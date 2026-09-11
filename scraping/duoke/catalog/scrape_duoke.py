#!/usr/bin/env python3
"""Capture product-related Duoke API responses through an authorized browser session."""

from __future__ import annotations

from scraping.shared.common import utc_now

import argparse
import json
import re
from pathlib import Path
from typing import Any

from scrapling.fetchers import DynamicSession


from scraping.shared.paths import ROOT, PRIVATE_DIR, CAPTURE_DIR, PROFILE_DIR
TARGET_URL = "https://web.duoke.com/?lang=id#/dk/main/knowledgeBase"

PRODUCT_URL = re.compile(r"product|goods|sku|item|commodity|catalog|inventory", re.I)
BLOCKED_URL = re.compile(r"chat|message|conversation|customer|buyer|contact|order", re.I)
PRODUCT_KEYS = {
    "productid", "product_id", "productname", "product_name", "goodsid", "goods_id",
    "goodsname", "goods_name", "itemid", "item_id", "itemname", "item_name", "sku",
    "skucode", "sku_code", "skulist", "sku_list", "variants", "variations",
}
SENSITIVE_KEYS = re.compile(
    r"^(phone|mobile|telephone|email|address|receiver|buyer|customer|contact|chat|message|conversation)(_|$)",
    re.I,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Open Duoke with an authorized session and capture product data responses only.",
    )
    parser.add_argument("--url", default=TARGET_URL, help="Initial Duoke URL")
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Use the saved session without displaying the browser (only after the first login).",
    )
    return parser.parse_args()


def contains_product_shape(value: Any) -> bool:
    if isinstance(value, dict):
        normalized = {str(key).lower() for key in value}
        if normalized & PRODUCT_KEYS:
            return True
        return any(contains_product_shape(child) for child in value.values())
    if isinstance(value, list):
        return any(contains_product_shape(child) for child in value[:50])
    return False


def strip_sensitive_fields(value: Any) -> Any:
    if isinstance(value, list):
        return [strip_sensitive_fields(item) for item in value]
    if not isinstance(value, dict):
        return value

    clean: dict[str, Any] = {}
    for key, child in value.items():
        key_text = str(key)
        if SENSITIVE_KEYS.search(key_text):
            continue
        clean[key_text] = strip_sensitive_fields(child)
    return clean


def interactive_step(page: Any) -> None:
    if not page.url.startswith("https://web.duoke.com"):
        raise RuntimeError("The browser is outside the Duoke domain.")

    print("\nThe Duoke browser is open.")
    print("1. Sign in with an authorized account if prompted.")
    print("2. Open the product catalog and load every product page that must be synchronized.")
    print("3. Do not open customer conversations during this process.")
    input("After the catalog has fully loaded, return to the terminal and press Enter... ")
    page.wait_for_timeout(1500)


def main() -> int:
    args = parse_args()
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    with DynamicSession(
        headless=args.headless,
        user_data_dir=str(PROFILE_DIR),
        disable_resources=False,
        network_idle=False,
        timeout=120_000,
        wait=1000,
        capture_xhr=r".*",
        locale="id-ID",
        timezone_id="Asia/Jakarta",
    ) as session:
        response = session.fetch(
            args.url,
            page_action=None if args.headless else interactive_step,
        )

    captured_at = utc_now()
    saved: list[dict[str, Any]] = []
    skipped = 0

    for index, xhr in enumerate(response.captured_xhr, start=1):
        url = str(xhr.url)
        if BLOCKED_URL.search(url):
            skipped += 1
            continue

        try:
            payload = json.loads(xhr.body)
        except (json.JSONDecodeError, UnicodeDecodeError, TypeError):
            skipped += 1
            continue

        if not PRODUCT_URL.search(url) and not contains_product_shape(payload):
            skipped += 1
            continue

        clean_payload = strip_sensitive_fields(payload)
        filename = f"capture-{index:04d}.json"
        output = {
            "source": "duoke",
            "sourceUrl": url,
            "capturedAt": captured_at,
            "payload": clean_payload,
        }
        (CAPTURE_DIR / filename).write_text(
            json.dumps(output, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        saved.append({"file": filename, "url": url, "status": xhr.status})

    index_output = {
        "source": "duoke",
        "capturedAt": captured_at,
        "savedResponses": saved,
        "skippedResponses": skipped,
    }
    (PRIVATE_DIR / "capture-index.json").write_text(
        json.dumps(index_output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\nComplete: {len(saved)} product responses saved; {skipped} other responses ignored.")
    print(f"Private index: {PRIVATE_DIR / 'capture-index.json'}")
    if not saved:
        print("No product responses were captured. Make sure the catalog page is open and its data is loaded.")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
