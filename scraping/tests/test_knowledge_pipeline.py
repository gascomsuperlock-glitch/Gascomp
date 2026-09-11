from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


import scraping.duoke.knowledge.build_duoke_knowledge as builder
import scraping.duoke.reply.duoke_auto_reply as auto_reply
import scraping.duoke.knowledge.knowledge_engine as engine
from scraping.shared.common import redact_text
from scraping.shared.paths import BOT_MESSAGES_PATH, KNOWLEDGE_PATH
from playwright.sync_api import sync_playwright


PRODUCT = {
    "id": "product-1",
    "slug": "regulator-gascomp",
    "sku": "GC-100",
    "name": "Regulator Gascomp",
    "model": "Superlock",
    "variationSkus": ["GC-100-R"],
}


def approved_payload() -> dict:
    return {
        "schemaVersion": 1,
        "entries": [{
            "id": "admin-faq-1",
            "kind": "faq",
            "approval": "approved",
            "title": "Regulator will not lock",
            "question": "Why will the regulator not lock?",
            "answer": "Make sure the lever is open, align the regulator, and lock it again.",
            "triggers": ["regulator longgar", "tidak bisa ngunci", "sulit mengunci"],
            "product": PRODUCT,
        }],
    }


def fake_read_json(path: Path, fallback: object) -> object:
    if path == KNOWLEDGE_PATH:
        return approved_payload()
    if path == BOT_MESSAGES_PATH:
        return {
            "schemaVersion": 1,
            "approval": "approved",
            "clarifyProduct": "Please provide the product name or SKU.",
        }
    return fallback


class PrivacyTests(unittest.TestCase):
    def test_redacts_contact_order_name_and_address(self) -> None:
        raw = (
            "Nama saya Budi Santoso, email budi@example.com, telepon 0812-3456-7890.\n"
            "Nomor pesanan: INV-12345678\nAlamat: Jalan Contoh 12"
        )
        clean = redact_text(raw)
        self.assertNotIn("budi@example.com", clean.lower())
        self.assertNotIn("0812", clean)
        self.assertNotIn("INV-12345678", clean)
        self.assertNotIn("Jalan Contoh", clean)
        self.assertIn("[EMAIL]", clean)
        self.assertIn("[PHONE]", clean)


class HistoryNormalizationTests(unittest.TestCase):
    def test_pairs_customer_and_admin_without_marking_resolved(self) -> None:
        payload = {
            "messages": [
                {
                    "messageId": "m1",
                    "conversationId": "private-conversation-id",
                    "senderType": "buyer",
                    "text": "Regulator GC-100 gak bisa ngunci, hubungi saya 081234567890",
                    "timestamp": 1_700_000_000_000,
                },
                {
                    "messageId": "m2",
                    "conversationId": "private-conversation-id",
                    "senderType": "agent",
                    "text": "Align the regulator, then lock it again.",
                    "timestamp": 1_700_000_001_000,
                },
            ],
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "chat-00001.json"
            path.write_text(json.dumps({"sourceUrl": "https://web.duoke.com/chat", "payload": payload}))
            messages = builder.normalize_capture(path, [PRODUCT])
        candidates = builder.make_candidates(messages, [PRODUCT])
        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        self.assertEqual(candidate["approval"], "pending")
        self.assertIn("outcome_not_verified", candidate["flags"])
        self.assertIn("regulator-will-not-lock", candidate["topics"])
        self.assertEqual(candidate["productIds"], ["product-1"])
        self.assertNotIn("081234567890", candidate["question"])
        self.assertNotIn("private-conversation-id", json.dumps(candidate))


class RetrievalTests(unittest.TestCase):
    @patch.object(engine, "read_json", side_effect=fake_read_json)
    def test_returns_only_approved_matching_answer(self, _read_json: object) -> None:
        result = engine.retrieve("GC-100 regulator saya gak bisa ngunci", threshold=0.25)
        self.assertEqual(result.action, "reply")
        self.assertEqual(result.knowledge_id, "admin-faq-1")
        self.assertIn("align the regulator", result.reply.lower())

    @patch.object(engine, "read_json", side_effect=fake_read_json)
    def test_requests_product_when_context_is_missing(self, _read_json: object) -> None:
        result = engine.retrieve("regulator saya longgar", threshold=0.25)
        self.assertEqual(result.action, "clarify")
        self.assertEqual(result.reason, "missing_product")

    @patch.object(engine, "read_json", side_effect=fake_read_json)
    def test_escalates_when_approved_answer_does_not_match(self, _read_json: object) -> None:
        result = engine.retrieve("Paket saya belum sampai", product_sku="GC-100", threshold=0.50)
        self.assertEqual(result.action, "escalate")
        self.assertEqual(result.reason, "no_adequate_answer")


class BrowserRunnerTests(unittest.TestCase):
    def test_live_send_requires_https_public_knowledge_url(self) -> None:
        with patch.object(auto_reply, "read_json", return_value={"baseUrl": "http://localhost:3000"}):
            self.assertFalse(auto_reply.production_links_ready())
        with patch.object(auto_reply, "read_json", return_value={"baseUrl": "https://help.example.com"}):
            self.assertTrue(auto_reply.production_links_ready())

    def test_headless_runner_sends_once_and_skips_after_outgoing_message(self) -> None:
        config = auto_reply.SelectorConfig(
            inbox_url="https://web.duoke.com/",
            iframe="",
            conversation="[data-conversation-id]",
            unread=".unread",
            conversation_id_attribute="data-conversation-id",
            message="[data-message-id]",
            message_id_attribute="data-message-id",
            message_direction_attribute="data-direction",
            incoming_values=frozenset({"incoming"}),
            product_sku="[data-product-sku]",
            composer="#composer",
            send_button="#send",
        )
        html = """
          <div data-conversation-id="conversation-1">Conversation<span class="unread">new</span></div>
          <div data-message-id="message-1" data-direction="incoming">GC-100 tidak bisa ngunci</div>
          <span data-product-sku>GC-100</span>
          <textarea id="composer"></textarea>
          <button id="send" onclick="
            const sent = document.createElement('div');
            sent.dataset.messageId = 'outgoing-1';
            sent.dataset.direction = 'outgoing';
            sent.textContent = document.querySelector('#composer').value;
            document.body.insertBefore(sent, document.querySelector('[data-product-sku]'));
          ">Send</button>
        """
        response = engine.RetrievalResult(
            "reply", "An approved answer.", "kb-1", "product-1", 0.9, "approved_match",
        )
        audit: list[dict] = []
        state: set[str] = set()
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content(html)
            with (
                patch.object(auto_reply, "read_state", return_value=state),
                patch.object(auto_reply, "save_state", side_effect=lambda value: state.update(value)),
                patch.object(auto_reply, "append_audit", side_effect=audit.append),
                patch.object(auto_reply, "retrieve", return_value=response),
            ):
                first = auto_reply.process_once(page, config, True, 0.36, 10)
                second = auto_reply.process_once(page, config, True, 0.36, 10)
            browser.close()
        self.assertEqual(first["sent"], 1)
        self.assertEqual(second["sent"], 0)
        self.assertEqual(len(audit), 1)
        self.assertEqual(audit[0]["knowledgeId"], "kb-1")
        self.assertNotIn("GC-100 tidak bisa ngunci", json.dumps(audit))


if __name__ == "__main__":
    unittest.main()
