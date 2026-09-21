"""Regression coverage for the draft-only Chrome/Hermes workflow."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from playwright.async_api import async_playwright

from scraping.duoke.reply import hermes_drafts as drafts
from scraping.duoke.reply.browser_reader import BrowserReader, ORIGIN, allowed_read
from scraping.duoke.chat.archive_duoke_chats import LIST_PATH, MESSAGE_PATH
from scraping.duoke.reply import knowledge_bundle
from scraping.tests.test_ai_assistance_corpus import product, conversation, pair


SESSION = {"headers": {"content-type": "application/json"}, "list_url": ORIGIN + LIST_PATH,
           "message_url": ORIGIN + MESSAGE_PATH, "list_body": {"shopIdList": ["shop-1"], "filterGroups": []}}
CONVERSATION = {"platform": "test", "shopId": "shop-1", "conversationId": "conversation-1"}
MESSAGE = {**CONVERSATION, "messageId": "message-1", "createdTimestamp": 1000,
           "fromAccountType": 1, "messageContent": json.dumps({"text": "What is the material of GC-100?"})}


def make_vault(vault):
    for language in ("en", "id"):
        for kind in ("greeting", "clarification", "handoff"):
            entry = {"id": f"{kind}-{language}", "kind": kind, "language": language,
                     "questions": [kind]}
            (vault / f"{entry['id']}.md").write_text("---\n" + json.dumps(entry) + "\n---\nPlease describe the product question.")
    entry = {"id": "material", "kind": "answer", "language": "en", "sku": "GC-100",
             "questions": ["What is the material of GC-100?"]}
    (vault / "material.md").write_text("---\n" + json.dumps(entry) + "\n---\nThe GC-100 housing is stainless steel.")


def generated(payload, timeout):
    return json.dumps({"text": "The GC-100 housing is stainless steel.", "kind": "answer",
                       "basis": "knowledge", "sourceIds": ["material"]})


class FakeReader:
    def __init__(self, messages=None, changed=None):
        self.messages = messages or [MESSAGE]
        self.changed = changed
        self.reads = []
        self.history_reads = 0

    async def read(self, method, url, **kwargs):
        self.reads.append((method, url, kwargs))
        if method == "POST":
            return {"list": [CONVERSATION], "hasMore": False}
        self.history_reads += 1
        messages = self.changed if self.changed is not None and self.history_reads > 1 else self.messages
        return {"list": messages, "totalSize": len(messages), "totalPage": 1, "pageNo": 1}


class DraftTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.vault = Path(self.directory.name)
        make_vault(self.vault)
        self.stop = self.vault / "STOP"
        patcher = patch.object(drafts, "STOP_FILE", self.stop)
        patcher.start()
        self.addCleanup(patcher.stop)

    async def test_draft_citations_and_duplicate_reuse_without_delivery(self):
        calls = []

        def generator(payload, timeout):
            calls.append(payload)
            return generated(payload, timeout)

        reader = FakeReader()
        report = await drafts.run_once(reader, SESSION, self.vault, generator)
        again = await drafts.run_once(FakeReader(), SESSION, self.vault, generator, previous=report)
        self.assertEqual(len(calls), 1)
        self.assertEqual(again["drafts"][0]["sources"], [{"id": "material", "note": "material.md"}])
        self.assertEqual(report["sent"], 0)
        self.assertTrue(report["complete"])
        self.assertNotIn("What is the material", json.dumps(report))
        self.assertTrue(all(allowed_read(method, url) for method, url, _ in reader.reads))
        self.assertEqual(reader.reads[0][2]["json"]["shopIdList"], ["shop-1"])

    async def test_seller_reply_or_new_customer_message_discards_draft(self):
        for role in (1, 2):
            changed = [MESSAGE, {**MESSAGE, "messageId": "new-message", "createdTimestamp": 2000,
                                  "fromAccountType": role}]
            report = await drafts.run_once(FakeReader(changed=changed), SESSION, self.vault, generated)
            self.assertEqual(report["drafts"], [])

    async def test_stop_during_generation_discards_draft(self):
        def generator(payload, timeout):
            self.stop.touch()
            return generated(payload, timeout)
        report = await drafts.run_once(FakeReader(), SESSION, self.vault, generator)
        self.assertFalse(report["complete"])
        self.assertEqual(report["drafts"], [])

    async def test_changed_knowledge_invalidates_whole_pass(self):
        def generator(payload, timeout):
            path = self.vault / "material.md"
            path.write_text(path.read_text().replace("stainless steel", "aluminum"))
            return generated(payload, timeout)
        with self.assertRaisesRegex(ValueError, "Knowledge changed"):
            await drafts.run_once(FakeReader(), SESSION, self.vault, generator)

    async def test_model_failure_does_not_create_a_draft(self):
        report = await drafts.run_once(FakeReader(), SESSION, self.vault, lambda *a, **k: "")
        self.assertEqual(report["drafts"][0]["status"], "needs_review")
        self.assertEqual(report["drafts"][0]["text"], "")

    async def test_fabricated_citation_and_uncited_answer_rejected(self):
        for ids, basis in ((["invented"], "knowledge"), ([], "general")):
            report = await drafts.run_once(FakeReader(), SESSION, self.vault, lambda *a, **k: json.dumps({
                "text": "An unsupported answer.", "kind": "answer", "basis": basis, "sourceIds": ids}))
            self.assertEqual(report["drafts"][0]["status"], "needs_review")

    async def test_mixed_attachment_and_outgoing_messages_are_skipped(self):
        for message in ({**MESSAGE, "fromAccountType": 2},
                        {**MESSAGE, "messageContent": json.dumps({"image": "private-image"})}):
            report = await drafts.run_once(FakeReader([message]), SESSION, self.vault, generated)
            self.assertEqual(report["skipped"], 1)
            self.assertEqual(report["drafts"], [])

    async def test_history_identity_mismatch_fails_closed(self):
        report = await drafts.run_once(FakeReader([{**MESSAGE, "shopId": "wrong-store"}]),
                                      SESSION, self.vault, generated)
        self.assertEqual(report["errors"], 1)
        self.assertFalse(report["complete"])

    async def test_requested_scope_cannot_broaden_saved_scope(self):
        with self.assertRaises(ValueError):
            await drafts.run_once(FakeReader(), SESSION, self.vault, generated, shop_ids=["other-store"])

    async def test_server_cannot_escape_saved_store_scope(self):
        class WrongStore(FakeReader):
            async def read(self, *args, **kwargs):
                return {"list": [{**CONVERSATION, "shopId": "other-store"}], "hasMore": False}
        with self.assertRaises(ValueError):
            await drafts.run_once(WrongStore(), SESSION, self.vault, generated)

    def make_source(self):
        source = self.vault / "source"
        (source / "Produk").mkdir(parents=True)
        (source / "Percakapan").mkdir()
        (source / "Produk" / "kettle.md").write_text(product(
            "kettle", "DEMO-9", "Bahan: Baja tahan karat", name="Demo Kettle"))
        (source / "Percakapan" / "history.md").write_text(conversation(
            "history", pair("Bagaimana membersihkan DEMO-9?", "Lap permukaan DEMO-9 dengan kain lembut.")))
        return source

    async def test_full_archive_supplies_new_product_and_citations(self):
        # Keep the two vault roots separate, as they are on the operator's machine.
        source = self.make_source()
        curated = self.vault / "curated"
        curated.mkdir()
        for path in list(self.vault.glob("*.md")):
            path.rename(curated / path.name)
        captured = []

        def generator(payload, timeout):
            captured.append(payload)
            identifier = next(item["id"] for item in payload["evidence"] if item.get("sku") == "DEMO-9")
            return json.dumps({"text": "The DEMO-9 is made of stainless steel.", "kind": "answer",
                               "basis": "knowledge", "sourceIds": [identifier]})

        message = {**MESSAGE, "messageContent": json.dumps({"text": "Apa bahan DEMO-9?"})}
        report = await drafts.run_once(FakeReader([message]), SESSION, curated, generator, source_vault=source)
        self.assertEqual(report["knowledgeCounts"]["sourceFiles"], 2)
        self.assertEqual(report["knowledgeCounts"]["indexedDocuments"], 2)
        self.assertEqual(report["drafts"][0]["status"], "draft")
        self.assertEqual(report["drafts"][0]["sources"][0]["note"], "Produk/kettle.md")
        self.assertEqual(report["drafts"][0]["sources"][0]["vault"], "source")
        self.assertTrue(captured)
        self.assertNotIn("Lap permukaan", json.dumps(captured))

    async def test_source_edit_discards_draft_even_when_extracted_answers_unchanged(self):
        source = self.make_source()
        curated = self.vault / "curated"
        curated.mkdir()
        for path in list(self.vault.glob("*.md")):
            path.rename(curated / path.name)

        def generator(payload, timeout):
            (source / "Percakapan" / "Index.md").write_text("# Updated private index")
            return generated(payload, timeout)

        with self.assertRaisesRegex(ValueError, "Knowledge changed"):
            await drafts.run_once(FakeReader(), SESSION, curated, generator, source_vault=source)

    async def test_configured_source_is_reused_without_copying_private_settings(self):
        with (patch.object(knowledge_bundle, "load_env_file", return_value={}),
              patch.dict("os.environ", {}, clear=True),
              patch.object(knowledge_bundle, "read_json", return_value={
                  "GASCOMP_AI_SOURCE_VAULT": str(self.vault), "GASCOMP_AI_WORKER_TOKEN": "private"})):
            self.assertEqual(knowledge_bundle.configured_source(), self.vault)
        with (patch.object(knowledge_bundle, "load_env_file", return_value={
                "DUOKE_HERMES_SOURCE_VAULT": str(self.vault / "override")}),
              patch.dict("os.environ", {}, clear=True),
              patch.object(knowledge_bundle, "read_json", side_effect=AssertionError("No fallback expected"))):
            self.assertEqual(knowledge_bundle.configured_source(), self.vault / "override")

    async def test_missing_full_source_fails_instead_of_silently_using_35_notes(self):
        with self.assertRaises(ValueError):
            knowledge_bundle.load_knowledge(self.vault, self.vault / "missing")

    async def test_stop_and_invalid_config_clear_previous_report(self):
        from contextlib import redirect_stdout
        from io import StringIO

        for stopped in (True, False):
            if stopped:
                self.stop.touch()
            else:
                self.stop.unlink()
            report_path = self.vault / "latest.json"
            report_path.write_text(json.dumps({"drafts": [{"text": "Stale draft"}]}))
            with (patch.object(drafts, "DUOKE_DRAFT_DIR", self.vault),
                  patch("sys.argv", ["hermes_drafts"]),
                  patch.object(drafts.DraftConfig, "from_environment", side_effect=ValueError("Invalid config")),
                  redirect_stdout(StringIO())):
                self.assertEqual(drafts.main(), 2)
            report = json.loads(report_path.read_text())
            self.assertEqual(report["drafts"], [])
            self.assertEqual(report["status"], "stopped" if stopped else "failed")

    async def test_actual_chrome_reads_fixture_and_blocks_other_endpoints(self):
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(channel="chrome", headless=True)
            try:
                async with BrowserReader(browser, SESSION) as reader:
                    fake = FakeReader()

                    async def fixture(route):
                        request = route.request
                        payload = await fake.read(request.method, request.url)
                        await route.fulfill(status=200, content_type="application/json",
                                            body=json.dumps({"code": 0, "data": payload}))

                    await reader.context.route("**/api/v1/im/conversation/queryConversationList", fixture)
                    await reader.context.route("**/api/v1/im/message/list?*", fixture)
                    report = await drafts.run_once(reader, SESSION, self.vault, generated)
                    self.assertEqual(report["drafts"][0]["status"], "draft")
                    with self.assertRaises(ValueError):
                        await reader.read("POST", ORIGIN + "/api/v1/im/message/send")
                    blocked = await reader.page.evaluate("""async () => {
                        try { await fetch('/api/v1/im/message/send', {method: 'POST'}); return false; }
                        catch { return true; }
                    }""")
                    self.assertTrue(blocked)
            finally:
                await browser.close()


if __name__ == "__main__":
    unittest.main()
