#!/usr/bin/env python3
"""Normalize captured Duoke product JSON and generate the Obsidian product vault."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
CAPTURE_DIR = ROOT / "scraping" / ".private" / "captures"
CATALOG_PATH = ROOT / "data" / "duoke-products.json"
REPORT_PATH = ROOT / "data" / "duoke-sync-report.json"
VAULT_DIR = ROOT / "obsidian"
PRODUCT_NOTES = VAULT_DIR / "products"
VARIATION_NOTES = VAULT_DIR / "variations"


ALIASES = {
    "product_id": ("productid", "goodsid", "itemid", "commodityid", "productno", "goodsno"),
    "generic_id": ("id",),
    "store_id": ("storeid", "shopid", "sellerid", "merchantid"),
    "sku": ("sku", "skucode", "outerid", "merchantsku", "sellersku", "productsku", "goodssku"),
    "name": ("productname", "goodsname", "itemname", "commodityname", "title", "name"),
    "model": ("model", "categoryname", "typename", "producttype", "goodsmodel"),
    "description": ("description", "productdescription", "goodsdescription", "desc", "detail", "remark"),
    "variations": ("variations", "variants", "skulist", "skus", "specifications", "specs"),
    "variation_id": ("variationid", "variantid", "skuid", "specid", "id"),
    "variation_name": ("variationname", "variantname", "skuname", "specname", "title", "name"),
    "attributes": ("attributes", "attrs", "properties", "specifications", "specs"),
    "attribute_name": ("attributename", "propertyname", "specname", "key", "name"),
    "attribute_value": ("attributevalue", "propertyvalue", "specvalue", "val", "value"),
}

VARIATION_PATH_KEYS = set(ALIASES["variations"])


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalized_key(key: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(key).lower())


def record_map(record: dict[str, Any]) -> dict[str, Any]:
    return {normalized_key(key): value for key, value in record.items()}


def first_value(record: dict[str, Any], aliases: Iterable[str]) -> Any:
    mapped = record_map(record)
    for alias in aliases:
        value = mapped.get(alias)
        if value is not None and value != "":
            return value
    return None


def identity_text(value: Any) -> str | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (str, int)):
        result = str(value).strip()
        return result or None
    return None


def source_text(value: Any) -> str | None:
    # SKU and names must arrive as text so leading zeroes and punctuation are preserved.
    if not isinstance(value, str):
        return None
    result = value.strip()
    return result or None


def extract_attributes(value: Any) -> list[dict[str, str]]:
    attributes: list[dict[str, str]] = []
    if isinstance(value, dict):
        for name, item_value in value.items():
            if isinstance(item_value, (str, int, float)) and not isinstance(item_value, bool):
                attributes.append({"name": str(name).strip(), "value": str(item_value).strip()})
    elif isinstance(value, list):
        for item in value:
            if not isinstance(item, dict):
                continue
            name = source_text(first_value(item, ALIASES["attribute_name"]))
            item_value = first_value(item, ALIASES["attribute_value"])
            if name and isinstance(item_value, (str, int, float)) and not isinstance(item_value, bool):
                attributes.append({"name": name, "value": str(item_value).strip()})
    return [item for item in attributes if item["name"] and item["value"]]


def find_variation_records(record: dict[str, Any]) -> list[dict[str, Any]]:
    raw = first_value(record, ALIASES["variations"])
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    if isinstance(raw, dict):
        for child in raw.values():
            if isinstance(child, list):
                return [item for item in child if isinstance(item, dict)]
    return []


def looks_like_product(record: dict[str, Any], path: tuple[str, ...]) -> bool:
    if any(normalized_key(part) in VARIATION_PATH_KEYS for part in path):
        return False
    mapped = record_map(record)
    has_product_id = any(alias in mapped for alias in ALIASES["product_id"])
    has_generic_id = any(alias in mapped for alias in ALIASES["generic_id"])
    has_sku = any(alias in mapped for alias in ALIASES["sku"])
    has_name = any(alias in mapped for alias in ALIASES["name"])
    has_variations = any(alias in mapped for alias in ALIASES["variations"])
    return has_name and (has_product_id or (has_generic_id and (has_sku or has_variations)))


def walk_products(value: Any, path: tuple[str, ...] = ()) -> Iterable[tuple[tuple[str, ...], dict[str, Any]]]:
    if isinstance(value, dict):
        if looks_like_product(value, path):
            yield path, value
        for key, child in value.items():
            yield from walk_products(child, (*path, str(key)))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk_products(child, (*path, str(index)))


def stable_slug(name: str, store_id: str | None, product_id: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")[:55] or "produk"
    digest = hashlib.sha1(f"{store_id or ''}:{product_id}".encode()).hexdigest()[:8]
    return f"{base}-{digest}"


def normalize_variations(
    record: dict[str, Any],
    source_url: str,
    product_id: str,
    review: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, variation in enumerate(find_variation_records(record)):
        variation_id = identity_text(first_value(variation, ALIASES["variation_id"]))
        sku = source_text(first_value(variation, ALIASES["sku"]))
        name = source_text(first_value(variation, ALIASES["variation_name"]))
        missing = [field for field, value in (("ID variasi", variation_id), ("SKU variasi", sku), ("nama variasi", name)) if not value]
        if missing:
            review.append({
                "sourceUrl": source_url,
                "productId": product_id,
                "variationIndex": index,
                "reason": f"Tidak diimpor: {', '.join(missing)} tidak tersedia sebagai teks yang valid.",
            })
            continue
        if variation_id in seen:
            continue
        seen.add(variation_id)
        attributes = extract_attributes(first_value(variation, ALIASES["attributes"]))
        normalized.append({
            "sourceVariationId": variation_id,
            "name": name,
            "sku": sku,
            "attributes": attributes,
        })
    return normalized


def normalize_product(
    record: dict[str, Any],
    source_url: str,
    path: tuple[str, ...],
    review: list[dict[str, Any]],
) -> dict[str, Any] | None:
    product_id = identity_text(
        first_value(record, ALIASES["product_id"]) or first_value(record, ALIASES["generic_id"]),
    )
    store_id = identity_text(first_value(record, ALIASES["store_id"]))
    sku = source_text(first_value(record, ALIASES["sku"]))
    name = source_text(first_value(record, ALIASES["name"]))
    missing = [field for field, value in (("ID produk", product_id), ("SKU", sku), ("nama produk", name)) if not value]
    if missing:
        review.append({
            "sourceUrl": source_url,
            "jsonPath": ".".join(path),
            "productId": product_id,
            "reason": f"Tidak diimpor: {', '.join(missing)} tidak tersedia sebagai teks yang valid.",
        })
        return None

    model = source_text(first_value(record, ALIASES["model"]))
    description = source_text(first_value(record, ALIASES["description"]))
    attributes = extract_attributes(first_value(record, ALIASES["attributes"]))
    variations = normalize_variations(record, source_url, product_id, review)
    return {
        "sourceProductId": product_id,
        "storeId": store_id,
        "slug": stable_slug(name, store_id, product_id),
        "sku": sku,
        "name": name,
        "model": model,
        "description": description,
        "attributes": attributes,
        "variations": variations,
    }


def load_captures() -> list[dict[str, Any]]:
    captures: list[dict[str, Any]] = []
    for path in sorted(CAPTURE_DIR.glob("capture-*.json")):
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if isinstance(value, dict) and isinstance(value.get("payload"), (dict, list)):
            captures.append(value)
    return captures


def note_id(prefix: str, *parts: str | None) -> str:
    safe_parts = [re.sub(r"[^a-zA-Z0-9_-]", "-", part or "unknown") for part in parts]
    return "--".join((prefix, *safe_parts))


def yaml_text(value: str | None) -> str:
    return json.dumps(value or "", ensure_ascii=False)


def clear_generated_notes(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for path in directory.glob("duoke--*.md"):
        path.unlink()


def write_vault(products: list[dict[str, Any]], synced_at: str) -> None:
    PRODUCT_NOTES.mkdir(parents=True, exist_ok=True)
    VARIATION_NOTES.mkdir(parents=True, exist_ok=True)
    (VAULT_DIR / ".obsidian").mkdir(parents=True, exist_ok=True)
    clear_generated_notes(PRODUCT_NOTES)
    clear_generated_notes(VARIATION_NOTES)

    product_links: list[str] = []
    for product in products:
        product_note = note_id("duoke", product["storeId"], product["sourceProductId"])
        variation_links: list[str] = []
        for variation in product["variations"]:
            variation_note = note_id(
                "duoke", product["storeId"], product["sourceProductId"], variation["sourceVariationId"],
            )
            variation_links.append(f"[[variations/{variation_note}|{variation['name']} · {variation['sku']}]]")
            attributes = "\n".join(
                f"- **{item['name']}:** {item['value']}" for item in variation["attributes"]
            ) or "- Tidak ada atribut tambahan pada sumber."
            (VARIATION_NOTES / f"{variation_note}.md").write_text(
                "\n".join([
                    "---",
                    "source: duoke",
                    f"source_variation_id: {yaml_text(variation['sourceVariationId'])}",
                    f"sku: {yaml_text(variation['sku'])}",
                    f"synced_at: {yaml_text(synced_at)}",
                    "generated: true",
                    "---",
                    "",
                    f"# {variation['name']}",
                    "",
                    f"Produk induk: [[products/{product_note}|{product['name']}]]",
                    "",
                    "## Atribut",
                    "",
                    attributes,
                    "",
                ]),
                encoding="utf-8",
            )

        product_links.append(f"[[products/{product_note}|{product['name']} · {product['sku']}]]")
        attributes = "\n".join(
            f"- **{item['name']}:** {item['value']}" for item in product["attributes"]
        ) or "- Tidak ada atribut tambahan pada sumber."
        variations = "\n".join(f"- {link}" for link in variation_links) or "- Tidak ada variasi pada sumber."
        (PRODUCT_NOTES / f"{product_note}.md").write_text(
            "\n".join([
                "---",
                "source: duoke",
                f"source_product_id: {yaml_text(product['sourceProductId'])}",
                f"store_id: {yaml_text(product['storeId'])}",
                f"sku: {yaml_text(product['sku'])}",
                f"synced_at: {yaml_text(synced_at)}",
                "generated: true",
                "---",
                "",
                f"# {product['name']}",
                "",
                f"- **SKU:** {product['sku']}",
                f"- **Model:** {product['model'] or 'Tidak tersedia pada sumber'}",
                f"- **Detail:** {product['description'] or 'Tidak tersedia pada sumber'}",
                "",
                "## Atribut",
                "",
                attributes,
                "",
                "## Variasi",
                "",
                variations,
                "",
            ]),
            encoding="utf-8",
        )

    (VAULT_DIR / "Duoke Catalog.md").write_text(
        "\n".join([
            "---",
            "source: duoke",
            f"synced_at: {yaml_text(synced_at)}",
            f"product_count: {len(products)}",
            "generated: true",
            "---",
            "",
            "# Katalog Produk Duoke",
            "",
            *(f"- {link}" for link in product_links),
            "",
        ]),
        encoding="utf-8",
    )


def main() -> int:
    captures = load_captures()
    if not captures:
        print(f"Tidak ada capture produk di {CAPTURE_DIR}.")
        return 2

    review: list[dict[str, Any]] = []
    products_by_identity: dict[tuple[str | None, str], dict[str, Any]] = {}
    conflicts: set[tuple[str | None, str]] = set()

    for capture in captures:
        source_url = str(capture.get("sourceUrl", ""))
        for path, record in walk_products(capture["payload"]):
            product = normalize_product(record, source_url, path, review)
            if not product:
                continue
            identity = (product["storeId"], product["sourceProductId"])
            previous = products_by_identity.get(identity)
            if previous and previous != product:
                conflicts.add(identity)
                review.append({
                    "sourceUrl": source_url,
                    "productId": product["sourceProductId"],
                    "storeId": product["storeId"],
                    "reason": "Tidak diimpor: ditemukan data berbeda untuk identitas sumber yang sama.",
                })
                continue
            products_by_identity[identity] = product

    for identity in conflicts:
        products_by_identity.pop(identity, None)

    products = sorted(products_by_identity.values(), key=lambda item: (item["sku"], item["name"]))
    synced_at = utc_now()
    catalog = {
        "schemaVersion": 1,
        "source": "duoke",
        "syncedAt": synced_at,
        "products": products,
    }
    report = {
        "source": "duoke",
        "syncedAt": synced_at,
        "capturedResponses": len(captures),
        "importedProducts": len(products),
        "importedVariations": sum(len(product["variations"]) for product in products),
        "reviewItems": review,
    }

    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_vault(products, synced_at)

    print(f"Produk valid: {len(products)}")
    print(f"Variasi valid: {report['importedVariations']}")
    print(f"Perlu diperiksa: {len(review)}")
    print(f"Katalog admin: {CATALOG_PATH}")
    print(f"Vault Obsidian: {VAULT_DIR}")
    return 0 if products else 3


if __name__ == "__main__":
    raise SystemExit(main())
