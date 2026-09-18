"""Headless Chrome adapter for Duoke's authenticated Vue application."""

from __future__ import annotations

import asyncio

from playwright.async_api import async_playwright

from scraping.duoke.reply.browser_reader import allowed_read
from scraping.shared.common import DEFAULT_DUOKE_URL, is_duoke_url, read_json
from scraping.shared.paths import CHAT_ARCHIVE_DIR, DUOKE_DESKTOP_STORAGE


class DesktopBrowser:
    def __init__(self):
        self.playwright = self.browser = self.context = self.page = None
        self.session = read_json(CHAT_ARCHIVE_DIR / "session.json", {})

    async def open(self):
        if self.page is not None:
            return
        if not DUOKE_DESKTOP_STORAGE.is_file():
            raise ValueError("Run the Desktop session setup first")
        self.playwright = await async_playwright().start()
        try:
            self.browser = await self.playwright.chromium.launch(channel="chrome", headless=True)
            self.context = await self.browser.new_context(storage_state=str(DUOKE_DESKTOP_STORAGE), service_workers="block")

            async def capture(request):
                if is_duoke_url(request.url):
                    headers = await request.all_headers()
                    if headers.get("x-access-token"):
                        self.session["headers"] = headers

            self.context.on("request", capture)
            self.page = await self.context.new_page()
            await self.page.goto(DEFAULT_DUOKE_URL, wait_until="domcontentloaded", timeout=60000)
            await self.page.wait_for_function("""() => {
                const store = document.querySelector('#app')?.__vue__?.$store;
                return !!(store?._actions?.['Chat/send-message'] && store.state.System?.user?.uid);
            }""", timeout=30000)
        except Exception:
            await self.close()
            raise

    async def close(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.playwright = self.browser = self.context = self.page = None

    async def read(self, method, url, **kwargs):
        from urllib.parse import urlencode
        if not allowed_read(method, url) or kwargs.get("params", {}).get("pageNo", 1) > 20:
            raise ValueError("Unsupported read or excessive history")
        await self.open()
        if not is_duoke_url(self.page.url):
            raise ValueError("Duoke authentication is required")
        if kwargs.get("params"):
            url += ("&" if "?" in url else "?") + urlencode(kwargs["params"])
        headers = {key.lower(): value for key, value in self.session.get("headers", {}).items()
                   if key.lower() in ("x-access-token", "content-type", "accept")}
        await asyncio.sleep(0.2)
        value = await self.page.evaluate("""async ({method,url,headers,body}) => {
            const response = await fetch(url,{method,headers,credentials:'include',redirect:'error',
                signal:AbortSignal.timeout(30000),...(body===null?{}:{body:JSON.stringify(body)})});
            if(!response.ok) throw new Error('Duoke read rejected');
            return response.json();
        }""", {"method": method, "url": url, "headers": headers, "body": kwargs.get("json")})
        if not isinstance(value, dict) or value.get("code") != 0 or not isinstance(value.get("data"), dict):
            raise ValueError("Duoke session or response is invalid")
        return value["data"]

    async def send(self, conversation: dict, text: str):
        await self.open()
        if not is_duoke_url(self.page.url):
            raise ValueError("Duoke authentication is required")
        # Source-reviewed Duoke action: it builds the outgoing SDK message and
        # performs the required claim operation. Never call a guessed send API.
        await self.page.evaluate("""async ({conversation,text}) => {
            const store=document.querySelector('#app')?.__vue__?.$store;
            if(!store?._actions?.['Chat/send-message'] || !store.state.System?.user?.uid)
                throw new Error('Duoke adapter unavailable');
            const {shopId,conversationId,platform,groupId}=conversation;
            if(!shopId || !conversationId || !platform)
                throw new Error('Conversation identity incomplete');
            await store.dispatch('Chat/sync-update-session',{session:conversation});
            await store.dispatch('Chat/send-message',{msg:{shopId,conversationId,platform,groupId,
                contentType:'text',content:{text}}});
        }""", {"conversation": conversation, "text": text})
