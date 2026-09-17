"""Build bounded, public-compatible evidence for a conversational response."""

from __future__ import annotations

import json
import re
from typing import Any

from scraping.ai_assistance.knowledge import _unknown_sku_tokens, resolve_product_context, retrieve


MAX_EVIDENCE_ITEMS = 5
MAX_EVIDENCE_BYTES = 7_000
_BLOCKED_FLAGS = frozenset({
    "account_specific_response",
    "ambiguous_product_multiple_skus",
    "ambiguous_product_reference",
    "context_dependent_reply",
    "incomplete_history",
    "missing_attachment_context",
    "monetary_or_promotion_claim",
    "operational_promise",
    "privacy_redacted",
    "stock_or_availability_claim",
    "historical_reply_requires_review",
    "outcome_not_verified",
    "source_review_status_unverified",
})
_UNSAFE_SERVICE_ADVICE = re.compile(
    r"\b(?:gotri|steel\s*ball|bola\s*baja|bypass|jumper|menonaktifkan|nonaktifkan|"
    r"cabut|lepas(?:kan)?|buang|bongkar|pecah(?:kan)?|lubangi)\b.{0,80}"
    r"\b(?:seal|segel|regulator|pengaman|safety|katup|valve|selang\s*gas)\b|"
    r"\b(?:seal|segel|regulator|pengaman|safety|katup|valve|selang\s*gas)\b.{0,80}"
    r"\b(?:gotri|steel\s*ball|bola\s*baja|bypass|jumper|menonaktifkan|nonaktifkan|"
    r"cabut|lepas(?:kan)?|buang|bongkar|pecah(?:kan)?|lubangi)\b|"
    r"\b(?:goyang|guncang|kocok|miringkan|putar|tekan|ketuk|tepuk(?:-tepuk)?|shake|tilt|tap)\b.{0,60}"
    r"\b(?:regulator|katup|valve|selang(?:nya)?)\b|"
    r"\b(?:remove|detach|open|disassemble|take\s+out)\b.{0,80}"
    r"\b(?:seal|regulator|valve|steel\s*ball|safety\s*device)\b",
    re.I | re.S,
)


def sanitize_history(value: object) -> list[dict[str, str]]:
    """Accept only the bounded role/text contract supplied by the backend."""
    if not isinstance(value, list):
        return []
    history: list[dict[str, str]] = []
    for item in value[-8:]:
        if not isinstance(item, dict) or set(item) != {"role", "text"}:
            continue
        role, text = item.get("role"), item.get("text")
        if role not in ("user", "assistant") or not isinstance(text, str):
            continue
        clean = text.strip()[:800]
        if clean:
            history.append({"role": role, "text": clean})
    return history


def _safe_candidate(entry: dict[str, Any]) -> bool:
    flags = set(entry.get("sourceFlags", []))
    text = "\n".join((entry.get("answer", ""), *entry.get("questions", [])))
    return (not flags.intersection(_BLOCKED_FLAGS)
            and not entry.get("conflictingAttributes")
            and not _UNSAFE_SERVICE_ADVICE.search(text))


def _compact_entry(entry: dict[str, Any]) -> dict[str, Any]:
    answer = entry["answer"].strip()
    if len(answer) > 2500:
        answer = answer[:2500].rsplit("\n", 1)[0].strip() or answer[:2500]
    item = {
        "id": entry["id"],
        "kind": entry["kind"],
        "language": entry["language"],
        "answer": answer,
        "questions": entry.get("questions", [])[:3],
    }
    for key in ("sku", "sourceFlags", "conflictingAttributes"):
        if entry.get(key):
            item[key] = entry[key]
    return item


def build_evidence(snapshot: dict, source_index, text: str, language: str,
                   sku: str | None = None, *, context_ambiguous: bool = False) -> tuple[list[dict], str | None]:
    """Return safe published entries; private documents influence rank only.

    Evidence may be written in either supported language because the grounded
    response mode may translate it. Raw private documents and transcripts never
    enter the model payload.
    """
    if context_ambiguous:
        return [], None
    known_skus = {entry["sku"].strip().casefold() for entry in snapshot.get("entries", [])
                  if isinstance(entry.get("sku"), str) and entry["sku"].strip()}
    if _unknown_sku_tokens(text, known_skus):
        return [], None
    resolved_sku = resolve_product_context(snapshot, text, sku)
    retrieval_text = re.sub(
        r"\b(daya|kapasitas|ukuran|warna|bahan|fungsi)nya\b",
        lambda match: match.group(1), text, flags=re.I,
    )
    ranked: list[dict] = []
    seen: set[str] = set()

    def add(entries: list[dict]) -> None:
        for entry in entries:
            if (resolved_sku and entry.get("id", "").startswith(("source-", "catalog-"))
                    and entry.get("sku", "").casefold() != resolved_sku.casefold()):
                continue
            identifier = entry.get("id")
            if identifier not in seen:
                seen.add(identifier)
                ranked.append(entry)

    for candidate_language in (language, "id" if language == "en" else "en"):
        candidates = retrieve(snapshot, retrieval_text, candidate_language, sku)
        if source_index:
            candidates = source_index.guide(snapshot, retrieval_text, candidate_language, candidates, sku)
        add(candidates)

    # When a symptom does not lexically match an answer, provide a small safe
    # catalog excerpt for the resolved product. This establishes what the item
    # is without treating its marketing description as a fault diagnosis.
    if resolved_sku and not ranked:
        for candidate in snapshot.get("entries", []):
            if (candidate.get("sku", "").casefold() == resolved_sku.casefold()
                    and candidate.get("id", "").startswith(("source-", "catalog-"))):
                enriched = dict(candidate)
                if source_index:
                    local = source_index.evidence.get(candidate["id"], {})
                    enriched["sourceFlags"] = local.get("flags", [])
                    enriched["conflictingAttributes"] = local.get("conflictingAttributes", [])
                add([enriched])
                if len(ranked) == 2:
                    break

    # Search the private index only for IDs of already published, sanitized
    # entries. Its document text remains local and is never copied below.
    if source_index:
        by_id = {entry["id"]: entry for entry in snapshot.get("entries", [])}
        for document in source_index.search(retrieval_text, limit=8):
            for identifier in document.get("entryIds", []):
                candidate = by_id.get(identifier)
                if candidate is None:
                    continue
                if candidate.get("sku") and not resolved_sku:
                    continue
                if resolved_sku and candidate.get("sku") not in (None, resolved_sku):
                    continue
                enriched = dict(candidate)
                local = source_index.evidence.get(identifier, {})
                enriched["sourceFlags"] = local.get("flags", [])
                enriched["conflictingAttributes"] = local.get("conflictingAttributes", [])
                add([enriched])

    evidence: list[dict] = []
    for entry in ranked:
        if entry.get("kind") == "handoff" or not _safe_candidate(entry):
            continue
        compact = _compact_entry(entry)
        proposed = [*evidence, compact]
        if len(json.dumps(proposed, ensure_ascii=False).encode("utf-8")) > MAX_EVIDENCE_BYTES:
            continue
        evidence.append(compact)
        if len(evidence) == MAX_EVIDENCE_ITEMS:
            break
    return evidence, resolved_sku


def unsafe_service_advice(text: str) -> bool:
    return bool(_UNSAFE_SERVICE_ADVICE.search(text))
