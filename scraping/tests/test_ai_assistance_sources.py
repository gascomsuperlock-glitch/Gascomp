from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scraping.ai_assistance.sources import SourceIndex, load_bundle
from scraping.tests import test_ai_assistance as fixtures

entry = fixtures.entry
seed = fixtures.seed


class SourceBundleTests(unittest.TestCase):
    def test_merge_preserves_exact_answers_and_changes_version(self):
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            seed(vault)
            baseline, _ = load_bundle(vault)
            corpus = {"documents": [], "entries": [entry("source-fixture", answer="  Exact source.\n")]}
            with patch("scraping.ai_assistance.corpus.build_corpus", return_value=corpus):
                expanded, actual = load_bundle(vault, Path("fixture-source"))
            self.assertIs(actual, corpus)
            self.assertNotEqual(expanded["version"], baseline["version"])
            self.assertEqual(next(e for e in expanded["entries"] if e["id"] == "source-fixture")["answer"], "  Exact source.\n")

    def test_duplicate_ids_in_source_bundle_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            vault = Path(directory)
            seed(vault)
            with patch("scraping.ai_assistance.corpus.build_corpus", return_value={"documents": [], "entries": [entry()]}):
                with self.assertRaisesRegex(ValueError, "duplicate"):
                    load_bundle(vault, Path("fixture-source"))

    def test_all_documents_can_guide_clarification_without_exposing_transcript(self):
        index = SourceIndex([{"id": "private", "names": ["Fixture blender"], "skus": ["DEMO-1"],
                              "text": "Blender maintenance for [NAME] with [PHONE]", "entryIds": []}])
        clarification = entry("clarify", kind="clarification", answer="Which product?")
        snapshot = {"entries": [clarification, entry("product", sku="DEMO-1")]}
        self.assertEqual(index.guide(snapshot, "Blender maintenance", "en", []), [clarification])
        for question in ("Weather tomorrow", "Blender phone customer", "Blender maintenance XYZ-99"):
            self.assertEqual(index.guide(snapshot, question, "en", []), [])
        self.assertNotIn("[PHONE]", str(index.guide(snapshot, "Blender maintenance", "en", [])))

    def test_conflict_metadata_stays_local_and_does_not_change_answer(self):
        index = SourceIndex([], [{"entryId": "source-test", "flags": ["conflicting_product_facts"],
                                  "conflictingAttributes": ["capacity"]}])
        candidate = entry("source-test", answer="Exact source.")
        result = index.guide({"entries": [candidate]}, "specifications", "en", [candidate])
        self.assertEqual(result[0]["answer"], candidate["answer"])
        self.assertEqual(result[0]["conflictingAttributes"], ["capacity"])
        self.assertNotIn("sourceFlags", candidate)

    def test_requested_conflicting_fact_is_rejected_before_model_selection(self):
        index = SourceIndex([], [{"entryId": "source-test", "conflictingAttributes": ["kapasitas"]}])
        candidate = entry("source-test")
        for question in ("What capacity?", "Berapa kapasitasnya, muat berapa liter?"):
            self.assertEqual(index.guide({"entries": [candidate]}, question, "en", [candidate]), [])

    def test_known_product_without_answer_does_not_repeat_context_question(self):
        index = SourceIndex([{"id": "private", "names": ["Fixture blender"], "skus": ["DEMO-1"],
                              "text": "Blender specifications", "entryIds": []}])
        snapshot = {"entries": [entry("clarify", kind="clarification"),
                                entry("product", language="id", sku="DEMO-1")]}
        self.assertEqual(index.guide(snapshot, "Specifications of DEMO-1", "en", []), [])
        self.assertEqual(index.guide(snapshot, "Blender specifications", "en", [], "DEMO-1"), [])


class SourceWorkerTests(unittest.TestCase):
    def setUp(self):
        fixtures.WorkerTests.setUp(self)

    def test_source_change_during_selection_discards_result_even_if_answer_version_stays_same(self):
        fixtures.WorkerTests.job(self)
        def select(text, candidates, timeout):
            with self.worker.lock:
                self.worker.signature = "changed-private-source"
            return candidates[0]["id"]
        self.worker.selector = select
        self.worker.process_one()
        self.assertIsNone(self.transport.calls[-1][1]["answerId"])

    def test_worker_sends_inferred_product_context_with_exact_candidate_id(self):
        fixtures.write_entry(self.vault, entry("source-blender", sku="DEMO-1",
                                               questions=["Fixture blender", "Fixture blender capacity"],
                                               answer="Fixture blender capacity: 2 liters."))
        self.worker.sync_knowledge()
        fixtures.WorkerTests.job(self)
        self.transport.job["text"] = "What is the Fixture blender capacity?"
        self.worker.process_one()
        self.assertEqual(self.transport.calls[-1][1]["answerId"], "source-blender")
        self.assertEqual(self.transport.calls[-1][1]["resolvedSku"], "DEMO-1")


if __name__ == "__main__":
    unittest.main()
