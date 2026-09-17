#!/usr/bin/env python3
"""Prepare private AI-answer candidates from archived Duoke product notes.

The importer copies only stable, exact source-description lines. It cannot publish
knowledge and writes only below the AI-assistance private directory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from scraping.ai_assistance.knowledge import KnowledgeError, validate_entry
from scraping.shared.common import (
    ADDRESS_LINE_RE,
    EMAIL_RE,
    NAME_RE,
    ORDER_RE,
    PHONE_RE,
    URL_RE,
    stable_hash,
)
from scraping.shared.paths import AI_ASSISTANCE_PRIVATE_DIR


REVIEW_DIR = AI_ASSISTANCE_PRIVATE_DIR / "product-review"
MAX_FILES = 1000
MAX_NOTE_BYTES = 1_000_000
MAX_FACT_LINES = 12
MAX_ANSWER_CHARS = 4000

_DYNAMIC = re.compile(
    r"\b(?:harga|price|rp\.?\s*\d|stok|stock|tersedia|availability|ready|"
    r"order|pesan(?:an)?|pemesanan|beli|checkout|keranjang|promo|diskon|voucher|"
    r"gratis|free|bonus|gift|ongkir|shipping|pengiriman|seller|chat|"
    r"garansi|warranty)\b",
    re.IGNORECASE,
)
_PACKAGE_QUANTITY = re.compile(r"^\s*(?:[-*+•✅✔✓>]+\s*)?\d+\s*[xX]\b")
_MARKER = re.compile(r"^\s*(?:[-*+•✅✔✓>]+|\d+[.)])\s*")
_CLAIM_REQUIRES_REVIEW = re.compile(
    r"\b(?:aman|keamanan|anti\s*bocor|kebocoran|meledak|sni|kan|sertifi\w*|"
    r"sehat|nutrisi|bakteri|low\s+sugar|rendah\s+gula|anti\s*pecah|"
    r"hemat|efisien|terbaik|premium|maksimal|sempurna|terpercaya|"
    r"elegan|modern|durability|durable|safe|safety|efficient|"
    r"awet|tahan\s+lama|super\s+kuat|lebih\s+(?:kuat|cepat|irit))\b|\d+\s*%",
    re.IGNORECASE,
)
_LABELED_SPECIFICATION = re.compile(
    r"^(?P<key>material|bahan|kapasitas|dimensi|ukuran|panjang|warna|"
    r"daya(?:\s+(?:listrik|api|pemanasan))?|tegangan|voltase|berat(?:\s+(?:produk|unit))?|"
    r"jumlah(?:\s+tungku)?|model|tipe|jenis\s+burner|burner|diameter|kelistrikan)"
    r"\s*:\s*(?P<value>\S.*)$",
    re.IGNORECASE,
)
_MULTI_MODEL_DESCRIPTION = re.compile(
    r"\b(?:terdapat\s+\d+\s+varian|varian\s+tipe|beberapa\s+varian)\b",
    re.IGNORECASE,
)


class ProductImportError(ValueError):
    """The catalog source or private destination is unsafe or malformed."""


@dataclass(frozen=True)
class FactLine:
    text: str
    line: int


@dataclass(frozen=True)
class ProductNote:
    relative_path: str
    digest: str
    product_ref: str
    sku: str
    aliases: tuple[str, ...]
    facts: tuple[FactLine, ...]
    rejected: tuple[tuple[int, str], ...]


def _frontmatter(lines: list[str]) -> tuple[list[str], int]:
    if not lines or lines[0].strip() != "---":
        raise ProductImportError("Source note has no frontmatter")
    try:
        end = next(index for index, line in enumerate(lines[1:], start=1)
                   if line.strip() == "---")
    except StopIteration as error:
        raise ProductImportError("Source note has unterminated frontmatter") from error
    return lines[1:end], end + 1


def _scalar(frontmatter: list[str], key: str) -> str:
    pattern = re.compile(rf"^{re.escape(key)}:\s*(.*?)\s*$")
    for line in frontmatter:
        match = pattern.match(line)
        if match:
            value = match.group(1).strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            return value
    return ""


def _aliases(frontmatter: list[str]) -> tuple[str, ...]:
    value = _scalar(frontmatter, "aliases")
    if not value:
        return ()
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as error:
        raise ProductImportError("Product aliases must be an inline JSON list") from error
    if not isinstance(parsed, list) or any(not isinstance(item, str) for item in parsed):
        raise ProductImportError("Product aliases must contain strings")
    return tuple(dict.fromkeys(item.strip() for item in parsed if item.strip()))


def _privacy_reason(text: str) -> bool:
    return any(pattern.search(text) for pattern in (
        EMAIL_RE, PHONE_RE, ORDER_RE, NAME_RE, ADDRESS_LINE_RE,
    ))


def _fact_reason(text: str) -> str | None:
    plain = _MARKER.sub("", text).strip()
    if not plain or len(plain) < 12 or not re.search(r"[A-Za-z0-9]", plain):
        return "empty_or_fragment"
    if plain.endswith(":"):
        return "section_heading"
    if URL_RE.search(text):
        return "link"
    if _privacy_reason(text):
        return "privacy"
    if _DYNAMIC.search(text) or _PACKAGE_QUANTITY.search(text):
        return "dynamic_commercial"
    if _CLAIM_REQUIRES_REVIEW.search(text):
        return "claims_require_owner_review"
    return None


def _description(lines: list[str], start: int) -> tuple[tuple[FactLine, ...], tuple[tuple[int, str], ...]]:
    section = None
    for index in range(start, len(lines)):
        if lines[index].strip() == "## Source description":
            section = index + 1
            break
    if section is None:
        raise ProductImportError("Source note has no description section")

    facts: list[FactLine] = []
    rejected: list[tuple[int, str]] = []
    for index in range(section, len(lines)):
        line = lines[index]
        if line.startswith("## "):
            break
        if not line.startswith(">"):
            if line.strip():
                rejected.append((index + 1, "non_source_description_line"))
            continue
        text = line[1:]
        if text.startswith(" "):
            text = text[1:]
        reason = _fact_reason(text)
        if reason:
            rejected.append((index + 1, reason))
        else:
            facts.append(FactLine(text=text, line=index + 1))
    return tuple(facts), tuple(rejected)


def source_files(source: Path) -> list[Path]:
    if not source.is_dir() or source.is_symlink():
        raise ProductImportError("The source must be a real directory")
    root = source.resolve()
    paths = sorted(path for path in source.rglob("Product *.md")
                   if not any(part.startswith(".") for part in path.relative_to(source).parts))
    if len(paths) > MAX_FILES:
        raise ProductImportError("The source exceeds the 1000-note limit")
    for path in paths:
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ProductImportError("Source symlinks are forbidden")
    return paths


def parse_note(path: Path, source: Path) -> ProductNote:
    if path.is_symlink() or not path.resolve().is_relative_to(source.resolve()):
        raise ProductImportError("Source symlinks are forbidden")
    if path.stat().st_size > MAX_NOTE_BYTES:
        raise ProductImportError("Source note exceeds the size limit")
    raw = path.read_bytes()
    try:
        lines = raw.decode("utf-8").splitlines()
    except UnicodeDecodeError as error:
        raise ProductImportError("Source note is not valid UTF-8") from error
    frontmatter, body_start = _frontmatter(lines)
    if _scalar(frontmatter, "status") != "source_catalog":
        raise ProductImportError("Source note is not a catalog snapshot")
    sku = _scalar(frontmatter, "sku").strip()
    product_ref = _scalar(frontmatter, "product_ref").strip()
    if not product_ref or not re.fullmatch(r"[a-zA-Z0-9._-]{1,100}", product_ref):
        raise ProductImportError("Source note has an invalid product reference")
    aliases = _aliases(frontmatter)
    facts, rejected = _description(lines, body_start)
    return ProductNote(
        relative_path=path.relative_to(source).as_posix(),
        digest=hashlib.sha256(raw).hexdigest(),
        product_ref=product_ref,
        sku=sku,
        aliases=aliases,
        facts=facts,
        rejected=rejected,
    )


def _sku_key(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


def _fact_key(value: str) -> str:
    return re.sub(r"\s+", " ", _MARKER.sub("", value)).strip().casefold()


def _labeled_specification(value: str) -> tuple[str, str] | None:
    match = _LABELED_SPECIFICATION.fullmatch(_MARKER.sub("", value).strip())
    if not match:
        return None
    key = re.sub(r"\s+", " ", match.group("key").casefold())
    normalized_value = re.sub(r"\s+", " ", match.group("value").casefold()).strip(" .")
    return key, normalized_value


def _mentions_sku(text: str, sku_key: str) -> bool:
    parts = [re.escape(part) for part in sku_key.split()]
    if not parts:
        return False
    pattern = r"(?<![\w-])" + r"\s+".join(parts) + r"(?![\w-])"
    return bool(re.search(pattern, text, re.IGNORECASE))


def _questions(sku: str, selected: list[FactLine]) -> list[str]:
    values: list[str] = []
    deterministic_aliases = [
        sku,
        f"Spesifikasi {sku}",
        f"Apa spesifikasi {sku}?",
        f"Informasi produk {sku}",
        f"Deskripsi {sku}",
    ]
    keys = {_labeled_specification(fact.text)[0] for fact in selected
            if _labeled_specification(fact.text) is not None}
    if keys & {"bahan", "material"}:
        deterministic_aliases.extend((f"Apa bahan {sku}?", f"{sku} bahannya apa?"))
    if "kapasitas" in keys:
        deterministic_aliases.append(f"Berapa kapasitas {sku}?")
    if keys & {"dimensi", "ukuran", "diameter"}:
        deterministic_aliases.append(f"Berapa ukuran {sku}?")
    if keys & {"daya", "daya listrik", "daya api", "daya pemanasan", "kelistrikan"}:
        deterministic_aliases.append(f"Berapa watt {sku}?")
    if keys & {"tegangan", "voltase"}:
        deterministic_aliases.append(f"Berapa tegangan {sku}?")
    if keys & {"berat", "berat produk", "berat unit"}:
        deterministic_aliases.append(f"Berapa berat {sku}?")
    if "panjang" in keys:
        deterministic_aliases.append(f"Berapa panjang {sku}?")
    if "jumlah tungku" in keys:
        deterministic_aliases.append(f"Berapa jumlah tungku {sku}?")
    if "warna" in keys:
        deterministic_aliases.append(f"Apa warna {sku}?")
    for value in deterministic_aliases:
        clean = value.strip()
        if clean and len(clean) <= 500 and clean not in values:
            values.append(clean)
        if len(values) == 50:
            break
    return values


def _selected_facts(notes: list[ProductNote]) -> tuple[list[FactLine], bool]:
    labeled_by_note: list[dict[str, set[str]]] = []
    line_sets: list[set[str]] = []
    contradictory = False
    for note in notes:
        attributes: dict[str, set[str]] = defaultdict(set)
        lines: set[str] = set()
        for fact in note.facts:
            labeled = _labeled_specification(fact.text)
            if labeled is None:
                continue
            key, value = labeled
            attributes[key].add(value)
            lines.add(_fact_key(fact.text))
        contradictory = contradictory or any(len(values) > 1 for values in attributes.values())
        labeled_by_note.append(attributes)
        line_sets.append(lines)
    if not line_sets or any(not values for values in line_sets):
        return [], not contradictory
    values_by_attribute: dict[str, set[str]] = defaultdict(set)
    for attributes in labeled_by_note:
        for key, values in attributes.items():
            values_by_attribute[key].update(values)
    contradictory = contradictory or any(len(values) > 1 for values in values_by_attribute.values())
    eligible = set.intersection(*line_sets)
    selected: list[FactLine] = []
    answer_chars = 0
    for fact in notes[0].facts:
        if _fact_key(fact.text) not in eligible:
            continue
        addition = len(fact.text) + (1 if selected else 0)
        if len(selected) == MAX_FACT_LINES or answer_chars + addition > MAX_ANSWER_CHARS:
            break
        selected.append(fact)
        answer_chars += addition
    return selected, not contradictory


def _candidate(notes: list[ProductNote], known_skus: set[str]) -> dict[str, Any]:
    notes = sorted(notes, key=lambda note: (note.relative_path, note.product_ref))
    sku = notes[0].sku.strip()
    selected, specifications_agree = _selected_facts(notes)
    duplicate = len(notes) > 1
    pilot_eligible = bool(selected) and specifications_agree
    flags: list[str] = []
    if duplicate:
        flags.append("duplicate_sku")
    if not specifications_agree:
        flags.append("conflicting_stable_descriptions")
    if not selected:
        flags.append("no_common_stable_facts")
    if len(selected) == MAX_FACT_LINES:
        flags.append("excerpt_line_limit_applied")
    if not re.fullmatch(r"[\w-]+", sku):
        flags.append("non_retrievable_or_composite_sku")
        pilot_eligible = False
    source_text = "\n".join(fact.text.casefold() for note in notes for fact in note.facts)
    other_skus = sorted(value for value in known_skus
                        if value != _sku_key(sku) and _mentions_sku(source_text, value))
    if other_skus:
        flags.append("multiple_product_models_in_source")
        pilot_eligible = False
    if _MULTI_MODEL_DESCRIPTION.search(source_text):
        flags.append("multiple_product_models_in_source")
        pilot_eligible = False
    selected_labels = [_labeled_specification(fact.text) for fact in selected]
    selected_labels = [label for label in selected_labels if label is not None]
    substantive = {
        "material", "bahan", "kapasitas", "dimensi", "ukuran", "panjang",
        "daya", "daya listrik", "daya api", "daya pemanasan", "tegangan",
        "voltase", "berat", "berat produk", "berat unit", "jumlah",
        "jumlah tungku", "jenis burner", "burner", "diameter", "kelistrikan",
    }
    if selected and not any(key in substantive for key, _ in selected_labels):
        flags.append("identity_only_not_useful_answer")
        pilot_eligible = False
    measurement = re.compile(
        r"\d+(?:[.,]\d+)?\s*(?:w|watt|v|volt|kg|g|gram|l|liter|ml|cm|mm|m|meter|rpm|db|kw)\b",
        re.IGNORECASE,
    )
    ambiguous_value = any(
        key not in {"dimensi", "ukuran"} and len(measurement.findall(value)) > 1
        for key, value in selected_labels
    )
    if ambiguous_value:
        flags.append("ambiguous_labeled_value")
        pilot_eligible = False

    identifier = f"catalog-{stable_hash(_sku_key(sku), length=20)}"
    entry: dict[str, Any] | None = None
    if selected:
        proposed = {
            "id": identifier,
            "kind": "answer",
            "language": "id",
            "questions": _questions(sku, selected),
            "sku": sku,
            "answer": "\n".join(fact.text for fact in selected),
        }
        try:
            entry = validate_entry(proposed)
        except KnowledgeError:
            flags.append("knowledge_schema_rejected")
            pilot_eligible = False

    selected_keys = {_fact_key(fact.text) for fact in selected}
    provenance = []
    for note in notes:
        matched = [{"line": fact.line, "text": fact.text} for fact in note.facts
                   if _fact_key(fact.text) in selected_keys]
        provenance.append({
            "path": note.relative_path,
            "sha256": note.digest,
            "productRef": note.product_ref,
            "sourceAliases": list(note.aliases),
            "selectedExactLines": matched,
        })
    return {
        "id": identifier,
        "approval": "unapproved",
        "pilotEligible": pilot_eligible,
        "reviewStatus": "pilot_eligible" if pilot_eligible else "review_required",
        "flags": sorted(set(flags)),
        "entry": entry,
        "provenance": provenance,
    }


def build_review(source: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    paths = source_files(source)
    groups: dict[str, list[ProductNote]] = defaultdict(list)
    excluded: Counter[str] = Counter()
    rejected_lines: Counter[str] = Counter()
    source_digests: list[str] = []
    parsed = 0
    for path in paths:
        try:
            raw = path.read_bytes()
            source_digests.append(
                f"{path.relative_to(source).as_posix()}:{hashlib.sha256(raw).hexdigest()}"
            )
            note = parse_note(path, source)
        except (OSError, ProductImportError):
            excluded["invalid_source_note"] += 1
            continue
        parsed += 1
        rejected_lines.update(reason for _, reason in note.rejected)
        if not note.sku:
            excluded["missing_sku"] += 1
            continue
        if not note.facts:
            excluded["no_stable_description_facts"] += 1
        groups[_sku_key(note.sku)].append(note)

    known_skus = set(groups)
    candidates = [_candidate(notes, known_skus) for _, notes in sorted(groups.items())]
    candidates.sort(key=lambda item: item["id"])
    if len(candidates) > MAX_FILES:
        raise ProductImportError("Candidate count exceeds the knowledge entry limit")
    if len({candidate["id"] for candidate in candidates}) != len(candidates):
        raise ProductImportError("Stable candidate IDs are not unique")
    report = {
        "schemaVersion": 1,
        "sourceFingerprint": hashlib.sha256(
            "\n".join(source_digests).encode("utf-8")
        ).hexdigest(),
        "sourceFiles": len(paths),
        "parsedProductNotes": parsed,
        "skuGroups": len(groups),
        "candidateCount": len(candidates),
        "draftEntryCount": sum(candidate["entry"] is not None for candidate in candidates),
        "stagedEntryCount": sum(
            candidate["pilotEligible"] and candidate["entry"] is not None
            for candidate in candidates
        ),
        "pilotEligibleCount": sum(candidate["pilotEligible"] for candidate in candidates),
        "reviewRequiredCount": sum(not candidate["pilotEligible"] for candidate in candidates),
        "duplicateSkuGroups": sum(len(notes) > 1 for notes in groups.values()),
        "conflictingDuplicateSkuGroups": sum(
            "conflicting_stable_descriptions" in candidate["flags"] for candidate in candidates
        ),
        "excludedCounts": dict(sorted(excluded.items())),
        "rejectedLineCounts": dict(sorted(rejected_lines.items())),
        "publicationPerformed": False,
    }
    return candidates, report


def _assert_private_destination(output: Path, private_root: Path) -> None:
    if private_root.exists() and private_root.is_symlink():
        raise ProductImportError("Private output symlinks are forbidden")
    root = private_root.resolve(strict=False)
    destination = output.resolve(strict=False)
    if destination == root or not destination.is_relative_to(root):
        raise ProductImportError("Review output must stay below the private directory")
    current = private_root
    for part in output.relative_to(private_root).parts:
        current = current / part
        if current.exists() and current.is_symlink():
            raise ProductImportError("Private output symlinks are forbidden")


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


def _knowledge_markdown(entry: dict[str, Any]) -> str:
    metadata = {key: entry[key] for key in ("id", "kind", "language", "questions", "sku")}
    return f"---\n{json.dumps(metadata, ensure_ascii=False, indent=2)}\n---\n{entry['answer']}"


def _review_markdown(candidate: dict[str, Any]) -> str:
    entry = candidate["entry"]
    lines = [
        f"# Product candidate {candidate['id']}",
        "",
        "Status: **UNAPPROVED / REVIEW REQUIRED**",
        "",
        "## Flags",
        "",
        *(f"- `{flag}`" for flag in candidate["flags"]),
        "",
        "## Proposed exact source excerpt",
        "",
    ]
    if entry:
        lines.extend(f"> {line}" for line in entry["answer"].splitlines())
    else:
        lines.append("No common stable source excerpt was found.")
    lines.extend(["", "## Provenance", ""])
    for source in candidate["provenance"]:
        lines.append(f"- `{source['path']}` (`{source['sha256']}`)")
    lines.extend([
        "",
        "This generated review file cannot publish active knowledge.",
        "",
    ])
    return "\n".join(lines)


def _sync_markdown(directory: Path, expected: dict[str, str]) -> None:
    if directory.exists() and directory.is_symlink():
        raise ProductImportError("Private output symlinks are forbidden")
    directory.mkdir(exist_ok=True, mode=0o700)
    directory.chmod(0o700)
    for filename, text in expected.items():
        _private_write(directory / filename, text)
    for stale in directory.glob("*.md"):
        if stale.name not in expected:
            if stale.is_symlink():
                raise ProductImportError("Private output symlinks are forbidden")
            stale.unlink()


def write_review(candidates: list[dict[str, Any]], report: dict[str, Any],
                 output: Path = REVIEW_DIR,
                 private_root: Path = AI_ASSISTANCE_PRIVATE_DIR) -> None:
    _assert_private_destination(output, private_root)
    private_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    private_root.chmod(0o700)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.chmod(0o700)

    staging = {
        f"{candidate['id']}.md": _knowledge_markdown(candidate["entry"])
        for candidate in candidates
        if candidate["pilotEligible"] and candidate["entry"] is not None
    }
    review = {
        f"{candidate['id']}.md": _review_markdown(candidate)
        for candidate in candidates if not candidate["pilotEligible"]
    }
    _sync_markdown(output / "staging", staging)
    _sync_markdown(output / "review-required", review)
    payload = {"report": report, "candidates": candidates}
    _private_write(output / "candidates.json",
                   json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    _private_write(output / "report.json",
                   json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    readme = (
        "# Product answer review\n\n"
        "All files are private and unapproved. `staging/` contains mechanically "
        "eligible exact source excerpts. Duplicate SKUs with differing stable "
        "descriptions remain in `review-required/`. This importer never publishes "
        "to the active customer-support vault.\n"
    )
    _private_write(output / "README.md", readme)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Preview private exact-excerpt candidates from Duoke product notes."
    )
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--write-review", action="store_true")
    args = parser.parse_args()
    try:
        candidates, report = build_review(args.source)
        if args.write_review:
            write_review(candidates, report)
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return 0
    except (OSError, ProductImportError) as error:
        parser.exit(2, f"error: {error}\n")


if __name__ == "__main__":
    raise SystemExit(main())
