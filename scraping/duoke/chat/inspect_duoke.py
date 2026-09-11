#!/usr/bin/env python3
"""Create a private, read-only inventory for configuring Duoke DOM selectors."""

from __future__ import annotations

import argparse
import re
from typing import Any

from playwright.sync_api import Response, sync_playwright

from scraping.shared.common import DEFAULT_DUOKE_URL, is_duoke_url, sanitize_url, stable_hash, utc_now, write_json
from scraping.shared.paths import PRIVATE_DIR, PROFILE_DIR


RELEVANT_RE = re.compile(r"chat|message|conversation|session|dialog|inbox|unread|editor|composer|send", re.I)
REPORT_PATH = PRIVATE_DIR / "duoke-capabilities.json"


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect the Duoke structure without opening or changing conversations.")
    parser.add_argument("--url", default=DEFAULT_DUOKE_URL)
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()
    if not is_duoke_url(args.url):
        print("The URL must use the web.duoke.com domain.")
        return 2

    endpoints: set[str] = set()

    def response_seen(response: Response) -> None:
        if is_duoke_url(response.url) and RELEVANT_RE.search(response.url):
            endpoints.add(sanitize_url(response.url))

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=not args.headed,
            viewport={"width": 1440, "height": 900},
            locale="id-ID",
            timezone_id="Asia/Jakarta",
        )
        context.on("response", response_seen)
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_timeout(4000)
        expired = page.locator("input[type=password]").count() > 0
        nodes: list[dict[str, Any]] = []
        if not expired:
            raw_nodes = page.locator("body *").evaluate_all(
                """elements => elements.map(element => {
                  const attrs = {};
                  for (const attr of element.attributes || []) {
                    if (attr.name === 'id' || attr.name === 'class' || attr.name === 'role' ||
                        attr.name === 'placeholder' || attr.name === 'contenteditable' ||
                        attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
                      attrs[attr.name] = String(attr.value || '').slice(0, 240);
                    }
                  }
                  return { tag: element.tagName.toLowerCase(), attrs };
                }).filter(item => {
                  const value = Object.entries(item.attrs).map(([k,v]) => `${k} ${v}`).join(' ');
                  return /chat|message|conversation|session|dialog|inbox|unread|editor|composer|send/i.test(value) ||
                         item.tag === 'textarea' || item.attrs.contenteditable === 'true';
                }).slice(0, 500)""",
            )
            for item in raw_nodes:
                attributes = item.get("attrs", {})
                clean_attributes: dict[str, str] = {}
                for name, value in attributes.items():
                    if name in {"class", "role", "contenteditable"}:
                        clean_attributes[name] = value
                    elif name in {"id", "placeholder"} and RELEVANT_RE.search(value):
                        clean_attributes[name] = value
                    else:
                        clean_attributes[name] = f"ref:{stable_hash(value, length=12)}" if value else ""
                nodes.append({"tag": item.get("tag"), "attributes": clean_attributes})

        report = {
            "schemaVersion": 1,
            "inspectedAt": utc_now(),
            "status": "login_required" if expired else "ready_for_selector_mapping",
            "routeRef": stable_hash(page.url),
            "matchedEndpoints": sorted(endpoints),
            "candidateNodes": nodes,
            "openedConversation": False,
            "modifiedContent": False,
        }
        write_json(REPORT_PATH, report)
        context.close()

    print(f"Status: {report['status']}")
    print(f"Relevant endpoints: {len(endpoints)}; candidate nodes: {len(nodes)}")
    print(f"Private report: {REPORT_PATH}")
    if expired:
        print("Login ulang diperlukan: npm run duoke:login")
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
