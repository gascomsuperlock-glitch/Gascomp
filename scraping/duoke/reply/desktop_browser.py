"""Headless Chrome adapter for Duoke's authenticated Vue application."""

from __future__ import annotations

import asyncio
import hashlib
from urllib.parse import urlsplit, urlunsplit

from playwright.async_api import async_playwright, TimeoutError as BrowserTimeout, Error as BrowserError

from scraping.duoke.reply.browser_reader import allowed_read
from scraping.shared.common import DEFAULT_DUOKE_URL, is_duoke_url, read_json
from scraping.shared.paths import CHAT_ARCHIVE_DIR, DUOKE_DESKTOP_STORAGE


DUOKE_WORKSPACE_URL = urlunsplit(urlsplit(DEFAULT_DUOKE_URL)._replace(query="", fragment="/dk/main/chat"))


class DeliveryAdapterError(RuntimeError):
    """A bounded diagnostic without provider text or customer identifiers."""

    def __init__(self, reason):
        self.reason = reason
        super().__init__(reason)


class DesktopBrowser:
    def __init__(self):
        self.playwright = self.browser = self.context = self.page = None
        self.storage_signature = None
        self.session = read_json(CHAT_ARCHIVE_DIR / "session.json", {})

    async def open(self):
        try:
            signature = hashlib.sha256(DUOKE_DESKTOP_STORAGE.read_bytes()).digest()
        except FileNotFoundError:
            await self.close()
            raise ValueError("Run the Desktop session setup first") from None
        if self.page is not None:
            if not self.page.is_closed() and signature == self.storage_signature:
                return
            await self.close()
        # A long-running MCP process must use the owner's refreshed credentials.
        self.session = read_json(CHAT_ARCHIVE_DIR / "session.json", {})
        self.playwright = await async_playwright().start()
        try:
            self.browser = await self.playwright.chromium.launch(channel="chrome", headless=True)
            self.context = await self.browser.new_context(storage_state=str(DUOKE_DESKTOP_STORAGE), service_workers="block")

            async def capture(request):
                if is_duoke_url(request.url):
                    try:
                        headers = await request.all_headers()
                    except BrowserError:
                        # Requests may finish after a failed login closes the
                        # context. Header capture is best-effort, not readiness.
                        return
                    if headers.get("x-access-token"):
                        self.session["headers"] = headers

            self.context.on("request", capture)
            self.page = await self.context.new_page()
            try:
                await self.page.goto(DUOKE_WORKSPACE_URL, wait_until="domcontentloaded", timeout=60000)
            except BrowserTimeout as error:
                raise DeliveryAdapterError("navigation_timeout") from error
            await self.page.wait_for_function("""() => {
                const store = document.querySelector('#app')?.__vue__?.$store;
                return !!(store?._actions?.['Chat/send-message'] && store.state.System?.user?.uid)
                    || (!!document.querySelector('input[type=password]') &&
                        document.querySelector('#app')?.__vue__?.$route?.meta?.loginPage);
            }""", timeout=30000)
            authenticated = await self.page.evaluate("() => !!document.querySelector('#app')?.__vue__?.$store?.state.System?.user?.uid")
            if not authenticated:
                raise DeliveryAdapterError("authentication_required")
            self.storage_signature = signature
        except BrowserTimeout as error:
            await self.close()
            raise DeliveryAdapterError("application_not_ready") from error
        except Exception:
            await self.close()
            raise

    async def close(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.playwright = self.browser = self.context = self.page = None
        self.storage_signature = None

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

    async def prepare_send(self):
        """Wait for the application's SDK, which lives inside its micro-app."""
        await self.open()
        try:
            await self.page.wait_for_function("""() => {
                const app=document.querySelector('#app')?.__vue__;
                return !!(app?.$store?.state.System?.user?.uid &&
                    typeof app.$dkChat?.createCustomMessage==='function' &&
                    typeof app.$dkChat?.sendMessage==='function' &&
                    app.$store.state.Socket?.imUserStatus==='onLine');
            }""", timeout=30000)
        except Exception as error:
            raise DeliveryAdapterError("chat_not_ready") from error

    async def send(self, conversation: dict, text: str):
        await self.open()
        if not is_duoke_url(self.page.url):
            raise ValueError("Duoke authentication is required")
        # Source-reviewed Duoke action: it builds the outgoing SDK message and
        # performs the required claim operation. Never call a guessed send API.
        result = await self.page.evaluate("""async ({conversation,text}) => {
            const app=document.querySelector('#app')?.__vue__;
            const store=app?.$store;
            if(!store?._actions?.['Chat/send-message'] || !store.state.System?.user?.uid)
                return {reason:'authentication_required'};
            if(typeof app.$dkChat?.createCustomMessage!=='function' ||
               typeof app.$dkChat?.sendMessage!=='function' ||
               store.state.Socket?.imUserStatus!=='onLine')
                return {reason:'chat_not_ready'};
            if(store.state.System.vipExpiryData?.shopNum || store.state.System.vipExpiryData?.subAccountNum)
                return {reason:'account_restricted'};
            const {shopId,conversationId,platform,groupId}=conversation;
            if(!shopId || !conversationId || !platform)
                throw new Error('Conversation identity incomplete');
            await store.dispatch('Chat/sync-update-session',{session:conversation});
            const msg={shopId,conversationId,platform,groupId,contentType:'text',content:{text}};
            await store.dispatch('Chat/send-message',{msg});
            // The application catches its own provider errors. Dispatch resolving
            // is not an acknowledgement: inspect its mutated message state.
            if(msg.pendingFlag===2) return {reason:'sdk_rejected'};
            if(msg.pendingFlag!==0) return {reason:'sdk_not_acknowledged'};
            return {acknowledged:true};
        }""", {"conversation": conversation, "text": text})
        if not isinstance(result, dict) or not result.get("acknowledged"):
            reason = result.get("reason") if isinstance(result, dict) else None
            allowed = {"authentication_required", "chat_not_ready", "account_restricted",
                       "sdk_rejected", "sdk_not_acknowledged"}
            raise DeliveryAdapterError(reason if reason in allowed else "adapter_result_invalid")
