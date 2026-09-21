from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from scraping.ai_assistance.import_products import (
    ProductImportError,
    build_review,
    parse_note,
    source_files,
    write_review,
)
from scraping.ai_assistance.knowledge import parse_note as parse_knowledge_note


def product_note(*, sku: str = "GC-1", product_ref: str = "source-1",
                 aliases: tuple[str, ...] = ("Gascomp GC-1",),
                 description: str = "- Bahan: Baja tahan karat\n- Daya: 200 watt") -> str:
    return f'''---
source: duoke
status: source_catalog
product_ref: "{product_ref}"
sku: "{sku}"
aliases: {json.dumps(list(aliases), ensure_ascii=False)}
---

# Product fixture

## Deskripsi sumber

{chr(10).join("> " + line for line in description.splitlines())}

## Variasi

| Price | Stock |
| --- | --- |
| 100000 | 3 |
'''


class ProductAnswerImportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "Catalog"
        self.source.mkdir()
        self.private = self.root / "private"
        self.output = self.private / "ai-assistance" / "product-review"

    def write_product(self, value: str, name: str = "Product source-1.md") -> Path:
        path = self.source / name
        path.write_text(value, encoding="utf-8")
        return path

    def test_exact_stable_lines_become_schema_valid_candidate_with_provenance(self):
        path = self.write_product(product_note())
        parsed = parse_note(path, self.source)
        candidates, report = build_review(self.source)

        self.assertEqual(report["sourceFiles"], 1)
        self.assertEqual(report["pilotEligibleCount"], 1)
        self.assertEqual(report["draftEntryCount"], 1)
        self.assertEqual(report["stagedEntryCount"], 1)
        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        self.assertTrue(candidate["pilotEligible"])
        self.assertEqual(candidate["entry"]["answer"],
                         "- Bahan: Baja tahan karat\n- Daya: 200 watt")
        self.assertEqual(candidate["entry"]["sku"], "GC-1")
        self.assertNotIn("Gascomp GC-1", candidate["entry"]["questions"])
        self.assertIn("Apa bahan GC-1?", candidate["entry"]["questions"])
        self.assertIn("Berapa watt GC-1?", candidate["entry"]["questions"])
        self.assertEqual(candidate["provenance"][0]["path"], "Product source-1.md")
        self.assertEqual(candidate["provenance"][0]["sourceAliases"], ["Gascomp GC-1"])
        self.assertEqual(candidate["provenance"][0]["selectedExactLines"][0]["text"],
                         parsed.facts[0].text)

    def test_dynamic_commercial_and_private_lines_are_excluded_not_redacted(self):
        self.write_product(product_note(description="""- Material: Stainless steel 304
- Harga promo Rp 100.000 selama stok tersedia.
- Pesan sekarang dan dapatkan gratis ongkir.
- Hubungi 081234567890 untuk informasi.
- Detail produk ada di https://example.com/product."""))
        candidates, report = build_review(self.source)
        self.assertEqual(candidates[0]["entry"]["answer"], "- Material: Stainless steel 304")
        self.assertEqual(report["rejectedLineCounts"]["dynamic_commercial"], 2)
        self.assertEqual(report["rejectedLineCounts"]["privacy"], 1)
        self.assertEqual(report["rejectedLineCounts"]["link"], 1)
        self.assertNotIn("[PHONE]", candidates[0]["entry"]["answer"])

    def test_matching_duplicate_sku_is_eligible_and_keeps_all_sources(self):
        self.write_product(product_note(product_ref="one"), "Product one.md")
        self.write_product(product_note(product_ref="two", aliases=("GC-1 Official",)),
                           "Product two.md")
        candidates, report = build_review(self.source)
        self.assertEqual(report["duplicateSkuGroups"], 1)
        self.assertEqual(report["conflictingDuplicateSkuGroups"], 0)
        self.assertTrue(candidates[0]["pilotEligible"])
        self.assertEqual(len(candidates[0]["provenance"]), 2)
        self.assertEqual(candidates[0]["flags"], ["duplicate_sku"])

    def test_conflicting_duplicate_sku_is_never_pilot_eligible(self):
        shared = "- Bahan: Baja tahan karat"
        self.write_product(product_note(product_ref="one", description=f"{shared}\n- Daya: 200 watt"),
                           "Product one.md")
        self.write_product(product_note(product_ref="two", description=f"{shared}\n- Daya: 300 watt"),
                           "Product two.md")
        candidates, report = build_review(self.source)
        candidate = candidates[0]
        self.assertFalse(candidate["pilotEligible"])
        self.assertEqual(candidate["reviewStatus"], "review_required")
        self.assertIn("conflicting_stable_descriptions", candidate["flags"])
        self.assertEqual(candidate["entry"]["answer"], shared)
        self.assertEqual(report["conflictingDuplicateSkuGroups"], 1)

    def test_conflict_without_common_fact_retains_review_record_without_entry(self):
        self.write_product(product_note(product_ref="one", description="- Daya: 200 watt"),
                           "Product one.md")
        self.write_product(product_note(product_ref="two", description="- Daya: 300 watt"),
                           "Product two.md")
        candidates, report = build_review(self.source)
        self.assertIsNone(candidates[0]["entry"])
        self.assertFalse(candidates[0]["pilotEligible"])
        self.assertIn("no_common_stable_facts", candidates[0]["flags"])
        self.assertEqual(report["stagedEntryCount"], 0)

    def test_duplicate_with_no_stable_facts_blocks_other_source_from_pilot(self):
        self.write_product(product_note(product_ref="one"), "Product one.md")
        self.write_product(product_note(
            product_ref="two",
            description="Harga promo Rp 100.000 selama stok tersedia.",
        ), "Product two.md")
        candidates, report = build_review(self.source)
        self.assertEqual(len(candidates), 1)
        self.assertFalse(candidates[0]["pilotEligible"])
        self.assertIsNone(candidates[0]["entry"])
        self.assertEqual(report["excludedCounts"]["no_stable_description_facts"], 1)

    def test_unlabeled_narrative_is_not_staged_as_an_answer(self):
        self.write_product(product_note(
            description="Produk ini mudah digunakan untuk kebutuhan sehari-hari.",
        ))
        candidates, _ = build_review(self.source)
        self.assertIsNone(candidates[0]["entry"])
        self.assertFalse(candidates[0]["pilotEligible"])

    def test_ambiguous_labeled_measurements_require_review(self):
        self.write_product(product_note(description="Kapasitas: 3L / 1.2L"))
        candidates, _ = build_review(self.source)
        self.assertIsNotNone(candidates[0]["entry"])
        self.assertFalse(candidates[0]["pilotEligible"])
        self.assertIn("ambiguous_labeled_value", candidates[0]["flags"])

    def test_write_review_is_private_deterministic_and_never_publishes(self):
        self.write_product(product_note())
        candidates, report = build_review(self.source)
        write_review(candidates, report, self.output, self.private)
        first = (self.output / "candidates.json").read_bytes()
        staged = next((self.output / "staging").glob("*.md"))

        parsed_entry = parse_knowledge_note(staged.read_text(encoding="utf-8"))
        self.assertEqual(parsed_entry, candidates[0]["entry"])
        self.assertEqual(os.stat(staged).st_mode & 0o777, 0o600)
        self.assertFalse(report["publicationPerformed"])

        write_review(candidates, report, self.output, self.private)
        self.assertEqual(first, (self.output / "candidates.json").read_bytes())

    def test_write_removes_stale_generated_markdown_and_separates_review(self):
        shared = "- Bahan: Baja tahan karat"
        self.write_product(product_note(product_ref="one", description=f"{shared}\n- Daya: 200 watt"),
                           "Product one.md")
        self.write_product(product_note(product_ref="two", description=f"{shared}\n- Daya: 300 watt"),
                           "Product two.md")
        candidates, report = build_review(self.source)
        staging = self.output / "staging"
        staging.mkdir(parents=True)
        (staging / "stale.md").write_text("stale", encoding="utf-8")
        write_review(candidates, report, self.output, self.private)
        self.assertFalse((staging / "stale.md").exists())
        self.assertEqual(list(staging.glob("*.md")), [])
        self.assertEqual(len(list((self.output / "review-required").glob("*.md"))), 1)

    def test_invalid_source_and_destination_boundaries_fail_predictably(self):
        with self.assertRaises(ProductImportError):
            source_files(self.root / "missing")
        self.write_product(product_note())
        candidates, report = build_review(self.source)
        with self.assertRaises(ProductImportError):
            write_review(candidates, report, self.root / "outside", self.private)


if __name__ == "__main__":
    unittest.main()
