from __future__ import annotations

import unittest

from scraping.ai_assistance.knowledge import retrieve


def entry(identifier: str, question: str, *, sku: str | None = None) -> dict:
    value = {
        "id": identifier,
        "kind": "answer",
        "language": "id",
        "questions": [question],
        "answer": f"Approved {identifier} reply.",
    }
    if sku:
        value["sku"] = sku
    return value


class SkuRetrievalGuardTests(unittest.TestCase):
    def setUp(self) -> None:
        self.question = "Bagaimana proses retur GRS-02PRO"
        self.snapshot = {
            "entries": [
                entry("return-grs", self.question, sku="GRS-02PRO"),
                entry("return-generic", "Bagaimana proses retur produk"),
            ]
        }

    def identifiers(self, text: str, sku: str | None = None) -> list[str]:
        return [candidate["id"] for candidate in retrieve(self.snapshot, text, "id", sku)]

    def test_known_sku_still_produces_candidates(self):
        self.assertIn("return-grs", self.identifiers(self.question))
        self.assertIn("return-grs", self.identifiers("Bagaimana proses retur grs-02pro"))

    def test_known_and_unknown_model_codes_fail_closed(self):
        self.assertEqual(self.identifiers(f"{self.question} XYZ-99"), [])
        self.assertEqual(self.identifiers(f"{self.question} xyz-99"), [])

    def test_page_hint_conflicting_with_unknown_model_code_fails_closed(self):
        self.assertEqual(self.identifiers("Bagaimana proses retur XYZ-99", "GRS-02PRO"), [])
        self.assertEqual(self.identifiers("Bagaimana proses retur produk", "XYZ-99"), [])

    def test_dates_prices_and_sizes_are_not_unknown_skus(self):
        question = "Apakah harga Rp100000 berlaku 2026-09-17 untuk ukuran 10x20 cm dan baut 12-mm"
        snapshot = {"entries": [entry("ordinary-values", question)]}
        self.assertEqual(
            [candidate["id"] for candidate in retrieve(snapshot, question, "id")],
            ["ordinary-values"],
        )


if __name__ == "__main__":
    unittest.main()
