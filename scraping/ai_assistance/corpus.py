#!/usr/bin/env python3
"""Build a private, searchable corpus from the complete archived Duoke vault.

The corpus keeps every readable conversation and product note as a redacted
document.  Only locally paired, non-volatile excerpts are additionally emitted
as knowledge-schema entries.  This module does not publish or activate them.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

from scraping.ai_assistance.import_duoke import (
    ACCOUNT_SPECIFIC,
    BANK_ACCOUNT,
    INLINE_ADDRESS,
    LABELED_USERNAME,
    LONG_NUMERIC_IDENTIFIER,
    NATIONAL_ID,
    OPERATIONAL_PROMISE,
    PLACEHOLDER,
    SYSTEM_EVENT,
    AT_USERNAME,
    DuokeImportError,
    ParsedNote,
    Turn,
    _annotate_conflicts_and_eligibility,
    _safe_turn,
    candidates_from_note,
    parse_note as parse_conversation_note,
)
from scraping.ai_assistance.import_products import (
    _labeled_specification,
)
from scraping.ai_assistance.knowledge import KnowledgeError, validate_entry
from scraping.shared.common import URL_RE, redact_text, stable_hash
from scraping.shared.paths import AI_ASSISTANCE_PRIVATE_DIR


CORPUS_DIR = AI_ASSISTANCE_PRIVATE_DIR / "full-corpus"
MAX_SOURCE_FILES = 2_000
MAX_NOTE_BYTES = 1_000_000
MAX_ENTRIES = 2_000
MAX_PUBLICATION_BYTES = 4 * 1024 * 1024

_FRONTMATTER_SCALAR = re.compile(r"(?m)^([a-zA-Z0-9_]+):\s*(.*?)\s*$")
_HEADING = re.compile(r"(?m)^#\s+(.+?)\s*$")
_SKU_IN_TEXT = re.compile(
    r"(?<![A-Za-z0-9])(?=[A-Za-z0-9./-]{3,30}(?![A-Za-z0-9]))"
    r"(?=[A-Za-z0-9./-]*[A-Za-z])(?=[A-Za-z0-9./-]*\d)[A-Za-z0-9]+(?:[./-][A-Za-z0-9]+)+"
)
_VOLATILE_PRODUCT = re.compile(
    r"(?:\b(?:harga|price|stok|stock|ready|tersedia|habis|sold\s*out|promo|diskon|"
    r"voucher|cashback|checkout|keranjang|gratis\s+ongkir|shipping|pengiriman|"
    r"order|pesanan)\b|\brp\.?\s*\d|\bidr\b)",
    re.IGNORECASE,
)
_ORDER_OR_ACCOUNT = re.compile(
    rf"(?:{ACCOUNT_SPECIFIC.pattern}|\b(?:resi|invoice|tracking|pembayaran\s+(?:saya|anda|kak))\b)",
    re.IGNORECASE,
)
_SYSTEM_OR_AUTOMATION = re.compile(
    r"(?:chat dengan penjual|shop agent|customer service\d+|tim kami akan segera membalas|"
    r"chat has been assigned|chat timed out|"
    r"terima kasih telah menghubungi kami.{0,80}apa yang bisa (?:saya|kami) bantu)",
    re.IGNORECASE,
)
_PASSIVE_OPERATIONAL_PROMISE = re.compile(
    r"\bakan\s+(?:segera\s+)?(?:di\s*proses|diproses)\b",
    re.IGNORECASE,
)
_MARKDOWN_LINK = re.compile(r"!?\[([^\]]*)\]\([^)]*\)|!?\[\[([^\]|]*)(?:\|([^\]]*))?\]\]")
_PLACEHOLDER_DESCRIPTION = re.compile(
    r"^Douke provided an image-only description; its URL references are listed below\.?$",
    re.IGNORECASE,
)
_LEADING_DECORATION = re.compile(r"^\s*[^\w\d]+", re.UNICODE)


class CorpusError(ValueError):
    """The full source corpus or its private output cannot be processed safely."""


def _source_paths(source: Path) -> list[tuple[str, Path]]:
    if not source.is_dir() or source.is_symlink():
        raise CorpusError("The source must be a real Duoke directory")
    root = source.resolve()
    paths: list[tuple[str, Path]] = []
    for kind, directory_name in (("conversation", "Percakapan"), ("product", "Produk")):
        directory = source / directory_name
        if not directory.is_dir() or directory.is_symlink():
            raise CorpusError(f"The source is missing {directory_name}")
        for path in directory.rglob("*.md"):
            relative = path.relative_to(source)
            if any(part.startswith(".") for part in relative.parts):
                continue
            if path.is_symlink() or not path.resolve().is_relative_to(root):
                raise CorpusError("Source symlinks are forbidden")
            paths.append((kind, path))
    paths.sort(key=lambda item: item[1].relative_to(source).as_posix())
    if len(paths) > MAX_SOURCE_FILES:
        raise CorpusError("The source exceeds the 2000-note limit")
    return paths


def source_signature(source: Path) -> str:
    """Hash source paths and bytes so additions, edits, and deletions are visible."""
    digest = hashlib.sha256()
    for _, path in _source_paths(source):
        relative = path.relative_to(source).as_posix()
        try:
            raw = path.read_bytes()
        except OSError as error:
            raise CorpusError(f"Cannot read source note: {relative}") from error
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(hashlib.sha256(raw).digest())
        digest.update(b"\0")
    return digest.hexdigest()


def _frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        return {}, text
    raw, body = text[4:].split("\n---\n", 1)
    values = {
        match.group(1): match.group(2).strip().strip("\"'")
        for match in _FRONTMATTER_SCALAR.finditer(raw)
    }
    return values, body


def _redact(value: str) -> tuple[str, bool]:
    redacted = redact_text(value)
    redacted = NATIONAL_ID.sub("[NATIONAL_ID]", redacted)
    redacted = BANK_ACCOUNT.sub("[BANK_ACCOUNT]", redacted)
    redacted = LONG_NUMERIC_IDENTIFIER.sub("[IDENTIFIER]", redacted)
    redacted = INLINE_ADDRESS.sub("[ADDRESS]", redacted)
    redacted = LABELED_USERNAME.sub("Username: [USERNAME]", redacted)
    redacted = AT_USERNAME.sub("[USERNAME]", redacted)
    return redacted, redacted != value.strip() or bool(PLACEHOLDER.search(redacted))


def _plain_markdown(value: str) -> str:
    value = _MARKDOWN_LINK.sub(lambda match: match.group(1) or match.group(3) or match.group(2) or "", value)
    value = re.sub(r"(?m)^\s{0,3}(?:#{1,6}|[-*+]\s+|>\s?)", "", value)
    value = re.sub(r"(?m)^\s*<!--.*?-->\s*$", "", value)
    value = re.sub(r"[*_`]", "", value)
    return re.sub(r"\n{3,}", "\n\n", value).strip()


def _source_id(metadata: dict[str, str], relative: str, kind: str) -> str:
    key = "conversation_ref" if kind == "conversation" else "product_ref"
    return metadata.get(key) or stable_hash(relative, length=20)


def _conversation_document(path: Path, source: Path) -> tuple[dict[str, Any], ParsedNote | None]:
    relative = path.relative_to(source).as_posix()
    raw = path.read_bytes()
    text = raw.decode("utf-8")
    metadata, body = _frontmatter(text)
    flags: set[str] = set()
    parsed: ParsedNote | None = None
    turns: list[dict[str, Any]] = []
    skus: list[str] = []
    try:
        parsed = parse_conversation_note(path, source / "Percakapan")
        skus = list(parsed.skus)
        if not parsed.history_complete:
            flags.add("incomplete_history")
        if parsed.missing_media:
            flags.add("missing_attachment_context")
        if parsed.product_context_ambiguous:
            flags.add("ambiguous_product_reference")
        for record in parsed.records:
            if not isinstance(record, Turn):
                continue
            item, item_flags = _safe_turn(record, relative)
            flags.update(item_flags)
            if item["text"] and not SYSTEM_EVENT.fullmatch(" ".join(item["text"].split())):
                turns.append({"role": record.role, "text": item["text"], "source": item["source"]})
    except (OSError, DuokeImportError):
        flags.add("unparsed_source_note")

    # Index and legacy notes still receive a searchable, redacted document.
    if turns:
        document_text = "\n\n".join(f"{turn['role'].title()}: {turn['text']}" for turn in turns)
    else:
        clean, changed = _redact(_plain_markdown(body))
        document_text = clean
        if changed:
            flags.add("privacy_redacted")
    names = []
    heading = _HEADING.search(body)
    if heading:
        names.append(heading.group(1).strip())
    return {
        "id": f"source-conversation-{stable_hash(relative, length=20)}",
        "sourceKind": "conversation",
        "sourceId": _source_id(metadata, relative, "conversation"),
        "path": relative,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "names": names,
        "skus": skus,
        "text": document_text,
        "flags": sorted(flags),
        "entryIds": [],
        "retrievalEvidence": {"plainTurnCount": len(turns)},
    }, parsed


def _description_lines(body: str) -> list[str]:
    lines = body.splitlines()
    start = next((index + 1 for index, line in enumerate(lines)
                  if line.strip() == "## Source description"), None)
    if start is None:
        return []
    result: list[str] = []
    for line in lines[start:]:
        if line.startswith("## "):
            break
        if line.startswith(">"):
            result.append(line[1:].lstrip())
    while result and not result[-1].strip():
        result.pop()
    return result


def _metadata_aliases(raw_frontmatter: str) -> list[str]:
    match = re.search(r"(?m)^aliases:\s*(\[.*\])\s*$", raw_frontmatter)
    if not match:
        return []
    try:
        value = json.loads(match.group(1))
    except json.JSONDecodeError:
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _product_document(path: Path, source: Path) -> tuple[dict[str, Any], list[str]]:
    relative = path.relative_to(source).as_posix()
    raw = path.read_bytes()
    text = raw.decode("utf-8")
    metadata, body = _frontmatter(text)
    raw_frontmatter = text[4:].split("\n---\n", 1)[0] if text.startswith("---\n") and "\n---\n" in text else ""
    heading = _HEADING.search(body)
    names = _metadata_aliases(raw_frontmatter)
    if heading and heading.group(1).strip() not in names:
        names.insert(0, heading.group(1).strip())
    sku = metadata.get("sku", "").strip()
    skus = [sku] if sku else []
    flags: set[str] = set()
    description = _description_lines(body)
    if description:
        source_text = "\n".join(description)
    else:
        source_text = _plain_markdown(body)
        flags.add("no_source_description_section")
    document_text, changed = _redact(source_text)
    if changed:
        flags.add("privacy_redacted")
    if _VOLATILE_PRODUCT.search(source_text):
        flags.add("contains_volatile_commercial_content")
    return {
        "id": f"source-product-{stable_hash(relative, length=20)}",
        "sourceKind": "product",
        "sourceId": _source_id(metadata, relative, "product"),
        "path": relative,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "names": names,
        "skus": skus,
        "text": document_text,
        "flags": sorted(flags),
        "entryIds": [],
        "retrievalEvidence": {"descriptionLineCount": len(description)},
    }, description


def _product_duplicate_key(path: Path) -> tuple[str, ...] | None:
    """Only identical captures of an identified listing can be removed as duplicates.

    A SKU or title alone cannot identify a marketplace posting. Different content
    may contain additional facts or variants and is retained rather than lost.
    """
    metadata, body = _frontmatter(path.read_text(encoding="utf-8"))
    platform = metadata.get("platform", "").strip().casefold()
    shop = metadata.get("source_shop_id", "").strip()
    listing = metadata.get("source_product_id", "").strip()
    if not all((platform, shop, listing)):
        return None
    stable_metadata = {key: value for key, value in metadata.items()
                       if key not in {"captured_at", "updated_at", "diperbarui", "product_ref"}}
    content = json.dumps(stable_metadata, sort_keys=True, ensure_ascii=False) + "\n" + body.strip()
    return platform, shop, listing, hashlib.sha256(content.encode()).hexdigest()


def _candidate_entry(candidate: dict[str, Any]) -> tuple[dict[str, Any] | None, list[str]]:
    flags = set(candidate["flags"])
    blocking = {
        "account_specific_response",
        "ambiguous_product_multiple_skus",
        "ambiguous_product_reference",
        "approximate_or_uncertain_reply",
        "conflicting_historical_replies",
        "context_dependent_reply",
        "monetary_or_promotion_claim",
        "non_retrievable_composite_sku",
        "operational_promise",
        "possible_role_misattribution",
        "privacy_redacted",
        "source_contains_link",
        "source_contains_local_or_unsafe_link",
        "stock_or_availability_claim",
    }
    if flags & blocking:
        return None, sorted(flags | {"not_public_answer_compatible"})
    question = "\n".join(turn["text"] for turn in candidate["questionTurns"]).strip()
    answer = "\n".join(turn["text"] for turn in candidate["historicalSellerTurns"]).strip()
    if "[IDENTIFIER]" in question or "[IDENTIFIER]" in answer:
        return None, sorted(flags | {"redacted_identifier_context"})
    if (_ORDER_OR_ACCOUNT.search(question + "\n" + answer)
            or _VOLATILE_PRODUCT.search(question + "\n" + answer)
            or _SYSTEM_OR_AUTOMATION.search(question + "\n" + answer)
            or _PASSIVE_OPERATIONAL_PROMISE.search(answer)):
        return None, sorted(flags | {"not_public_answer_compatible"})
    proposed: dict[str, Any] = {
        "id": f"archive-{candidate['id'].removeprefix('duoke-')}",
        "kind": "answer",
        "language": "id",
        "questions": [question],
        "answer": answer,
    }
    if len(candidate["skus"]) == 1 and len(candidate["skus"][0]) <= 100:
        sku = candidate["skus"][0]
        proposed["sku"] = sku
        if sku.casefold() not in question.casefold():
            # A scoped answer must remain directly retrievable without relying on
            # browser page context. The exact customer wording stays in its source
            # document; the selection alias makes the required product explicit.
            proposed["questions"] = [f"{question} {sku}"]
    try:
        return validate_entry(proposed), sorted(flags)
    except KnowledgeError:
        return None, sorted(flags | {"knowledge_schema_rejected"})


def _safe_product_lines(lines: Iterable[str]) -> tuple[list[str], set[str]]:
    result: list[str] = []
    flags: set[str] = set()
    for line in lines:
        clean = line.rstrip()
        if not clean.strip():
            if result and result[-1] != "":
                result.append("")
            continue
        redacted, changed = _redact(clean)
        if _PLACEHOLDER_DESCRIPTION.fullmatch(clean.strip()):
            flags.add("placeholder_description_excluded")
            continue
        if changed:
            flags.add("privacy_line_excluded")
            continue
        if URL_RE.search(clean):
            flags.add("link_line_excluded")
            continue
        if _VOLATILE_PRODUCT.search(clean) or _ORDER_OR_ACCOUNT.search(clean):
            flags.add("volatile_line_excluded")
            continue
        result.append(redacted)
    while result and not result[-1]:
        result.pop()
    return result, flags


def _corpus_labeled_specification(value: str) -> tuple[str, str] | None:
    """Recognize source labels after emoji/bullet decoration without rewriting text."""
    return _labeled_specification(_LEADING_DECORATION.sub("", value))


def _normalized_fact_value(value: str) -> str:
    """Compare formatting-equivalent measurements while retaining source wording."""
    normalized = unicodedata.normalize("NFKC", value).casefold()
    normalized = re.sub(r"(?<=\d),(?=\d)", ".", normalized)
    units = {
        "watts": "w", "watt": "w",
        "volts": "v", "volt": "v",
        "litres": "l", "litre": "l", "liters": "l", "liter": "l", "ltr": "l",
        "kilograms": "kg", "kilogram": "kg",
        "grams": "g", "gram": "g",
        "centimeters": "cm", "centimeter": "cm",
        "millimeters": "mm", "millimeter": "mm",
        "meters": "m", "meter": "m",
    }
    for source, target in units.items():
        normalized = re.sub(rf"(?<=\d)\s*{source}\b", target, normalized)
    normalized = re.sub(r"(?<=\d)\s+(?=(?:w|v|l|kg|g|cm|mm|m)\b)", "", normalized)
    return re.sub(r"\s+", " ", normalized).strip(" .")


def _sku_pattern(value: str) -> re.Pattern[str] | None:
    parts = re.findall(r"[a-z]+|\d+", value.casefold())
    if not parts:
        return None
    return re.compile(r"(?<![a-z0-9])" + r"[\s._/+\-]*".join(map(re.escape, parts))
                      + r"(?![a-z0-9])", re.IGNORECASE)


def _has_foreign_model(alias: str, own_key: str,
                       patterns: list[tuple[str, re.Pattern[str]]]) -> bool:
    matches: list[tuple[int, int, str]] = []
    for group_key, pattern in patterns:
        matches.extend((match.start(), match.end(), group_key) for match in pattern.finditer(alias))
    maximal = [
        current for current in matches
        if not any(
            other[0] <= current[0] and other[1] >= current[1]
            and (other[1] - other[0]) > (current[1] - current[0])
            for other in matches
        )
    ]
    return any(group_key != own_key for _, _, group_key in maximal)


def _without_foreign_models(alias: str, own_key: str,
                            patterns: list[tuple[str, re.Pattern[str]]]) -> str:
    matches: list[tuple[int, int, str]] = []
    for group_key, pattern in patterns:
        matches.extend((match.start(), match.end(), group_key) for match in pattern.finditer(alias))
    maximal = [
        current for current in matches
        if not any(
            other[0] <= current[0] and other[1] >= current[1]
            and (other[1] - other[0]) > (current[1] - current[0])
            for other in matches
        )
    ]
    result = alias
    for start, end, group_key in sorted(maximal, reverse=True):
        if group_key != own_key:
            result = result[:start] + " " + result[end:]
    return re.sub(r"\s+", " ", result).strip(" -+/,.;:")


def _product_questions(sku: str, names: list[str], lines: list[str], *, primary: bool,
                       chunk_index: int = 0) -> list[str]:
    values: list[str] = []
    aliases: list[str] = list(names)
    if primary and sku:
        aliases = [sku, f"Spesifikasi {sku}", f"Apa spesifikasi {sku}?", *aliases]
    for line in lines:
        labeled = _corpus_labeled_specification(line)
        if not labeled or not sku:
            continue
        key, _ = labeled
        interrogative = "Berapa" if key in {
            "kapasitas", "dimensi", "ukuran", "panjang", "daya", "daya listrik",
            "daya api", "daya pemanasan", "tegangan", "voltase", "berat",
            "berat produk", "berat unit", "jumlah", "jumlah tungku", "diameter",
            "kelistrikan",
        } else "Apa"
        aliases.append(f"{interrogative} {key} {sku}?")
    if chunk_index and names:
        aliases.append(f"Informasi {names[0]} bagian {chunk_index + 1}")
    for value in aliases:
        clean = re.sub(r"\s+", " ", value).strip()
        if clean and len(clean) <= 500 and clean not in values:
            values.append(clean)
        if len(values) == 50:
            break
    return values


def _answer_chunks(lines: list[str]) -> list[list[str]]:
    """Split only at source line boundaries; no source line is paraphrased or lost."""
    chunks: list[list[str]] = []
    active: list[str] = []
    for line in lines:
        if len(line) > 12_000:
            # Such a line cannot fit the public schema intact. It remains searchable
            # in the document and is explicitly visible in candidate evidence.
            continue
        proposed = "\n".join((*active, line)).strip()
        if active and len(proposed) > 12_000:
            chunks.append(active)
            active = [line]
        else:
            active.append(line)
    if any(line.strip() for line in active):
        chunks.append(active)
    return chunks


def _product_entries(documents: list[dict[str, Any]], descriptions: dict[str, list[str]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], int, int]:
    sku_patterns: list[tuple[str, re.Pattern[str]]] = []
    for document in documents:
        if document["sourceKind"] != "product":
            continue
        for sku in document["skus"]:
            group_key = re.sub(r"[^a-z0-9]+", "", sku.casefold())
            pattern = _sku_pattern(sku)
            if group_key and pattern:
                sku_patterns.append((group_key, pattern))
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for document in documents:
        if document["sourceKind"] != "product" or not descriptions.get(document["id"]):
            continue
        sku = document["skus"][0] if document["skus"] else ""
        # Marketplace exports vary punctuation for the same exact model
        # (`GRS 925F` / `GRS-925F`). Removing separators groups only equivalent
        # complete codes; true prefix variants retain their additional parts.
        key = re.sub(r"[^a-z0-9]+", "", sku.casefold()) or f"ref:{document['sourceId']}"
        groups[key].append(document)

    entries: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    conflict_count = 0
    for key, group in sorted(groups.items()):
        sku_counts = Counter(
            document["skus"][0] for document in group if document["skus"]
        )
        sku_aliases = sorted(sku_counts, key=lambda value: value.casefold())
        canonical_sku = min(
            sku_aliases,
            key=lambda value: (-sku_counts[value], -value.count("-"), value.casefold()),
        ) if sku_aliases else ""
        attributes: dict[str, set[str]] = defaultdict(set)
        by_document: dict[str, tuple[list[str], set[str]]] = {}
        for document in group:
            safe_lines, line_flags = _safe_product_lines(descriptions[document["id"]])
            by_document[document["id"]] = (safe_lines, line_flags)
            for line in safe_lines:
                labeled = _corpus_labeled_specification(line)
                if labeled:
                    attributes[labeled[0]].add(_normalized_fact_value(labeled[1]))
        conflicts = sorted(name for name, values in attributes.items() if len(values) > 1)
        if conflicts:
            conflict_count += 1
            for document in group:
                document["flags"] = sorted(set(document["flags"]) | {"conflicting_product_facts"})

        name_counts = Counter(name for document in group for name in document["names"])

        # Preserve every distinct safe source description. Exact duplicates map to
        # one entry, while complementary descriptions remain independently
        # retrievable with their own source-specific names.
        distinct: dict[str, dict[str, Any]] = {}
        for document in group:
            safe_lines, line_flags = by_document[document["id"]]
            answer_lines = [line for line in safe_lines
                            if not (_corpus_labeled_specification(line)
                                    and _corpus_labeled_specification(line)[0] in conflicts)]
            answer_key = "\n".join(answer_lines).strip()
            if not answer_key:
                evidence.append({
                    "entryId": None,
                    "sourceDocumentIds": [document["id"]],
                    "sourceKind": "product",
                    "flags": sorted(line_flags | {"no_public_compatible_product_text"}
                                    | ({"conflicting_product_facts"} if conflicts else set())),
                    "conflictingAttributes": conflicts,
                    "removedConflictingAttributes": [],
                })
                continue
            item = distinct.setdefault(answer_key, {
                "lines": answer_lines,
                "documents": [],
                "flags": set(),
            })
            item["documents"].append(document)
            item["flags"].update(line_flags)

        for passage_index, (answer_key, passage) in enumerate(sorted(distinct.items())):
            passage_documents = passage["documents"]
            sku = canonical_sku
            raw_names = list(dict.fromkeys(
                name for document in passage_documents for name in document["names"]
                if name_counts[name] == 1 or passage_index == 0
            ))
            names = []
            for name in raw_names:
                if _has_foreign_model(name, key, sku_patterns):
                    passage["flags"].add("foreign_sku_alias_excluded")
                else:
                    names.append(name)
            if passage_index == 0:
                names = list(dict.fromkeys((*sku_aliases, *names)))
            if passage_index:
                generic = {
                    sku.casefold(),
                    f"spesifikasi {sku}".casefold(),
                    f"apa spesifikasi {sku}?".casefold(),
                }
                names = [name for name in names if name.casefold() not in generic]
            if not names and passage["lines"]:
                fallback = _without_foreign_models(passage["lines"][0], key, sku_patterns)
                fallback = re.sub(r"\s+", " ", fallback).strip()
                if fallback:
                    generated = f"{sku} {fallback}".strip()[:500]
                    if not _has_foreign_model(generated, key, sku_patterns):
                        names.append(generated)
                        passage["flags"].add("source_excerpt_alias_generated")
            chunks = _answer_chunks(passage["lines"])
            if sum(len(chunk) for chunk in chunks) < len(passage["lines"]):
                passage["flags"].add("oversized_source_line_document_only")
            if not chunks:
                flags = set(passage["flags"]) | {"no_public_compatible_product_text"}
                if conflicts:
                    flags.add("conflicting_product_facts")
                evidence.append({
                    "entryId": None,
                    "sourceDocumentIds": [document["id"] for document in passage_documents],
                    "sourceKind": "product",
                    "flags": sorted(flags),
                    "conflictingAttributes": conflicts,
                    "removedConflictingAttributes": [],
                })
            for chunk_index, chunk in enumerate(chunks):
                entry_id = f"source-{stable_hash(key, answer_key, chunk_index, length=24)}"
                questions = _product_questions(
                    sku,
                    names,
                    chunk,
                    primary=passage_index == 0 and chunk_index == 0,
                    chunk_index=chunk_index,
                )
                entry: dict[str, Any] | None = None
                if questions:
                    proposed: dict[str, Any] = {
                        "id": entry_id,
                        "kind": "answer",
                        "language": "id",
                        "questions": questions,
                        "answer": "\n".join(chunk).strip(),
                    }
                    if sku:
                        proposed["sku"] = sku
                    try:
                        entry = validate_entry(proposed)
                    except KnowledgeError:
                        passage["flags"].add("knowledge_schema_rejected")
                else:
                    passage["flags"].add("no_safe_product_alias")
                if entry:
                    entries.append(entry)
                    for document in passage_documents:
                        document["entryIds"].append(entry_id)
                flags = set(passage["flags"])
                if conflicts:
                    flags.add("conflicting_product_facts_removed")
                if len(distinct) > 1:
                    flags.add("multiple_distinct_product_descriptions")
                if len(chunks) > 1:
                    flags.add("source_description_chunked")
                evidence.append({
                    "entryId": entry_id if entry else None,
                    "sourceDocumentIds": [document["id"] for document in passage_documents],
                    "sourceKind": "product",
                    "flags": sorted(flags),
                    "conflictingAttributes": conflicts,
                    "removedConflictingAttributes": conflicts,
                })
    return entries, evidence, conflict_count, len(groups)


def build_corpus(source: Path) -> dict[str, Any]:
    paths = _source_paths(source)
    initial_signature = source_signature(source)
    documents: list[dict[str, Any]] = []
    parsed_conversations: list[tuple[dict[str, Any], ParsedNote]] = []
    descriptions: dict[str, list[str]] = {}
    excluded: Counter[str] = Counter()
    kind_counts: Counter[str] = Counter()
    product_copies: dict[tuple[str, ...], str] = {}
    duplicate_products: list[dict[str, str]] = []

    for kind, path in paths:
        relative = path.relative_to(source).as_posix()
        try:
            if path.stat().st_size > MAX_NOTE_BYTES:
                raise CorpusError("note exceeds size limit")
            if kind == "conversation":
                document, parsed = _conversation_document(path, source)
                if parsed is not None:
                    parsed_conversations.append((document, parsed))
            else:
                duplicate_key = _product_duplicate_key(path)
                if duplicate_key is not None and duplicate_key in product_copies:
                    excluded["product:duplicate_listing_copy"] += 1
                    duplicate_products.append({"path": relative, "keptPath": product_copies[duplicate_key]})
                    continue
                document, description = _product_document(path, source)
                descriptions[document["id"]] = description
                if duplicate_key is not None:
                    product_copies[duplicate_key] = relative
            documents.append(document)
            kind_counts[kind] += 1
        except (OSError, UnicodeDecodeError, CorpusError) as error:
            excluded[f"{kind}:{type(error).__name__}"] += 1
            excluded[f"path:{relative}"] += 1

    conversation_candidates: list[dict[str, Any]] = []
    candidate_documents: dict[str, str] = {}
    candidate_excluded: Counter[str] = Counter()
    for document, parsed in parsed_conversations:
        candidates, local_excluded = candidates_from_note(parsed)
        candidate_excluded.update(local_excluded)
        for candidate in candidates:
            conversation_candidates.append(candidate)
            candidate_documents[candidate["id"]] = document["id"]
    _annotate_conflicts_and_eligibility(conversation_candidates)

    entries: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    seen_pairs: dict[tuple[str, str, tuple[str, ...]], str] = {}
    duplicate_pairs = 0
    document_by_id = {document["id"]: document for document in documents}
    for candidate in conversation_candidates:
        entry, flags = _candidate_entry(candidate)
        document_id = candidate_documents[candidate["id"]]
        if entry:
            key = (
                " ".join(entry["questions"][0].casefold().split()),
                " ".join(entry["answer"].casefold().split()),
                tuple(candidate["skus"]),
            )
            existing = seen_pairs.get(key)
            if existing:
                duplicate_pairs += 1
                document_by_id[document_id]["entryIds"].append(existing)
                evidence.append({
                    "entryId": existing,
                    "sourceDocumentIds": [document_id],
                    "sourceKind": "conversation",
                    "flags": sorted(set(flags) | {"duplicate_exact_pair"}),
                })
                continue
            seen_pairs[key] = entry["id"]
            entries.append(entry)
            document_by_id[document_id]["entryIds"].append(entry["id"])
        evidence.append({
            "entryId": entry["id"] if entry else None,
            "sourceDocumentIds": [document_id],
            "sourceKind": "conversation",
            "flags": flags,
        })

    product_entries, product_evidence, product_conflicts, product_groups = _product_entries(
        documents, descriptions
    )
    entries.extend(product_entries)
    evidence.extend(product_evidence)
    entries.sort(key=lambda item: item["id"])
    documents.sort(key=lambda item: item["path"])
    evidence.sort(key=lambda item: (item["sourceKind"], item["sourceDocumentIds"], item.get("entryId") or ""))
    if len(entries) > MAX_ENTRIES:
        raise CorpusError("Public-compatible entry count exceeds 2000")
    if len({entry["id"] for entry in entries}) != len(entries):
        raise CorpusError("Generated entry IDs are not unique")
    publication_bytes = len(json.dumps(entries, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    if publication_bytes > MAX_PUBLICATION_BYTES:
        raise CorpusError("Public-compatible entries exceed the 4 MiB transport limit")
    if source_signature(source) != initial_signature:
        raise CorpusError("Source changed while the corpus was being built")

    report: dict[str, Any] = {
        "schemaVersion": 1,
        "sourceFingerprint": initial_signature,
        "sourceFiles": len(paths),
        "includedDocuments": len(documents),
        "excludedSourceFiles": sum(value for key, value in excluded.items() if key.startswith(("conversation:", "product:"))),
        "sourceKindCounts": dict(sorted(kind_counts.items())),
        "documentWithTextCount": sum(bool(item["text"]) for item in documents),
        "documentWithoutTextCount": sum(not item["text"] for item in documents),
        "conversationCandidateCount": len(conversation_candidates),
        "productCandidateGroupCount": product_groups,
        "productCandidateEvidenceCount": len(product_evidence),
        "entryCount": len(entries),
        "conversationEntryCount": sum(entry["id"].startswith("archive-") for entry in entries),
        "productEntryCount": sum(entry["id"].startswith("source-") for entry in entries),
        "deduplicatedConversationPairs": duplicate_pairs,
        "deduplicatedProductDocuments": len(duplicate_products),
        "duplicateProductDocuments": duplicate_products,
        "conflictingConversationCandidates": sum(
            "conflicting_historical_replies" in candidate["flags"]
            for candidate in conversation_candidates
        ),
        "conflictingProductGroups": product_conflicts,
        "candidateExcludedCounts": dict(sorted(candidate_excluded.items())),
        "sourceExclusionManifest": dict(sorted(excluded.items())),
        "publicationBytes": publication_bytes,
        "publicationPerformed": False,
    }
    return {"documents": documents, "entries": entries, "candidateEvidence": evidence, "report": report}


def _assert_private_destination(output: Path, private_root: Path) -> None:
    root = private_root.resolve(strict=False)
    destination = output.resolve(strict=False)
    if destination == root or not destination.is_relative_to(root):
        raise CorpusError("Corpus output must stay below the private directory")
    current = private_root
    for part in output.relative_to(private_root).parts:
        current = current / part
        if current.exists() and current.is_symlink():
            raise CorpusError("Private output symlinks are forbidden")


def _private_write(path: Path, text: str) -> None:
    temporary = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(temporary, flags, 0o600)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    temporary.replace(path)
    path.chmod(0o600)


def _entry_markdown(entry: dict[str, Any]) -> str:
    metadata = {key: entry[key] for key in ("id", "kind", "language", "questions")}
    if "sku" in entry:
        metadata["sku"] = entry["sku"]
    return f"---\n{json.dumps(metadata, ensure_ascii=False, indent=2)}\n---\n{entry['answer']}"


def write_corpus(corpus: dict[str, Any], output: Path = CORPUS_DIR,
                 private_root: Path = AI_ASSISTANCE_PRIVATE_DIR) -> None:
    _assert_private_destination(output, private_root)
    private_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    staged = output / "staged"
    staged.mkdir(exist_ok=True, mode=0o700)
    expected = {f"{entry['id']}.md": _entry_markdown(entry) for entry in corpus["entries"]}
    for filename, text in expected.items():
        _private_write(staged / filename, text)
    for stale in staged.glob("*.md"):
        if stale.name not in expected:
            if stale.is_symlink():
                raise CorpusError("Private output symlinks are forbidden")
            stale.unlink()
    payload = json.dumps(corpus, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    _private_write(output / "corpus.json", payload)
    _private_write(output / "report.json", json.dumps(
        corpus["report"], ensure_ascii=False, indent=2, sort_keys=True
    ) + "\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the private full Duoke AI corpus")
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    try:
        corpus = build_corpus(args.source)
        if args.write:
            write_corpus(corpus)
        print(json.dumps(corpus["report"], ensure_ascii=False, sort_keys=True))
        return 0
    except (OSError, CorpusError) as error:
        parser.exit(2, f"error: {error}\n")


if __name__ == "__main__":
    raise SystemExit(main())
