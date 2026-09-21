"""Validated operations exposed to the Hermes Desktop agent over MCP."""

from __future__ import annotations

import asyncio
import fcntl
import json
import secrets
import time
from contextlib import contextmanager
from pathlib import Path

from scraping.ai_assistance.grounding import build_evidence
from scraping.duoke.reply.conversation_references import search_references, terms
from scraping.ai_assistance.sources import bundle_signature
from scraping.duoke.chat.archive_duoke_chats import capture_history, conversation_ref, message_key, private_json
from scraping.duoke.reply.hermes_drafts import latest_incoming
from scraping.duoke.reply.desktop_prompts import RETURN_HANDOFF, NO_MATCH_HANDOFF
from scraping.duoke.reply.desktop_browser import DeliveryAdapterError
from scraping.duoke.reply.knowledge_bundle import configured_source, load_knowledge
from scraping.shared.common import read_json, utc_now
from scraping.shared.paths import AI_ASSISTANCE_VAULT, DUOKE_DESKTOP_DIR, DUOKE_DESKTOP_ENABLED, STOP_FILE


class DesktopService:
    def __init__(self, transport, *, directory=DUOKE_DESKTOP_DIR, vault=AI_ASSISTANCE_VAULT,
                 source=None, enabled=DUOKE_DESKTOP_ENABLED, stop=STOP_FILE):
        self.transport = transport
        self.directory = Path(directory)
        self.vault = vault
        self.source = source if source is not None else configured_source()
        self.enabled = Path(enabled)
        self.stop = Path(stop)
        self.pending = {}
        self.offset = 0
        self.mutex = asyncio.Lock()

    @contextmanager
    def lock(self):
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        with (self.directory / "delivery.lock").open("w") as stream:
            fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            yield

    def state(self):
        path = self.directory / "delivery-state.json"
        if not path.exists():
            return {}
        value = json.loads(path.read_text())
        if not isinstance(value, dict):
            raise ValueError("Invalid delivery state; operator review required")
        return value

    def audit(self, event):
        from os import O_APPEND, O_CREAT, O_WRONLY, fdopen, open as os_open
        with fdopen(os_open(self.directory / "audit.jsonl", O_APPEND | O_CREAT | O_WRONLY, 0o600), "a") as stream:
            stream.write(json.dumps({"at": utc_now(), **event}) + "\n")

    async def status(self):
        bundle = await asyncio.to_thread(load_knowledge, self.vault, self.source, admin_references=True)
        return {"mode": "automatic-delivery" if self.enabled.exists() else "preview",
                "stopped": self.stop.exists(), "model": "qwen3.5:4b", "knowledge": bundle.counts}

    async def search(self, question: str):
        """Search local references without touching the customer inbox or issuing tickets."""
        if not isinstance(question, str) or not question.strip() or len(question) > 2000:
            raise ValueError("Question must contain 1-2000 characters")
        bundle = await asyncio.to_thread(load_knowledge, self.vault, self.source, admin_references=True)
        evidence, sku = build_evidence(bundle.snapshot, bundle.index, question, "id")
        references = search_references(bundle, question)
        # Prefer paired admin answers over catalog-only matches. A catalog is
        # never evidence of a return policy.
        extra = [{**item, "sources": bundle.citations.get(item["id"], [])}
                 for item in evidence if item["kind"] == "answer" and not item["id"].startswith("archive-")
                 and all(intent in terms(" ".join(item["questions"]))
                         for intent in terms(question) & {"return", "lock"})]
        bounded = []
        for item in references + extra:
            if len(json.dumps([*bounded, item], ensure_ascii=False).encode()) <= 7000:
                bounded.append(item)
            if len(bounded) == 5:
                break
        references = bounded
        historical_matches = []
        if "return" in terms(question):
            # Small models repeated old processing promises despite caveats.
            # Preserve provenance for the operator, but keep unsupported policy
            # text out of the model's customer-answer evidence.
            historical_matches = [{"id": item["id"], "sources": item["sources"],
                                   "sourceFlags": item.get("sourceFlags", []),
                                   "reason": "Historical return case; not current policy or approval"}
                                  for item in references if item.get("referenceOnly")]
            references = [item for item in references if not item.get("referenceOnly")]
        handoff = bool(historical_matches) and not references
        return {"status": "handoff_required" if handoff else "matched" if references else "no_match",
                "resolution": "whatsapp_handoff" if not references else "answer_from_references",
                "historicalMatches": historical_matches,
                **({"customerReply": RETURN_HANDOFF if handoff else NO_MATCH_HANDOFF} if not references else {}),
                "replyGuidance": ("Acknowledge the return request and direct the customer to Gascomp admin "
                                  "via WhatsApp. No verified contact is supplied here; do not invent a link. "
                                  "Do not state eligibility, receipt, processing time, destination, or approval."
                                  if handoff else "Use only applicable source facts."),
                "sku": sku, "sent": False,
                "references": references, "knowledge": bundle.counts,
                "referencePolicy": "Historical admin replies are context, not current approval or promises. "
                                   "Respect sourceSkus and sourceFlags. Do not copy a case-specific approval. "
                                   "Use WhatsApp handoff if applicability cannot be established."}

    async def poll(self, limit=10):
        if type(limit) is not int or not 1 <= limit <= 20:
            raise ValueError("Limit must be 1-20")
        async with self.mutex:
            with self.lock():
                if self.stop.exists():
                    return {"status": "stopped", "jobs": []}
                bundle = await asyncio.to_thread(load_knowledge, self.vault, self.source, admin_references=True)
                state = self.state()
                session = self.transport.session
                cursor = read_json(self.directory / "cursor.json", {"offset": 0})
                self.offset = cursor.get("offset", 0)
                # Explicit owner scope: every connected store. Never expose raw
                # source account identifiers to the model.
                body = {**session["list_body"], "offset": self.offset, "size": limit,
                        "shopIdList": [], "filterGroups": []}
                page = await self.transport.read("POST", session["list_url"], json=body)
                if not isinstance(page.get("list"), list) or type(page.get("hasMore")) is not bool:
                    raise ValueError("Invalid conversation page")
                next_offset = page.get("nextOffset") if page["hasMore"] else 0
                if page["hasMore"] and (next_offset is None or str(next_offset) == str(self.offset)):
                    raise ValueError("Conversation pagination stalled")
                self.offset = next_offset
                private_json(self.directory / "cursor.json", {"offset": self.offset})
                self.pending = {key: item for key, item in self.pending.items() if item["expires"] > time.monotonic()}
                jobs, review, skipped, errors = [], 0, 0, 0
                for conversation in page["list"][:limit]:
                    if self.stop.exists():
                        break
                    try:
                        record = await capture_history(self.transport, session, conversation)
                        incoming = latest_incoming(record)
                        if not incoming or incoming["messageRef"] in state:
                            skipped += 1
                            continue
                        evidence, _ = build_evidence(bundle.snapshot, bundle.index, incoming["text"], "id")
                        allowed_ids = {item["id"] for item in evidence}
                        candidates = [{"id": item["id"], "answer": item["answer"], "language": item["language"],
                                       "questions": item["questions"][:3]}
                                      for item in bundle.snapshot["entries"] if item["id"] in allowed_ids
                                      and item["kind"] == "answer" and len(item["answer"]) <= 3000]
                        conversation_answers = search_references(bundle, incoming["text"], delivery=True)
                        # Historical candidates must pass the pair-level match,
                        # not merely share a word elsewhere in the transcript.
                        candidates = [{key: item[key] for key in ("id", "answer", "language", "questions")}
                                      for item in conversation_answers] + [
                                          item for item in candidates if not item["id"].startswith("archive-")
                                          and all(intent in terms(" ".join(item["questions"]))
                                                  for intent in terms(incoming["text"]) & {"return", "lock"})]
                        if not candidates:
                            review += 1
                            continue
                        token = secrets.token_urlsafe(24)
                        self.pending[token] = {"conversation": conversation, "incoming": incoming,
                                               "candidates": candidates, "signature": bundle.signature,
                                               "expires": time.monotonic() + 300}
                        jobs.append({"ticket": token, "customer": incoming["text"], "candidates": candidates})
                    except Exception as error:
                        errors += 1
                        self.audit({"action": "read_error", "reason": type(error).__name__, "sent": False})
                summary = {"status": "ready", "scanned": len(page["list"][:limit]), "skipped": skipped,
                           "needsReview": review, "errors": errors, "hasMore": page["hasMore"], "jobs": jobs}
                private_json(self.directory / "status.json", {"at": utc_now(), **{k: v for k, v in summary.items() if k != "jobs"},
                                                            "jobs": len(jobs), "deliveryEnabled": self.enabled.exists()})
                return summary

    async def reply(self, ticket: str, answer_id: str):
        async with self.mutex:
            with self.lock():
                if self.stop.exists():
                    return {"status": "stopped", "sent": False}
                pending = self.pending.get(ticket)
                if not pending or pending["expires"] <= time.monotonic():
                    return {"status": "expired", "sent": False}
                candidate = next((item for item in pending["candidates"] if item["id"] == answer_id), None)
                if candidate is None:
                    raise ValueError("Select an offered answer ID; arbitrary text is not accepted")
                if bundle_signature(self.vault, self.source) != pending["signature"]:
                    self.pending.pop(ticket, None)
                    return {"status": "knowledge_changed", "sent": False}
                state = self.state()
                ref = pending["incoming"]["messageRef"]
                if ref in state:
                    return {"status": "already_attempted", "sent": state[ref].get("status") == "sent"}
                if hasattr(self.transport, "prepare_send"):
                    try:
                        await self.transport.prepare_send()
                    except DeliveryAdapterError as error:
                        return {"status": "not_ready", "reason": error.reason, "sent": False}
                record = await capture_history(self.transport, self.transport.session, pending["conversation"])
                if latest_incoming(record) != pending["incoming"]:
                    return {"status": "conversation_changed", "sent": False}
                if not self.enabled.exists():
                    return {"status": "preview", "answerId": answer_id, "text": candidate["answer"], "sent": False}
                # Recheck controls after the awaited history read, then reserve
                # before crossing the network boundary. Ambiguous sends are never retried.
                if self.stop.exists():
                    return {"status": "stopped", "sent": False}
                if bundle_signature(self.vault, self.source) != pending["signature"]:
                    return {"status": "knowledge_changed", "sent": False}
                if not self.enabled.exists():
                    return {"status": "disabled", "sent": False}
                state[ref] = {"status": "attempted", "at": utc_now(), "answerId": answer_id}
                private_json(self.directory / "delivery-state.json", state)
                previous_ids = {message_key(item) for item in record["messages"]}
                verified = False
                failure_reason = "receipt_not_observed"
                try:
                    await self.transport.send(pending["conversation"], candidate["answer"])
                    for _ in range(5):
                        await asyncio.sleep(1)
                        current = await capture_history(self.transport, self.transport.session, pending["conversation"])
                        if not current["complete"]:
                            continue
                        for item in current["messages"]:
                            if message_key(item) in previous_ids or item.get("fromAccountType") != 2:
                                continue
                            content = item.get("messageContent")
                            if isinstance(content, str):
                                try:
                                    content = json.loads(content)
                                except ValueError:
                                    continue
                            if isinstance(content, dict) and content.get("text") == candidate["answer"]:
                                verified = True
                                break
                        if verified:
                            break
                except DeliveryAdapterError as error:
                    failure_reason = error.reason
                except Exception:
                    failure_reason = "transport_or_verification_error"
                state[ref]["status"] = "sent" if verified else "uncertain"
                private_json(self.directory / "delivery-state.json", state)
                self.audit({"action": state[ref]["status"], "messageRef": ref,
                            "conversationRef": conversation_ref(pending["conversation"]),
                            "answerId": answer_id, "sent": verified,
                            **({"reason": failure_reason} if not verified else {})})
                self.pending.pop(ticket, None)
                return {"status": state[ref]["status"], "sent": verified,
                        **({"reason": failure_reason} if not verified else {})}
