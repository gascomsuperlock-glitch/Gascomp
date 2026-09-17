"""Merge exact answer excerpts and search the complete private source index."""

from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter
from pathlib import Path

from scraping.ai_assistance.knowledge import _canonical_terms, _unknown_sku_tokens, build_snapshot, resolve_product_context, validate_entry, vault_signature


def bundle_signature(vault: Path, source: Path | None = None) -> str:
    primary = vault_signature(vault)
    if source is None:
        return primary
    from scraping.ai_assistance.corpus import source_signature

    return hashlib.sha256(f"{primary}:{source_signature(source)}".encode()).hexdigest()


def load_bundle(vault: Path, source: Path | None = None) -> tuple[dict, dict | None]:
    snapshot = build_snapshot(vault)
    if source is None:
        return snapshot, None
    from scraping.ai_assistance.corpus import build_corpus

    corpus = build_corpus(source)
    entries = snapshot["entries"] + [validate_entry(entry) for entry in corpus["entries"]]
    if len(entries) > 2000:
        raise ValueError("Combined knowledge exceeds the 2000-entry limit")
    if len({entry["id"] for entry in entries}) != len(entries):
        raise ValueError("Combined knowledge contains duplicate entry IDs")
    entries.sort(key=lambda entry: entry["id"])
    canonical = json.dumps(entries, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    snapshot = {"version": hashlib.sha256(canonical.encode()).hexdigest(), "entries": entries}
    if len(json.dumps({"ready": True, "snapshot": snapshot}, ensure_ascii=False).encode()) > 4 * 1024 * 1024:
        raise ValueError("Combined publication exceeds the 4 MiB limit")
    return snapshot, corpus


_STOP = frozenset("a an the this that my me is are to how what for please and or ini itu saya aku kak kakak min admin ya dong apakah apa berapa bagaimana bisa dengan dan di ke dari yang untuk nya mau ingin tentang ada kalau produk gascomp".split())
_PRIVATE_OR_VOLATILE = re.compile(r"\b(?:rekening|pesanan|resi|pelanggan|password|nomor|harga|stok|stock|promo|diskon|saldo|order|price|phone|customer|abaikan|ignore)\b", re.I)


def _terms(value: str) -> set[str]:
    return set(re.findall(r"[\w-]+", value.casefold())) - _STOP


class SourceIndex:
    """Keep source text local. Only source IDs guide candidate ordering/clarification."""

    def __init__(self, documents: list[dict], evidence: list[dict] | None = None):
        self.documents = documents
        self.evidence = {item["entryId"]: item for item in (evidence or []) if item.get("entryId")}
        self.tokens = []
        self.names = []
        for document in documents:
            names = " ".join([*document.get("names", []), *document.get("skus", [])])
            self.names.append(_terms(names))
            self.tokens.append(_terms(document.get("text", "") + " " + names))
        frequencies = Counter(term for values in self.tokens for term in values)
        self.weights = {term: math.log(1 + len(documents) / count) for term, count in frequencies.items()}

    def search(self, text: str, limit: int = 8) -> list[dict]:
        query = _terms(text)
        if not query:
            return []
        matches = []
        for index, values in enumerate(self.tokens):
            overlap = query & values
            name_overlap = query & self.names[index]
            if not overlap or (len(overlap) < 2 and not name_overlap):
                continue
            score = sum(self.weights[term] for term in overlap) + 2 * sum(self.weights[term] for term in name_overlap)
            matches.append((score / max(len(query), 1), index))
        matches.sort(key=lambda match: (-match[0], match[1]))
        return [self.documents[index] for _, index in matches[:limit]]

    def guide(self, snapshot: dict, text: str, language: str, candidates: list[dict], sku: str | None = None) -> list[dict]:
        documents = self.search(text)
        if candidates:
            requested_terms = set(_canonical_terms(text))
            for candidate in candidates:
                limitations = self.evidence.get(candidate["id"], {}).get("conflictingAttributes", [])
                if any(set(_canonical_terms(attribute)) & requested_terms for attribute in limitations):
                    return []
            # Respect the primary retriever's product/language/injection guards.
            priority = {identifier: rank for rank, document in reversed(list(enumerate(documents)))
                        for identifier in document.get("entryIds", [])}
            ordered = sorted(candidates, key=lambda entry: priority.get(entry["id"], len(documents)))
            return [{**entry, **({"sourceFlags": self.evidence[entry["id"]].get("flags", []),
                                 "conflictingAttributes": self.evidence[entry["id"]].get("conflictingAttributes", [])}
                                if entry["id"] in self.evidence else {})} for entry in ordered]
        if not documents or _PRIVATE_OR_VOLATILE.search(text):
            return []
        known = {entry["sku"].strip().casefold() for entry in snapshot["entries"] if entry.get("sku")}
        if _unknown_sku_tokens(text, known) or (sku and sku.strip().casefold() not in known):
            return []
        # Asking for a product code again cannot repair missing facts or a
        # missing translation when the customer already identified the product.
        if resolve_product_context(snapshot, text, sku):
            return []
        mentioned = _terms(text) & known
        if len(mentioned | ({sku.strip().casefold()} if sku else set())) > 1:
            return []
        # Related source documents without an eligible final answer can still
        # support asking for product context. Raw transcript text is never sent.
        if not any(document.get("skus") or document.get("names") for document in documents):
            return []
        return [entry for entry in snapshot["entries"]
                if entry["kind"] == "clarification" and entry["language"] == language][:1]
