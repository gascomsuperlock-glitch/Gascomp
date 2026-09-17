from __future__ import annotations

import unittest

from scraping.ai_assistance.evaluate import evaluate_snapshot


def answer(identifier, text, question, sku=None):
    entry = {"id": identifier, "kind": "answer", "language": "en",
             "questions": [question], "answer": text}
    if sku:
        entry["sku"] = sku
    return entry


class CoverageTests(unittest.TestCase):
    def report(self, *entries):
        return evaluate_snapshot({"version": "synthetic", "entries": list(entries)})

    def test_reports_conflicting_aliases_without_logging_questions(self):
        report = self.report(answer("first", "One.", "Private example question"),
                             answer("second", "Two.", "Private example question"))
        self.assertFalse(report["passed"])
        self.assertEqual(len(report["failures"]), 2)
        self.assertNotIn("Private example", str(report))

    def test_does_not_supply_missing_sku_context_to_hide_coverage_gap(self):
        report = self.report(answer("product", "Steel.", "What is the material?", "DEMO-1"))
        self.assertFalse(report["passed"])
        report = self.report(answer("product", "Steel.", "What is DEMO-1 made from?", "DEMO-1"))
        self.assertTrue(report["passed"])

    def test_equivalent_sources_are_allowed_and_handoffs_are_not_alias_checks(self):
        first = answer("first", "Steel.", "What is it made from?")
        second = answer("second", "Steel.", "What is it made from?")
        handoff = {**answer("handoff", "Contact support.", "Unsupported"), "kind": "handoff"}
        report = self.report(first, second, handoff)
        self.assertTrue(report["passed"])
        self.assertEqual(report["aliasChecks"], 2)
        self.assertFalse(report["modelEvaluated"])
        self.assertFalse(report["publicationPerformed"])


if __name__ == "__main__":
    unittest.main()
