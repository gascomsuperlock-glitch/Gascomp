from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from scraping.ai_assistance.import_duoke import (
    DuokeImportError,
    build_review,
    parse_note,
    write_review,
)


def note(transcript: str, *, history: bool = True, anonymous: bool = True,
         skus: tuple[str, ...] = ("GC-1",)) -> str:
    sku_lines = "\n".join(f"  - {sku}" for sku in skus)
    return f"""---
tipe: percakapan
history_lengkap: {str(history).lower()}
anonim: {str(anonymous).lower()}
sku:
{sku_lines}
tags:
  - status/perlu-review
---
# Conversation fixture

## Transkrip

{transcript}

## Untuk review

- [ ] Fixture review
"""


def archive_note(transcript: str, *, history: bool = True) -> str:
    return f"""---
source: duoke
status: unreviewed_archive
conversation_ref: fixture-reference
history_complete: {str(history).lower()}
privacy: automated_redaction
---

# Archived conversation

## Related products

- [[Product fixture|Fixture product]]

## Transcript

{transcript}

## Manual notes
"""


class ImportDuokeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "Percakapan"
        self.source.mkdir()
        self.private = self.root / "private"
        self.output = self.private / "ai-assistance" / "duoke-review"

    def write_note(self, value: str, name: str = "conversation.md") -> Path:
        path = self.source / name
        path.write_text(value, encoding="utf-8")
        return path

    def test_parser_groups_contiguous_turns_and_preserves_provenance(self):
        path = self.write_note(note("""- **Customer** · 09/09 10:00 — Bagaimana cara pemasangannya?
- **Customer** · 09/09 10:01 — Untuk pintu depan.
- **Seller** · 09/09 10:02 — Pasang bagian utama terlebih dahulu.
    Lalu kencangkan sekrup.
- **Seller** · 09/09 10:03 — Periksa kembali posisinya."""))
        parsed = parse_note(path, self.source)
        candidates, report = build_review(self.source)
        self.assertEqual(report["candidateCount"], 1)
        candidate = candidates[0]
        self.assertEqual(candidate["approval"], "unapproved")
        self.assertEqual(candidate["language"], "id")
        self.assertEqual(len(candidate["questionTurns"]), 2)
        self.assertEqual(len(candidate["historicalSellerTurns"]), 2)
        self.assertEqual(candidate["historicalSellerTurns"][0]["text"],
                         "Pasang bagian utama terlebih dahulu.\nLalu kencangkan sekrup.")
        self.assertEqual(candidate["questionTurns"][0]["source"], {
            "path": "conversation.md", "lineStart": 14, "lineEnd": 14,
        })
        self.assertEqual(parsed.relative_path, "conversation.md")

    def test_archive_parser_uses_only_explicit_plain_text_and_exact_sku_context(self):
        archive_dir = self.source / "Archive"
        archive_dir.mkdir()
        (archive_dir / "Index.md").write_text("# Archive index\n", encoding="utf-8")
        (archive_dir / "malformed.md").write_text("missing frontmatter\n", encoding="utf-8")
        path = archive_dir / "Conversation fixture.md"
        path.write_text(archive_note("""### 2026-09-15T03:02:20+00:00 — Pelanggan

Tipe: item

    {
      "skuValue": "GRS-01"
    }

### 2026-09-15T03:02:21+00:00 — Pelanggan

Tipe: text

> The chat has been assigned to Customer Service5309

### 2026-09-15T03:02:22+00:00 — Penjual

Tipe: text

> The chat timed out due to customer inactivity

### 2026-09-15T03:02:32+00:00 — Pelanggan

Tipe: text

> Apakah selang lama masih bisa dipakai?

### 2026-09-15T03:03:00+00:00 — Penjual

Tipe: unknown

    {"unknownData": "untrusted embedded text"}

### 2026-09-15T03:04:00+00:00 — Pelanggan

Tipe: text

> Berapa panjang selangnya?

### 2026-09-15T03:05:00+00:00 — Penjual

Tipe: text

> Panjang selangnya 1,8 meter.
> Pastikan sambungannya rapat."""), encoding="utf-8")
        parsed = parse_note(path, self.source)
        candidates, report = build_review(self.source)
        self.assertEqual(parsed.source_format, "archive")
        self.assertEqual(parsed.skus, ("GRS-01",))
        self.assertEqual(report["candidateCount"], 1)
        self.assertEqual(report["sourceFiles"], 3)
        self.assertEqual(report["sourceFormatCounts"], {"archive": 1, "skippedArchiveIndex": 1})
        self.assertEqual(report["skippedSourceCounts"], {"archiveIndex": 1})
        self.assertEqual(report["invalidSourceNoteCount"], 1)
        self.assertEqual(report["excludedCounts"]["invalid_source_note"], 1)
        self.assertEqual(candidates[0]["questionTurns"][0]["text"], "Berapa panjang selangnya?")
        self.assertEqual(
            candidates[0]["historicalSellerTurns"][0]["text"],
            "Panjang selangnya 1,8 meter.\nPastikan sambungannya rapat.",
        )
        self.assertIn("roles_explicit_archive", candidates[0]["flags"])
        self.assertNotIn("untrusted embedded text", json.dumps(candidates))
        self.assertNotIn("customer inactivity", json.dumps(candidates))

    def test_composite_sku_context_dependent_and_approximate_replies_are_review_only(self):
        self.write_note(archive_note("""### 2026-09-15T03:02:20+00:00 — Customer

Type: item

    {"skuValue": "GHS-03 PRO/10M"}

### 2026-09-15T03:02:32+00:00 — Customer

Type: text

> Berapa ukurannya?

### 2026-09-15T03:03:00+00:00 — Seller

Type: text

> Maksudnya gimana Kak, ukurannya kurang lebih 6mm."""))
        candidates, report = build_review(self.source)
        self.assertEqual(report["candidateCount"], 1)
        self.assertTrue({
            "approximate_or_uncertain_reply",
            "context_dependent_reply",
            "non_retrievable_composite_sku",
        }.issubset(candidates[0]["flags"]))
        self.assertFalse(candidates[0]["strictPilotReviewEligible"])

    def test_archive_risk_flags_and_incomplete_media_are_not_strictly_eligible(self):
        archive_dir = self.source / "Archive"
        archive_dir.mkdir()
        self.write_note(archive_note("""### 2026-09-15T03:02:20+00:00 — Customer

Type: text

> Apakah pesanan saya ready dan berapa harga refund-nya?

### 2026-09-15T03:03:00+00:00 — Seller

Type: text

> Pesanan Kakak akan kami proses, refund Rp100.000 dalam 3-7 hari kerja.

### 2026-09-15T03:04:00+00:00 — Seller

Type: image

    {"imageUrl": "[LINK]", "skuValue": "GRS-01"}""", history=False),
                        name="risk.md")
        candidates, report = build_review(self.source)
        flags = set(candidates[0]["flags"])
        self.assertTrue({
            "account_specific_response",
            "incomplete_history",
            "missing_attachment_context",
            "monetary_or_promotion_claim",
            "operational_promise",
            "stock_or_availability_claim",
        }.issubset(flags))
        self.assertFalse(candidates[0]["strictPilotReviewEligible"])
        self.assertEqual(report["strictPilotReviewEligibleCount"], 0)

    def test_conflicting_exact_questions_are_flagged_but_safe_archive_pair_can_be_triaged(self):
        archive_dir = self.source / "Archive"
        archive_dir.mkdir()
        safe = """### 2026-09-15T03:02:20+00:00 — Customer

Type: item

    {"skuValue": "GRS-01"}

### 2026-09-15T03:02:32+00:00 — Customer

Type: text

> Apakah selang bawaan panjangnya 1,8 meter?

### 2026-09-15T03:03:00+00:00 — Seller

Type: text

> Panjang selang bawaan adalah 1,8 meter."""
        first = archive_dir / "first.md"
        first.write_text(archive_note(safe), encoding="utf-8")
        candidates, report = build_review(self.source)
        self.assertEqual(report["strictPilotReviewEligibleCount"], 1)
        self.assertTrue(candidates[0]["strictPilotReviewEligible"])

        second = safe.replace("Panjang selang bawaan adalah 1,8 meter.",
                              "Panjang selang bawaan adalah 1,5 meter.")
        (archive_dir / "second.md").write_text(archive_note(second), encoding="utf-8")
        candidates, report = build_review(self.source)
        self.assertEqual(report["candidateCount"], 2)
        self.assertEqual(report["strictPilotReviewEligibleCount"], 0)
        self.assertTrue(all("conflicting_historical_replies" in item["flags"]
                            for item in candidates))

    def test_system_boundary_prevents_reply_pairing_and_cards_are_excluded(self):
        self.write_note(note("""- **Customer** · 09/09 10:00 — Bagaimana cara pemasangannya?
- *The chat has been assigned to Customer Service5309*
- **Seller** · 09/09 10:01 — Pasang dengan sekrup.
- **Customer** · 09/09 10:02 — Apakah produk ini tersedia?
- **Seller** · 09/09 10:03 — Product card:
    SKU: GC-1
    Price: 100"""))
        candidates, report = build_review(self.source)
        self.assertEqual(candidates, [])
        self.assertEqual(report["excludedCounts"]["customer_run_without_adjacent_seller_run"], 1)
        self.assertEqual(report["excludedCounts"]["product_order_or_media_card"], 1)

    def test_renderer_cards_are_excluded(self):
        cards = (
            "kirim produk [[GC-1]] untuk dilihat pelanggan",
            "kirim order `ORDER-123` kepada pelanggan",
            "kirim foto produk (file tidak diunduh)",
            "kirim video pemasangan (file tidak diunduh)",
            "kirim gambar ukuran (file tidak diunduh)",
            "kirim stiker halo (file tidak diunduh)",
            "kirim image (file tidak diunduh)",
            "kirim photo (file tidak diunduh)",
            "kirim sticker (file tidak diunduh)",
            "kirim file (file tidak diunduh)",
            "kirim audio (file tidak diunduh)",
        )
        for index, card in enumerate(cards):
            self.write_note(note(f"""- **Customer** · 09/09 10:00 — Tolong jelaskan produk ini.
- **Seller** · 09/09 10:01 — {card}"""), name=f"card-{index}.md")
        candidates, report = build_review(self.source)
        self.assertEqual(candidates, [])
        self.assertEqual(report["excludedCounts"]["product_order_or_media_card"], len(cards))

    def test_quoted_reply_metadata_is_removed_but_provenance_covers_source_lines(self):
        self.write_note(note("""- **Customer** · 09/09 10:00 — Bagaimana cara pemasangannya?
- **Seller** · 09/09 10:01 — Pasang bagian utama terlebih dahulu.
    > membalas: pesan lama pelanggan
    > isi pesan lama"""))
        candidates, _ = build_review(self.source)
        reply = candidates[0]["historicalSellerTurns"][0]
        self.assertEqual(reply["text"], "Pasang bagian utama terlebih dahulu.")
        self.assertEqual(reply["source"]["lineEnd"], 17)
        self.assertIn("quoted_reply_metadata_removed", candidates[0]["flags"])

    def test_redacts_private_values_flags_links_and_never_writes_active_vault(self):
        self.write_note(note("""- **Customer** · 09/09 10:00 — Hubungi saya di 0812 3456 7890, NIK 3273010101010001, rekening BCA1234567890, alamat Jalan Melati 7, dan akun @buyer_private.
- **Seller** · 09/09 10:01 — Baca https://localhost:3000/private lalu email help@example.com dan transfer ke 9876543210.""",
                                  history=False, skus=("GC-1", "GC-2")))
        active = self.root / "vault" / "customer-support"
        active.mkdir(parents=True)
        marker = active / "owner.md"
        marker.write_text("owner content", encoding="utf-8")
        candidates, report = build_review(self.source)
        write_review(candidates, report, self.output, self.private)
        encoded = (self.output / "candidates.json").read_text(encoding="utf-8")
        self.assertNotIn("0812 3456 7890", encoded)
        self.assertNotIn("help@example.com", encoded)
        self.assertNotIn("https://localhost:3000/private", encoded)
        self.assertNotIn("3273010101010001", encoded)
        self.assertNotIn("1234567890", encoded)
        self.assertNotIn("9876543210", encoded)
        self.assertNotIn("Jalan Melati 7", encoded)
        self.assertNotIn("@buyer_private", encoded)
        self.assertIn("[NATIONAL_ID]", encoded)
        self.assertIn("[BANK_ACCOUNT]", encoded)
        self.assertIn("[ADDRESS]", encoded)
        self.assertIn("[USERNAME]", encoded)
        candidate = json.loads(encoded)["candidates"][0]
        self.assertIn("privacy_redacted", candidate["flags"])
        self.assertIn("source_contains_local_or_unsafe_link", candidate["flags"])
        self.assertIn("incomplete_history", candidate["flags"])
        self.assertIn("ambiguous_product_multiple_skus", candidate["flags"])
        self.assertEqual(marker.read_text(encoding="utf-8"), "owner content")
        self.assertFalse(any(active.glob("duoke-*")))
        self.assertEqual(os.stat(self.output).st_mode & 0o777, 0o700)
        self.assertEqual(os.stat(self.output / "candidates.json").st_mode & 0o777, 0o600)

    def test_rerun_is_stable_and_removes_only_stale_generated_candidates(self):
        self.write_note(note("""- **Customer** · 09/09 10:00 — Bagaimana cara pemasangannya?
- **Seller** · 09/09 10:01 — Pasang bagian utama terlebih dahulu."""))
        candidates, report = build_review(self.source)
        write_review(candidates, report, self.output, self.private)
        first = (self.output / "candidates.json").read_bytes()
        stale = self.output / "candidates" / "duoke-stale.md"
        stale.write_text("stale", encoding="utf-8")
        write_review(candidates, report, self.output, self.private)
        self.assertEqual(first, (self.output / "candidates.json").read_bytes())
        self.assertFalse(stale.exists())
        index = (self.output / "REVIEW.md").read_text(encoding="utf-8")
        self.assertIn("**UNAPPROVED**", index)
        self.assertIn("](candidates/", index)
        self.assertNotIn("[[candidates/", index)
        self.assertIn("GC-1 · Bagaimana cara pemasangannya?", index)
        self.assertIn("ditimpa saat dijalankan ulang", index)

    def test_source_and_destination_symlinks_fail_closed(self):
        outside = self.root / "outside.md"
        outside.write_text(note("- **Customer** · t — question\n- **Seller** · t — answer"), encoding="utf-8")
        (self.source / "linked.md").symlink_to(outside)
        with self.assertRaisesRegex(DuokeImportError, "symlinks"):
            build_review(self.source)
        (self.source / "linked.md").unlink()
        candidates, report = build_review(self.source)
        self.private.mkdir()
        target = self.root / "elsewhere"
        target.mkdir()
        (self.private / "ai-assistance").symlink_to(target)
        with self.assertRaisesRegex(DuokeImportError, "(?:symlinks|private directory)"):
            write_review(candidates, report, self.output, self.private)

    def test_non_anonymized_and_trivial_history_is_not_drafted(self):
        self.write_note(note("""- **Customer** · 09/09 10:00 — Bagaimana cara pemasangannya?
- **Seller** · 09/09 10:01 — Oke"""), name="trivial.md")
        self.write_note(note("""- **Customer** · 09/09 10:00 — Bagaimana cara pemasangannya?
- **Seller** · 09/09 10:01 — Pasang bagian utama terlebih dahulu.""", anonymous=False),
                        name="not-anonymous.md")
        candidates, report = build_review(self.source)
        self.assertEqual(candidates, [])
        self.assertEqual(report["excludedCounts"]["trivial_seller_run"], 1)
        self.assertEqual(report["excludedCounts"]["source_not_anonymized"], 1)

    def test_emoji_honorific_and_auto_ack_boilerplate_are_excluded(self):
        self.write_note(note("""- **Customer** · 09/09 10:00 — baik kak, terima kasih.🙏🥰
- **Seller** · 09/09 10:01 — Jawaban panjang yang seharusnya tidak menjadi kandidat."""),
                        name="thanks.md")
        self.write_note(note("""- **Customer** · 09/09 10:00 — Bagaimana cara pemasangannya?
- **Seller** · 09/09 10:01 — Mohon ditunggu ya kak, jika ada kendala bisa di diskusikan terlebih dahulu ya kak."""),
                        name="wait.md")
        self.write_note(note("""- **Customer** · 09/09 10:00 — Bagaimana cara pemasangannya?
- **Seller** · 09/09 10:01 — Pesan Kakak sudah kami terima. Tim kami akan segera membalas pesan Kakak."""),
                        name="auto-ack.md")
        candidates, report = build_review(self.source)
        self.assertEqual(candidates, [])
        self.assertEqual(report["excludedCounts"]["trivial_customer_run"], 1)
        self.assertEqual(report["excludedCounts"]["boilerplate_seller_run"], 2)

    def test_customer_admin_wording_is_flagged_without_role_reversal(self):
        self.write_note(note("""- **Customer** · 09/09 10:00 — Hallo kak, terima kasih sudah menghubungi kami. Ada yang bisa kami bantu?
- **Seller** · 09/09 10:01 — Saya ingin mengetahui cara pemasangan produk ini."""))
        candidates, report = build_review(self.source)
        self.assertEqual(report["candidateCount"], 1)
        self.assertIn("possible_role_misattribution", candidates[0]["flags"])
        self.assertTrue(candidates[0]["questionTurns"][0]["text"].startswith("Hallo kak"))
        self.assertTrue(candidates[0]["historicalSellerTurns"][0]["text"].startswith("Saya ingin"))


if __name__ == "__main__":
    unittest.main()
