from __future__ import annotations

import asyncio
import json
import unittest

import httpx

from scraping.shared.async_http import fetch_pages


class AsyncHttpTests(unittest.IsolatedAsyncioTestCase):
    async def test_bounds_concurrency_and_preserves_page_order(self) -> None:
        active = 0
        peak = 0
        both_started = asyncio.Event()

        async def respond(request: httpx.Request) -> httpx.Response:
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            if active == 2:
                both_started.set()
            await asyncio.wait_for(both_started.wait(), timeout=1)
            await asyncio.sleep(0)
            active -= 1
            return httpx.Response(200, json={"page": int(request.url.params["page"])})

        results = await fetch_pages(
            "https://example.test/products", {}, {}, [3, 1, 2, 4],
            concurrency=2, transport=httpx.MockTransport(respond),
        )
        self.assertEqual(results, [{"page": page} for page in [3, 1, 2, 4]])
        self.assertEqual(peak, 2)

    async def test_preserves_auth_and_filters_with_custom_pagination(self) -> None:
        filters = {"store": "test-store"}

        def respond(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.method, "GET")
            self.assertEqual(request.headers["authorization"], "Bearer test-only")
            self.assertIn("session=test-only", request.headers["cookie"])
            self.assertEqual(dict(request.url.params), {
                "category": "test-category", "store": "test-store", "pageIndex": "0",
            })
            return httpx.Response(200, json={"items": []})

        results = await fetch_pages(
            "https://example.test/products?category=test-category&pageIndex=99",
            {"Authorization": "Bearer test-only"}, {"session": "test-only"}, [0],
            page_parameter="pageIndex", params=filters,
            transport=httpx.MockTransport(respond),
        )
        self.assertEqual(results, [{"items": []}])
        self.assertEqual(filters, {"store": "test-store"})

    async def test_reports_failures_without_losing_successful_pages(self) -> None:
        seen: list[int] = []

        def respond(request: httpx.Request) -> httpx.Response:
            page = int(request.url.params["page"])
            seen.append(page)
            if page == 1:
                return httpx.Response(200, json={"items": []})
            if page == 2:
                return httpx.Response(429, headers={"Retry-After": "60"})
            if page == 3:
                return httpx.Response(200, text="not JSON")
            if page == 4:
                raise httpx.ReadTimeout("Test timeout", request=request)
            return httpx.Response(302, headers={"Location": "https://example.test/login"})

        results = await fetch_pages(
            "https://example.test/products", {}, {}, range(1, 6),
            transport=httpx.MockTransport(respond),
        )
        self.assertEqual(results[0], {"items": []})
        self.assertIsInstance(results[1], httpx.HTTPStatusError)
        self.assertEqual(results[1].response.status_code, 429)
        self.assertIsInstance(results[2], json.JSONDecodeError)
        self.assertIsInstance(results[3], httpx.ReadTimeout)
        self.assertIsInstance(results[4], httpx.HTTPStatusError)
        self.assertEqual(sorted(seen), list(range(1, 6)))

    async def test_empty_batch_does_not_send_requests(self) -> None:
        def respond(request: httpx.Request) -> httpx.Response:
            self.fail("An empty batch must not send requests.")

        self.assertEqual(await fetch_pages(
            "https://example.test/products", {}, {}, [],
            transport=httpx.MockTransport(respond),
        ), [])

    async def test_rejects_invalid_configuration(self) -> None:
        for options in ({"concurrency": 0}, {"timeout": 0}, {"page_parameter": ""}):
            with self.subTest(options=options), self.assertRaises(ValueError):
                await fetch_pages("https://example.test/products", {}, {}, [1], **options)


if __name__ == "__main__":
    unittest.main()
