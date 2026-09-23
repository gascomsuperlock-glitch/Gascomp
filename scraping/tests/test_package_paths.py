from __future__ import annotations

import contextlib
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scraping.duoke.catalog import normalize_duoke
from scraping.shared import paths


class PackagePathsTests(unittest.TestCase):
    def test_paths_keep_runtime_state_and_resolve_grouped_data(self) -> None:
        root = Path(__file__).resolve().parents[2]
        self.assertEqual(paths.ROOT, root)
        self.assertEqual(paths.PRIVATE_DIR, root / "scraping" / ".private")
        self.assertEqual(paths.PROFILE_DIR, paths.PRIVATE_DIR / "browser-profile")
        self.assertEqual(paths.STOP_FILE, paths.PRIVATE_DIR / "STOP_AUTOREPLY")
        self.assertEqual(paths.VAULT_DIR, root.parent / "douke-chat" / "knowledge" / "approved" / "Douke Knowledge Base")
        self.assertEqual(paths.DUOKE_DIR, paths.VAULT_DIR / "Duoke")
        # Generated notes stay inside the root GASCOMP_AI_SOURCE_VAULT indexes.
        self.assertEqual(paths.APPROVED_DIR, paths.DUOKE_DIR / "knowledge" / "approved")
        self.assertEqual(paths.REVIEW_DIR, paths.DUOKE_DIR / "knowledge" / "pending")
        self.assertEqual(paths.AI_ASSISTANCE_VAULT, paths.VAULT_DIR / "customer-support")
        self.assertTrue(paths.CATALOG_PATH.is_file())
        self.assertTrue(paths.BOT_MESSAGES_PATH.is_file())
        self.assertEqual(paths.REPORT_PATH.parent, root / "data" / "reports")

    def test_module_commands_accept_help_without_opening_browser_or_network(self) -> None:
        modules = [
            "duoke.catalog.scrape_duoke", "duoke.chat.duoke_login",
            "duoke.chat.inspect_duoke", "duoke.chat.capture_duoke_chats",
            "duoke.knowledge.build_duoke_knowledge", "duoke.knowledge.approve_duoke_knowledge",
            "duoke.knowledge.knowledge_engine", "duoke.reply.duoke_auto_reply",
            "warehouse.normalize_warehouse_xlsx",
        ]
        for module in modules:
            with self.subTest(module=module):
                result = subprocess.run(
                    [sys.executable, "-m", f"scraping.{module}", "--help"],
                    cwd=paths.ROOT, capture_output=True, text=True, timeout=30,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("usage:", result.stdout)

    def test_catalog_pipeline_writes_grouped_outputs_in_fresh_directory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            captures = root / "captures"
            captures.mkdir()
            (captures / "capture-001.json").write_text(json.dumps({
                "sourceUrl": "https://web.duoke.com/products",
                "payload": {"products": [{"productId": "123", "productName": "Regulator", "sku": "GC-100"}]},
            }))
            catalog = root / "data" / "catalog" / "duoke-products.json"
            report = root / "data" / "reports" / "duoke-sync-report.json"
            vault = root / "vault"
            with patch.multiple(
                normalize_duoke, CAPTURE_DIR=captures, CATALOG_PATH=catalog,
                REPORT_PATH=report, VAULT_DIR=vault, PRODUCT_NOTES=vault / "products",
                VARIATION_NOTES=vault / "variations",
            ), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(normalize_duoke.main(), 0)
            self.assertEqual(json.loads(catalog.read_text())["products"][0]["sku"], "GC-100")
            self.assertEqual(json.loads(report.read_text())["importedProducts"], 1)
            self.assertTrue((vault / "Duoke Catalog.md").is_file())


if __name__ == "__main__":
    unittest.main()
