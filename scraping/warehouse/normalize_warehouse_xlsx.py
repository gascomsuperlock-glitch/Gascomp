#!/usr/bin/env python3
"""Read only the product fields required by the Gascomp admin from a warehouse XLSX."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

from scraping.shared.common import utc_now, write_json
from scraping.shared.paths import ROOT


OUTPUT_PATH = ROOT / "data" / "catalog" / "warehouse-products.json"
REPORT_PATH = ROOT / "data" / "reports" / "warehouse-import-source-report.json"
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
REQUIRED_HEADERS = {"Nomor SKU", "Judul", "Kategori", "Tautan Gambar", "Kode Produk"}


def column_index(cell_reference: str) -> int:
    letters = "".join(character for character in cell_reference if character.isalpha())
    result = 0
    for character in letters.upper():
        result = result * 26 + ord(character) - 64
    return result - 1


def shared_strings(archive: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return [
        "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
        for item in root.findall(f"{{{MAIN_NS}}}si")
    ]


def sheet_path(archive: ZipFile, requested_name: str) -> str:
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {
        item.attrib["Id"]: item.attrib["Target"]
        for item in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
    }
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    sheets = workbook.find(f"{{{MAIN_NS}}}sheets")
    if sheets is None:
        raise ValueError("The workbook has no sheets.")
    for sheet in sheets:
        if sheet.attrib.get("name") != requested_name:
            continue
        relationship_id = sheet.attrib[f"{{{REL_NS}}}id"]
        target = targets[relationship_id].lstrip("/")
        return target if target.startswith("xl/") else f"xl/{target}"
    raise ValueError(f"Sheet {requested_name!r} was not found.")


def cell_text(cell: ET.Element, strings: list[str]) -> str:
    inline = cell.find(f"{{{MAIN_NS}}}is")
    if inline is not None:
        return "".join(node.text or "" for node in inline.iter(f"{{{MAIN_NS}}}t")).strip()
    value_node = cell.find(f"{{{MAIN_NS}}}v")
    if value_node is None:
        return ""
    value = (value_node.text or "").strip()
    if cell.attrib.get("t") == "s" and value.isdigit():
        index = int(value)
        return strings[index].strip() if index < len(strings) else ""
    if cell.attrib.get("t") == "b":
        return "TRUE" if value == "1" else "FALSE"
    return value


def read_sheet(path: Path, name: str) -> list[dict[str, str]]:
    try:
        with ZipFile(path) as archive:
            strings = shared_strings(archive)
            root = ET.fromstring(archive.read(sheet_path(archive, name)))
    except (BadZipFile, KeyError, ET.ParseError) as error:
        raise ValueError("The file is not a readable XLSX workbook.") from error

    rows: list[list[str]] = []
    for row in root.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row"):
        values: dict[int, str] = {}
        for cell in row.findall(f"{{{MAIN_NS}}}c"):
            index = column_index(cell.attrib.get("r", ""))
            if index >= 0:
                values[index] = cell_text(cell, strings)
        width = max(values, default=-1) + 1
        rows.append([values.get(index, "") for index in range(width)])
    if not rows:
        return []
    headers = rows[0]
    missing = sorted(REQUIRED_HEADERS - set(headers))
    if missing:
        raise ValueError(f"Required columns are missing: {', '.join(missing)}")
    return [
        {header: row[index] if index < len(row) else "" for index, header in enumerate(headers)}
        for row in rows[1:]
    ]


def stable_slug(name: str, source_id: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]+", "-", ascii_name.casefold()).strip("-")[:70] or "product"
    digest = hashlib.sha1(source_id.encode("utf-8")).hexdigest()[:7]
    return f"{base}-{digest}"


def valid_image_url(value: str) -> str:
    try:
        parsed = urlsplit(value.strip())
    except ValueError:
        return ""
    return value.strip() if parsed.scheme == "https" and bool(parsed.hostname) else ""


def workbook_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def normalize(rows: list[dict[str, str]]) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    products: list[dict[str, Any]] = []
    review: list[dict[str, str]] = []
    seen_skus: set[str] = set()
    seen_source_ids: set[str] = set()
    for row_number, row in enumerate(rows, start=2):
        sku = row.get("Nomor SKU", "").strip()
        name = row.get("Judul", "").strip()
        source_id = row.get("Kode Produk", "").strip()
        missing = [label for label, value in (("SKU", sku), ("title", name), ("product code", source_id)) if not value]
        if missing:
            review.append({"row": str(row_number), "sku": sku, "reason": f"Skipped: {', '.join(missing)} is empty."})
            continue
        sku_key = sku.casefold()
        if sku_key in seen_skus or source_id in seen_source_ids:
            review.append({"row": str(row_number), "sku": sku, "reason": "Skipped: duplicate SKU or product code."})
            continue
        seen_skus.add(sku_key)
        seen_source_ids.add(source_id)
        raw_category = row.get("Kategori", "").strip()
        model = "" if raw_category.casefold() == "tidak ada kategori" else raw_category
        raw_image = row.get("Tautan Gambar", "").strip()
        image_url = valid_image_url(raw_image)
        if raw_image and not image_url:
            review.append({"row": str(row_number), "sku": sku, "reason": "The image link is not a valid HTTPS URL."})
        if not raw_image:
            review.append({"row": str(row_number), "sku": sku, "reason": "The product has no image link."})
        products.append({
            "sourceProductId": source_id,
            "slug": stable_slug(sku, source_id),
            "sku": sku,
            "name": name,
            "model": model,
            "imageUrl": image_url,
        })
    return products, review


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize admin fields from a warehouse SKU XLSX export.")
    parser.add_argument("xlsx", type=Path, help="Path to the SKU_Gudang*.xlsx file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    path = args.xlsx.expanduser().resolve()
    if not path.is_file() or path.suffix.casefold() != ".xlsx":
        print("XLSX file not found.")
        return 2
    try:
        rows = read_sheet(path, "SKU")
        products, review = normalize(rows)
    except ValueError as error:
        print(error)
        return 2
    generated_at = utc_now()
    source_hash = workbook_hash(path)
    write_json(OUTPUT_PATH, {
        "schemaVersion": 1,
        "source": "warehouse-xlsx",
        "sourceFile": path.name,
        "sourceSha256": source_hash,
        "syncedAt": generated_at,
        "products": products,
    })
    write_json(REPORT_PATH, {
        "source": "warehouse-xlsx",
        "sourceFile": path.name,
        "sourceSha256": source_hash,
        "generatedAt": generated_at,
        "rowsRead": len(rows),
        "validProducts": len(products),
        "reviewItems": review,
        "excludedColumns": [
            "price/cost", "stock", "GTIN", "weight/dimensions", "date", "warehouse notes",
            "brand/material/use/tags", "combination SKU details",
        ],
    })
    print(f"Rows read: {len(rows)}; valid products: {len(products)}; review items: {len(review)}")
    print(f"Admin data: {OUTPUT_PATH}")
    return 0 if products else 3


if __name__ == "__main__":
    raise SystemExit(main())
