#!/usr/bin/env python3
"""Normalize private Duoke chat captures into anonymized review candidates."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from scraping.shared.common import read_json, redact_text, stable_hash, utc_now, write_json
from scraping.shared.paths import CHAT_CAPTURE_DIR, KNOWLEDGE_PATH, PRIVATE_DIR, REVIEW_DIR


CANDIDATES_PATH = PRIVATE_DIR / "knowledge-candidates.json"

TEXT_KEYS = (
    "text", "content", "message", "msgcontent", "messagetext", "body", "description",
)
ROLE_KEYS = (
    "role", "sendertype", "fromtype", "direction", "messagedirection", "msgdirection",
    "identity", "usertype", "sourcetype",
)
SELF_KEYS = ("isself", "fromme", "sendbyself", "issent", "outgoing")
MESSAGE_ID_KEYS = ("messageid", "msgid", "clientmsgid", "uuid", "id")
CONVERSATION_ID_KEYS = (
    "conversationid", "sessionid", "chatid", "dialogid", "contactid", "threadid",
)
TIMESTAMP_KEYS = (
    "timestamp", "messagetime", "msgtime", "sendtime", "createdat", "createtime", "time",
)
SKU_KEYS = ("sku", "skucode", "merchantsku", "sellersku", "productsku", "goodssku")
PRODUCT_KEYS = ("productname", "goodsname", "itemname", "producttitle", "goodstitle")

ADMIN_ROLES = {"admin", "agent", "operator", "seller", "service", "staff", "cs", "outgoing", "sent"}
CUSTOMER_ROLES = {"customer", "buyer", "consumer", "guest", "contact", "incoming", "received"}

ISSUE_PATTERNS = {
    "product-will-not-turn-on": re.compile(r"(?:tidak|tak|ga|gak|nggak)\s+(?:mau\s+)?(?:menyala|nyala|hidup)|\bmati\b", re.I),
    "flame-adjustment": re.compile(r"\b(?:api|adjuster|pengatur)\b.*\b(?:kecil|besar|atur|putar)\b|\badjuster\b", re.I),
    "regulator-will-not-lock": re.compile(r"\bregulator\b.*(?:kunci|ngunci|terkunci|longgar)|(?:tidak|ga|gak|nggak)\s+(?:bisa\s+)?(?:ngunci|mengunci)", re.I),
}


@dataclass(frozen=True)
class Message:
    conversation_ref: str
    message_ref: str
    role: str
    text: str
    timestamp: str
    sku: str
    product_name: str


def normalized_key(value: object) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def mapped(record: dict[str, Any]) -> dict[str, Any]:
    return {normalized_key(key): value for key, value in record.items()}


def first(record: dict[str, Any], keys: Iterable[str]) -> Any:
    values = mapped(record)
    for key in keys:
        if key in values and values[key] not in (None, ""):
            return values[key]
    return None


def scalar_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, dict):
        nested = first(value, ("text", "content", "value", "title"))
        return scalar_text(nested)
    return ""


def normalize_timestamp(value: Any) -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        seconds = float(value)
        if seconds > 10_000_000_000:
            seconds /= 1000
        try:
            return datetime.fromtimestamp(seconds, tz=timezone.utc).isoformat().replace("+00:00", "Z")
        except (OverflowError, OSError, ValueError):
            return ""
    if isinstance(value, str):
        return value.strip()[:80]
    return ""


def classify_role(record: dict[str, Any]) -> str | None:
    values = mapped(record)
    for key in SELF_KEYS:
        value = values.get(key)
        if isinstance(value, bool):
            return "admin" if value else "customer"
        if value in (0, 1, "0", "1"):
            return "admin" if str(value) == "1" else "customer"

    raw = scalar_text(first(record, ROLE_KEYS)).lower()
    tokens = set(re.findall(r"[a-z]+", raw))
    if tokens & ADMIN_ROLES:
        return "admin"
    if tokens & CUSTOMER_ROLES:
        return "customer"
    return None


def looks_like_message(record: dict[str, Any]) -> bool:
    return bool(scalar_text(first(record, TEXT_KEYS))) and classify_role(record) is not None


def walk_message_records(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        if looks_like_message(value):
            yield value
            return
        for child in value.values():
            yield from walk_message_records(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_message_records(child)


def known_products() -> list[dict[str, Any]]:
    knowledge = read_json(KNOWLEDGE_PATH, {})
    products: dict[str, dict[str, Any]] = {}
    for entry in knowledge.get("entries", []) if isinstance(knowledge, dict) else []:
        product = entry.get("product") if isinstance(entry, dict) else None
        if not isinstance(product, dict) or not product.get("id"):
            continue
        products[str(product["id"])] = product
    return list(products.values())


def detect_product(
    text: str,
    source_sku: str,
    source_name: str,
    products: list[dict[str, Any]],
) -> tuple[list[str], list[str], list[dict[str, str]]]:
    haystack = f"{text} {source_sku} {source_name}".casefold()
    product_ids: list[str] = []
    skus: list[str] = []
    product_refs: list[dict[str, str]] = []
    for product in products:
        aliases = [product.get("sku", ""), product.get("name", ""), *(product.get("variationSkus") or [])]
        matching = [str(alias) for alias in aliases if alias and str(alias).casefold() in haystack]
        if matching:
            product_ids.append(str(product["id"]))
            product_refs.append({
                "id": str(product["id"]),
                "slug": str(product.get("slug", "")),
                "name": str(product.get("name", "")),
                "sku": str(product.get("sku", "")),
            })
            skus.extend(alias for alias in matching if alias.casefold() != str(product.get("name", "")).casefold())
    if source_sku and source_sku not in skus:
        skus.append(source_sku)
    unique_refs = {item["id"]: item for item in product_refs}
    return sorted(set(product_ids)), sorted(set(skus)), [unique_refs[key] for key in sorted(unique_refs)]


def normalize_capture(path: Path, products: list[dict[str, Any]]) -> list[Message]:
    wrapper = read_json(path, {})
    if not isinstance(wrapper, dict):
        return []
    payload = wrapper.get("payload")
    fallback_conversation = stable_hash(wrapper.get("sourceUrl", ""), path.parent.name)
    result: list[Message] = []
    for record in walk_message_records(payload):
        role = classify_role(record)
        raw_text = scalar_text(first(record, TEXT_KEYS))
        text = redact_text(raw_text)
        if not role or not text:
            continue
        raw_conversation = scalar_text(first(record, CONVERSATION_ID_KEYS)) or fallback_conversation
        raw_message = scalar_text(first(record, MESSAGE_ID_KEYS))
        timestamp = normalize_timestamp(first(record, TIMESTAMP_KEYS))
        sku = scalar_text(first(record, SKU_KEYS))
        product_name = scalar_text(first(record, PRODUCT_KEYS))
        message_ref = stable_hash(raw_message or raw_text, raw_conversation, timestamp)
        result.append(Message(
            conversation_ref=stable_hash(raw_conversation),
            message_ref=message_ref,
            role=role,
            text=text[:5000],
            timestamp=timestamp,
            sku=sku[:120],
            product_name=redact_text(product_name)[:200],
        ))
    return result


def message_sort_key(message: Message) -> tuple[str, str]:
    return (message.timestamp or "9999", message.message_ref)


def detect_topics(text: str) -> list[str]:
    return [topic for topic, pattern in ISSUE_PATTERNS.items() if pattern.search(text)]


def make_candidates(messages: list[Message], products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    conversations: dict[str, dict[str, Message]] = {}
    for message in messages:
        conversations.setdefault(message.conversation_ref, {})[message.message_ref] = message

    candidates: list[dict[str, Any]] = []
    for conversation_ref, unique_messages in conversations.items():
        ordered = sorted(unique_messages.values(), key=message_sort_key)
        runs: list[tuple[str, list[Message]]] = []
        for message in ordered:
            if not runs or runs[-1][0] != message.role:
                runs.append((message.role, [message]))
            else:
                runs[-1][1].append(message)
        for index in range(len(runs) - 1):
            customer_role, customer_messages = runs[index]
            admin_role, admin_messages = runs[index + 1]
            if customer_role != "customer" or admin_role != "admin":
                continue
            question = "\n".join(item.text for item in customer_messages).strip()
            answer = "\n".join(item.text for item in admin_messages).strip()
            if not question or not answer:
                continue
            source_refs = [item.message_ref for item in (*customer_messages, *admin_messages)]
            source_sku = next((item.sku for item in (*customer_messages, *admin_messages) if item.sku), "")
            source_name = next((item.product_name for item in (*customer_messages, *admin_messages) if item.product_name), "")
            product_ids, skus, product_refs = detect_product(question, source_sku, source_name, products)
            candidate_id = f"history-{stable_hash(conversation_ref, *source_refs, length=16)}"
            flags = ["historical_reply_requires_review", "outcome_not_verified"]
            if not product_ids:
                flags.append("product_not_identified")
            candidates.append({
                "id": candidate_id,
                "approval": "pending",
                "question": question,
                "historicalAnswer": answer,
                "suggestedAnswer": answer,
                "productIds": product_ids,
                "products": product_refs,
                "skus": skus,
                "topics": detect_topics(f"{question}\n{answer}"),
                "sourceRef": stable_hash(conversation_ref, *source_refs),
                "sourceMessageCount": len(source_refs),
                "firstMessageAt": customer_messages[0].timestamp,
                "flags": flags,
            })
    return sorted(candidates, key=lambda item: (item["firstMessageAt"] or "", item["id"]))


def yaml_value(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_review_notes(candidates: list[dict[str, Any]]) -> None:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    for old in REVIEW_DIR.glob("history-*.md"):
        old.unlink()
    index_lines = [
        "# Kandidat pengetahuan dari riwayat Duoke",
        "",
        "Catatan ini telah dianonimkan, tetapi belum boleh digunakan untuk balasan otomatis.",
        "Jawaban dalam riwayat memerlukan tinjauan karena balasan lama tidak membuktikan masalah pelanggan telah selesai.",
        "",
    ]
    for candidate in candidates:
        filename = f"{candidate['id']}.md"
        product_links = "\n".join(
            f"- [[../../products/{product['slug']}|{product['name']} · {product['sku']}]]"
            for product in candidate.get("products", [])
        ) or "- Belum teridentifikasi"
        topics = ", ".join(candidate["topics"]) or "unclassified"
        note = "\n".join([
            "---",
            f"candidate_id: {yaml_value(candidate['id'])}",
            "approval: pending",
            f"source_ref: {yaml_value(candidate['sourceRef'])}",
            f"topics: {yaml_value(candidate['topics'])}",
            f"skus: {yaml_value(candidate['skus'])}",
            f"flags: {yaml_value(candidate['flags'])}",
            "---",
            "",
            f"# Kandidat {candidate['id']}",
            "",
            "## Pertanyaan pelanggan",
            "",
            candidate["question"],
            "",
            "## Balasan dukungan sebelumnya",
            "",
            candidate["historicalAnswer"],
            "",
            "## Jawaban yang diusulkan",
            "",
            candidate["suggestedAnswer"],
            "",
            "## Hubungan produk",
            "",
            product_links,
            "",
            f"Topik: {topics}",
            "",
            "Status penyelesaian: **belum diverifikasi**.",
            "",
        ])
        (REVIEW_DIR / filename).write_text(note, encoding="utf-8")
        index_lines.append(f"- [[{candidate['id']}|{candidate['id']}]] · {topics}")
    (REVIEW_DIR / "Inbox.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build knowledge-base candidates from private Duoke captures.")
    parser.add_argument("--capture-dir", type=Path, default=CHAT_CAPTURE_DIR)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    products = known_products()
    paths = sorted(path for path in args.capture_dir.glob("**/chat-*.json") if path.is_file())
    messages: list[Message] = []
    for path in paths:
        messages.extend(normalize_capture(path, products))
    candidates = make_candidates(messages, products)
    write_json(CANDIDATES_PATH, {
        "schemaVersion": 1,
        "generatedAt": utc_now(),
        "captureFiles": len(paths),
        "normalizedMessages": len({message.message_ref for message in messages}),
        "candidates": candidates,
    })
    write_review_notes(candidates)
    print(f"Identified messages: {len({message.message_ref for message in messages})}")
    print(f"Candidates to review: {len(candidates)}")
    print(f"Inbox Obsidian: {REVIEW_DIR / 'Inbox.md'}")
    print("No candidates were approved or activated automatically.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
