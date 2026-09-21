"""Synthetic acceptance coverage for Hermes-controlled automatic delivery."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

from playwright.async_api import async_playwright

from scraping.duoke.reply.desktop_browser import DesktopBrowser, DeliveryAdapterError
from scraping.duoke.reply.desktop_service import DesktopService
from scraping.tests.test_hermes_drafts import FakeReader, MESSAGE, SESSION, CONVERSATION, make_vault
from scraping.tests.test_ai_assistance_corpus import conversation, pair, product


class Transport(FakeReader):
    def __init__(self):
        super().__init__()
        self.session = SESSION
        self.send_count = 0
        self.fail_send = False

    async def send(self, conversation, text):
        self.send_count += 1
        if self.fail_send:
            raise TimeoutError("Uncertain network outcome")
        self.messages.append({**MESSAGE, "messageId": "outgoing", "fromAccountType": 2,
                              "createdTimestamp": 2000, "messageContent": json.dumps({"text": text})})


class DesktopServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.vault = self.root / "vault"
        self.vault.mkdir()
        make_vault(self.vault)
        self.transport = Transport()
        with patch("scraping.duoke.reply.desktop_service.configured_source", return_value=None):
            self.service = DesktopService(self.transport, directory=self.root / "runtime", vault=self.vault,
                                          enabled=self.root / "ENABLE", stop=self.root / "STOP")

    async def job(self):
        result = await self.service.poll(5)
        self.assertEqual(len(result["jobs"]), 1)
        return result["jobs"][0]

    async def test_preview_does_not_write_and_preserves_source_language(self):
        job = await self.job()
        result = await self.service.reply(job["ticket"], "material")
        self.assertEqual(result["status"], "preview")
        self.assertEqual(result["text"], "The GC-100 housing is stainless steel.")
        self.assertEqual(self.transport.send_count, 0)
        self.assertFalse((self.root / "runtime/delivery-state.json").exists())

    async def test_interactive_search_never_reads_or_sends_customer_inbox(self):
        self.service.enabled.touch()
        result = await self.service.search("What is the material of GC-100?")
        self.assertEqual(result["status"], "matched")
        self.assertEqual(result["references"][0]["sources"], [{"note": "material.md"}])
        self.assertEqual(self.transport.reads, [])
        self.assertEqual(self.transport.send_count, 0)
        self.assertEqual(self.service.pending, {})

    async def test_admin_references_are_available_without_changing_legacy_drafts(self):
        from scraping.duoke.reply.knowledge_bundle import load_knowledge
        from scraping.ai_assistance.grounding import build_evidence
        source = self.root / "source"
        (source / "Percakapan").mkdir(parents=True)
        (source / "Produk").mkdir()
        (source / "Produk/test.md").write_text(product(
            "p", "DEMO-9", "Bahan: Baja tahan karat", name="Demo Kettle"))
        (source / "Percakapan/test.md").write_text(conversation("c", pair(
            "Bagaimana membersihkan DEMO-9?", "Lap permukaan DEMO-9 dengan kain lembut.")))
        self.service.source = source
        question = "Bagaimana membersihkan DEMO-9?"
        result = await self.service.search(question)
        refs = [item for item in result["references"] if item["id"].startswith("archive-")]
        self.assertEqual(len(refs), 1)
        self.assertEqual(refs[0]["sources"][0]["sourceKind"], "conversation")
        legacy = load_knowledge(self.vault, source)
        old, _ = build_evidence(legacy.snapshot, legacy.index, question, "id")
        self.assertFalse(any(item["id"].startswith("archive-") for item in old))
        # A substantive block is still enforced even though archive provenance
        # alone no longer excludes the owner's designated admin references.
        with patch("scraping.duoke.reply.desktop_service.load_knowledge") as loader:
            bundle = load_knowledge(self.vault, source, admin_references=True)
            for evidence in bundle.index.evidence.values():
                if evidence["sourceKind"] == "conversation":
                    evidence["flags"].append("account_specific_response")
            loader.return_value = bundle
            blocked = await self.service.search(question)
        self.assertFalse(any(item["id"].startswith("archive-") for item in blocked["references"]))

    def source_note(self, transcript):
        source = self.root / "source"
        (source / "Percakapan").mkdir(parents=True, exist_ok=True)
        (source / "Produk").mkdir(exist_ok=True)
        (source / "Percakapan/test.md").write_text(conversation("reference", transcript))
        self.service.source = source

    async def test_return_synonyms_retrieve_admin_pair_without_catalog_or_sku(self):
        self.source_note(pair("Bagaimana pengajuan refund regulator?",
                              "Pengajuan retur dilakukan melalui menu pengembalian di aplikasi."))
        result = await self.service.search("saya ingin pengembalian barang untuk regulator")
        self.assertEqual(result["status"], "handoff_required")
        reference = result["historicalMatches"][0]
        self.assertEqual(reference["sources"][0]["note"], "Percakapan/test.md")
        self.assertFalse(result["references"])
        self.assertIn("WhatsApp", result["customerReply"])
        self.assertNotIn("answer", reference)
        self.assertNotIn("menu pengembalian", json.dumps(result))
        # A historical money/policy reference informs previews, not delivery.
        self.transport.messages = [{**self.transport.messages[0], "messageContent": json.dumps({"text": "pengembalian regulator"})}]
        result = await self.service.poll(5)
        self.assertFalse(result["jobs"])
        self.assertEqual(self.transport.send_count, 0)

    async def test_unrelated_media_does_not_hide_self_contained_answer(self):
        media = "### 2026-09-01T00:00:00Z — Customer\n\nType: image\n\n"
        self.source_note(media + pair("Bagaimana membersihkan permukaan regulator?",
                                     "Bersihkan permukaan luar dengan kain lembut."))
        result = await self.service.search("Bagaimana membersihkan permukaan regulator?")
        self.assertTrue(result["references"])
        self.assertFalse(result["references"][0]["referenceOnly"])
        # A media boundary between the question and answer must break the pair.
        transcript = pair("Bagaimana membersihkan permukaan regulator?",
                          "Bersihkan permukaan luar dengan kain lembut.")
        transcript = transcript.replace("### 2026-09-01T00:00:00Z — Seller", media + "### 2026-09-01T00:00:00Z — Seller")
        self.source_note(transcript)
        self.assertFalse((await self.service.search("membersihkan permukaan regulator"))["references"])

    async def test_reference_search_rejects_unsafe_private_and_unrelated_pairs(self):
        for question, answer in [
            ("Bagaimana memperbaiki regulator?", "Bongkar regulator lalu buang katup pengaman."),
            ("Bagaimana pengembalian regulator?", "Pesanan anda sudah diproses dengan resi 12345678901."),
            ("Apa warna regulator?", "Warna hitam. Pengajuan retur ada pada menu aplikasi."),
        ]:
            with self.subTest(answer=answer):
                self.source_note(pair(question, answer))
                query = "memperbaiki regulator" if "memperbaiki" in question else "pengembalian regulator"
                self.assertFalse((await self.service.search(query))["references"])

    async def test_lock_symptom_does_not_match_shared_negation_or_catalog(self):
        self.source_note(pair("Regulator ini tidak tersedia?", "Produk masih dalam promosi."))
        result = await self.service.search("Regulator tidak bisa ditutup")
        self.assertFalse(result["references"])
        self.assertIn("WhatsApp", result["customerReply"])
        self.source_note(pair("Regulator tidak bisa dikunci", "Hubungi admin untuk bantuan pemasangan."))
        result = await self.service.search("Regulator tidak bisa menutup")
        self.assertEqual(result["references"][0]["answer"], "Hubungi admin untuk bantuan pemasangan.")

    async def test_admin_chat_abbreviations_match_normalized_customer_question(self):
        self.source_note(pair("ini udah dpt selang pembuanganya?", "Selang pembuangan sudah termasuk."))
        result = await self.service.search("Apakah sudah termasuk selang pembuangan?")
        self.assertEqual(result["references"][0]["sources"][0]["sourceKind"], "conversation")
        self.assertEqual(result["references"][0]["answer"], "Selang pembuangan sudah termasuk.")

    async def test_identifier_placeholders_never_reach_reference_answers(self):
        self.source_note(pair("Regulator tidak bisa dikunci", "Hubungi nomor [IDENTIFIER] untuk bantuan."))
        self.assertFalse((await self.service.search("Regulator tidak bisa dikunci"))["references"])

    async def test_conversation_search_respects_explicit_product_scope(self):
        from scraping.duoke.reply.conversation_references import search_references
        from scraping.duoke.reply.knowledge_bundle import load_knowledge
        self.source_note(pair("Bagaimana membersihkan DEMO-9?", "Lap permukaan dengan kain lembut."))
        bundle = load_knowledge(self.vault, self.service.source, admin_references=True)
        reference = bundle.conversations[0]
        reference["sourceSkus"] = ["DEMO-9"]
        reference["sku"] = "DEMO-9"
        bundle.snapshot["entries"].append({"sku": "DEMO-8"})
        self.assertTrue(search_references(bundle, "membersihkan DEMO-9"))
        self.assertFalse(search_references(bundle, "membersihkan DEMO-8"))
        self.assertFalse(search_references(bundle, "membersihkan UNKNOWN-77"))

    async def test_unready_chat_is_not_reserved_or_sent(self):
        self.service.enabled.touch()
        job = await self.job()
        async def prepare():
            raise DeliveryAdapterError("chat_not_ready")
        self.transport.prepare_send = prepare
        result = await self.service.reply(job["ticket"], "material")
        self.assertEqual(result, {"status": "not_ready", "reason": "chat_not_ready", "sent": False})
        self.assertEqual(self.transport.send_count, 0)
        self.assertEqual(self.service.state(), {})

    async def test_sdk_rejection_has_a_bounded_reason_and_is_not_retried(self):
        self.service.enabled.touch()
        job = await self.job()
        async def reject(*args):
            self.transport.send_count += 1
            raise DeliveryAdapterError("sdk_rejected")
        self.transport.send = reject
        result = await self.service.reply(job["ticket"], "material")
        self.assertEqual(result, {"status": "uncertain", "reason": "sdk_rejected", "sent": False})
        await self.service.reply(job["ticket"], "material")
        self.assertEqual(self.transport.send_count, 1)
        audit = json.loads((self.root / "runtime/audit.jsonl").read_text().splitlines()[-1])
        self.assertEqual(audit["reason"], "sdk_rejected")

    async def test_delivery_verified_and_never_repeated_after_restart(self):
        self.service.enabled.touch()
        job = await self.job()
        result = await self.service.reply(job["ticket"], "material")
        self.assertEqual(result, {"status": "sent", "sent": True})
        # Simulate a stale API cache returning the old customer message.
        self.transport.messages = [MESSAGE]
        result = await self.service.poll()
        self.assertEqual(result["jobs"], [])
        self.assertEqual(self.transport.send_count, 1)
        audit = (self.root / "runtime/audit.jsonl").read_text()
        self.assertNotIn("stainless steel", audit)
        self.assertNotIn("What is the material", audit)

    async def test_uncertain_send_is_reserved_and_not_retried(self):
        self.service.enabled.touch()
        self.transport.fail_send = True
        job = await self.job()
        result = await self.service.reply(job["ticket"], "material")
        self.assertEqual(result["status"], "uncertain")
        self.assertEqual((await self.service.poll())["jobs"], [])
        self.assertEqual(self.transport.send_count, 1)

    async def test_unknown_answer_never_crosses_network(self):
        self.service.enabled.touch()
        job = await self.job()
        with self.assertRaises(ValueError):
            await self.service.reply(job["ticket"], "invented-answer")
        self.assertEqual(self.transport.send_count, 0)

    async def test_new_message_or_seller_reply_invalidates_ticket(self):
        self.service.enabled.touch()
        job = await self.job()
        for role in (1, 2):
            self.transport.messages = [MESSAGE, {**MESSAGE, "messageId": "new", "createdTimestamp": 2000,
                                                 "fromAccountType": role}]
            result = await self.service.reply(job["ticket"], "material")
            self.assertEqual(result["status"], "conversation_changed")
        self.assertEqual(self.transport.send_count, 0)

    async def test_stop_during_recheck_prevents_send(self):
        self.service.enabled.touch()
        job = await self.job()
        original = self.transport.read

        async def read(*args, **kwargs):
            result = await original(*args, **kwargs)
            self.service.stop.touch()
            return result
        self.transport.read = read
        result = await self.service.reply(job["ticket"], "material")
        self.assertEqual(result["status"], "stopped")
        self.assertEqual(self.transport.send_count, 0)

    async def test_knowledge_change_invalidates_ticket(self):
        self.service.enabled.touch()
        job = await self.job()
        note = self.vault / "material.md"
        note.write_text(note.read_text().replace("steel", "aluminum"))
        result = await self.service.reply(job["ticket"], "material")
        self.assertEqual(result["status"], "knowledge_changed")
        self.assertEqual(self.transport.send_count, 0)

    async def test_cursor_survives_new_agent_run_and_covers_all_stores(self):
        calls = []

        async def read(method, url, **kwargs):
            calls.append(kwargs["json"])
            return {"list": [], "hasMore": True, "nextOffset": "next"}
        self.transport.read = read
        await self.service.poll()
        self.assertEqual(calls[0]["shopIdList"], [])
        self.assertEqual(calls[0]["filterGroups"], [])
        self.assertEqual(json.loads((self.root / "runtime/cursor.json").read_text())["offset"], "next")
        with self.assertRaises(ValueError):
            await self.service.poll()
        self.assertEqual(calls[1]["offset"], "next")

    async def test_login_redirect_is_reported_without_generic_timeout(self):
        page = MagicMock()
        page.goto = AsyncMock()
        page.wait_for_function = AsyncMock()
        page.evaluate = AsyncMock(return_value=False)
        context = MagicMock()
        context.new_page = AsyncMock(return_value=page)
        browser = MagicMock()
        browser.new_context = AsyncMock(return_value=context)
        browser.close = AsyncMock()
        playwright = MagicMock()
        playwright.chromium.launch = AsyncMock(return_value=browser)
        playwright.stop = AsyncMock()
        manager = MagicMock()
        manager.start = AsyncMock(return_value=playwright)
        storage = self.root / "storage.json"
        storage.write_text("{}")
        adapter = DesktopBrowser()
        with (patch("scraping.duoke.reply.desktop_browser.async_playwright", return_value=manager),
              patch("scraping.duoke.reply.desktop_browser.DUOKE_DESKTOP_STORAGE", storage)):
            with self.assertRaisesRegex(DeliveryAdapterError, "authentication_required"):
                await adapter.open()
        self.assertEqual(page.goto.call_args.args[0], "https://web.duoke.com/#/dk/main/chat")
        browser.close.assert_awaited_once()
        playwright.stop.assert_awaited_once()
        self.assertIsNone(adapter.page)
        from playwright.async_api import Error as BrowserError
        request = MagicMock()
        request.url = "https://web.duoke.com/"
        request.all_headers = AsyncMock(side_effect=BrowserError("Target closed"))
        callback = context.on.call_args.args[1]
        await callback(request)

    async def test_real_chrome_action_receives_only_validated_message(self):
        async with async_playwright() as p:
            browser = await p.chromium.launch(channel="chrome", headless=True)
            try:
                context = await browser.new_context()
                await context.route("https://web.duoke.com/", lambda route: route.fulfill(
                    status=200, content_type="text/html", body='<div id="app"></div>'))
                page = await context.new_page()
                await page.goto("https://web.duoke.com/")
                await page.evaluate("""() => {
                    window.calls=[];
                    document.querySelector('#app').__vue__={$store:{
                      _actions:{'Chat/send-message':true},
                      state:{System:{user:{uid:'fixture'}},Socket:{imUserStatus:'onLine'}},
                      dispatch:async(name,value)=>{
                        window.calls.push({name,value});
                        if(name==='Chat/send-message') value.msg.pendingFlag=window.rejectSend?2:0;
                      }
                    },$dkChat:{createCustomMessage(){},sendMessage(){}}};
                }""")
                adapter = DesktopBrowser()
                adapter.page = page
                # The synthetic page is already open and has no saved login.
                adapter.open = AsyncMock()
                await adapter.send({**CONVERSATION, "groupId": "fixture-group"}, "Exact source text")
                calls = await page.evaluate("window.calls")
                self.assertEqual(calls[-1]["name"], "Chat/send-message")
                self.assertEqual(calls[-1]["value"]["msg"]["content"], {"text": "Exact source text"})
                self.assertEqual(calls[-1]["value"]["msg"]["conversationId"], "conversation-1")
                await page.evaluate("window.rejectSend=true; window.calls=[]")
                with self.assertRaisesRegex(DeliveryAdapterError, "sdk_rejected"):
                    await adapter.send(CONVERSATION, "Exact source text")
                await page.evaluate("document.querySelector('#app').__vue__.$store.state.Socket.imUserStatus='offLine';window.calls=[]")
                with self.assertRaisesRegex(DeliveryAdapterError, "chat_not_ready"):
                    await adapter.send(CONVERSATION, "Exact source text")
                self.assertEqual(await page.evaluate("window.calls"), [])
            finally:
                await browser.close()


if __name__ == "__main__":
    unittest.main()
