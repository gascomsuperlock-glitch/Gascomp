from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

from scraping.duoke.chat.archive_duoke_chats import (
    ArchiveClient, MANUAL_MARKER, capture_history, conversation_ref,
    enumerate_conversations, note_link, render_index, render_note, write_note,
)


ITEM = {
    "shopId": "test-store", "conversationId": "test-thread", "platform": "shopee",
    "shopName": "Test store", "buyerNick": "Test Customer", "buyerId": "test-buyer",
}


def message(identifier: str, role: int, text: str) -> dict:
    return {
        "messageId": identifier, "conversationId": "test-thread", "shopId": "test-store",
        "createdTimestamp": 1000, "messageSort": identifier, "fromAccountType": role,
        "messageType": "text", "messageContent": json.dumps({"text": text}),
    }


class FakeApi:
    def __init__(self, pages: list[dict]) -> None:
        self.pages = pages
        self.calls: list[int] = []

    async def read(self, method: str, url: str, **kwargs) -> dict:
        page = kwargs["params"]["pageNo"]
        self.calls.append(page)
        return self.pages[page - 1]


class ChatArchiveTests(unittest.IsolatedAsyncioTestCase):
    async def test_enumerates_unfiltered_list_until_server_reports_end(self) -> None:
        calls = []

        class ListApi:
            async def read(self, method, url, **kwargs):
                body = kwargs["json"]
                calls.append(body)
                if body["offset"] == 0:
                    return {"list": [ITEM], "hasMore": True, "nextOffset": "next"}
                return {"list": [{**ITEM, "conversationId": "second-thread"}], "hasMore": False}

        with tempfile.TemporaryDirectory() as directory, patch(
            "scraping.duoke.chat.archive_duoke_chats.CHAT_ARCHIVE_DIR", Path(directory),
        ):
            items = await enumerate_conversations(ListApi(), {
                "list_url": "unused", "list_body": {"shopIdList": ["old-filter"], "filterGroups": ["old-filter"]},
            })
            snapshot = json.loads((Path(directory) / "conversations.json").read_text())
        self.assertEqual(len(items), 2)
        self.assertTrue(snapshot["complete"])
        self.assertEqual([call["offset"] for call in calls], [0, "next"])
        self.assertTrue(all(call["shopIdList"] == [] and call["filterGroups"] == [] for call in calls))

    async def test_index_links_existing_notes_and_identifies_missing_capture(self) -> None:
        second = {**ITEM, "conversationId": "missing-thread"}
        summary = {
            "finished_at": "2026-09-17T00:00:00Z", "total_messages": 1, "complete": False,
            "conversations": [
                {"ref": conversation_ref(ITEM), "complete": True, "messages": 1},
                {"ref": conversation_ref(second), "complete": False},
            ],
        }
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            (folder / f"Conversation {conversation_ref(ITEM)}.md").touch()
            index = render_index(summary, [ITEM, second], folder)
        self.assertIn("## Test store (shopee)", index)
        self.assertIn(f"[[Conversation {conversation_ref(ITEM)}|", index)
        self.assertNotIn(f"[[Conversation {conversation_ref(second)}", index)
        self.assertIn("pengambilan gagal", index)

    async def test_reads_all_history_pages_and_verifies_total(self) -> None:
        pages = [
            {"pageNo": 1, "totalPage": 2, "totalSize": 2, "list": [message("2", 2, "Reply")]},
            {"pageNo": 2, "totalPage": 2, "totalSize": 2, "list": [message("1", 1, "Question")]},
        ]
        api = FakeApi(pages)
        result = await capture_history(api, {"message_url": "unused"}, ITEM)
        self.assertTrue(result["complete"])
        self.assertEqual(api.calls, [1, 2])
        note = render_note(result)
        self.assertLess(note.index("Question"), note.index("Reply"))
        self.assertIn("Pelanggan", note)
        self.assertIn("Penjual", note)

    async def test_duplicate_pages_cannot_claim_complete_history(self) -> None:
        repeated = message("1", 1, "Question")
        api = FakeApi([
            {"pageNo": 1, "totalPage": 2, "totalSize": 2, "list": [repeated]},
            {"pageNo": 2, "totalPage": 2, "totalSize": 2, "list": [repeated]},
        ])
        result = await capture_history(api, {"message_url": "unused"}, ITEM)
        self.assertFalse(result["complete"])
        self.assertEqual(len(result["messages"]), 1)

    async def test_rejects_changed_total_and_cross_conversation_messages(self) -> None:
        first = {"pageNo": 1, "totalPage": 2, "totalSize": 2, "list": [message("1", 1, "Question")]}
        api = FakeApi([first, {"pageNo": 2, "totalPage": 2, "totalSize": 3, "list": []}])
        with self.assertRaisesRegex(ValueError, "changed during pagination"):
            await capture_history(api, {"message_url": "unused"}, ITEM)
        wrong = {**message("1", 1, "Question"), "conversationId": "another-thread"}
        api = FakeApi([{**first, "list": [wrong]}])
        with self.assertRaisesRegex(ValueError, "different conversation"):
            await capture_history(api, {"message_url": "unused"}, ITEM)

    async def test_only_verified_read_endpoints_are_allowed(self) -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: self.fail("Must not send"))) as client:
            api = ArchiveClient(client)
            for method, url in [
                ("POST", "https://web.duoke.com/api/v1/im/message/send"),
                ("GET", "https://example.test/api/v1/im/message/list"),
                ("GET", "https://web.duoke.com/api/v1/im/conversation/view/v2"),
            ]:
                with self.subTest(url=url), self.assertRaises(ValueError):
                    await api.read(method, url)

    async def test_redacts_notes_and_preserves_manual_content(self) -> None:
        record = {
            "conversation": ITEM, "captured_at": "2026-09-17T00:00:00Z", "complete": True,
            "expected_messages": 1,
            "messages": [message("1", 1, "Test Customer test@example.test 081234567890")],
        }
        note = render_note(record)
        for private in ("Test Customer", "test@example.test", "081234567890"):
            self.assertNotIn(private, note)
        self.assertIn("unreviewed_archive", note)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Conversation.md"
            write_note(path, note)
            path.write_text(path.read_text() + "Owner note\n")
            write_note(path, note)
            self.assertEqual(path.read_text().count("Owner note"), 1)
            self.assertEqual(path.read_text().count(MANUAL_MARKER), 1)
            path.write_text("Existing independent note")
            with self.assertRaises(ValueError):
                write_note(path, note)

    def test_note_links_flatten_legacy_generated_directories(self) -> None:
        self.assertEqual(
            note_link("Duoke/Produk/Catalog/Product abc"),
            "Duoke/Produk/Product abc",
        )
        self.assertEqual(
            note_link("Duoke/Percakapan/Archive/Conversation abc"),
            "Duoke/Percakapan/Conversation abc",
        )
        self.assertEqual(
            note_link("Duoke/Produk/Catalog/Index#Test store"),
            "Duoke/Produk/Product catalog index#Test store",
        )
        self.assertEqual(
            note_link("Duoke/Percakapan/Archive/Index.md#Manual notes"),
            "Duoke/Percakapan/Conversation archive index.md#Manual notes",
        )
        self.assertEqual(note_link("Independent/Note"), "Independent/Note")

    def test_conversation_note_uses_unique_flat_index_name(self) -> None:
        record = {
            "conversation": ITEM,
            "captured_at": "2026-09-17T00:00:00Z",
            "complete": True,
            "expected_messages": 0,
            "messages": [],
        }
        self.assertIn("[[Conversation archive index|Indeks arsip]]", render_note(record))


if __name__ == "__main__":
    unittest.main()
