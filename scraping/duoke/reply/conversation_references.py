"""Private Desktop retrieval of paired admin replies from Obsidian Percakapan.

Website publication eligibility is not the reference-search contract. Keep
historical caveats explicit, and never turn a contextual reference into permission
for automatic delivery.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import replace

from scraping.ai_assistance.grounding import _safe_candidate, unsafe_service_advice
from scraping.ai_assistance.import_duoke import (
    DuokeImportError, _annotate_conflicts_and_eligibility, candidates_from_note,
    parse_note, source_files,
)
from scraping.ai_assistance.knowledge import _canonical_terms, _unknown_sku_tokens

_PROVENANCE = {"historical_reply_requires_review", "outcome_not_verified",
               "source_review_status_unverified", "roles_explicit_archive", "product_not_identified"}
_PRIVATE = {"privacy_redacted", "account_specific_response", "possible_role_misattribution",
            "source_contains_local_or_unsafe_link", "roles_inferred_requires_review", "incomplete_history"}
_MEDIA = re.compile(r"\b(?:foto|gambar|video|lampiran|seperti\s+ini|yang\s+ini|yang\s+itu)\b", re.I)
_FILLERS = {"kak", "kakak", "min", "halo", "hallo", "ya", "nya", "dong", "ingin", "barang", "saja", "tidak", "bukan", "belum", "gak", "nggak", "ga", "ngga", "sudah", "udah"}
_INTENTS = {"return", "garansi", "bocor", "rusak", "install", "material", "power", "size", "color", "lock"}


def terms(text):
    normalized = re.sub(r"\b(?:dikunci|mengunci|terkunci|kunci|menutup|ditutup|tertutup|tutup)\b", "lock", text, flags=re.I)
    aliases = {"dpt": "include", "dapet": "include", "dapat": "include",
               "termasuk": "include", "dilengkapi": "include",
               "pembuanganya": "pembuangan", "pembuangannya": "pembuangan"}
    return {aliases.get(term, term) for term in _canonical_terms(normalized)} - _FILLERS


def load_references(source):
    if source is None:
        return [], {}
    candidates, counts = [], Counter()
    for path in source_files(source / "Percakapan"):
        counts["conversationFilesScanned"] += 1
        try:
            note = parse_note(path, source / "Percakapan")
        except (OSError, DuokeImportError):
            counts["conversationFilesUnparsed"] += 1
            continue
        # The parser retains media boundaries. An unrelated photo elsewhere in
        # the note must not invalidate an adjacent, self-contained text Q&A.
        local, excluded = candidates_from_note(replace(note, missing_media=False))
        for reason, count in excluded.items():
            counts[f"excluded:{reason}"] += count
        for item in local:
            item["note"] = path.relative_to(source).as_posix()
            candidates.append(item)
    _annotate_conflicts_and_eligibility(candidates)
    references = []
    for item in candidates:
        counts["conversationPairsExtracted"] += 1
        question = "\n".join(turn["text"] for turn in item["questionTurns"])
        answer = "\n".join(turn["text"] for turn in item["historicalSellerTurns"])
        flags = set(item["flags"]) - _PROVENANCE
        if (flags & _PRIVATE or unsafe_service_advice(question + "\n" + answer)
                or re.search(r"\[(?:IDENTIFIER|BANK_ACCOUNT|PHONE|ADDRESS|ORDER_NUMBER|NAME|EMAIL|USERNAME)\]", question + "\n" + answer)
                or _MEDIA.search(question + "\n" + answer) or len(answer) > 2500
                or len(question) > 1500):
            counts["conversationPairsExcluded"] += 1
            continue
        entry = {"id": f"archive-{item['id'].removeprefix('duoke-')}", "kind": "answer",
                 "language": "id", "questions": [question], "answer": answer,
                 "sourceFlags": sorted(flags), "sourceSkus": item["skus"],
                 "sources": [{"note": item["note"], "vault": "source", "sourceKind": "conversation"}]}
        if len(item["skus"]) == 1:
            entry["sku"] = item["skus"][0]
        # Policy, ambiguous scope, links, and other historical qualifications may
        # inform a preview, but cannot become an exact automatic reply.
        entry["referenceOnly"] = bool(flags) or "return" in terms(question + " " + answer) or not _safe_candidate(entry)
        references.append(entry)
    counts["conversationReferences"] = len(references)
    return references, dict(counts)


def search_references(bundle, question, *, delivery=False):
    query = terms(question)
    known = {sku.casefold() for entry in bundle.snapshot["entries"] for sku in [entry.get("sku", "")] if sku}
    known.update(sku.casefold() for entry in bundle.conversations for sku in entry["sourceSkus"])
    if not query or _unknown_sku_tokens(question, known):
        return []
    requested = query & known
    ranked = []
    for original in bundle.conversations:
        entry = dict(original)
        # Honor any stronger corpus-level exclusions added by the caller.
        inherited = bundle.index.evidence.get(entry["id"], {}).get("flags", []) if bundle.index else []
        flags = set(entry["sourceFlags"]) | (set(inherited) - _PROVENANCE - {"missing_attachment_context"})
        if flags & _PRIVATE:
            continue
        entry["sourceFlags"] = sorted(flags)
        entry["referenceOnly"] = entry["referenceOnly"] or bool(flags)
        if delivery and entry["referenceOnly"]:
            continue
        scoped = {sku.casefold() for sku in entry["sourceSkus"]}
        if requested and scoped and requested != scoped:
            continue
        if delivery and scoped and requested != scoped:
            continue
        question_terms = terms(entry["questions"][0])
        overlap = query & question_terms
        intent = query & _INTENTS
        if intent and not intent <= question_terms:
            continue
        if len(overlap) < 2 and not (intent and intent <= overlap):
            continue
        score = len(overlap) / max(len(query), 1) + len(overlap) / max(len(question_terms), 1)
        ranked.append((score, entry))
    ranked.sort(key=lambda item: (-item[0], item[1]["id"]))
    result, seen = [], set()
    for _, entry in ranked:
        key = (entry["answer"], tuple(entry["sourceSkus"]))
        if key in seen:
            continue
        if len(json.dumps([*result, entry], ensure_ascii=False).encode()) > 7000:
            continue
        seen.add(key)
        result.append(entry)
        if len(result) == 5:
            break
    return result
