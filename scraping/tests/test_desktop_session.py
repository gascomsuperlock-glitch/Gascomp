"""Session replacement and bounded MCP diagnostics without live accounts."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from scraping.duoke.reply import desktop_browser as module
from scraping.duoke.reply.desktop_mcp import safe_call


class SessionTests(unittest.IsolatedAsyncioTestCase):
    async def test_refreshed_snapshot_replaces_cached_browser_and_headers(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = Path(directory) / "storage.json"
            storage.write_text('{"cookies": [], "origins": []}')
            page = MagicMock()
            page.is_closed.return_value = False
            page.goto = AsyncMock()
            page.wait_for_function = AsyncMock()
            page.evaluate = AsyncMock(return_value=True)
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
            adapter = module.DesktopBrowser()
            with (patch.object(module, "DUOKE_DESKTOP_STORAGE", storage),
                  patch.object(module, "async_playwright", return_value=manager),
                  patch.object(module, "read_json", return_value={"headers": {"fixture": "first"}}) as reader):
                await adapter.open()
                await adapter.open()
                self.assertEqual(playwright.chromium.launch.await_count, 1)
                reader.return_value = {"headers": {"fixture": "refreshed"}}
                storage.write_text('{"cookies": [], "origins": [], "fixture": "new"}')
                await adapter.open()
                self.assertEqual(playwright.chromium.launch.await_count, 2)
                browser.close.assert_awaited_once()
                self.assertEqual(adapter.session["headers"]["fixture"], "refreshed")
                storage.unlink()
                with self.assertRaisesRegex(ValueError, "session setup"):
                    await adapter.open()
                self.assertIsNone(adapter.page)
                self.assertIsNone(adapter.storage_signature)

    async def test_authentication_reason_reaches_operator_without_provider_payload(self):
        result = await safe_call(AsyncMock(side_effect=module.DeliveryAdapterError("authentication_required")))
        self.assertEqual(result["reason"], "authentication_required")
        self.assertEqual(result["status"], "error")
        self.assertFalse(result["sent"])
        self.assertNotIn("jobs", result)

    async def test_unexpected_error_details_never_escape(self):
        for error in [RuntimeError("private provider payload"),
                      module.DeliveryAdapterError("private provider payload")]:
            result = await safe_call(AsyncMock(side_effect=error))
            self.assertNotIn("private provider payload", str(result))
            self.assertEqual(result["reason"], type(error).__name__)


if __name__ == "__main__":
    unittest.main()
