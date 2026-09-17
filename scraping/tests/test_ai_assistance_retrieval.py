from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scraping.ai_assistance.hermes_turn import SYSTEM
from scraping.ai_assistance.knowledge import KnowledgeError, note_files, resolve_product_context, retrieve
from scraping.ai_assistance.selector import compact_candidates


def entry(identifier: str, questions: list[str], answer: str, *,
          sku: str | None = None, kind: str = "answer") -> dict:
    value = {
        "id": identifier,
        "kind": kind,
        "language": "id",
        "questions": questions,
        "answer": answer,
    }
    if sku:
        value["sku"] = sku
    return value


class BroadRetrievalTests(unittest.TestCase):
    def test_selector_distinguishes_complementary_catalog_passages_from_conflicts(self) -> None:
        self.assertIn("multiple_distinct_product_descriptions flag alone is not a conflict", SYSTEM)
        self.assertIn("informative text excerpt over an image-only placeholder", SYSTEM)
        self.assertIn("conflictingAttributes", SYSTEM)

    def test_selector_payload_bounds_aliases_without_changing_exact_answers_or_safety(self) -> None:
        candidate = {
            **entry("source-product", [f"Unrelated alias {index}" for index in range(10)],
                    "Exact owner-authored paragraph.\n" * 270, sku="GC-1"),
            "sourceFlags": ["multiple_distinct_product_descriptions"],
            "conflictingAttributes": ["warna"],
            "privateMetadata": "not for the model",
        }
        candidate["questions"].append("Berapa kapasitas GC-1?")
        identity = "Gascomp Compact Air Fryer Digital GC-1 Stainless Steel"
        candidate["questions"].append(identity)

        compacted = compact_candidates("Berapa kapasitas GC-1?", [candidate])

        self.assertEqual(compacted[0]["answer"], candidate["answer"])
        self.assertEqual(compacted[0]["conflictingAttributes"], ["warna"])
        self.assertIn("Berapa kapasitas GC-1?", compacted[0]["questions"])
        self.assertIn(identity, compacted[0]["questions"])
        self.assertEqual(len(compacted[0]["questions"]), 3)
        self.assertNotIn("privateMetadata", compacted[0])

    def test_small_selector_context_retains_all_source_aliases(self) -> None:
        candidate = entry("source-product", ["GC-1", "Specifications GC-1", "What specifications GC-1?",
                                              "Gascomp Tea Filter", "Tea and coffee strainer"],
                          "A reusable tea and coffee strainer.", sku="GC-1")
        candidate["privateMetadata"] = "not for the model"
        result = compact_candidates("What is GC-1 used for?", [candidate])
        self.assertEqual(result[0]["questions"], candidate["questions"])
        self.assertEqual(result[0]["answer"], candidate["answer"])
        self.assertNotIn("privateMetadata", result[0])

    def test_unique_exact_alias_ranks_first_without_hiding_fuzzy_source_evidence(self) -> None:
        primary = entry(
            "source-primary",
            ["EHJ-01", "Apa spesifikasi EHJ-01?", "Berapa daya EHJ-01?"],
            "Model: EHJ-01\nDaya: 240W\nTegangan: 220V",
            sku="EHJ-01",
        )
        complementary = entry(
            "source-complementary",
            ["Gascomp Multifunctional Juicer EHJ-01", "Berapa daya EHJ-01?"],
            "EHJ-01 dapat digunakan sebagai blender dan juicer.",
            sku="EHJ-01",
        )

        result = compact_candidates(
            "Apa spesifikasi EHJ-01?",
            [complementary, primary],
        )

        self.assertEqual([candidate["id"] for candidate in result],
                         ["source-primary", "source-complementary"])
        self.assertEqual(result[0]["answer"], primary["answer"])

    def test_unique_exact_alias_does_not_hide_fuzzy_contradiction(self) -> None:
        primary = entry(
            "source-primary", ["Apa kapasitas GC-1?"], "Kapasitas: 1 liter", sku="GC-1",
        )
        contradictory = entry(
            "source-contradictory", ["Informasi produk GC-1"],
            "Kapasitas produk ini 2 liter.", sku="GC-1",
        )

        result = compact_candidates("Apa kapasitas GC-1?", [contradictory, primary])

        self.assertEqual([candidate["id"] for candidate in result],
                         ["source-primary", "source-contradictory"])

    def test_duplicate_exact_alias_keeps_all_candidates_for_conflict_review(self) -> None:
        candidates = [
            entry("source-one", ["Apa spesifikasi GC-1?"], "Daya: 200W", sku="GC-1"),
            entry("source-two", ["Apa spesifikasi GC-1?"], "Daya: 300W", sku="GC-1"),
        ]

        result = compact_candidates("Apa spesifikasi GC-1?", candidates)

        self.assertEqual([candidate["id"] for candidate in result],
                         ["source-one", "source-two"])

    def test_snapshot_file_limit_allows_full_scrape_but_remains_bounded(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            for index in range(1001):
                (vault / f"entry-{index}.md").touch()
            self.assertEqual(len(note_files(vault)), 1001)
            for index in range(1001, 2001):
                (vault / f"entry-{index}.md").touch()
            with self.assertRaisesRegex(KnowledgeError, "2000-entry"):
                note_files(vault)

    def test_answer_text_and_bounded_synonyms_retrieve_exact_source(self) -> None:
        snapshot = {"entries": [
            entry("air-fryer", ["Informasi produk EBAF01"],
                  "Kapasitas: 5 liter\nDaya: 800 watt", sku="EBAF01"),
        ]}

        candidates = retrieve(snapshot, "EBAF01 ini muat berapa liter?", "id")

        self.assertEqual([candidate["id"] for candidate in candidates], ["air-fryer"])
        self.assertEqual(candidates[0]["answer"], "Kapasitas: 5 liter\nDaya: 800 watt")

    def test_full_product_name_resolves_unique_sku_but_shared_category_clarifies(self) -> None:
        snapshot = {"entries": [
            entry("clarification-id", ["Produk yang mana?"], "Sebutkan model produknya.",
                  kind="clarification"),
            entry("source-fryer-small", ["Air Fryer Digital Compact EBAF01"],
                  "Kapasitas: 5 liter", sku="EBAF01"),
            entry("source-fryer-large", ["Air Fryer Digital Family EBAF02"],
                  "Kapasitas: 8 liter", sku="EBAF02"),
        ]}

        self.assertEqual(
            resolve_product_context(snapshot, "berapa kapasitas Air Fryer Digital Compact?"),
            "EBAF01",
        )
        self.assertEqual(
            [item["id"] for item in retrieve(
                snapshot, "berapa kapasitas Air Fryer Digital Compact?", "id")],
            ["source-fryer-small"],
        )
        self.assertIsNone(resolve_product_context(snapshot, "air fryer digital berapa liter?"))
        self.assertEqual(
            [item["id"] for item in retrieve(snapshot, "air fryer digital berapa liter?", "id")],
            ["clarification-id"],
        )

    def test_unknown_topic_and_unknown_model_fail_closed(self) -> None:
        snapshot = {"entries": [
            entry("fryer", ["Air Fryer EBAF01"], "Kapasitas: 5 liter", sku="EBAF01"),
        ]}

        self.assertEqual(retrieve(snapshot, "bagaimana cuaca besok?", "id"), [])
        self.assertEqual(retrieve(snapshot, "berapa kapasitas XYZ-99?", "id"), [])

    def test_longer_sku_variant_does_not_hide_an_unrelated_second_sku(self) -> None:
        snapshot = {"entries": [
            entry("source-base", ["GAS-1"], "Base product.", sku="GAS-1"),
            entry("source-variant", ["GAS-1-X"], "Variant product.", sku="GAS-1-X"),
            entry("source-other", ["OTHER-2"], "Other product.", sku="OTHER-2"),
        ]}

        self.assertEqual(resolve_product_context(snapshot, "GAS-1-X"), "GAS-1-X")
        self.assertEqual(retrieve(snapshot, "Spesifikasi GAS-1-X dan OTHER-2", "id"), [])

    def test_duplicate_answers_are_deduplicated_and_conflicts_fail_closed(self) -> None:
        same = {"entries": [
            entry("first", ["Bagaimana cara membersihkan produk?"], "Lap dengan kain kering."),
            entry("second", ["Bagaimana cara membersihkan produk?"], "Lap dengan kain kering."),
        ]}
        conflict = {"entries": [
            entry("first", ["Bagaimana cara membersihkan produk?"], "Lap dengan kain kering."),
            entry("second", ["Bagaimana cara membersihkan produk?"], "Cuci dengan air."),
        ]}

        self.assertEqual(
            [item["id"] for item in retrieve(same, "Bagaimana cara membersihkan produk?", "id")],
            ["first"],
        )
        self.assertEqual(retrieve(conflict, "Bagaimana cara membersihkan produk?", "id"), [])

    def test_complementary_catalog_passages_with_shared_alias_remain_candidates(self) -> None:
        snapshot = {"entries": [
            entry("source-fryer-capacity", ["Spesifikasi EBAF01"],
                  "Kapasitas: 5 liter", sku="EBAF01"),
            entry("source-fryer-power", ["Spesifikasi EBAF01"],
                  "Daya: 800 watt", sku="EBAF01"),
        ]}

        self.assertEqual(
            [item["id"] for item in retrieve(snapshot, "Spesifikasi EBAF01", "id")],
            ["source-fryer-capacity", "source-fryer-power"],
        )


if __name__ == "__main__":
    unittest.main()
