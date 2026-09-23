#!/usr/bin/env python3
"""Create private, unapproved AI-assistance review drafts from Duoke notes.

This importer deliberately has no publication path. Its only writable destination is
the private review directory, and its default CLI mode is a count-only preview.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from scraping.ai_assistance.knowledge import public_https_url
from scraping.shared.common import URL_RE, redact_text, stable_hash
from scraping.shared.paths import AI_ASSISTANCE_PRIVATE_DIR


REVIEW_DIR = AI_ASSISTANCE_PRIVATE_DIR / "duoke-review"
ROLE_LINE = re.compile(r"^- \*\*(Customer|Seller)\*\* · ([^—\n]+?) —(.*)$")
ARCHIVE_ROLE_LINE = re.compile(r"^###\s+(.+?)\s+—\s+(Customer|Seller|Pelanggan|Penjual)\s*$")
ARCHIVE_SKU = re.compile(r'"skuValue"\s*:\s*"([^"\n]+)"')
ARCHIVE_CARD_SKU = re.compile(r"(?m)^SKU kartu produk:\s*(.+?)\s*$")
PLACEHOLDER = re.compile(
    r"\[(?:EMAIL|PHONE|ORDER_NUMBER|NAME|ADDRESS|LINK|NATIONAL_ID|BANK_ACCOUNT|USERNAME)\]"
)
NATIONAL_ID = re.compile(r"(?<!\d)\d{16}(?!\d)")
BANK_ACCOUNT = re.compile(
    r"(?i)\b(?:rekening|rek(?:ening)?\.?|bca|bri|bni|mandiri|cimb|permata)\s*[:#.-]?\s*\d{8,16}\b"
)
LONG_NUMERIC_IDENTIFIER = re.compile(r"(?<![\w])\d{8,15}(?![\w])")
INLINE_ADDRESS = re.compile(
    r"(?i)\b(?:jalan|jl\.?|gang|gg\.?|komplek|perumahan)\s+[a-z0-9][a-z0-9 .,/()#-]{2,100}"
)
LABELED_USERNAME = re.compile(r"(?i)\b(?:username|user\s*id|akun)\s*[:=-]\s*@?[a-z0-9_.-]{3,40}")
AT_USERNAME = re.compile(r"(?<![\w@])@[a-z0-9_][a-z0-9_.-]{2,39}\b", re.IGNORECASE)
TRIVIAL_REPLY = re.compile(
    r"^(?:(?:ya|iya|ok(?:e|ay)?|siap|baik|bisa|tidak|nggak|gak|ga|"
    r"belum|terima kasih|makasih|sama-sama|halo|hai|hi|thanks|thank you|yes|no)"
    r"[\s,.!?:-]*){1,4}$",
    re.IGNORECASE,
)
BOILERPLATE_REPLY = re.compile(
    r"(?:mohon\s+ditunggu|harap\s+ditunggu|"
    r"pesan\s+(?:kak(?:ak)?\s+)?sudah\s+kami\s+terima|"
    r"tim\s+kami\s+akan\s+segera\s+membalas|"
    r"jika\s+ada\s+kendala\s+bisa\s+di\s*diskusikan)",
    re.IGNORECASE,
)
ROLE_MISATTRIBUTION = re.compile(
    r"(?:terima\s+kasih\s+sudah\s+menghubungi\s+kami|"
    r"ada\s+yang\s+bisa\s+kami\s+bantu|kami\s+(?:siap|akan)\s+membantu)",
    re.IGNORECASE,
)
CARD_MARKERS = re.compile(
    r"(?:^|\n)\s*(?:\[?(?:product|order|image|photo|video|file|sticker|media)\]?|"
    r"(?:product|order)\s*(?:card|details?)|kartu\s+produk|detail\s+pesanan)\s*(?::|$)|"
    r"(?:^|\n)\s*kirim\s+(?:produk|order|foto|video|gambar|stiker|image|photo|sticker|file|audio)\b",
    re.IGNORECASE,
)
MARKDOWN_EMBED = re.compile(r"!\[\[|!\[[^\]]*\]\(|<img\b", re.IGNORECASE)
STRUCTURED_CARD_FIELD = re.compile(
    r"(?im)^\s*(?:sku|product|produk|price|harga|quantity|jumlah|order(?:\s+(?:id|number))?|"
    r"nomor\s+pesanan|status)\s*:\s*\S+"
)
ACCOUNT_SPECIFIC = re.compile(
    r"\b(?:nomor\s+pesanan|status\s+pesanan|pesanan\s+(?:kak(?:ak)?|anda)|resi|"
    r"paket(?:nya|\s+kak(?:ak)?)|bukti\s+pembelian|order\s*(?:id|number)?)\b",
    re.IGNORECASE,
)
MONETARY_OR_PROMOTION = re.compile(
    r"(?:\b(?:rp\.?\s*\d|idr\b|harga|biaya|refund|promo|voucher|diskon|cashback)\b|%)",
    re.IGNORECASE,
)
STOCK_OR_AVAILABILITY = re.compile(
    r"\b(?:ready|stok|stock|sold\s*out|tersedia|kehabisan|habis)\b", re.IGNORECASE
)
OPERATIONAL_PROMISE = re.compile(
    r"\b(?:kami\s+pastikan|akan\s+(?:kami\s+)?(?:proses|kirim|hubungi|bantu)|"
    r"segera\s+(?:diproses|dikirim|ditangani)|diproses\s+\d|\d+\s*-\s*\d+\s+hari\s+kerja|"
    r"(?:sudah\s+)?alih(?:kan)?\s+chat|dialihkan\s+ke\s+(?:agen|penjual))\b",
    re.IGNORECASE,
)
SYSTEM_EVENT = re.compile(
    r"^(?:the chat has been assigned to .+|the chat timed out due to customer inactivity|"
    r".+ started the chat)$",
    re.IGNORECASE,
)
CONTEXT_DEPENDENT_REPLY = re.compile(
    r"^(?:halo\s+kak,?\s*)?(?:maksudnya\s+(?:gimana|bagaimana)|sama\s+aja\b)",
    re.IGNORECASE,
)
APPROXIMATE_REPLY = re.compile(r"\b(?:kurang\s+lebih|sekitar|kira-kira)\b", re.IGNORECASE)
MISSING_MEDIA_TYPES = {"file", "file_image", "image", "image_with_text", "video"}
MAX_FILES = 1000
MAX_NOTE_BYTES = 1_000_000


class DuokeImportError(ValueError):
    """The source or private review destination cannot be processed safely."""


@dataclass(frozen=True)
class Turn:
    role: str
    timestamp: str
    text: str
    line_start: int
    line_end: int
    quote_removed: bool = False


@dataclass(frozen=True)
class Boundary:
    line: int


@dataclass(frozen=True)
class ParsedNote:
    relative_path: str
    history_complete: bool
    anonymous: bool
    skus: tuple[str, ...]
    tags: tuple[str, ...]
    records: tuple[Turn | Boundary, ...]
    digest: str
    source_format: str = "legacy"
    missing_media: bool = False
    product_context_ambiguous: bool = False


def _frontmatter(text: str) -> tuple[str, list[tuple[int, str]]]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise DuokeImportError("Source note has no frontmatter")
    try:
        end = next(index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---")
    except StopIteration as error:
        raise DuokeImportError("Source note has unterminated frontmatter") from error
    return "\n".join(lines[1:end]), list(enumerate(lines[end + 1:], start=end + 2))


def _scalar(frontmatter: str, key: str) -> str:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*(.*?)\s*$", frontmatter)
    return match.group(1).strip(" \"'") if match else ""


def _list(frontmatter: str, key: str) -> tuple[str, ...]:
    lines = frontmatter.splitlines()
    values: list[str] = []
    for index, line in enumerate(lines):
        match = re.match(rf"^{re.escape(key)}:\s*(.*?)\s*$", line)
        if not match:
            continue
        inline = match.group(1).strip()
        if inline.startswith("[") and inline.endswith("]"):
            inline = inline[1:-1]
            values.extend(part.strip(" \"'") for part in inline.split(",") if part.strip(" \"'"))
        elif inline:
            values.append(inline.strip(" \"'"))
        for following in lines[index + 1:]:
            item = re.match(r"^\s+-\s+(.*?)\s*$", following)
            if item:
                value = item.group(1).strip(" \"'")
                if value:
                    values.append(value)
                continue
            if following.startswith((" ", "\t")) or not following.strip():
                continue
            break
        break
    return tuple(dict.fromkeys(values))


def _bool(frontmatter: str, key: str, default: bool = False) -> bool:
    value = _scalar(frontmatter, key).casefold()
    if not value:
        return default
    if value not in {"true", "false"}:
        raise DuokeImportError(f"Source note has an invalid {key} value")
    return value == "true"


def _transcript(lines: list[tuple[int, str]]) -> tuple[Turn | Boundary, ...]:
    records: list[Turn | Boundary] = []
    in_transcript = False
    active: Turn | None = None

    def flush() -> None:
        nonlocal active
        if active is not None:
            records.append(active)
            active = None

    for line_number, line in lines:
        if line.strip() == "## Transkrip":
            in_transcript = True
            continue
        if in_transcript and line.startswith("## "):
            flush()
            break
        if not in_transcript:
            continue
        role = ROLE_LINE.match(line)
        if role:
            flush()
            active = Turn(
                role=role.group(1).casefold(),
                timestamp=role.group(2).strip(),
                text=role.group(3).lstrip(),
                line_start=line_number,
                line_end=line_number,
            )
            continue
        if active is not None and line.startswith("    "):
            continuation = line[4:]
            if continuation.lstrip().startswith(">"):
                active = Turn(
                    role=active.role,
                    timestamp=active.timestamp,
                    text=active.text,
                    line_start=active.line_start,
                    line_end=line_number,
                    quote_removed=True,
                )
                continue
            active = Turn(
                role=active.role,
                timestamp=active.timestamp,
                text=f"{active.text}\n{continuation}",
                line_start=active.line_start,
                line_end=line_number,
                quote_removed=active.quote_removed,
            )
            continue
        if line.strip():
            flush()
            records.append(Boundary(line_number))
    flush()
    return tuple(records)


def _archive_transcript(lines: list[tuple[int, str]]) -> tuple[tuple[Turn | Boundary, ...], bool]:
    """Parse only explicit-role, plain-text messages from the immutable archive format."""
    records: list[Turn | Boundary] = []
    in_transcript = False
    message: list[tuple[int, str]] = []
    heading: tuple[int, str, str] | None = None
    missing_media = False

    def flush() -> None:
        nonlocal heading, message, missing_media
        if heading is None:
            message = []
            return
        line_start, timestamp, role = heading
        message_type = ""
        for _, value in message:
            if value.startswith(("Type:", "Tipe:")):
                message_type = value.partition(":")[2].strip().casefold()
                break
        if message_type in MISSING_MEDIA_TYPES:
            missing_media = True
        if message_type != "text":
            records.append(Boundary(line_start))
        else:
            quoted = [(number, value[1:].lstrip()) for number, value in message if value.startswith(">")]
            text = "\n".join(value for _, value in quoted).strip()
            if text and not SYSTEM_EVENT.fullmatch(" ".join(text.split())):
                records.append(Turn(
                    role=role,
                    timestamp=timestamp,
                    text=text,
                    line_start=line_start,
                    line_end=quoted[-1][0],
                ))
            else:
                records.append(Boundary(line_start))
        heading = None
        message = []

    for line_number, line in lines:
        if line.strip() == "## Transcript":
            in_transcript = True
            continue
        if in_transcript and line.startswith("## "):
            flush()
            break
        if not in_transcript:
            continue
        role_match = ARCHIVE_ROLE_LINE.match(line)
        if role_match:
            flush()
            role = role_match.group(2).casefold()
            heading = (line_number, role_match.group(1).strip(), {"pelanggan": "customer", "penjual": "seller"}.get(role, role))
            continue
        if heading is not None:
            message.append((line_number, line))
    flush()
    return tuple(records), missing_media


def parse_note(path: Path, source: Path) -> ParsedNote:
    if path.is_symlink() or not path.resolve().is_relative_to(source.resolve()):
        raise DuokeImportError("Source symlinks are forbidden")
    if path.stat().st_size > MAX_NOTE_BYTES:
        raise DuokeImportError("Source note exceeds the size limit")
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise DuokeImportError("Source note is not valid UTF-8") from error
    metadata, body = _frontmatter(text)
    origin = _scalar(metadata, "source")
    # Both the original archive export and the later API recapture use the same
    # explicit-role transcript layout; only their identifier fields differ.
    archive_format = ((origin == "duoke" and bool(_scalar(metadata, "conversation_ref")))
                      or (origin == "duoke_api_recapture" and bool(_scalar(metadata, "capture_id"))))
    records, missing_media = _archive_transcript(body) if archive_format else (_transcript(body), False)
    if archive_format:
        skus = tuple(dict.fromkeys(
            value.strip() for value in (*ARCHIVE_SKU.findall(text), *ARCHIVE_CARD_SKU.findall(text))
            if value.strip() and not value.startswith("[")
        ))
        history_complete = _bool(metadata, "history_complete")
        anonymous = (_scalar(metadata, "privacy") == "automated_redaction"
                     or bool(_scalar(metadata, "redaction_review")))
    else:
        skus = _list(metadata, "sku")
        history_complete = _bool(metadata, "history_lengkap")
        anonymous = _bool(metadata, "anonim")
    return ParsedNote(
        relative_path=path.relative_to(source).as_posix(),
        history_complete=history_complete,
        anonymous=anonymous,
        skus=skus,
        tags=_list(metadata, "tags"),
        records=records,
        digest=hashlib.sha256(raw).hexdigest(),
        source_format="archive" if archive_format else "legacy",
        missing_media=missing_media,
        product_context_ambiguous=("Product context review: Multiple products" in text or
                                   "Tinjauan konteks produk: Beberapa produk" in text),
    )


def source_files(source: Path) -> list[Path]:
    if not source.is_dir() or source.is_symlink():
        raise DuokeImportError("The source must be a real directory")
    root = source.resolve()
    paths = sorted(path for path in source.rglob("*.md") if not any(part.startswith(".") for part in path.relative_to(source).parts))
    if len(paths) > MAX_FILES:
        raise DuokeImportError("The source exceeds the 1000-note limit")
    for path in paths:
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise DuokeImportError("Source symlinks are forbidden")
    return paths


def _runs(records: Iterable[Turn | Boundary]) -> list[tuple[str, list[Turn]] | None]:
    runs: list[tuple[str, list[Turn]] | None] = []
    for record in records:
        if isinstance(record, Boundary):
            if not runs or runs[-1] is not None:
                runs.append(None)
            continue
        if runs and runs[-1] is not None and runs[-1][0] == record.role:
            runs[-1][1].append(record)
        else:
            runs.append((record.role, [record]))
    return runs


def _turn_has_card(turn: Turn) -> bool:
    structured_fields = STRUCTURED_CARD_FIELD.findall(turn.text)
    return bool(CARD_MARKERS.search(turn.text) or MARKDOWN_EMBED.search(turn.text) or len(structured_fields) >= 2)


def _is_trivial(turns: list[Turn]) -> bool:
    text = " ".join(turn.text for turn in turns).strip()
    words = re.findall(r"[\w-]+", text.casefold(), re.UNICODE)
    meaningful = [word for word in words if word not in {"kak", "kakak", "min", "admin", "ya", "yah"}]
    normalized = " ".join(meaningful)
    return (
        len(normalized) < 4
        or len(meaningful) <= 4 and bool(TRIVIAL_REPLY.fullmatch(normalized))
        or normalized in {"baik terima kasih", "terima kasih", "makasih", "thanks", "thank you"}
    )


def _is_boilerplate(turns: list[Turn]) -> bool:
    return bool(BOILERPLATE_REPLY.search(" ".join(turn.text for turn in turns)))


def _safe_turn(turn: Turn, relative_path: str) -> tuple[dict[str, Any], set[str]]:
    flags: set[str] = set()
    if turn.quote_removed:
        flags.add("quoted_reply_metadata_removed")
    urls = URL_RE.findall(turn.text)
    if urls:
        flags.add("source_contains_link")
    if any(not public_https_url(url.rstrip(".,;:!?")) for url in urls):
        flags.add("source_contains_local_or_unsafe_link")
    redacted = redact_text(turn.text)
    redacted = NATIONAL_ID.sub("[NATIONAL_ID]", redacted)
    redacted = BANK_ACCOUNT.sub("[BANK_ACCOUNT]", redacted)
    redacted = LONG_NUMERIC_IDENTIFIER.sub("[BANK_ACCOUNT]", redacted)
    redacted = INLINE_ADDRESS.sub("[ADDRESS]", redacted)
    redacted = LABELED_USERNAME.sub("Username: [USERNAME]", redacted)
    redacted = AT_USERNAME.sub("[USERNAME]", redacted)
    if PLACEHOLDER.search(redacted):
        flags.add("privacy_redacted")
    return {
        "text": redacted,
        "timestamp": turn.timestamp,
        "source": {
            "path": relative_path,
            "lineStart": turn.line_start,
            "lineEnd": turn.line_end,
        },
    }, flags


def candidates_from_note(note: ParsedNote) -> tuple[list[dict[str, Any]], Counter[str]]:
    excluded: Counter[str] = Counter()
    if not note.anonymous:
        excluded["source_not_anonymized"] += 1
        return [], excluded

    results: list[dict[str, Any]] = []
    runs = _runs(note.records)
    for index, run in enumerate(runs):
        if run is None or run[0] != "customer":
            continue
        following = runs[index + 1] if index + 1 < len(runs) else None
        if following is None or following[0] != "seller":
            excluded["customer_run_without_adjacent_seller_run"] += 1
            continue
        customer_turns, seller_turns = run[1], following[1]
        if any(_turn_has_card(turn) for turn in (*customer_turns, *seller_turns)):
            excluded["product_order_or_media_card"] += 1
            continue
        if _is_trivial(customer_turns):
            excluded["trivial_customer_run"] += 1
            continue
        if _is_trivial(seller_turns):
            excluded["trivial_seller_run"] += 1
            continue
        if _is_boilerplate(seller_turns):
            excluded["boilerplate_seller_run"] += 1
            continue

        flags = {"historical_reply_requires_review", "outcome_not_verified"}
        if note.source_format == "archive":
            flags.add("roles_explicit_archive")
        else:
            flags.add("roles_inferred_requires_review")
        if not note.history_complete:
            flags.add("incomplete_history")
        if len(note.skus) == 0:
            flags.add("product_not_identified")
        elif len(note.skus) > 1:
            flags.add("ambiguous_product_multiple_skus")
        elif re.search(r"[\s/]", note.skus[0]):
            flags.add("non_retrievable_composite_sku")
        if note.product_context_ambiguous:
            flags.add("ambiguous_product_reference")
        if note.missing_media:
            flags.add("missing_attachment_context")
        if "status/perlu-review" not in note.tags:
            flags.add("source_review_status_unverified")
        if ROLE_MISATTRIBUTION.search(" ".join(turn.text for turn in customer_turns)):
            flags.add("possible_role_misattribution")

        combined_text = " ".join(turn.text for turn in (*customer_turns, *seller_turns))
        seller_text = " ".join(turn.text for turn in seller_turns)
        if ACCOUNT_SPECIFIC.search(combined_text):
            flags.add("account_specific_response")
        if MONETARY_OR_PROMOTION.search(combined_text):
            flags.add("monetary_or_promotion_claim")
        if STOCK_OR_AVAILABILITY.search(combined_text):
            flags.add("stock_or_availability_claim")
        if OPERATIONAL_PROMISE.search(seller_text):
            flags.add("operational_promise")
        if CONTEXT_DEPENDENT_REPLY.search(seller_text):
            flags.add("context_dependent_reply")
        if APPROXIMATE_REPLY.search(seller_text):
            flags.add("approximate_or_uncertain_reply")

        question: list[dict[str, Any]] = []
        replies: list[dict[str, Any]] = []
        for turn in customer_turns:
            item, turn_flags = _safe_turn(turn, note.relative_path)
            question.append(item)
            flags.update(turn_flags)
        for turn in seller_turns:
            item, turn_flags = _safe_turn(turn, note.relative_path)
            replies.append(item)
            flags.update(turn_flags)
        if any(not item["text"] for item in (*question, *replies)):
            excluded["empty_after_redaction"] += 1
            continue

        provenance = [
            f"{item['source']['lineStart']}:{item['source']['lineEnd']}:{item['text']}"
            for item in (*question, *replies)
        ]
        identifier = f"duoke-{stable_hash(note.relative_path, *provenance, length=20)}"
        source_hash = hashlib.sha256(
            "\x1f".join((note.relative_path, *provenance)).encode("utf-8")
        ).hexdigest()
        results.append({
            "id": identifier,
            "approval": "unapproved",
            "language": "id",
            "questionTurns": question,
            "historicalSellerTurns": replies,
            "skus": list(note.skus),
            "flags": sorted(flags),
            "strictPilotReviewEligible": False,
            "sourceHash": source_hash,
        })
    return results, excluded


def _normalized_turns(turns: list[dict[str, Any]]) -> str:
    text = " ".join(item["text"] for item in turns).casefold()
    return " ".join(re.findall(r"[\w-]+", text, re.UNICODE))


def _annotate_conflicts_and_eligibility(candidates: list[dict[str, Any]]) -> None:
    groups: dict[tuple[tuple[str, ...], str], list[dict[str, Any]]] = {}
    for candidate in candidates:
        key = (tuple(candidate["skus"]), _normalized_turns(candidate["questionTurns"]))
        groups.setdefault(key, []).append(candidate)
    for group in groups.values():
        replies = {_normalized_turns(item["historicalSellerTurns"]) for item in group}
        if len(replies) > 1:
            for candidate in group:
                candidate["flags"] = sorted(set(candidate["flags"]) | {"conflicting_historical_replies"})

    blocking_flags = {
        "account_specific_response",
        "approximate_or_uncertain_reply",
        "ambiguous_product_multiple_skus",
        "ambiguous_product_reference",
        "conflicting_historical_replies",
        "context_dependent_reply",
        "incomplete_history",
        "missing_attachment_context",
        "monetary_or_promotion_claim",
        "non_retrievable_composite_sku",
        "operational_promise",
        "possible_role_misattribution",
        "privacy_redacted",
        "product_not_identified",
        "roles_inferred_requires_review",
        "source_contains_link",
        "source_contains_local_or_unsafe_link",
        "stock_or_availability_claim",
    }
    for candidate in candidates:
        candidate["strictPilotReviewEligible"] = not bool(set(candidate["flags"]) & blocking_flags)


def build_review(source: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    paths = source_files(source)
    candidates: list[dict[str, Any]] = []
    excluded: Counter[str] = Counter()
    parsed_turns = 0
    source_digests: list[str] = []
    source_formats: Counter[str] = Counter()
    skipped_sources: Counter[str] = Counter()
    for path in paths:
        relative_path = path.relative_to(source).as_posix()
        if relative_path == "Archive/Index.md":
            try:
                source_digests.append(f"{relative_path}:{hashlib.sha256(path.read_bytes()).hexdigest()}")
            except OSError:
                excluded["invalid_source_note"] += 1
                continue
            source_formats["skippedArchiveIndex"] += 1
            skipped_sources["archiveIndex"] += 1
            continue
        try:
            note = parse_note(path, source)
        except (OSError, DuokeImportError):
            excluded["invalid_source_note"] += 1
            continue
        source_formats[note.source_format] += 1
        parsed_turns += sum(isinstance(record, Turn) for record in note.records)
        source_digests.append(f"{note.relative_path}:{note.digest}")
        note_candidates, note_excluded = candidates_from_note(note)
        candidates.extend(note_candidates)
        excluded.update(note_excluded)
    candidates.sort(key=lambda item: item["id"])
    if len({candidate["id"] for candidate in candidates}) != len(candidates):
        raise DuokeImportError("Stable candidate IDs are not unique")
    _annotate_conflicts_and_eligibility(candidates)
    flag_counts = Counter(flag for candidate in candidates for flag in candidate["flags"])
    review_buckets = {
        "eligibleAfterOwnerReview": sum(bool(item["strictPilotReviewEligible"]) for item in candidates),
        "privacy": sum("privacy_redacted" in item["flags"] for item in candidates),
        "productOrRoleAmbiguity": sum(bool({
            "ambiguous_product_multiple_skus", "ambiguous_product_reference",
            "non_retrievable_composite_sku", "possible_role_misattribution",
            "product_not_identified", "roles_inferred_requires_review",
        } & set(item["flags"])) for item in candidates),
        "accountOrOperational": sum(bool({
            "account_specific_response", "operational_promise",
        } & set(item["flags"])) for item in candidates),
        "volatileCommercialFacts": sum(bool({
            "monetary_or_promotion_claim", "stock_or_availability_claim",
        } & set(item["flags"])) for item in candidates),
        "missingOrIncompleteContext": sum(bool({
            "context_dependent_reply", "incomplete_history", "missing_attachment_context",
        } & set(item["flags"])) for item in candidates),
        "conflictingReplies": sum("conflicting_historical_replies" in item["flags"] for item in candidates),
    }
    report = {
        "schemaVersion": 1,
        "sourceFingerprint": hashlib.sha256("\n".join(source_digests).encode("utf-8")).hexdigest(),
        "sourceFiles": len(paths),
        "sourceFormatCounts": dict(sorted(source_formats.items())),
        "skippedSourceCounts": dict(sorted(skipped_sources.items())),
        "invalidSourceNoteCount": excluded.get("invalid_source_note", 0),
        "parsedTurns": parsed_turns,
        "candidateCount": len(candidates),
        "strictPilotReviewEligibleCount": sum(
            bool(candidate["strictPilotReviewEligible"]) for candidate in candidates
        ),
        "excludedCounts": dict(sorted(excluded.items())),
        "flagCounts": dict(sorted(flag_counts.items())),
        "reviewBuckets": review_buckets,
        "publicationPerformed": False,
    }
    return candidates, report


def _assert_private_destination(output: Path, private_root: Path) -> None:
    if private_root.exists() and private_root.is_symlink():
        raise DuokeImportError("Review output symlinks are forbidden")
    root = private_root.resolve(strict=False)
    destination = output.resolve(strict=False)
    if destination == root or not destination.is_relative_to(root):
        raise DuokeImportError("Review output must stay below the private directory")
    current = private_root
    for part in output.relative_to(private_root).parts:
        current = current / part
        if current.exists() and current.is_symlink():
            raise DuokeImportError("Review output symlinks are forbidden")


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


def _markdown(candidate: dict[str, Any]) -> str:
    lines = [
        f"# Kandidat tinjauan {candidate['id']}",
        "",
        "Status: **UNAPPROVED**",
        "",
        "Ini adalah draf riwayat yang telah disamarkan. Verifikasi peran, konteks produk, dan ketepatan fakta sebelum membuat pengetahuan aktif secara manual.",
        "",
        "## Penanda tinjauan",
        "",
        *(f"- `{flag}`" for flag in candidate["flags"]),
        "",
        "## Giliran pelanggan",
        "",
    ]
    for index, turn in enumerate(candidate["questionTurns"], start=1):
        source = turn["source"]
        lines.extend([
            f"### Giliran pelanggan {index}",
            "",
            f"Sumber: `{source['path']}:{source['lineStart']}-{source['lineEnd']}`",
            "",
            *(f"> {line}" for line in turn["text"].splitlines()),
            "",
        ])
    lines.extend(["## Giliran penjual dalam riwayat", ""])
    for index, turn in enumerate(candidate["historicalSellerTurns"], start=1):
        source = turn["source"]
        lines.extend([
            f"### Giliran penjual {index}",
            "",
            f"Sumber: `{source['path']}:{source['lineStart']}-{source['lineEnd']}`",
            "",
            *(f"> {line}" for line in turn["text"].splitlines()),
            "",
        ])
    lines.extend([
        "## Tinjauan pemilik",
        "",
        "- [ ] Pastikan peran pelanggan dan penjual.",
        "- [ ] Pastikan konteks produk/SKU.",
        "- [ ] Tulis ulang dan setujui redaksi akhir berbahasa Indonesia di vault dukungan pelanggan khusus.",
        "- [ ] Buat dan setujui entri bahasa Inggris terpisah bila diperlukan.",
        "",
    ])
    return "\n".join(lines)


def _index_label(candidate: dict[str, Any]) -> str:
    question = " ".join(candidate["questionTurns"][0]["text"].split())[:100]
    question = question.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")
    skus = ", ".join(candidate["skus"]) or "SKU unverified"
    return f"{candidate['id']} · {skus} · {question}"


def write_review(candidates: list[dict[str, Any]], report: dict[str, Any], output: Path = REVIEW_DIR,
                 private_root: Path = AI_ASSISTANCE_PRIVATE_DIR) -> None:
    _assert_private_destination(output, private_root)
    private_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    private_root.chmod(0o700)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.chmod(0o700)
    candidate_dir = output / "candidates"
    if candidate_dir.exists() and candidate_dir.is_symlink():
        raise DuokeImportError("Review output symlinks are forbidden")
    candidate_dir.mkdir(exist_ok=True, mode=0o700)
    candidate_dir.chmod(0o700)

    expected: set[str] = set()
    for candidate in candidates:
        filename = f"{candidate['id']}.md"
        expected.add(filename)
        _private_write(candidate_dir / filename, _markdown(candidate))
    for stale in candidate_dir.glob("*.md"):
        if stale.name not in expected:
            if stale.is_symlink():
                raise DuokeImportError("Review output symlinks are forbidden")
            stale.unlink()

    index = [
        "# Tinjauan Bantuan AI Duoke",
        "",
        "Semua kandidat berstatus **UNAPPROVED** dan tidak dapat diterbitkan oleh pengimpor ini.",
        "Teks penjual dalam riwayat telah disamarkan, tetapi belum diverifikasi sebagai fakta produk.",
        "Artefak yang dihasilkan ini ditimpa saat dijalankan ulang. Simpan redaksi akhir yang disetujui pemilik di vault dukungan pelanggan khusus.",
        "",
        f"Jumlah kandidat: {len(candidates)}",
        f"Layak ditinjau untuk pilot ketat: {report['strictPilotReviewEligibleCount']}",
        "",
        "## Kelompok tinjauan yang dapat ditindaklanjuti",
        "",
        *(f"- {name}: {count}" for name, count in report["reviewBuckets"].items()),
        "",
        "## Kandidat tinjauan pilot ketat",
        "",
        "Kandidat ini tetap belum disetujui. Kandidat hanya lolos pemilahan risiko otomatis dan masih memerlukan pemeriksaan fakta oleh pemilik.",
        "",
        *(f"- [ ] [{_index_label(candidate)}](candidates/{candidate['id']}.md)"
          for candidate in candidates if candidate["strictPilotReviewEligible"]),
        "",
        "## Kandidat",
        "",
        *(f"- [ ] [{_index_label(candidate)}](candidates/{candidate['id']}.md) · {', '.join(candidate['flags'])}" for candidate in candidates),
        "",
    ]
    payload = {
        "schemaVersion": 1,
        "approval": "unapproved",
        "sourceFingerprint": report["sourceFingerprint"],
        "candidates": candidates,
    }
    _private_write(output / "REVIEW.md", "\n".join(index))
    _private_write(output / "candidates.json", json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    _private_write(output / "report.json", json.dumps(report, ensure_ascii=False, indent=2) + "\n")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Preview or write private, unapproved review drafts from Duoke Obsidian transcripts."
    )
    parser.add_argument("--source", type=Path, required=True, help="Duoke Percakapan directory")
    parser.add_argument("--write-review", action="store_true", help="Write private review artifacts; never publish")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    candidates, report = build_review(args.source)
    if args.write_review:
        write_review(candidates, report)
    print(f"Source files: {report['sourceFiles']}")
    print(f"Source formats: {json.dumps(report['sourceFormatCounts'], sort_keys=True)}")
    print(f"Skipped source files: {sum(report['skippedSourceCounts'].values())}")
    print(f"Parsed turns: {report['parsedTurns']}")
    print(f"Candidates for review: {report['candidateCount']}")
    print(f"Strict pilot review eligible: {report['strictPilotReviewEligibleCount']}")
    print(f"Excluded groups: {sum(report['excludedCounts'].values())}")
    print(f"Mode: {'private review write' if args.write_review else 'preview only'}")
    print("No candidates were approved, published, or copied to active knowledge.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
