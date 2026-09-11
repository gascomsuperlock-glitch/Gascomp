#!/usr/bin/env python3
"""Refresh the authorized Duoke browser session without collecting any content."""

from __future__ import annotations

import argparse

from playwright.sync_api import sync_playwright

from scraping.shared.common import DEFAULT_DUOKE_URL, is_duoke_url
from scraping.shared.paths import PROFILE_DIR


def main() -> int:
    parser = argparse.ArgumentParser(description="Sign in to Duoke and save the session in the private browser profile.")
    parser.add_argument("--url", default=DEFAULT_DUOKE_URL)
    args = parser.parse_args()
    if not is_duoke_url(args.url):
        print("The URL must use the web.duoke.com domain.")
        return 2
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=False,
            viewport={"width": 1440, "height": 900},
            locale="id-ID",
            timezone_id="Asia/Jakarta",
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=60_000)
        print("Complete the authorized sign-in in the Duoke window. Do not open customer conversations.")
        input("When the Duoke home page appears, return to the terminal and press Enter... ")
        page.wait_for_timeout(1500)
        expired = page.locator("input[type=password]").count() > 0
        context.close()
    if expired:
        print("Sign-in was not detected. Run this command again.")
        return 3
    print("The Duoke session was saved in the private directory.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
