"""Prepare private Duoke reply drafts using Chrome, Obsidian, and Hermes Agent."""

from __future__ import annotations

import argparse
import asyncio
import fcntl
import json
import os
from dataclasses import dataclass
from pathlib import Path

from playwright.async_api import async_playwright

from scraping.ai_assistance.config import loopback_url
from scraping.ai_assistance.grounding import build_evidence
from scraping.ai_assistance.hermes_response import HermesResponseGenerator
from scraping.ai_assistance.sources import bundle_signature
from scraping.ai_assistance.responder import validate_grounded_response
from scraping.duoke.chat.archive_duoke_chats import (
    capture_history, conversation_ref, message_key, private_json, redact_value,
)
from scraping.duoke.reply.browser_reader import BrowserReader, validate_session
from scraping.duoke.reply.knowledge_bundle import configured_source, load_knowledge
from scraping.shared.common import load_env_file, read_json, stable_hash, utc_now
from scraping.shared.paths import AI_ASSISTANCE_VAULT, CHAT_ARCHIVE_DIR, DUOKE_DRAFT_DIR, STOP_FILE


@dataclass(frozen=True)
class DraftConfig:
    hermes_root: Path
    hermes_python: str
    hermes_home: Path
    model: str
    model_url: str

    @classmethod
    def from_environment(cls):
        values = {**load_env_file(), **os.environ}
        root = Path(values.get("DUOKE_HERMES_ROOT") or values.get("GASCOMP_AI_HERMES_ROOT")
                    or "~/.hermes/hermes-agent").expanduser().resolve()
        config = cls(root, values.get("DUOKE_HERMES_PYTHON") or str(root / "venv/bin/python"),
                     DUOKE_DRAFT_DIR / "hermes",
                     values.get("DUOKE_HERMES_MODEL") or values.get("GASCOMP_AI_MODEL", ""),
                     values.get("DUOKE_HERMES_MODEL_BASE_URL") or "http://127.0.0.1:11434/v1")
        if not (root / "run_agent.py").is_file() or not Path(config.hermes_python).is_file():
            raise ValueError("The Hermes source or Python interpreter is unavailable")
        if not config.model or not loopback_url(config.model_url):
            raise ValueError("Configure a Hermes model and a loopback HTTP model endpoint")
        return config


def latest_incoming(record: dict) -> dict | None:
    if not record.get("complete"):
        raise ValueError("Incomplete history cannot produce a draft")
    messages = record["messages"]
    if not messages:
        return None
    latest = max(messages, key=lambda item: (int(item.get("createdTimestamp") or 0),
                                            str(item.get("messageSort") or "").zfill(30), message_key(item)))
    if latest.get("fromAccountType") != 1:
        return None
    raw = latest.get("messageContent")
    try:
        content = json.loads(raw) if isinstance(raw, str) else raw
    except ValueError:
        content = raw
    # Images, orders, and mixed payloads need an operator rather than guessed text.
    if not isinstance(content, dict) or set(content) != {"text"} or not isinstance(content["text"], str):
        return None
    text = content["text"].strip()
    if not text or len(text) > 2000:
        return None
    item = record["conversation"]
    text = redact_value(text, str(item.get("buyerNick") or ""), str(item.get("buyerId") or ""))
    return {"messageRef": stable_hash(conversation_ref(item), message_key(latest)), "text": text}


def generate_draft(incoming: dict, snapshot: dict, sources: dict, generator, source_index=None) -> dict:
    evidence, sku = build_evidence(snapshot, source_index, incoming["text"], "en")
    if not evidence:
        return {"status": "needs_review", "reason": "no_approved_evidence", "text": "", "sources": []}
    raw = generator({"language": "en", "customer": incoming["text"], "history": [],
                     "resolvedSku": sku, "evidence": evidence}, timeout=38)
    response, reason = validate_grounded_response(raw, evidence)
    if not response:
        return {"status": "needs_review", "reason": reason, "text": "", "sources": []}
    if response["kind"] != "answer" or response["basis"] != "knowledge":
        return {"status": "needs_review", "reason": "clarification_or_handoff_required", "text": "", "sources": []}
    return {"status": "draft", "reason": "grounded_draft", "text": response["text"],
            "sources": [{"id": identifier, **reference} for identifier in response["sourceIds"]
                        for reference in sources[identifier]]}


async def list_conversations(api, session: dict, limit: int, shop_ids: list[str]) -> tuple[list[dict], bool]:
    items, seen, offsets = [], set(), set()
    offset = 0
    # Preserve saved filters, including store scope. An explicit scope narrows it.
    saved_shops = session["list_body"].get("shopIdList", [])
    if shop_ids and saved_shops and not set(shop_ids) <= {str(value) for value in saved_shops}:
        raise ValueError("Requested stores must stay within the saved session scope")
    for _ in range(20):
        body = {**session["list_body"], "offset": offset, "size": min(limit, 50)}
        if shop_ids:
            body["shopIdList"] = shop_ids
        allowed_shops = {str(value) for value in body.get("shopIdList", [])}
        data = await api.read("POST", session["list_url"], json=body)
        if not isinstance(data.get("list"), list) or type(data.get("hasMore")) is not bool:
            raise ValueError("Invalid conversation page")
        for index, item in enumerate(data["list"]):
            ref = conversation_ref(item)
            if ref not in seen:
                if allowed_shops and str(item["shopId"]) not in allowed_shops:
                    raise ValueError("The source returned a store outside the requested scope")
                seen.add(ref)
                items.append(item)
            if len(items) == limit:
                return items, data["hasMore"] or index < len(data["list"]) - 1
        if not data["hasMore"]:
            return items, False
        offset = data.get("nextOffset")
        if offset is None or str(offset) in offsets or not data["list"]:
            raise ValueError("Conversation pagination stalled")
        offsets.add(str(offset))
    return items, True


async def run_once(api, session: dict, vault: Path, generator, *, limit: int = 5,
                   shop_ids: list[str] | None = None, previous: dict | None = None,
                   source_vault: Path | None = None) -> dict:
    bundle = load_knowledge(vault, source_vault)
    snapshot, sources = bundle.snapshot, bundle.citations
    report = {"schemaVersion": 1, "mode": "draft-only", "startedAt": utc_now(),
              "knowledgeVersion": snapshot["version"], "vault": str(vault),
              "sourceVault": str(source_vault) if source_vault else None,
              "sourceSignature": bundle.signature, "knowledgeCounts": bundle.counts,
              "complete": False, "limited": False, "scanned": 0, "skipped": 0,
              "errors": 0, "drafts": [], "sent": 0}
    items, report["limited"] = await list_conversations(api, session, limit, shop_ids or [])
    reusable = {item["conversationRef"]: item for item in (previous or {}).get("drafts", [])}
    for item in items:
        if STOP_FILE.exists():
            break
        report["scanned"] += 1
        ref = conversation_ref(item)
        try:
            record = await capture_history(api, session, item)
            incoming = latest_incoming(record)
            if not incoming:
                report["skipped"] += 1
                continue
            fingerprint = stable_hash(incoming["messageRef"], incoming["text"], bundle.signature)
            cached = reusable.get(ref)
            if cached and cached.get("fingerprint") == fingerprint and cached.get("status") == "draft":
                draft = cached
            else:
                draft = await asyncio.to_thread(generate_draft, incoming, snapshot, sources, generator, bundle.index)
            if bundle.index:
                draft = {**draft, "relatedNotes": [
                    {"note": document["path"], "sourceKind": document["sourceKind"],
                     "requiresReview": document["sourceKind"] == "conversation"}
                    for document in bundle.index.search(incoming["text"], limit=5)
                ]}
            # Never retain a draft after a new customer message or a seller reply.
            current = latest_incoming(await capture_history(api, session, item))
            if STOP_FILE.exists():
                break
            if current != incoming:
                report["skipped"] += 1
                continue
            report["drafts"].append({**draft, "conversationRef": ref,
                                     "messageRef": incoming["messageRef"], "fingerprint": fingerprint,
                                     "checkedAt": utc_now()})
        except Exception as error:
            # Browser errors and API payloads may contain credentials or customer text.
            report["errors"] += 1
            report["drafts"].append({"conversationRef": ref, "status": "error",
                                     "reason": type(error).__name__, "text": "", "sources": []})
    if bundle_signature(vault, source_vault) != bundle.signature:
        raise ValueError("Knowledge changed during generation; discard this pass")
    report["complete"] = not STOP_FILE.exists() and report["errors"] == 0
    if STOP_FILE.exists():
        report["drafts"] = []
    report["finishedAt"] = utc_now()
    return report


async def run(args, config) -> int:
    session = read_json(args.session, {})
    validate_session(session)
    generator = HermesResponseGenerator(config)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="chrome", headless=True)
        try:
            async with BrowserReader(browser, session, args.max_history_pages) as api:
                previous = None
                while not STOP_FILE.exists():
                    private_json(DUOKE_DRAFT_DIR / "latest.json", {"schemaVersion": 1, "mode": "draft-only",
                                 "complete": False, "status": "running", "drafts": [], "sent": 0})
                    report = await run_once(api, session, args.vault, generator, limit=args.limit,
                                            shop_ids=args.shop_id, previous=previous, source_vault=args.source_vault)
                    private_json(DUOKE_DRAFT_DIR / "latest.json", report)
                    counts = {key: report[key] for key in ("scanned", "skipped", "errors", "limited", "sent")}
                    counts["drafts"] = sum(item["status"] == "draft" for item in report["drafts"])
                    print(json.dumps(counts), flush=True)
                    if not args.watch:
                        return 0 if report["complete"] else 2
                    previous = report
                    for _ in range(args.interval):
                        if STOP_FILE.exists():
                            break
                        await asyncio.sleep(1)
        finally:
            await browser.close()
    private_json(DUOKE_DRAFT_DIR / "latest.json", {"schemaVersion": 1, "mode": "draft-only",
                 "complete": False, "status": "stopped", "drafts": [], "sent": 0})
    return 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate local prerequisites without network access")
    parser.add_argument("--vault", type=Path, default=AI_ASSISTANCE_VAULT,
                        help="Curated Obsidian answer folder using the customer-support note schema")
    source_options = parser.add_mutually_exclusive_group()
    source_options.add_argument("--source-vault", type=Path,
                                help="Full Duoke Obsidian directory containing Percakapan and Produk")
    source_options.add_argument("--curated-only", action="store_true",
                                help="Explicitly disable the configured full source archive")
    parser.add_argument("--session", type=Path, default=CHAT_ARCHIVE_DIR / "session.json")
    parser.add_argument("--shop-id", action="append", default=[], help="Narrow the saved store scope; repeatable")
    parser.add_argument("--limit", type=int, default=5, help="Maximum conversations per pass (1-50)")
    parser.add_argument("--max-history-pages", type=int, default=20, help="Maximum history pages per conversation (1-100)")
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--interval", type=int, default=30, help="Watch delay in seconds (5-300)")
    args = parser.parse_args()
    if not (1 <= args.limit <= 50 and 1 <= args.max_history_pages <= 100 and 5 <= args.interval <= 300):
        parser.error("Limit, history page count, or interval is outside the supported range")
    args.vault = args.vault.expanduser().absolute()
    try:
        args.source_vault = (None if args.curated_only else
                             args.source_vault.expanduser().absolute() if args.source_vault else configured_source())
        if args.check:
            DraftConfig.from_environment()
            bundle = load_knowledge(args.vault, args.source_vault)
            validate_session(read_json(args.session, {}))
            print(json.dumps({"configuration": "valid", "fullSourceConnected": args.source_vault is not None,
                              **bundle.counts}))
            print("Chrome, model, and session connectivity are unverified.")
            return 0
        DUOKE_DRAFT_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
        with (DUOKE_DRAFT_DIR / "runner.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            # Invalidate the old report before attempting fresh reads.
            private_json(DUOKE_DRAFT_DIR / "latest.json", {"schemaVersion": 1, "mode": "draft-only",
                         "complete": False, "status": "running", "drafts": [], "sent": 0})
            try:
                if STOP_FILE.exists():
                    private_json(DUOKE_DRAFT_DIR / "latest.json", {"schemaVersion": 1, "mode": "draft-only",
                                 "complete": False, "status": "stopped", "drafts": [], "sent": 0})
                    print("Draft generation is stopped by STOP_AUTOREPLY.")
                    return 2
                config = DraftConfig.from_environment()
                load_knowledge(args.vault, args.source_vault)
                return asyncio.run(run(args, config))
            except (Exception, KeyboardInterrupt):
                private_json(DUOKE_DRAFT_DIR / "latest.json", {"schemaVersion": 1, "mode": "draft-only",
                             "complete": False, "status": "failed", "drafts": [], "sent": 0})
                raise
    except KeyboardInterrupt:
        print("Draft generation interrupted.")
        return 130
    except Exception as error:
        print(f"Draft generation unavailable ({type(error).__name__}). Check local configuration, session, and model readiness.")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
