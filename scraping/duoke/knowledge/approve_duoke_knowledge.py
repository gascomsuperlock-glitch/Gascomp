#!/usr/bin/env python3
"""Promote one anonymized historical candidate after an explicit human review."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from scraping.duoke.knowledge.build_duoke_knowledge import CANDIDATES_PATH
from scraping.shared.common import read_json, redact_text, utc_now, write_json
from scraping.shared.paths import APPROVED_DIR, KNOWLEDGE_PATH, REVIEWED_KNOWLEDGE_PATH


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Approve one historical candidate after its technical answer has been verified.",
    )
    parser.add_argument("--candidate", required=True, help="Candidate ID in the history-... format")
    parser.add_argument("--product-id", required=True, help="Product ID in the active knowledge base")
    parser.add_argument("--question-file", type=Path, required=True, help="Anonymized general question")
    parser.add_argument("--answer-file", type=Path, required=True, help="Text file containing the reviewed answer")
    parser.add_argument("--reviewer", required=True, help="Internal reviewer name or identifier")
    return parser.parse_args()


def find_product(product_id: str) -> dict[str, Any] | None:
    knowledge = read_json(KNOWLEDGE_PATH, {})
    for entry in knowledge.get("entries", []) if isinstance(knowledge, dict) else []:
        product = entry.get("product") if isinstance(entry, dict) else None
        if isinstance(product, dict) and product.get("id") == product_id:
            return product
    return None


def write_note(entry: dict[str, Any]) -> None:
    APPROVED_DIR.mkdir(parents=True, exist_ok=True)
    product = entry["product"]
    note = "\n".join([
        "---",
        f"knowledge_id: {json.dumps(entry['id'], ensure_ascii=False)}",
        "approval: approved",
        "source: duoke-history-reviewed",
        f"source_ref: {json.dumps(entry['sourceRef'], ensure_ascii=False)}",
        f"reviewed_by: {json.dumps(entry['reviewedBy'], ensure_ascii=False)}",
        f"reviewed_at: {json.dumps(entry['reviewedAt'], ensure_ascii=False)}",
        f"sku: {json.dumps(product.get('sku', ''), ensure_ascii=False)}",
        "---",
        "",
        f"# {entry['title']}",
        "",
        f"Product: [[../../products/{product['slug']}|{product['name']}]]",
        "",
        "## Question",
        "",
        entry["question"],
        "",
        "## Approved answer",
        "",
        entry["answer"],
        "",
    ])
    (APPROVED_DIR / f"{entry['id']}.md").write_text(note, encoding="utf-8")


def main() -> int:
    args = parse_args()
    candidate_data = read_json(CANDIDATES_PATH, {})
    candidates = candidate_data.get("candidates", []) if isinstance(candidate_data, dict) else []
    candidate = next((item for item in candidates if item.get("id") == args.candidate), None)
    if not isinstance(candidate, dict):
        raise SystemExit(f"Candidate {args.candidate!r} was not found. Run duoke:knowledge:build.")
    product = find_product(args.product_id)
    if not product:
        raise SystemExit(f"Product {args.product_id!r} was not found in the active knowledge base.")
    try:
        raw_question = args.question_file.read_text(encoding="utf-8").strip()
        raw_answer = args.answer_file.read_text(encoding="utf-8").strip()
    except OSError as error:
        raise SystemExit(f"The question or answer could not be read: {error}") from error
    question = redact_text(raw_question)
    answer = redact_text(raw_answer)
    if len(question) < 5:
        raise SystemExit("The reviewed general question is too short.")
    if len(answer) < 10:
        raise SystemExit("The reviewed answer is too short.")

    reviewed_at = utc_now()
    entry = {
        "id": candidate["id"],
        "kind": "historical-faq",
        "approval": "approved",
        "title": question[:100],
        "question": question,
        "answer": answer,
        "triggers": [question, *candidate.get("topics", [])],
        "product": product,
        "sourceRef": candidate["sourceRef"],
        "reviewedBy": redact_text(args.reviewer)[:100],
        "reviewedAt": reviewed_at,
    }
    reviewed = read_json(REVIEWED_KNOWLEDGE_PATH, {"schemaVersion": 1, "entries": []})
    entries = [item for item in reviewed.get("entries", []) if item.get("id") != entry["id"]]
    entries.append(entry)
    write_json(REVIEWED_KNOWLEDGE_PATH, {
        "schemaVersion": 1,
        "updatedAt": reviewed_at,
        "entries": sorted(entries, key=lambda item: item["id"]),
    })
    write_note(entry)
    print(f"Candidate {entry['id']} was approved for {product['name']} ({product['sku']}).")
    print("Run duoke:knowledge:export to include this answer in the runtime index.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
