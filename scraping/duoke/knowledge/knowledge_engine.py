#!/usr/bin/env python3
"""Deterministic retrieval over approved Gascomp support knowledge."""

from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from dataclasses import dataclass
from typing import Any

from scraping.shared.common import read_json
from scraping.shared.paths import BOT_MESSAGES_PATH, KNOWLEDGE_PATH


STOP_WORDS = {
    "ada", "adalah", "agar", "aku", "anda", "apa", "atau", "buat", "dalam", "dan", "dari",
    "di", "ini", "itu", "ke", "kok", "mau", "nya", "pada", "produk", "saya", "sebuah", "sudah",
    "tolong", "untuk", "yang",
}
NORMALIZATIONS = {
    "gak": "tidak", "ga": "tidak", "nggak": "tidak", "ngga": "tidak", "enggak": "tidak",
    "tak": "tidak", "nyala": "menyala", "hidup": "menyala", "ngunci": "mengunci",
    "dikunci": "mengunci", "pemakaian": "menggunakan", "pakai": "menggunakan",
}
PHRASE_BOOSTS = {
    "tidak menyala": ("tidak menyala", "mati", "gagal menyala"),
    "api kecil": ("api kecil", "apinya kecil", "nyala kecil"),
    "api besar": ("api besar", "apinya besar", "nyala besar"),
    "adjuster": ("adjuster", "pengatur api", "atur api"),
    "regulator mengunci": ("regulator tidak mengunci", "regulator mengunci", "tidak bisa mengunci", "regulator longgar"),
    "tutorial": ("tutorial", "video", "cara menggunakan", "cara pakai"),
}


@dataclass(frozen=True)
class RetrievalResult:
    action: str
    reply: str
    knowledge_id: str | None
    product_id: str | None
    score: float
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "action": self.action,
            "reply": self.reply,
            "knowledgeId": self.knowledge_id,
            "productId": self.product_id,
            "score": round(self.score, 4),
            "reason": self.reason,
        }


def normalize_text(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text.casefold()).strip()
    words = [NORMALIZATIONS.get(word, word) for word in text.split()]
    return " ".join(words)


def tokens(value: object) -> set[str]:
    return {word for word in normalize_text(value).split() if len(word) > 1 and word not in STOP_WORDS}


def load_approved_entries() -> list[dict[str, Any]]:
    payload = read_json(KNOWLEDGE_PATH, {})
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1:
        return []
    return [
        entry for entry in payload.get("entries", [])
        if isinstance(entry, dict)
        and entry.get("approval") == "approved"
        and isinstance(entry.get("answer"), str)
        and isinstance(entry.get("product"), dict)
    ]


def product_aliases(product: dict[str, Any]) -> list[str]:
    return [
        str(product.get("sku", "")),
        str(product.get("name", "")),
        str(product.get("model", "")),
        *(str(value) for value in product.get("variationSkus", []) if value),
    ]


def resolve_product(entries: list[dict[str, Any]], query: str, product_sku: str | None) -> tuple[str | None, str]:
    products: dict[str, dict[str, Any]] = {}
    for entry in entries:
        product = entry["product"]
        products[str(product.get("id"))] = product

    supplied = normalize_text(product_sku or "")
    if supplied:
        matches = [
            product_id for product_id, product in products.items()
            if any(supplied == normalize_text(alias) for alias in product_aliases(product) if alias)
        ]
        if len(matches) == 1:
            return matches[0], "sku_context"
        return None, "unknown_product_context"

    normalized_query = f" {normalize_text(query)} "
    matches: list[str] = []
    for product_id, product in products.items():
        for alias in product_aliases(product):
            normalized_alias = normalize_text(alias)
            if normalized_alias and f" {normalized_alias} " in normalized_query:
                matches.append(product_id)
                break
    unique = sorted(set(matches))
    if len(unique) == 1:
        return unique[0], "product_in_question"
    if len(unique) > 1:
        return None, "ambiguous_product"
    return None, "missing_product"


def phrase_score(query: str, document: str) -> float:
    normalized_query = normalize_text(query)
    normalized_document = normalize_text(document)
    matched = 0
    possible = 0
    for canonical, variants in PHRASE_BOOSTS.items():
        query_match = canonical in normalized_query or any(normalize_text(item) in normalized_query for item in variants)
        if not query_match:
            continue
        possible += 1
        if canonical in normalized_document or any(normalize_text(item) in normalized_document for item in variants):
            matched += 1
    return matched / possible if possible else 0.0


def entry_score(query: str, entry: dict[str, Any]) -> float:
    query_tokens = tokens(query)
    if not query_tokens:
        return 0.0
    searchable = " ".join([
        str(entry.get("title", "")),
        str(entry.get("question", "")),
        " ".join(str(value) for value in entry.get("triggers", [])),
    ])
    document_tokens = tokens(searchable)
    overlap = len(query_tokens & document_tokens)
    coverage = overlap / len(query_tokens)
    precision = overlap / len(document_tokens) if document_tokens else 0.0
    lexical = 0.72 * coverage + 0.18 * math.sqrt(precision) + 0.10 * phrase_score(query, searchable)
    return min(1.0, lexical)


def retrieve(query: str, product_sku: str | None = None, threshold: float = 0.36) -> RetrievalResult:
    entries = load_approved_entries()
    messages = read_json(BOT_MESSAGES_PATH, {})
    if not query.strip():
        return RetrievalResult("ignore", "", None, None, 0.0, "empty_message")
    if not entries:
        return RetrievalResult("escalate", "", None, None, 0.0, "knowledge_base_empty")
    if not isinstance(messages, dict) or messages.get("approval") != "approved":
        return RetrievalResult("escalate", "", None, None, 0.0, "bot_messages_not_approved")

    product_id, product_reason = resolve_product(entries, query, product_sku)
    if not product_id:
        clarification = str(messages.get("clarifyProduct", "")).strip()
        return RetrievalResult("clarify", clarification, None, None, 0.0, product_reason)

    product_entries = [entry for entry in entries if str(entry["product"].get("id")) == product_id]
    ranked = sorted(
        ((entry_score(query, entry), entry) for entry in product_entries),
        key=lambda item: (-item[0], str(item[1].get("id", ""))),
    )
    if not ranked or ranked[0][0] < threshold:
        return RetrievalResult("escalate", "", None, product_id, ranked[0][0] if ranked else 0.0, "no_adequate_answer")
    score, entry = ranked[0]
    return RetrievalResult(
        "reply",
        str(entry["answer"]).strip()[:3000],
        str(entry["id"]),
        product_id,
        score,
        "approved_match",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Find an approved answer without sending it.")
    parser.add_argument("query", help="Customer question")
    parser.add_argument("--product-sku", help="SKU from the conversation or order context")
    parser.add_argument("--threshold", type=float, default=0.36)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result = retrieve(args.query, args.product_sku, max(0.0, min(1.0, args.threshold)))
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
    return 0 if result.action == "reply" else 2


if __name__ == "__main__":
    raise SystemExit(main())
