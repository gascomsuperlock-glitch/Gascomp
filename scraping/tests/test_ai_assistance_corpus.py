from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from scraping.ai_assistance.corpus import (
    CorpusError,
    build_corpus,
    source_signature,
    write_corpus,
)
from scraping.ai_assistance.knowledge import parse_note


def conversation(ref: str, transcript: str) -> str:
    return f"""---
source: duoke
status: unreviewed_archive
conversation_ref: {ref}
history_complete: true
privacy: automated_redaction
---

# Conversation {ref}

## Transcript

{transcript}

## Manual notes
"""


def pair(question: str, answer: str, *, timestamp: str = "2026-09-01T00:00:00Z") -> str:
    quoted_question = "\n".join(f"> {line}" for line in question.splitlines())
    quoted_answer = "\n".join(f"> {line}" for line in answer.splitlines())
    return f"""### {timestamp} — Customer

Type: text

{quoted_question}

### {timestamp} — Seller

Type: text

{quoted_answer}"""


def product(ref: str, sku: str, description: str, *, name: str = "Gascomp Product",
            aliases: tuple[str, ...] | None = None) -> str:
    quoted = "\n".join(f"> {line}" for line in description.splitlines())
    source_aliases = aliases or (name,)
    return f'''---
source: duoke
status: source_catalog
product_ref: "{ref}"
sku: "{sku}"
aliases: {json.dumps(list(source_aliases), ensure_ascii=False)}
---

# {name}

## Source description

{quoted}

## Variants
'''


def recaptured(capture_id: str, transcript: str) -> str:
    return f"""---
status: unreviewed_archive
reviewed: false
source: duoke_api_recapture
capture_id: {capture_id}
store: "Gascomp Official Shop"
history_complete: true
redaction_review: pending_human_review
---

# Riwayat {capture_id}

## Transcript

{transcript}
"""


def faq_block(reference: str, label: str, questions: tuple[str, ...], answer: str) -> str:
    quoted_questions = "\n".join(f"> {line}" for line in questions)
    quoted_answer = "\n".join(f"> {line}" for line in answer.splitlines())
    return f"""## {label} — {reference}

- Toko: Gascomp Official Shop
- Status: direview dan disetujui pemilik untuk pemilihan otomatis

### Pertanyaan pelanggan

{quoted_questions}

### Balasan seller dalam riwayat

{quoted_answer}

### Sumber

- [Percakapan](<Duoke/Impor/2026-09-22/Percakapan/{reference}.md>), pesan 1, 2
"""


def approved_answer(identifier: str, sku: str, question: str, answer: str,
                    triggers: tuple[str, ...] = ()) -> str:
    listed = "\n".join(f"- {line}" for line in (triggers or (question,)))
    return f"""---
knowledge_id: "{identifier}"
kind: "faq"
approval: approved
sku: "{sku}"
generated: true
---

# {question}

Produk: [[../../products/example|Example product]]

## Pertanyaan

{question}

## Jawaban disetujui

{answer}

## Pemicu pencarian

{listed}
"""


class FullCorpusTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "Duoke"
        self.conversations = self.source / "Percakapan"
        self.products = self.source / "Produk" / "Listings"
        self.conversations.mkdir(parents=True)
        self.products.mkdir(parents=True)

    def write_conversation(self, name: str, value: str) -> Path:
        path = self.conversations / name
        path.write_text(value, encoding="utf-8")
        return path

    def write_product(self, name: str, value: str) -> Path:
        path = self.products / name
        path.write_text(value, encoding="utf-8")
        return path

    def write_import(self, name: str, value: str) -> Path:
        directory = self.source / "Impor" / "2026-09-22" / "Percakapan"
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / name
        path.write_text(value, encoding="utf-8")
        return path

    def write_approved(self, name: str, value: str) -> Path:
        directory = self.source / "knowledge" / "approved"
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / name
        path.write_text(value, encoding="utf-8")
        return path

    def write_catalog(self, name: str, value: str) -> Path:
        directory = self.source / "products"
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / name
        path.write_text(value, encoding="utf-8")
        return path

    def write_faq(self, name: str, blocks: str) -> Path:
        directory = self.source / "FAQ" / "2026-09-22"
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / name
        path.write_text(
            "---\nstatus: reviewed_reference\nreviewed: true\n---\n\n"
            "# Pertanyaan umum\n\n" + blocks,
            encoding="utf-8",
        )
        return path

    def test_conversation_archive_is_retained_and_watched_before_or_after_flattening(self) -> None:
        self.write_conversation("conversation.md", conversation("main", pair(
            "Bagaimana cara membersihkannya?", "Lap dengan kain lembut.",
        )))
        archive = self.conversations / "Archive"
        archive.mkdir()
        note = archive / "conversation.md"
        original = conversation("duplicate", pair(
            "Bagaimana cara menyikat permukaan?", "Gunakan sikat untuk membersihkan permukaan.",
        ))
        note.write_text(original)
        (archive / "Index.md").write_text("# Duplicate conversation index\n")
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))

        corpus = build_corpus(self.source)
        self.assertEqual(corpus["report"]["sourceFiles"], 4)
        self.assertEqual(corpus["report"]["includedDocuments"], 4)
        self.assertEqual(corpus["report"]["excludedSourceFiles"], 0)
        self.assertEqual(corpus["report"]["sourceExclusionManifest"], {})
        self.assertTrue(any("Archive/" in document["path"] for document in corpus["documents"]))
        answers = [entry["answer"] for entry in corpus["entries"]]
        self.assertIn("Lap dengan kain lembut.", answers)
        self.assertIn("Gunakan sikat untuk membersihkan permukaan.", answers)
        self.assertEqual(corpus["report"]["conflictingConversationCandidates"], 0)
        self.assertEqual(note.read_text(), original)

        signature = source_signature(self.source)
        note.write_text(original + "\nArchive-only edit\n")
        self.assertNotEqual(source_signature(self.source), signature)
        edited_signature = source_signature(self.source)
        flattened = self.conversations / "conversation-from-archive.md"
        note.replace(flattened)
        self.assertNotEqual(source_signature(self.source), edited_signature)
        flattened_corpus = build_corpus(self.source)
        self.assertEqual(flattened_corpus["report"]["includedDocuments"], 4)
        self.assertTrue(any(document["path"] == "Percakapan/conversation-from-archive.md"
                            for document in flattened_corpus["documents"]))

    def test_product_catalog_is_retained_and_watched_before_flattening(self) -> None:
        self.write_product("main.md", product("main", "GC-1", "- Bahan: Baja"))
        catalog = self.source / "Produk" / "Catalog"
        catalog.mkdir()
        note = catalog / "copy.md"
        note.write_text(product("catalog", "GC-2", "- Bahan: Plastik"))
        (catalog / "Index.md").write_text("# Catalog index\n")
        corpus = build_corpus(self.source)
        self.assertEqual(corpus["report"]["includedDocuments"], 3)
        self.assertEqual(corpus["report"]["sourceExclusionManifest"], {})
        self.assertEqual(sorted(entry["answer"] for entry in corpus["entries"]),
                         ["- Bahan: Baja", "- Bahan: Plastik"])
        signature = source_signature(self.source)
        note.write_text(product("catalog", "GC-2", "- Bahan: Plastik\n- Warna: Hitam"))
        self.assertNotEqual(source_signature(self.source), signature)
        changed_signature = source_signature(self.source)
        note.unlink()
        self.assertNotEqual(source_signature(self.source), changed_signature)

    def test_duplicate_products_require_same_marketplace_store_listing_and_content(self) -> None:
        def listing(ref, *, platform="market-one", shop="shop-one", post="post-one",
                    sku="GC-1", description="- Bahan: Baja", captured="2026-09-01"):
            note = product(ref, sku, description)
            return note.replace("source: duoke\n", f"source: duoke\nplatform: {platform}\nsource_shop_id: {shop}\nsource_product_id: {post}\ncaptured_at: {captured}\n")

        original = self.write_product("00-main.md", listing("main"))
        duplicate = self.write_product("01-copy.md", listing("copy", captured="2026-09-02"))
        self.write_product("02-other-shop.md", listing("other-shop", shop="shop-two"))
        self.write_product("03-other-post.md", listing("other-post", post="post-two"))
        self.write_product("04-other-market.md", listing("other-market", platform="market-two"))
        self.write_product("05-other-variant.md", listing("other-variant", sku="GC-2"))
        self.write_product("06-other-content.md", listing("other-content", description="- Bahan: Baja\n- Warna: Hitam"))
        corpus = build_corpus(self.source)
        self.assertEqual(corpus["report"]["includedDocuments"], 6)
        self.assertEqual(corpus["report"]["deduplicatedProductDocuments"], 1)
        self.assertEqual(corpus["report"]["duplicateProductDocuments"], [{
            "path": "Produk/Listings/01-copy.md", "keptPath": "Produk/Listings/00-main.md",
        }])
        self.assertTrue(original.exists())
        self.assertTrue(duplicate.exists())
        paths = {document["path"] for document in corpus["documents"]}
        self.assertNotIn("Produk/Listings/01-copy.md", paths)
        self.assertIn("Produk/Listings/06-other-content.md", paths)

    def test_same_sku_without_listing_identity_is_not_enough_to_delete_a_product(self) -> None:
        self.write_product("one.md", product("one", "GC-1", "- Bahan: Baja"))
        self.write_product("two.md", product("two", "GC-1", "- Bahan: Baja"))
        corpus = build_corpus(self.source)
        self.assertEqual(corpus["report"]["includedDocuments"], 2)
        self.assertEqual(corpus["report"]["deduplicatedProductDocuments"], 0)

    def test_indexes_every_note_and_preserves_multiline_plain_turn_context(self) -> None:
        transcript = pair(
            "Bagaimana cara membersihkannya?",
            "Cabut steker terlebih dahulu.\nLap dengan kain lembut.",
        ) + """

### 2026-09-01T00:01:00Z — Customer

Type: text

> The chat has been assigned to Customer Service5309

### 2026-09-01T00:02:00Z — Seller

Type: image

    {"imageUrl": "https://example.test/private.jpg"}
"""
        self.write_conversation("conversation.md", conversation("one", transcript))
        description = "\n".join([f"- Detail {index}: Nilai {index}" for index in range(1, 16)])
        self.write_product("Product one.md", product("product-one", "GC-1", description))

        corpus = build_corpus(self.source)

        self.assertEqual(corpus["report"]["sourceFiles"], 2)
        self.assertEqual(corpus["report"]["includedDocuments"], 2)
        self.assertEqual(corpus["report"]["sourceKindCounts"], {
            "conversation": 1, "product": 1,
        })
        conversation_document = next(item for item in corpus["documents"]
                                     if item["sourceKind"] == "conversation")
        self.assertIn("Seller: Cabut steker terlebih dahulu.\nLap dengan kain lembut.",
                      conversation_document["text"])
        self.assertNotIn("assigned", conversation_document["text"])
        self.assertNotIn("imageUrl", conversation_document["text"])
        product_entry = next(item for item in corpus["entries"] if item["id"].startswith("source-"))
        self.assertIn("Detail 15", product_entry["answer"])
        self.assertGreater(len(product_entry["answer"].splitlines()), 12)
        self.assertEqual(conversation_document["entryIds"], [
            next(item["id"] for item in corpus["entries"] if item["id"].startswith("archive-"))
        ])

    def test_privacy_is_redacted_from_documents_and_blocks_public_pair(self) -> None:
        self.write_conversation("private.md", conversation("private", pair(
            "Nomor saya 081234567890, bagaimana pemasangannya?",
            "Pasang pengunci lalu telepon 081298765432 jika masih sulit.",
        )))
        self.write_product("Product one.md", product(
            "product-one", "GC-1", "- Bahan: Baja\n- Hubungi 081234567890 untuk bantuan",
        ))

        corpus = build_corpus(self.source)
        serialized = json.dumps(corpus, ensure_ascii=False)

        self.assertNotIn("081234567890", serialized)
        self.assertNotIn("081298765432", serialized)
        self.assertIn("[PHONE]", serialized)
        self.assertEqual(corpus["report"]["conversationEntryCount"], 0)
        product_entry = next(item for item in corpus["entries"] if item["id"].startswith("source-"))
        self.assertEqual(product_entry["answer"], "- Bahan: Baja")

    def test_exact_pairs_are_deduplicated_and_all_sources_map_to_entry(self) -> None:
        value = pair("Bagaimana merawat GC-1?", "Bersihkan dengan kain lembut.")
        self.write_conversation("one.md", conversation("one", value))
        self.write_conversation("two.md", conversation("two", value))
        self.write_product("Product one.md", product("product-one", "GC-1", "- Bahan: Baja"))

        corpus = build_corpus(self.source)
        archive_entries = [entry for entry in corpus["entries"] if entry["id"].startswith("archive-")]

        self.assertEqual(len(archive_entries), 1)
        self.assertEqual(corpus["report"]["deduplicatedConversationPairs"], 1)
        conversation_documents = [item for item in corpus["documents"]
                                  if item["sourceKind"] == "conversation"]
        self.assertTrue(all(item["entryIds"] == [archive_entries[0]["id"]]
                            for item in conversation_documents))

    def test_conflicting_replies_remain_evidence_but_are_not_answer_entries(self) -> None:
        question = "Berapa panjang selang GC-1?"
        self.write_conversation("one.md", conversation(
            "one", pair(question, "Panjang selangnya 1,5 meter."),
        ))
        self.write_conversation("two.md", conversation(
            "two", pair(question, "Panjang selangnya 1,8 meter."),
        ))
        self.write_product("Product one.md", product("product-one", "GC-1", "- Bahan: Baja"))

        corpus = build_corpus(self.source)

        self.assertEqual(corpus["report"]["conflictingConversationCandidates"], 2)
        self.assertEqual(corpus["report"]["conversationEntryCount"], 0)
        conflicting = [item for item in corpus["candidateEvidence"]
                       if "conflicting_historical_replies" in item["flags"]]
        self.assertEqual(len(conflicting), 2)
        self.assertTrue(all(item["entryId"] is None for item in conflicting))

    def test_product_fact_conflict_is_flagged_and_only_conflicting_line_is_omitted(self) -> None:
        self.write_product("Product one.md", product(
            "one", "GC-1", "- Bahan: Baja\n- Kapasitas: 3 liter",
        ))
        self.write_product("Product two.md", product(
            "two", "GC-1", "- Bahan: Baja\n- Kapasitas: 4 liter",
        ))
        self.write_conversation("Index.md", "# Conversation index\n")

        corpus = build_corpus(self.source)

        self.assertEqual(corpus["report"]["conflictingProductGroups"], 1)
        entry = next(item for item in corpus["entries"] if item["id"].startswith("source-"))
        self.assertEqual(entry["answer"], "- Bahan: Baja")
        product_documents = [item for item in corpus["documents"]
                             if item["sourceKind"] == "product"]
        self.assertTrue(all("conflicting_product_facts" in item["flags"]
                            for item in product_documents))
        self.assertTrue(all(item["entryIds"] == [entry["id"]] for item in product_documents))

    def test_distinct_product_passages_are_preserved_with_one_generic_sku_alias(self) -> None:
        self.write_product("Product one.md", product(
            "one", "GC-1", "- Bahan: Baja\n- Warna: Hitam", name="Gascomp GC-1 Black",
        ))
        self.write_product("Product two.md", product(
            "two", "GC-1", "- Bahan: Baja\n- Panjang: 2 meter", name="Gascomp GC-1 Long",
        ))
        self.write_conversation("Index.md", "# Conversation index\n")

        corpus = build_corpus(self.source)
        entries = [item for item in corpus["entries"] if item["id"].startswith("source-")]

        self.assertEqual(len(entries), 2)
        self.assertTrue(any("Warna: Hitam" in item["answer"] for item in entries))
        self.assertTrue(any("Panjang: 2 meter" in item["answer"] for item in entries))
        generic = sum("Spesifikasi GC-1" in item["questions"] for item in entries)
        self.assertEqual(generic, 1)
        self.assertEqual(corpus["report"]["productCandidateGroupCount"], 1)
        self.assertEqual(corpus["report"]["productCandidateEvidenceCount"], 2)

    def test_punctuation_equivalent_skus_share_group_but_prefix_variant_does_not(self) -> None:
        self.write_product("Product one.md", product(
            "one", "GRS 925F", "- Bahan: Baja", name="Gascomp GRS 925F",
        ))
        self.write_product("Product two.md", product(
            "two", "GRS-925F", "- Panjang: 2 meter", name="Gascomp GRS-925F",
        ))
        self.write_product("Product variant.md", product(
            "variant", "GRS-925F-PRO", "- Panjang: 3 meter", name="Gascomp GRS-925F Pro",
        ))
        self.write_conversation("Index.md", "# Conversation index\n")

        corpus = build_corpus(self.source)
        entries = [item for item in corpus["entries"] if item["id"].startswith("source-")]

        self.assertEqual(corpus["report"]["productCandidateGroupCount"], 2)
        base = [item for item in entries if item.get("sku") == "GRS-925F"]
        self.assertEqual(len(base), 2)
        self.assertTrue(any("GRS 925F" in item["questions"] for item in base))
        self.assertEqual(sum("Spesifikasi GRS-925F" in item["questions"] for item in base), 1)
        self.assertTrue(any(item.get("sku") == "GRS-925F-PRO" for item in entries))

    def test_equivalent_measurement_formats_and_unicode_bullets_do_not_conflict(self) -> None:
        self.write_product("Product one.md", product(
            "one", "EBAF-01",
            "▶️Kapasitas: 4.5 Liter\n▶️Daya: 1350 Watt\n▶️Tegangan: 220 Volt",
            name="Gascomp Air Fryer EBAF-01",
        ))
        self.write_product("Product two.md", product(
            "two", "EBAF01",
            "▪️Kapasitas: 4,5L\n▪️Daya: 1350W\n▪️Tegangan: 220V",
            name="Gascomp Air Fryer EBAF01",
        ))
        self.write_conversation("Index.md", "# Conversation index\n")

        corpus = build_corpus(self.source)
        entries = [item for item in corpus["entries"] if item["id"].startswith("source-")]

        self.assertEqual(corpus["report"]["conflictingProductGroups"], 0)
        self.assertEqual(len(entries), 2)
        self.assertTrue(any("▶️Kapasitas: 4.5 Liter" in item["answer"] for item in entries))
        self.assertTrue(any("▪️Kapasitas: 4,5L" in item["answer"] for item in entries))
        self.assertTrue(any("Berapa kapasitas EBAF-01?" in item["questions"]
                            for item in entries))

    def test_unicode_labeled_genuine_conflict_is_removed_from_every_answer(self) -> None:
        self.write_product("Product one.md", product(
            "one", "GC-1", "▶️Kapasitas: 3 Liter\n▶️Bahan: Baja",
        ))
        self.write_product("Product two.md", product(
            "two", "GC-1", "▪️Kapasitas: 4L\n▪️Bahan: Baja",
        ))
        self.write_conversation("Index.md", "# Conversation index\n")

        corpus = build_corpus(self.source)
        answers = "\n".join(item["answer"] for item in corpus["entries"])

        self.assertEqual(corpus["report"]["conflictingProductGroups"], 1)
        self.assertNotIn("Kapasitas: 3", answers)
        self.assertNotIn("Kapasitas: 4", answers)
        self.assertIn("Bahan: Baja", answers)
        published = [item for item in corpus["candidateEvidence"] if item["entryId"]]
        self.assertTrue(all(item["conflictingAttributes"] == ["kapasitas"]
                            for item in published))
        self.assertTrue(all(item["removedConflictingAttributes"] == ["kapasitas"]
                            for item in published))
        self.assertTrue(all("conflicting_product_facts_removed" in item["flags"]
                            for item in published))

    def test_aliases_identifying_foreign_known_sku_are_not_entry_questions(self) -> None:
        self.write_product("Product own.md", product(
            "own", "GRT-924E", "- Bahan: Baja", name="Gascomp GRT-924E",
            aliases=("Gascomp GRT-924E", "GRP-924E", "GRT-2D", "GRT-924E dan GRT-2D"),
        ))
        self.write_product("Product foreign-one.md", product(
            "foreign-one", "GRP-924E", "- Bahan: Kaca", name="Gascomp GRP-924E",
        ))
        self.write_product("Product foreign-two.md", product(
            "foreign-two", "GRT-2D", "- Bahan: Besi", name="Gascomp GRT-2D",
        ))
        self.write_conversation("Index.md", "# Conversation index\n")

        corpus = build_corpus(self.source)
        entry = next(item for item in corpus["entries"] if item.get("sku") == "GRT-924E")
        evidence = next(item for item in corpus["candidateEvidence"]
                        if item["entryId"] == entry["id"])

        self.assertIn("Gascomp GRT-924E", entry["questions"])
        self.assertNotIn("GRP-924E", entry["questions"])
        self.assertNotIn("GRT-2D", entry["questions"])
        self.assertNotIn("GRT-924E dan GRT-2D", entry["questions"])
        self.assertIn("foreign_sku_alias_excluded", evidence["flags"])

    def test_image_only_placeholder_remains_document_only(self) -> None:
        placeholder = "Douke provided an image-only description; its URL references are listed below."
        self.write_product("Product image.md", product(
            "image", "FILTER-01", placeholder, name="Gascomp FILTER-01",
        ))
        self.write_conversation("Index.md", "# Conversation index\n")

        corpus = build_corpus(self.source)

        self.assertFalse(any(item.get("sku") == "FILTER-01" for item in corpus["entries"]))
        document = next(item for item in corpus["documents"] if item["sourceKind"] == "product")
        self.assertEqual(document["text"], placeholder)
        evidence = next(item for item in corpus["candidateEvidence"]
                        if item["sourceKind"] == "product")
        self.assertIsNone(evidence["entryId"])
        self.assertIn("placeholder_description_excluded", evidence["flags"])

    def test_scoped_archive_alias_includes_its_explicit_sku(self) -> None:
        transcript = """### 2026-09-01T00:00:00Z — Customer

Type: item

    {"skuValue": "GC-1"}

""" + pair("Bagaimana cara merawatnya?", "Bersihkan dengan kain lembut.")
        self.write_conversation("one.md", conversation("one", transcript))
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))

        corpus = build_corpus(self.source)
        entry = next(item for item in corpus["entries"] if item["id"].startswith("archive-"))

        self.assertEqual(entry["sku"], "GC-1")
        self.assertEqual(entry["questions"], ["Bagaimana cara merawatnya? GC-1"])

    def test_risky_historical_pairs_stay_searchable_but_never_become_answers(self) -> None:
        item = """### 2026-09-01T00:00:00Z — Customer

Type: item

    {"skuValue": "GC-1/2M"}

"""
        fixtures = {
            "composite.md": conversation("composite", item + pair(
                "Bagaimana cara memasangnya?", "Pasang sambungan sampai rapat.",
            )),
            "monetary.md": conversation("monetary", pair(
                "Bagaimana proses refund?", "Refund akan di proses setelah barang sampai.",
            )),
            "approximate.md": conversation("approximate", pair(
                "Berapa panjangnya?", "Panjangnya kurang lebih 2 meter.",
            )),
            "automation.md": conversation("automation", pair(
                "Please chat with shop agent. Bagaimana caranya?",
                "Ikuti petunjuk penggunaan pada kemasan.",
            )),
        }
        for name, value in fixtures.items():
            self.write_conversation(name, value)
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))

        corpus = build_corpus(self.source)
        archive_entries = [item for item in corpus["entries"] if item["id"].startswith("archive-")]
        archive_evidence = [item for item in corpus["candidateEvidence"]
                            if item["sourceKind"] == "conversation"]

        self.assertEqual(archive_entries, [])
        self.assertEqual(len(archive_evidence), 4)
        self.assertTrue(all(item["entryId"] is None for item in archive_evidence))
        self.assertEqual(sum(item["sourceKind"] == "conversation"
                             for item in corpus["documents"]), 4)

    def test_signature_detects_edits_and_deletions(self) -> None:
        first = self.write_conversation("one.md", conversation(
            "one", pair("Bagaimana caranya?", "Ikuti petunjuk pada produk."),
        ))
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))
        original = source_signature(self.source)
        first.write_text(conversation(
            "one", pair("Bagaimana caranya?", "Baca petunjuk pada produk."),
        ), encoding="utf-8")
        edited = source_signature(self.source)
        first.unlink()
        deleted = source_signature(self.source)

        self.assertNotEqual(original, edited)
        self.assertNotEqual(edited, deleted)

    def test_private_writer_emits_schema_valid_staged_notes(self) -> None:
        self.write_conversation("one.md", conversation(
            "one", pair("Bagaimana merawatnya?", "Bersihkan dengan kain lembut."),
        ))
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))
        corpus = build_corpus(self.source)
        private = self.root / "private"
        output = private / "full-corpus"

        write_corpus(corpus, output, private)

        staged = sorted((output / "staged").glob("*.md"))
        self.assertEqual(len(staged), len(corpus["entries"]))
        self.assertEqual(parse_note(staged[0].read_text(encoding="utf-8"))["kind"], "answer")
        self.assertEqual(os.stat(output / "corpus.json").st_mode & 0o777, 0o600)
        with self.assertRaises(CorpusError):
            write_corpus(corpus, self.root / "outside", private)

    def test_recaptured_imports_and_faq_join_the_indexed_sources(self) -> None:
        self.write_conversation("conversation.md", conversation("main", pair(
            "Bagaimana cara membersihkannya?", "Lap dengan kain lembut.",
        )))
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))
        self.write_import("capture.md", recaptured("abc1230000000000000000cc", pair(
            "Apakah regulator ini butuh karet seal tabung?",
            "Halo kak, karet seal pada tabung gas bersifat wajib sesuai standar keamanan SNI.",
        )))
        (self.source / "Impor" / "2026-09-22" / "README.md").write_text(
            "# Pengambilan ulang\n\n- Percakapan: 1 dari 1.\n", encoding="utf-8")
        self.write_faq("Pertanyaan-umum.md", faq_block(
            "abc1230000000000000000cc",
            "GC-1",
            ("Apakah bisa dipakai di kompor tanam?", "Kak"),
            "Halo kak, untuk kompor tanam dan kompor meja rumahan bisa dipakai ya kak.",
        ))

        corpus = build_corpus(self.source)
        report = corpus["report"]

        self.assertEqual(report["sourceFiles"], 5)
        self.assertEqual(report["sourceKindCounts"], {
            "conversation": 1, "faq": 1, "import-conversation": 1, "product": 1, "reference": 1,
        })
        self.assertEqual(report["faqDocumentCount"], 1)
        self.assertEqual(report["referenceDocumentCount"], 1)
        self.assertEqual(report["faqEntryCount"], 1)
        answers = [entry["answer"] for entry in corpus["entries"]]
        self.assertIn(
            "Halo kak, karet seal pada tabung gas bersifat wajib sesuai standar keamanan SNI.",
            answers,
        )
        faq = next(entry for entry in corpus["entries"] if entry["id"].startswith("faq-"))
        self.assertEqual(faq["sku"], "GC-1")
        # The bare greeting line beside the real question is not a retrieval alias.
        self.assertEqual(faq["questions"], ["Apakah bisa dipakai di kompor tanam? GC-1"])
        reference = next(item for item in corpus["documents"] if item["sourceKind"] == "reference")
        self.assertEqual(reference["entryIds"], [])

    def test_faq_pleasantries_and_volatile_replies_stay_out_of_the_entries(self) -> None:
        self.write_conversation("conversation.md", conversation("main", pair(
            "Bagaimana cara membersihkannya?", "Lap dengan kain lembut.",
        )))
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))
        self.write_faq("Pertanyaan-umum.md", "\n".join((
            faq_block("aaa1110000000000000000aa", "SKU belum pasti",
                      ("Terima kasih banyak untuk bantuannya kak",),
                      "baik kak, sehat selalu ya kak"),
            faq_block("bbb2220000000000000000bb", "SKU belum pasti",
                      ("Berapa harga regulator ini kak?",),
                      "Halo kak, harganya Rp137.000 dan sedang ada promo diskon ya kak"),
            faq_block("ccc3330000000000000000cc", "SKU belum pasti",
                      ("Bagaimana cara memasang selang ke regulator?",),
                      "「Bagaimana cara memasang selang ke regulator?」\n"
                      "- - - - - - - - -\n"
                      "Tekan tuas regulator sampai berbunyi klik lalu pastikan selang terkunci rapat."),
        )))

        corpus = build_corpus(self.source)

        faq = [entry for entry in corpus["entries"] if entry["id"].startswith("faq-")]
        self.assertEqual(len(faq), 1)
        self.assertEqual(
            faq[0]["answer"],
            "Tekan tuas regulator sampai berbunyi klik lalu pastikan selang terkunci rapat.",
        )
        rejected = [item["flags"] for item in corpus["candidateEvidence"]
                    if item["sourceKind"] == "faq" and item["entryId"] is None]
        self.assertEqual(len(rejected), 2)
        self.assertIn("reply_without_reusable_content", rejected[0])
        self.assertIn("not_public_answer_compatible", rejected[1])

    def test_generated_answer_and_catalog_notes_inside_duoke_are_indexed(self) -> None:
        self.write_conversation("conversation.md", conversation("main", pair(
            "Bagaimana cara membersihkannya?", "Lap dengan kain lembut.",
        )))
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))
        self.write_approved("admin-faq-one.md", approved_answer(
            "admin-faq-one", "GC-1",
            "Mengapa regulator ini tidak bisa digunakan?",
            "Halo Kak! Pastikan pemasangan sudah terkunci sempurna dan karet seal tabung masih lentur.",
            triggers=("Mengapa regulator ini tidak bisa digunakan?", "GC-1"),
        ))
        self.write_catalog("example.md", "---\nproduct_id: \"p1\"\nsku: \"GC-1\"\n---\n\n# Example product\n")

        corpus = build_corpus(self.source)
        report = corpus["report"]

        self.assertEqual(report["sourceKindCounts"]["approved-answer"], 1)
        self.assertEqual(report["sourceKindCounts"]["catalog"], 1)
        self.assertEqual(report["approvedAnswerEntryCount"], 1)
        self.assertEqual(report["catalogDocumentCount"], 1)
        entry = next(item for item in corpus["entries"] if item["id"].startswith("approved-"))
        self.assertEqual(entry["sku"], "GC-1")
        self.assertIn("GC-1", entry["questions"])
        self.assertTrue(entry["answer"].startswith("Halo Kak!"))
        catalog = next(item for item in corpus["documents"] if item["sourceKind"] == "catalog")
        self.assertEqual(catalog["skus"], ["GC-1"])

    def test_answer_without_owner_approval_stays_a_document_only(self) -> None:
        self.write_conversation("conversation.md", conversation("main", pair(
            "Bagaimana cara membersihkannya?", "Lap dengan kain lembut.",
        )))
        self.write_product("Product one.md", product("one", "GC-1", "- Bahan: Baja"))
        self.write_approved("admin-faq-two.md", approved_answer(
            "admin-faq-two", "GC-1", "Apakah aman?", "Aman digunakan sesuai panduan resmi.",
        ).replace("approval: approved", "approval: pending"))

        corpus = build_corpus(self.source)

        self.assertEqual(corpus["report"]["approvedAnswerEntryCount"], 0)
        document = next(item for item in corpus["documents"] if item["sourceKind"] == "approved-answer")
        self.assertIn("answer_not_approved", document["flags"])
        self.assertEqual(document["entryIds"], [])

    def test_missing_required_source_folder_fails_explicitly(self) -> None:
        (self.source / "Produk").rename(self.root / "moved-products")
        with self.assertRaisesRegex(CorpusError, "missing Produk"):
            build_corpus(self.source)


if __name__ == "__main__":
    unittest.main()
