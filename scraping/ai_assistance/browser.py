"""Optional deterministic link probe; web content never enters model context."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit

from scraping.ai_assistance.config import Config
from scraping.ai_assistance.knowledge import answer_links, public_https_url


def allowed_navigation(url: str, hosts: set[str]) -> bool:
    if not public_https_url(url, hosts):
        return False
    try:
        addresses = socket.getaddrinfo(urlsplit(url).hostname, 443, type=socket.SOCK_STREAM)
        return bool(addresses) and all(ipaddress.ip_address(address[4][0]).is_global for address in addresses)
    except (OSError, ValueError):
        return False


def probe_links(snapshot: dict, config: Config) -> list[dict]:
    from playwright.sync_api import sync_playwright

    urls = sorted({url for entry in snapshot["entries"] for url in answer_links(entry["answer"])
                   if public_https_url(url, set(config.browser_hosts))})
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(config.chrome_cdp_url, timeout=5000)
        context = browser.new_context(java_script_enabled=False, service_workers="block", accept_downloads=False)
        try:
            def route_request(route):
                request = route.request
                if request.is_navigation_request() and request.resource_type == "document" and allowed_navigation(request.url, set(config.browser_hosts)):
                    route.continue_()
                else:
                    route.abort()

            context.route("**/*", route_request)
            page = context.new_page()
            for url in urls:
                try:
                    response = page.goto(url, wait_until="domcontentloaded", timeout=8000)
                    results.append({"url": url, "ok": bool(response and response.ok)})
                except Exception:
                    results.append({"url": url, "ok": False})
        finally:
            context.close()
            browser.close()
    return results
