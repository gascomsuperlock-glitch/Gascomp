#!/usr/bin/env python3
"""Capture authorized Duoke chat payloads into the git-ignored private directory."""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import BrowserContext, Page, Response, WebSocket, sync_playwright

from scraping.shared.common import DEFAULT_DUOKE_URL, is_duoke_url, sanitize_url, stable_hash, utc_now, write_json
from scraping.shared.paths import CHAT_CAPTURE_DIR, PROFILE_DIR


CHAT_ENDPOINT_RE = re.compile(
    r"chat|message|conversation|session|dialog|inbox|contact|im(?:/|\?|$)|history",
    re.I,
)
MAX_PAYLOAD_BYTES = 10 * 1024 * 1024


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Capture Duoke chat history from an authorized session into the private directory.",
    )
    parser.add_argument("--url", default=DEFAULT_DUOKE_URL, help="Initial Duoke URL")
    parser.add_argument("--headless", action="store_true", help="Use the active saved session")
    parser.add_argument(
        "--duration",
        type=int,
        default=45,
        help="Observation duration in seconds in headless mode (5-3600)",
    )
    return parser.parse_args()


class PrivateCaptureWriter:
    def __init__(self) -> None:
        run_stamp = utc_now().replace(":", "-").replace(".", "-")
        self.run_dir = CHAT_CAPTURE_DIR / run_stamp
        self.run_dir.mkdir(parents=True, exist_ok=False)
        self.items: list[dict[str, Any]] = []
        self.seen: set[str] = set()
        self.skipped = 0

    def save(self, source_type: str, url: str, raw_body: str | bytes) -> None:
        body = raw_body.encode("utf-8", errors="replace") if isinstance(raw_body, str) else raw_body
        if len(body) > MAX_PAYLOAD_BYTES:
            self.skipped += 1
            return
        try:
            payload = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError, TypeError):
            self.skipped += 1
            return
        fingerprint = stable_hash(source_type, url, json.dumps(payload, ensure_ascii=False, sort_keys=True))
        if fingerprint in self.seen:
            return
        self.seen.add(fingerprint)
        filename = f"chat-{len(self.items) + 1:05d}.json"
        captured_at = utc_now()
        write_json(self.run_dir / filename, {
            "source": "duoke",
            "sourceType": source_type,
            "sourceUrl": url,
            "capturedAt": captured_at,
            "payload": payload,
        })
        self.items.append({
            "file": filename,
            "sourceType": source_type,
            "endpoint": sanitize_url(url),
            "endpointRef": stable_hash(url),
            "capturedAt": captured_at,
        })

    def finish(self, start_url: str, final_url: str) -> Path:
        index_path = self.run_dir / "index.json"
        write_json(index_path, {
            "source": "duoke",
            "startedFrom": sanitize_url(start_url),
            "finishedAt": utc_now(),
            "finalRouteRef": stable_hash(final_url),
            "savedResponses": self.items,
            "skippedResponses": self.skipped,
        })
        return index_path


def attach_capture(context: BrowserContext, writer: PrivateCaptureWriter) -> None:
    def handle_response(response: Response) -> None:
        if not is_duoke_url(response.url) or not CHAT_ENDPOINT_RE.search(response.url):
            return
        content_type = response.headers.get("content-type", "").lower()
        if "json" not in content_type and "text" not in content_type:
            return
        try:
            writer.save("xhr", response.url, response.body())
        except Exception:
            writer.skipped += 1

    def handle_websocket(socket: WebSocket) -> None:
        if not is_duoke_url(socket.url) or not CHAT_ENDPOINT_RE.search(socket.url):
            return
        socket.on("framereceived", lambda payload: writer.save("websocket", socket.url, payload))

    context.on("response", handle_response)
    for page in context.pages:
        page.on("websocket", handle_websocket)
    context.on("page", lambda page: page.on("websocket", handle_websocket))


def wait_for_operator(page: Page) -> None:
    print("\nDuoke is open in the private browser profile.")
    print("1. Sign in if prompted.")
    print("2. Select the store and time range, then open conversations approved as sources.")
    print("3. Load the history for the required period. Do not type or send replies.")
    input("After the history has fully loaded, return to the terminal and press Enter... ")
    page.wait_for_timeout(1500)


def main() -> int:
    args = parse_args()
    if not is_duoke_url(args.url):
        raise SystemExit("The URL must use the web.duoke.com domain.")
    duration = max(5, min(args.duration, 3600))
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    writer = PrivateCaptureWriter()

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=args.headless,
            locale="id-ID",
            timezone_id="Asia/Jakarta",
            viewport={"width": 1440, "height": 900},
        )
        attach_capture(context, writer)
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=120_000)
        page.wait_for_timeout(3000)
        if not is_duoke_url(page.url):
            context.close()
            raise SystemExit("Navigation outside the Duoke domain was stopped.")
        if page.locator("input[type=password]").count() > 0:
            if args.headless:
                context.close()
                print("The Duoke session has expired. Run the command again without --headless to sign in.")
                return 3
        if args.headless:
            deadline = time.monotonic() + duration
            while time.monotonic() < deadline:
                page.wait_for_timeout(min(1000, int((deadline - time.monotonic()) * 1000)))
        else:
            wait_for_operator(page)
        final_url = page.url
        context.close()

    index_path = writer.finish(args.url, final_url)
    print(f"Private capture complete: {len(writer.items)} payloads saved, {writer.skipped} ignored.")
    print(f"Indeks: {index_path}")
    if not writer.items:
        print("No chat payloads were captured. Open and load the selected conversations while the browser is visible.")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
