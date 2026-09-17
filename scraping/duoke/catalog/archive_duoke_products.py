"""Export Duoke product data and verified product links into an Obsidian vault."""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import re
import unicodedata
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx

from scraping.duoke.chat.archive_duoke_chats import (
    CONVERSATION_INDEX_NAME, MANUAL_MARKER, conversation_ref, message_key, private_json,
    render_index as render_chat_index, render_note as render_chat_note, write_note,
)
from scraping.shared.common import read_json, stable_hash, utc_now
from scraping.shared.paths import CHAT_ARCHIVE_DIR, PRODUCT_ARCHIVE_DIR, ROOT


PRODUCT_URL = "https://web.duoke.com/api/v1/dk/unity/product/list"
PRODUCT_NOTE_DIR = "Duoke/Produk"
CHAT_NOTE_DIR = "Duoke/Percakapan"
PRODUCT_INDEX_NAME = "Product catalog index.md"
PRODUCT_FIELDS = (
    "shopId", "platform", "site", "shopName", "productId", "productName", "productSku",
    "productDescription", "productBrand", "productAttribute", "productCategoryName",
    "productMinPrice", "productMaxPrice", "productCurrency", "productStock",
    "productImage", "productVideoUrl", "productUrl", "platformProductStatus",
    "platformCreateTime", "platformUpdateTime", "createTime", "updateTime", "extraInfo",
)
VARIANT_FIELDS = ("itemId", "itemSku", "currency", "price", "attribute", "stock", "extraInfo")


def parsed(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            pass
    return value


def normalized(value: Any) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", str(value or ""))).strip().casefold()


def product_key(product: dict[str, Any]) -> tuple[str, str, str]:
    return tuple(str(product[key]) for key in ("platform", "shopId", "productId"))


def product_ref(product: dict[str, Any]) -> str:
    return stable_hash(*product_key(product))


def product_note(product: dict[str, Any]) -> str:
    return f"{PRODUCT_NOTE_DIR}/Product {product_ref(product)}"


def clean_product(source: dict[str, Any]) -> dict[str, Any]:
    product = {key: source.get(key) for key in PRODUCT_FIELDS}
    if any(not product.get(key) for key in ("platform", "shopId", "productId", "productName")):
        raise ValueError("A product lacks a stable source identity or name.")
    product["items"] = [{key: item.get(key) for key in VARIANT_FIELDS} for item in source.get("items") or []]
    return product


class DescriptionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.images: list[str] = []
        self.hidden = 0

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag == "img":
            source = dict(attrs).get("src")
            if source and urlsplit(source).scheme in ("http", "https"):
                self.images.append(source)
        if tag in ("script", "style"):
            self.hidden += 1
        if tag in ("br", "p", "div", "li", "h1", "h2", "h3", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)
        if tag in ("p", "div", "li", "h1", "h2", "h3", "tr"):
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.hidden:
            self.parts.append(data)


def description_text(product: dict[str, Any]) -> str:
    source = product.get("productDescription")
    if not source:
        info = parsed((product.get("extraInfo") or {}).get("descriptionInfo"))
        if isinstance(info, dict):
            fields = (info.get("extended_description") or {}).get("field_list") or []
            source = "\n".join(str(field["text"]) for field in fields if field.get("text"))
        elif isinstance(info, str):
            source = info
    text = str(source or "")
    if re.search(r"</?[a-z][a-z0-9]*\b[^>]*>", text, re.I):
        parser = DescriptionParser()
        parser.feed(text)
        text = "".join(parser.parts)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def description_images(product: dict[str, Any]) -> list[str]:
    parser = DescriptionParser()
    parser.feed(str(product.get("productDescription") or ""))
    info = parsed((product.get("extraInfo") or {}).get("descriptionInfo"))
    if isinstance(info, dict):
        for field in (info.get("extended_description") or {}).get("field_list") or []:
            image = (field.get("image_info") or {}).get("image_url")
            if image and urlsplit(image).scheme in ("http", "https"):
                parser.images.append(image)
    return list(dict.fromkeys(parser.images))


def all_skus(product: dict[str, Any]) -> list[str]:
    return list(dict.fromkeys(str(value) for value in (
        product.get("productSku"), *(variant.get("itemSku") for variant in product.get("items") or []),
    ) if value not in (None, "")))


def label(value: Any) -> str:
    return str(value if value not in (None, "") else "Not provided").replace("|", " / ").replace("[", "(").replace("]", ")").replace("\n", " ")


def structured_lines(value: Any) -> list[str]:
    return ["    " + line for line in json.dumps(parsed(value), ensure_ascii=False, indent=2).splitlines()]


def render_product(product: dict[str, Any], backlinks: list[str], captured_at: str) -> str:
    skus = all_skus(product)
    lines = ["---", "source: duoke", "source_origin: https://web.duoke.com", "status: source_catalog",
             f"captured_at: {captured_at}", f"product_ref: {product_ref(product)}",
             f"source_product_id: {json.dumps(str(product['productId']))}",
             f"source_shop_id: {json.dumps(str(product['shopId']))}",
             f"platform: {json.dumps(product['platform'])}",
             f"sku: {json.dumps(product.get('productSku') or '', ensure_ascii=False)}",
             f"aliases: {json.dumps(list(dict.fromkeys([product['productName'], *skus])), ensure_ascii=False)}",
             "---", "", f"# {product['productName']}", "", f"[[{PRODUCT_NOTE_DIR}/Product catalog index|Product catalog]]", "",
             "## Identity", "", f"- Store: {product.get('shopName') or 'Not provided'}",
             f"- Channel: {product['platform']}", f"- Product SKU: {product.get('productSku') or 'Not provided'}",
             f"- Source product ID: {product['productId']}", f"- Brand: {product.get('productBrand') or 'Not provided'}",
             f"- Category: {product.get('productCategoryName') or 'Not provided'}", "",
             "Use the exact store, product ID, and variant SKU when identifying a product.",
             "A conversation link identifies a reference, not proof of which variant was purchased.", "",
             "## Source description", ""]
    description = description_text(product)
    missing = "Douke provided an image-only description; its URL references are listed below." if description_images(product) else "No text description was provided by Douke."
    lines.extend("> " + line for line in (description or missing).splitlines())
    lines.extend(["", "## Variants", "", "| Variant ID | SKU | Attributes | Price | Currency | Stock |",
                  "| --- | --- | --- | --- | --- | --- |"])
    for variant in product.get("items") or []:
        values = [variant.get(key) for key in ("itemId", "itemSku", "attribute", "price", "currency", "stock")]
        lines.append("| " + " | ".join(label(value) for value in values) + " |")
    lines.extend(["", "## Catalog snapshot", "",
                  f"- Price range: {product.get('productMinPrice')} – {product.get('productMaxPrice')} {product.get('productCurrency') or ''}",
                  f"- Stock: {product.get('productStock')}",
                  f"- Source status: {product.get('platformProductStatus')}",
                  f"- Source platform update timestamp: {product.get('platformUpdateTime')}", "",
                  "Prices and stock describe the Duoke snapshot at capture time.", "",
                  "## Source attributes", ""])
    lines.extend(structured_lines(product.get("productAttribute")))
    lines.extend(["", "## Source media references", "",
                  "These URL values were returned by Douke. External marketplace pages and media were not fetched.", ""])
    for key in ("productImage", "productVideoUrl", "productUrl"):
        if product.get(key):
            lines.append(f"- {key}: `{str(product[key]).replace('`', '')}`")
    for index, image_url in enumerate(description_images(product), start=1):
        lines.append(f"- Description image {index}: `{image_url.replace('`', '')}`")
    lines.extend(["", "## Related conversations", ""])
    lines.extend(f"- [[{CHAT_NOTE_DIR}/Conversation {ref}]]" for ref in sorted(set(backlinks)))
    if not backlinks:
        lines.append("No verified reference was found in the captured conversations.")
    lines.extend(["", "## Manual notes", "", MANUAL_MARKER, ""])
    return "\n".join(lines)


class ProductMatcher:
    def __init__(self, products: list[dict[str, Any]]) -> None:
        self.products = {product_ref(p): p for p in products}
        self.ids: dict[tuple[str, str, str], set[str]] = defaultdict(set)
        self.names: dict[tuple[str, str, str], set[str]] = defaultdict(set)
        self.skus: dict[tuple[str, str, str], set[str]] = defaultdict(set)
        self.text_patterns: dict[tuple[str, str], list[tuple[re.Pattern, set[str], str]]] = defaultdict(list)
        for ref, p in self.products.items():
            scope = (str(p["platform"]), str(p["shopId"]))
            self.ids[(*scope, str(p["productId"]))].add(ref)
            self.names[(*scope, normalized(p["productName"]))].add(ref)
            for sku in all_skus(p):
                self.skus[(*scope, normalized(sku))].add(ref)
        for (platform, shop, sku), refs in self.skus.items():
            if len(sku) >= 3 and re.search(r"[a-z]", sku) and re.search(r"\d", sku):
                pattern = re.compile(r"(?<![\w-])" + re.escape(sku) + r"(?![\w-])", re.I)
                self.text_patterns[(platform, shop)].append((pattern, refs, sku))

    def match(self, conversation: dict[str, Any], message: dict[str, Any]) -> tuple[list[dict[str, str]], bool]:
        scope = (str(conversation["platform"]), str(conversation["shopId"]))
        content = parsed(message.get("messageContent"))
        body = content if isinstance(content, dict) else {}
        custom = message.get("cloudCustomData") or {}
        found: dict[str, dict[str, str]] = {}
        ambiguous = False

        def add(refs: set[str], method: str) -> None:
            nonlocal ambiguous
            if len(refs) > 1:
                ambiguous = True
            elif len(refs) == 1:
                ref = next(iter(refs))
                product = self.products[ref]
                found[ref] = {"ref": ref, "note": product_note(product), "name": product["productName"], "method": method}

        if message.get("messageType") in ("item", "goods_card", "product"):
            identifier = body.get("itemId") or body.get("productId") or custom.get("productId")
            if identifier:
                add(self.ids.get((*scope, str(identifier)), set()), "source_product_id")
                return list(found.values()), ambiguous
        for key in ("productName", "title"):
            if body.get(key):
                add(self.names.get((*scope, normalized(body[key])), set()), "exact_source_name")
        for key in ("skuValue", "sku", "productSku", "itemSku"):
            if body.get(key):
                add(self.skus.get((*scope, normalized(body[key])), set()), "exact_source_sku")
        if message.get("messageType") == "text":
            text = normalized(body.get("text") if body else content)
            for pattern, refs, sku in self.text_patterns.get(scope, []):
                if pattern.search(text):
                    add(refs, "explicit_sku_in_text")
        return list(found.values()), ambiguous


async def fetch_store(read, shop: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    products: dict[str, dict[str, Any]] = {}
    expected = None
    pages = 1
    page = 1
    while page <= pages:
        data = await read({"shopId": shop["id"], "platform": shop["platform"], "messageItemIds": "", "pageSize": 20, "pageNo": page})
        if data is None:
            return [], {"shopId": shop["id"], "platform": shop["platform"], "status": "no_catalog_response", "products": 0}
        if expected is None:
            expected = int(data["total"])
            pages = max(int(data["pages"]), math.ceil(expected / 20))
        if int(data["total"]) != expected or int(data["pageNum"]) != page:
            raise ValueError("Product pagination changed or returned a different page.")
        before = len(products)
        for source in data.get("list") or []:
            product = clean_product(source)
            if str(product["shopId"]) != str(shop["id"]) or product["platform"] != shop["platform"]:
                raise ValueError("A product belongs to a different store.")
            products[product_ref(product)] = product
        if page < pages and len(products) == before:
            raise ValueError("Product pagination stalled.")
        page += 1
    if len(products) != expected:
        raise ValueError("Unique product count differs from the source total.")
    return list(products.values()), {"shopId": shop["id"], "platform": shop["platform"], "status": "complete", "products": len(products), "expected": expected, "pages": pages}


async def fetch_catalog(session_path: Path) -> dict[str, Any]:
    session = json.loads(session_path.read_text())
    if session["list_url"] != PRODUCT_URL:
        raise ValueError("Product capture is restricted to the verified web.duoke.com endpoint.")
    products = []
    stores = []
    async with httpx.AsyncClient(headers=session["headers"], timeout=30, follow_redirects=False) as client:
        async def read(body):
            for attempt in range(4):
                await asyncio.sleep(0.2 * (2 ** attempt))
                try:
                    response = await client.post(PRODUCT_URL, json=body)
                except httpx.TransportError:
                    if attempt == 3:
                        raise RuntimeError("Duoke product API remained unavailable.") from None
                    continue
                if response.status_code == 429:
                    raise RuntimeError("Duoke rate limited product capture; retry after the indicated interval.")
                if response.status_code >= 500 and attempt < 3:
                    continue
                if response.status_code != 200:
                    raise RuntimeError(f"Duoke product API returned HTTP {response.status_code}.")
                payload = response.json()
                if payload.get("code") != 0:
                    raise RuntimeError("Duoke rejected product capture; verify the authorized session.")
                return payload.get("data")
            raise RuntimeError("No successful product response.")

        for shop in json.loads((PRODUCT_ARCHIVE_DIR / "shops.json").read_text()):
            items, report = await fetch_store(read, shop)
            products.extend(items)
            stores.append(report)
            print(f"Store processed: {shop['platform']}; {report['status']}; {len(items)} products.", flush=True)
    result = {"source": "duoke", "source_origin": "https://web.duoke.com", "captured_at": utc_now(), "products": products, "stores": stores}
    private_json(PRODUCT_ARCHIVE_DIR / "catalog.json", result)
    return result


def export_catalog(catalog: dict[str, Any], vault: Path) -> dict[str, Any]:
    if any(store["status"] not in ("complete", "no_catalog_response") for store in catalog["stores"]):
        raise ValueError("An incomplete catalog cannot be exported as complete.")
    products = [clean_product(p) for p in catalog["products"]]
    if len({product_key(p) for p in products}) != len(products):
        raise ValueError("The catalog contains duplicate source products.")
    matcher = ProductMatcher(products)
    backlinks: dict[str, set[str]] = defaultdict(set)
    changed = []
    linked_messages = 0
    ambiguous_messages = 0
    review_references = []
    for path in sorted((CHAT_ARCHIVE_DIR / "conversations").glob("*.json")):
        record = json.loads(path.read_text())
        context = {}
        review = {}
        ref = conversation_ref(record["conversation"])
        for message in record["messages"]:
            matches, ambiguous = matcher.match(record["conversation"], message)
            ambiguous_messages += int(ambiguous)
            if ambiguous:
                review[message_key(message)] = "Multiple products share a referenced name or SKU; verify the source product and variant."
                review_references.append({"conversation_ref": ref, "message_ref": stable_hash(message_key(message))})
            if matches:
                linked_messages += 1
                context[message_key(message)] = matches
                for match in matches:
                    backlinks[match["ref"]].add(ref)
        record["product_context"] = context
        record["product_context_review"] = review
        private_json(path, record)
        write_note(vault / CHAT_NOTE_DIR / f"Conversation {ref}.md", render_chat_note(record))
        if context:
            changed.append(ref)
    captured_at = catalog.get("captured_at") or utc_now()
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for product in products:
        ref = product_ref(product)
        write_note(vault / f"{product_note(product)}.md", render_product(product, sorted(backlinks[ref]), captured_at))
        groups[(product["platform"], product.get("shopName") or "Unknown store")].append(product)
    summary = {
        "source": "duoke", "source_origin": "https://web.duoke.com", "exported_at": utc_now(),
        "products": len(products), "variants": sum(len(p["items"]) for p in products),
        "descriptions": sum(bool(description_text(p)) for p in products),
        "image_only_descriptions": sum(not description_text(p) and bool(description_images(p)) for p in products),
        "linked_conversations": len(changed), "linked_messages": linked_messages,
        "referenced_products": sum(bool(value) for value in backlinks.values()),
        "ambiguous_messages": ambiguous_messages,
        "missing_product_skus": sum(not p.get("productSku") for p in products),
        "missing_variant_skus": sum(not v.get("itemSku") for p in products for v in p["items"]),
        "stores": catalog["stores"],
    }
    lines = ["# Duoke product catalog", "", f"Captured: {captured_at}", "", f"Products: {len(products)}",
             f"Variants: {summary['variants']}", f"Linked conversations: {len(changed)}", "",
             f"[[{CHAT_NOTE_DIR}/Conversation archive index|Conversation archive]]", "",
             "All catalog data comes from web.duoke.com. Marketplace pages and media were not fetched.",
             "Products are kept separate by store and source ID, even when SKUs match.",
             "Missing SKUs and ambiguous references remain unresolved; do not infer a purchased variant.", ""]
    for (platform, shop), members in sorted(groups.items()):
        lines.extend([f"## {shop} ({platform})", "", f"Products: {len(members)}", ""])
        for product in sorted(members, key=lambda p: p["productName"].casefold()):
            display = label(f"{product.get('productSku') or 'SKU not provided'} — {product['productName']}")
            lines.append(f"- [[{product_note(product)}|{display}]]")
        lines.append("")
    lines.extend(["## Coverage", "",
                  f"Descriptions available: {summary['descriptions']}/{len(products)}.",
                  f"Missing parent SKUs: {summary['missing_product_skus']}; missing variant SKUs: {summary['missing_variant_skus']}.",
                  f"Ambiguous message references: {ambiguous_messages}.",
                  f"Channels without a catalog response: {sum(s['status'] == 'no_catalog_response' for s in catalog['stores'])}.",
                  "", "## Manual notes", "", MANUAL_MARKER, ""])
    write_note(vault / PRODUCT_NOTE_DIR / PRODUCT_INDEX_NAME, "\n".join(lines))
    manifest = read_json(CHAT_ARCHIVE_DIR / "manifest.json", {})
    snapshot = read_json(CHAT_ARCHIVE_DIR / "conversations.json", {})
    if manifest.get("complete") and snapshot.get("complete"):
        write_note(
            vault / CHAT_NOTE_DIR / CONVERSATION_INDEX_NAME,
            render_chat_index(manifest, snapshot["conversations"], vault / CHAT_NOTE_DIR),
        )
    private_json(PRODUCT_ARCHIVE_DIR / "verification.json", summary)
    private_json(PRODUCT_ARCHIVE_DIR / "context-review.json", {"source": "duoke", "ambiguous_references": review_references})
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", type=Path, required=True)
    parser.add_argument("--fetch", action="store_true", help="Refresh catalog data from the verified Duoke endpoint")
    parser.add_argument("--session", type=Path, default=PRODUCT_ARCHIVE_DIR / "session.json")
    args = parser.parse_args()
    if not args.vault.is_absolute():
        args.vault = ROOT / args.vault
    if not args.vault.is_dir():
        parser.error("The existing Obsidian vault is required.")
    catalog = asyncio.run(fetch_catalog(args.session)) if args.fetch else json.loads((PRODUCT_ARCHIVE_DIR / "catalog.json").read_text())
    summary = export_catalog(catalog, args.vault)
    print(json.dumps({key: value for key, value in summary.items() if key != "stores"}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
