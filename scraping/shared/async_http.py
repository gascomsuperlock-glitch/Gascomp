"""Fetch independent JSON pages with a shared, bounded HTTPX client."""

from __future__ import annotations

import asyncio
from collections.abc import Iterable, Mapping
from typing import Any

import httpx


async def fetch_pages(
    endpoint: str,
    headers: Mapping[str, str],
    cookies: Mapping[str, str] | httpx.Cookies,
    pages: Iterable[int],
    *,
    page_parameter: str = "page",
    params: Mapping[str, str | int] | None = None,
    concurrency: int = 3,
    timeout: float = 30.0,
    transport: httpx.AsyncBaseTransport | None = None,
) -> list[Any | Exception]:
    """Return JSON or an exception per page, preserving the requested order.

    Supply a verified GET endpoint and its authorized headers/cookies. This
    helper does not log in, discover pagination, retry failed requests, or save
    payloads. Callers must check every result before importing a complete batch.
    Cursor pagination that depends on previous responses is not supported.
    """
    if concurrency < 1:
        raise ValueError("Concurrency must be at least one.")
    if timeout <= 0:
        raise ValueError("Timeout must be positive.")
    if not page_parameter:
        raise ValueError("The page parameter must not be empty.")

    semaphore = asyncio.Semaphore(concurrency)
    url = httpx.URL(endpoint)
    base_params = url.params.merge(params or {})

    async with httpx.AsyncClient(
        headers=headers,
        cookies=cookies,
        timeout=timeout,
        follow_redirects=False,
        limits=httpx.Limits(
            max_connections=concurrency,
            max_keepalive_connections=concurrency,
        ),
        transport=transport,
    ) as client:
        async def fetch_page(page: int) -> Any:
            async with semaphore:
                response = await client.get(
                    url,
                    params=base_params.set(page_parameter, page),
                )
                response.raise_for_status()
                return response.json()

        return await asyncio.gather(
            *(fetch_page(page) for page in pages),
            return_exceptions=True,
        )
