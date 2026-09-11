#!/usr/bin/env python3
"""Read Duoke inbox conversations and reply only from approved knowledge entries."""

from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlsplit

from playwright.sync_api import BrowserContext, Locator, Page, sync_playwright

from scraping.shared.common import DEFAULT_DUOKE_URL, is_duoke_url, load_env_file, read_json, stable_hash, utc_now, write_json
from scraping.shared.paths import AUTOREPLY_LOG, AUTOREPLY_STATE, KNOWLEDGE_PATH, PROFILE_DIR, STOP_FILE
from scraping.duoke.knowledge.knowledge_engine import RetrievalResult, retrieve


@dataclass(frozen=True)
class SelectorConfig:
    inbox_url: str
    iframe: str
    conversation: str
    unread: str
    conversation_id_attribute: str
    message: str
    message_id_attribute: str
    message_direction_attribute: str
    incoming_values: frozenset[str]
    product_sku: str
    composer: str
    send_button: str

    @classmethod
    def from_environment(cls) -> "SelectorConfig":
        file_env = load_env_file()

        def value(name: str, fallback: str = "") -> str:
            return os.environ.get(name, file_env.get(name, fallback)).strip()

        return cls(
            inbox_url=value("DUOKE_INBOX_URL", DEFAULT_DUOKE_URL),
            iframe=value("DUOKE_IFRAME_SELECTOR"),
            conversation=value("DUOKE_CONVERSATION_SELECTOR"),
            unread=value("DUOKE_UNREAD_SELECTOR"),
            conversation_id_attribute=value("DUOKE_CONVERSATION_ID_ATTRIBUTE"),
            message=value("DUOKE_MESSAGE_SELECTOR"),
            message_id_attribute=value("DUOKE_MESSAGE_ID_ATTRIBUTE"),
            message_direction_attribute=value("DUOKE_MESSAGE_DIRECTION_ATTRIBUTE"),
            incoming_values=frozenset(
                item.strip().casefold()
                for item in value("DUOKE_INCOMING_DIRECTION_VALUES", "incoming,customer,buyer,received").split(",")
                if item.strip()
            ),
            product_sku=value("DUOKE_PRODUCT_SKU_SELECTOR"),
            composer=value("DUOKE_COMPOSER_SELECTOR"),
            send_button=value("DUOKE_SEND_BUTTON_SELECTOR"),
        )

    def missing(self) -> list[str]:
        required = {
            "DUOKE_CONVERSATION_SELECTOR": self.conversation,
            "DUOKE_CONVERSATION_ID_ATTRIBUTE": self.conversation_id_attribute,
            "DUOKE_MESSAGE_SELECTOR": self.message,
            "DUOKE_MESSAGE_ID_ATTRIBUTE": self.message_id_attribute,
            "DUOKE_MESSAGE_DIRECTION_ATTRIBUTE": self.message_direction_attribute,
            "DUOKE_COMPOSER_SELECTOR": self.composer,
        }
        return [name for name, value in required.items() if not value]


def env_enabled(name: str) -> bool:
    values = {**load_env_file(), **os.environ}
    return values.get(name, "").strip().casefold() == "true"


def read_state() -> set[str]:
    state = read_json(AUTOREPLY_STATE, {"processed": []})
    if not isinstance(state, dict):
        return set()
    return {str(value) for value in state.get("processed", [])}


def save_state(processed: set[str]) -> None:
    write_json(AUTOREPLY_STATE, {
        "schemaVersion": 1,
        "updatedAt": utc_now(),
        "processed": sorted(processed)[-50_000:],
    })


def append_audit(event: dict[str, Any]) -> None:
    AUTOREPLY_LOG.parent.mkdir(parents=True, exist_ok=True)
    with AUTOREPLY_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")


def scoped_root(page: Page, config: SelectorConfig) -> Any:
    return page.frame_locator(config.iframe) if config.iframe else page


def is_incoming(message: Locator, config: SelectorConfig) -> bool:
    direction = (message.get_attribute(config.message_direction_attribute) or "").strip().casefold()
    return direction in config.incoming_values


def identity(row: Locator, message: Locator, config: SelectorConfig) -> tuple[str, str, str] | None:
    conversation_id = row.get_attribute(config.conversation_id_attribute)
    message_id = message.get_attribute(config.message_id_attribute)
    if not conversation_id or not message_id:
        return None
    conversation_ref = stable_hash("conversation", conversation_id)
    message_ref = stable_hash("message", conversation_id, message_id)
    return conversation_ref, message_ref, stable_hash(conversation_id, message_id)


def latest_customer_message(root: Any, row: Locator, config: SelectorConfig) -> tuple[Locator, str] | None:
    messages = root.locator(config.message).all()
    if not messages:
        return None
    latest = messages[-1]
    if not is_incoming(latest, config):
        return None
    text = latest.inner_text(timeout=5000).strip()
    return (latest, text) if text else None


def sku_context(root: Any, config: SelectorConfig) -> str | None:
    if not config.product_sku:
        return None
    locator = root.locator(config.product_sku).last
    if locator.count() == 0:
        return None
    value = locator.inner_text(timeout=3000).strip()
    return value[:160] or None


def send_reply(root: Any, config: SelectorConfig, reply: str) -> None:
    composer = root.locator(config.composer).last
    composer.fill(reply, timeout=10_000)
    if config.send_button:
        root.locator(config.send_button).last.click(timeout=10_000)
    else:
        composer.press("Enter", timeout=10_000)


def delivery_visible(root: Any, config: SelectorConfig, previous_count: int, page: Page, reply: str) -> bool:
    for _ in range(10):
        page.wait_for_timeout(300)
        messages = root.locator(config.message).all()
        if len(messages) > previous_count and not is_incoming(messages[-1], config):
            rendered = messages[-1].inner_text(timeout=3000).strip()
            return bool(rendered and reply.strip() in rendered)
    return False


def production_links_ready() -> bool:
    payload = read_json(KNOWLEDGE_PATH, {})
    base_url = str(payload.get("baseUrl", "")) if isinstance(payload, dict) else ""
    try:
        parsed = urlsplit(base_url)
    except ValueError:
        return False
    return parsed.scheme == "https" and parsed.hostname not in {None, "localhost", "127.0.0.1", "::1"}


def audit_result(
    result: RetrievalResult,
    conversation_ref: str,
    message_ref: str,
    query_ref: str,
    mode: str,
    sent: bool,
) -> None:
    append_audit({
        "at": utc_now(),
        "mode": mode,
        "conversationRef": conversation_ref,
        "messageRef": message_ref,
        "queryRef": query_ref,
        "action": result.action,
        "reason": result.reason,
        "knowledgeId": result.knowledge_id,
        "productId": result.product_id,
        "score": round(result.score, 4),
        "sent": sent,
    })


def process_once(page: Page, config: SelectorConfig, allow_send: bool, threshold: float, limit: int) -> dict[str, int]:
    root = scoped_root(page, config)
    rows = root.locator(config.conversation).all()
    processed_state = read_state()
    counts = {"scanned": 0, "matched": 0, "sent": 0, "clarify": 0, "escalate": 0, "skipped": 0}

    for row in rows[:limit]:
        if STOP_FILE.exists():
            break
        if config.unread and row.locator(config.unread).count() == 0:
            continue
        counts["scanned"] += 1
        row.click(timeout=10_000)
        page.wait_for_timeout(700)
        latest = latest_customer_message(root, row, config)
        if not latest:
            counts["skipped"] += 1
            continue
        message, query = latest
        ids = identity(row, message, config)
        if not ids:
            counts["skipped"] += 1
            append_audit({"at": utc_now(), "mode": "error", "reason": "missing_stable_dom_identity", "sent": False})
            continue
        conversation_ref, message_ref, state_key = ids
        if state_key in processed_state:
            counts["skipped"] += 1
            continue

        result = retrieve(query, sku_context(root, config), threshold)
        if result.action == "reply":
            counts["matched"] += 1
        elif result.action in counts:
            counts[result.action] += 1

        can_send_action = result.action == "reply" or (
            result.action == "clarify" and env_enabled("DUOKE_AUTOREPLY_SEND_CLARIFICATIONS")
        )
        sent = False
        if allow_send and can_send_action and result.reply:
            # Re-read the last message immediately before sending. If an admin replied or
            # the customer sent a newer message, this conversation is left untouched.
            current = latest_customer_message(root, row, config)
            if current:
                current_ids = identity(row, current[0], config)
                if current_ids and current_ids[1] == message_ref:
                    previous_count = root.locator(config.message).count()
                    send_reply(root, config, result.reply)
                    sent = delivery_visible(root, config, previous_count, page, result.reply)
                    if sent:
                        counts["sent"] += 1
                        processed_state.add(state_key)
                        save_state(processed_state)
        audit_result(
            result,
            conversation_ref,
            message_ref,
            stable_hash(query),
            "send" if allow_send else "dry-run",
            sent,
        )
    return counts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Duoke support bot backed by the approved knowledge base.")
    parser.add_argument("--send", action="store_true", help="Allow delivery when the feature flag is also enabled")
    parser.add_argument("--headed", action="store_true", help="Display the browser for diagnostics")
    parser.add_argument("--watch", action="store_true", help="Repeat checks until STOP_AUTOREPLY is created")
    parser.add_argument("--interval", type=int, default=15, help="Delay between checks in seconds (5-300)")
    parser.add_argument("--limit", type=int, default=10, help="Maximum conversations per pass (1-100)")
    parser.add_argument("--threshold", type=float, default=0.36, help="Match threshold (0-1)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = SelectorConfig.from_environment()
    missing = config.missing()
    if missing:
        print("The Duoke selector configuration is incomplete:")
        for name in missing:
            print(f"- {name}")
        print("Run duoke:inspect after signing in to create the private selector report.")
        return 2
    if not is_duoke_url(config.inbox_url):
        print("DUOKE_INBOX_URL must use the web.duoke.com domain.")
        return 2

    allow_send = args.send and env_enabled("DUOKE_AUTOREPLY_ENABLED")
    if args.send and not allow_send:
        print("Delivery is disabled. Set DUOKE_AUTOREPLY_ENABLED=true after verifying the selectors and dry run.")
        return 2
    if allow_send and not production_links_ready():
        print("Delivery rejected: GASCOMP_PUBLIC_BASE_URL in the knowledge base must use a non-localhost HTTPS domain.")
        print("Update the URL, then run npm run duoke:knowledge:export.")
        return 2
    if STOP_FILE.exists():
        print("Automated replies are stopped by STOP_AUTOREPLY. Run npm run duoke:resume before starting again.")
        return 2
    interval = max(5, min(300, args.interval))
    limit = max(1, min(100, args.limit))
    threshold = max(0.0, min(1.0, args.threshold))

    with sync_playwright() as playwright:
        context: BrowserContext = playwright.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=not args.headed,
            viewport={"width": 1440, "height": 900},
            locale="id-ID",
            timezone_id="Asia/Jakarta",
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(config.inbox_url, wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_timeout(3000)
        if page.locator("input[type=password]").count() > 0:
            context.close()
            print("The Duoke session has expired. Sign in again with npm run duoke:login.")
            return 3

        aggregate = {"scanned": 0, "matched": 0, "sent": 0, "clarify": 0, "escalate": 0, "skipped": 0}
        while not STOP_FILE.exists():
            current = process_once(page, config, allow_send, threshold, limit)
            for key, value in current.items():
                aggregate[key] += value
            if not args.watch:
                break
            page.wait_for_timeout(interval * 1000)
        context.close()

    mode = "SEND" if allow_send else "DRY RUN"
    print(f"{mode}: {aggregate['scanned']} scanned, {aggregate['matched']} matched, {aggregate['sent']} sent, {aggregate['clarify']} need clarification, {aggregate['escalate']} escalated, {aggregate['skipped']} skipped.")
    print(f"Private audit log: {AUTOREPLY_LOG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
