from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scraping.duoke.catalog.archive_duoke_products import (
    PRODUCT_INDEX_NAME, ProductMatcher, clean_product, description_text, export_catalog,
    fetch_catalog, fetch_store, product_note, product_ref, render_product,
)
from scraping.duoke.chat.archive_duoke_chats import conversation_ref, render_note, write_note


PRODUCT = {
    "platform": "shopee", "shopId": "store-a", "shopName": "Test store",
    "productId": "product-a", "productName": "Test regulator", "productSku": "GC-01",
    "productDescription": "<p>Use with the specified cylinder.</p><p>Check the seal.</p>",
    "items": [{"itemId": "variant-a", "itemSku": "GC-01-BLUE", "attribute": "Blue", "stock": 0}],
}
CONVERSATION = {"platform": "shopee", "shopId": "store-a", "conversationId": "thread-a"}


def message(kind, content, identifier="message-a"):
    return {"messageId": identifier, "messageType": kind, "messageContent": json.dumps(content), "createdTimestamp": 1000}


class ProductArchiveTests(unittest.IsolatedAsyncioTestCase):
    async def test_fetches_all_pages_despite_false_has_next_flag(self) -> None:
        calls = []

        async def read(body):
            calls.append(body)
            n = body["pageNo"]
            return {"total": "2", "pages": 2, "pageNum": n, "hasNextPage": False,
                    "list": [{**PRODUCT, "productId": f"product-{n}"}]}

        products, report = await fetch_store(read, {"id": "store-a", "platform": "shopee"})
        self.assertEqual(len(products), 2)
        self.assertEqual(report["status"], "complete")
        self.assertEqual([body["pageNo"] for body in calls], [1, 2])
        self.assertTrue(all(body["messageItemIds"] == "" for body in calls))

    async def test_duplicates_and_wrong_stores_cannot_claim_complete_catalog(self) -> None:
        async def duplicate(body):
            return {"total": "2", "pages": 2, "pageNum": body["pageNo"], "list": [PRODUCT]}

        with self.assertRaisesRegex(ValueError, "Unique product count"):
            await fetch_store(duplicate, {"id": "store-a", "platform": "shopee"})
        with self.assertRaisesRegex(ValueError, "different store"):
            await fetch_store(duplicate, {"id": "store-b", "platform": "shopee"})

    async def test_blocks_external_marketplace_requests(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            session = Path(directory) / "session.json"
            session.write_text(json.dumps({"list_url": "https://shopee.co.id/product", "headers": {}}))
            with self.assertRaisesRegex(ValueError, "web.duoke.com"):
                await fetch_catalog(session)

    def test_preserves_skus_and_extracts_descriptions_without_executing_html(self) -> None:
        product = clean_product({**PRODUCT, "productSku": "0001-GC", "accessToken": "test-secret", "buyer": "private"})
        self.assertEqual(product["productSku"], "0001-GC")
        self.assertNotIn("accessToken", product)
        self.assertNotIn("buyer", product)
        self.assertEqual(description_text(product), "Use with the specified cylinder.\n\nCheck the seal.")
        product["productDescription"] = "<p>Keep this.</p><script>remove_this()</script>"
        self.assertNotIn("remove_this", description_text(product))
        product["productDescription"] = None
        product["extraInfo"] = {"descriptionInfo": json.dumps({"extended_description": {"field_list": [{"text": "Full source text"}]}})}
        self.assertEqual(description_text(product), "Full source text")

    def test_links_explicit_ids_only_in_the_correct_store(self) -> None:
        other = {**PRODUCT, "shopId": "store-b", "productName": "Other store product"}
        matcher = ProductMatcher([PRODUCT, other])
        matches, ambiguous = matcher.match(CONVERSATION, message("item", {"itemId": "product-a"}))
        self.assertFalse(ambiguous)
        self.assertEqual([m["ref"] for m in matches], [product_ref(PRODUCT)])
        matches, _ = matcher.match(CONVERSATION, message("item", {"itemId": "missing", "title": PRODUCT["productName"]}))
        self.assertEqual(matches, [])

    def test_image_only_description_is_a_reference_not_an_external_embed(self) -> None:
        product = {**PRODUCT, "productDescription": '<img src="https://example.test/product.jpg">'}
        self.assertEqual(description_text(product), "")
        note = render_product(product, [], "2026-09-17T00:00:00Z")
        self.assertIn("image-only description", note)
        self.assertIn("`https://example.test/product.jpg`", note)
        self.assertNotIn("<img", note)

    def test_ambiguous_skus_and_partial_names_are_not_linked(self) -> None:
        duplicate = {**PRODUCT, "productId": "second-product", "productName": "Another regulator"}
        matcher = ProductMatcher([PRODUCT, duplicate])
        matches, ambiguous = matcher.match(CONVERSATION, message("text", {"text": "How do I use GC-01?"}))
        self.assertEqual(matches, [])
        self.assertTrue(ambiguous)
        matches, _ = matcher.match(CONVERSATION, message("order", {"productName": "Test regul..."}))
        self.assertEqual(matches, [])
        matches, _ = ProductMatcher([PRODUCT]).match(CONVERSATION, message("text", {"text": "GC-010"}))
        self.assertEqual(matches, [])

    def test_exact_name_and_variant_sku_match(self) -> None:
        matcher = ProductMatcher([PRODUCT])
        for item in [message("order", {"productName": "Test regulator"}), message("text", {"text": "Use GC-01-BLUE?"})]:
            matches, _ = matcher.match(CONVERSATION, item)
            self.assertEqual([m["ref"] for m in matches], [product_ref(PRODUCT)])

    def test_ambiguous_context_has_a_visible_review_marker(self) -> None:
        record = {"conversation": CONVERSATION, "captured_at": "2026-09-17T00:00:00Z", "complete": True,
                  "expected_messages": 1, "messages": [message("text", {"text": "GC-01"})],
                  "product_context_review": {"message-a": "Multiple products share this SKU."}}
        note = render_note(record)
        self.assertIn("Product context requires review for 1 messages", note)
        self.assertIn("Product context review: Multiple products share this SKU.", note)

    def test_export_creates_two_way_links_without_losing_transcript_or_manual_notes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "raw"
            (archive / "conversations").mkdir(parents=True)
            vault = root / "vault"
            vault.mkdir()
            record = {"conversation": CONVERSATION, "captured_at": "2026-09-17T00:00:00Z", "complete": True,
                      "expected_messages": 1, "messages": [message("item", {"itemId": "product-a", "title": "Test regulator"})]}
            ref = conversation_ref(CONVERSATION)
            raw = archive / "conversations" / f"{ref}.json"
            raw.write_text(json.dumps(record))
            note = vault / "Duoke/Percakapan" / f"Conversation {ref}.md"
            write_note(note, render_note(record))
            note.write_text(note.read_text() + "Owner annotation\n")
            with patch("scraping.duoke.catalog.archive_duoke_products.CHAT_ARCHIVE_DIR", archive), patch(
                "scraping.duoke.catalog.archive_duoke_products.PRODUCT_ARCHIVE_DIR", root / "products",
            ):
                catalog = {"products": [PRODUCT], "stores": [{"status": "complete"}]}
                summary = export_catalog(catalog, vault)
                export_catalog(catalog, vault)
            self.assertEqual(summary["linked_conversations"], 1)
            self.assertEqual(summary["linked_messages"], 1)
            self.assertEqual(json.loads(raw.read_text())["messages"], record["messages"])
            self.assertEqual(note.read_text().count("Owner annotation"), 1)
            self.assertIn(product_note(PRODUCT), note.read_text())
            product_body = (vault / f"{product_note(PRODUCT)}.md").read_text()
            self.assertIn(f"Conversation {ref}", product_body)
            self.assertIn("GC-01-BLUE", product_body)
            self.assertNotIn("![", product_body)
            self.assertTrue((vault / "Duoke/Produk" / PRODUCT_INDEX_NAME).is_file())
            self.assertFalse((vault / "Duoke/Produk/Catalog").exists())
            self.assertFalse((vault / "Duoke/Percakapan/Archive").exists())


if __name__ == "__main__":
    unittest.main()
