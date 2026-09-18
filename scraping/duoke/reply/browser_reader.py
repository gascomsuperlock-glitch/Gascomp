"""Read verified Duoke endpoints inside an isolated headless Chrome context."""

from __future__ import annotations

import asyncio
from http.cookies import SimpleCookie
from urllib.parse import urlencode, urlsplit

from scraping.duoke.chat.archive_duoke_chats import LIST_PATH, MESSAGE_PATH


ORIGIN = "https://web.duoke.com"
READER_URL = ORIGIN + "/__douke_draft_reader__"


def allowed_read(method: str, url: str) -> bool:
    parsed = urlsplit(url)
    return (parsed.scheme == "https" and parsed.netloc == "web.duoke.com"
            and not parsed.fragment
            and (method, parsed.path) in (("POST", LIST_PATH), ("GET", MESSAGE_PATH)))


def validate_session(session: dict) -> None:
    if not isinstance(session, dict) or not isinstance(session.get("headers"), dict):
        raise ValueError("The private Duoke session is unavailable")
    for key, method in (("list_url", "POST"), ("message_url", "GET")):
        if not isinstance(session.get(key), str) or not allowed_read(method, session[key]):
            raise ValueError("The session must use the verified Duoke read endpoints")
    if not isinstance(session.get("list_body"), dict):
        raise ValueError("The session is missing its conversation filters")


class BrowserReader:
    """The page has no Duoke application scripts or message-delivery capability."""

    def __init__(self, browser, session: dict, max_history_pages: int = 20):
        validate_session(session)
        self.browser = browser
        self.session = session
        self.max_history_pages = max_history_pages
        self.context = None
        self.page = None

    async def __aenter__(self):
        self.context = await self.browser.new_context(service_workers="block")
        try:
            headers = {key.lower(): value for key, value in self.session["headers"].items()}
            cookies = SimpleCookie()
            cookies.load(headers.get("cookie", ""))
            if cookies:
                await self.context.add_cookies([
                    {"name": key, "value": value.value, "url": ORIGIN, "secure": True}
                    for key, value in cookies.items()
                ])

            async def route_request(route):
                request = route.request
                if request.url == READER_URL and request.method == "GET":
                    await route.fulfill(status=200, content_type="text/html", body="<!doctype html><title>Duoke draft reader</title>")
                elif allowed_read(request.method, request.url):
                    await route.continue_()
                else:
                    await route.abort()

            await self.context.route("**/*", route_request)
            self.page = await self.context.new_page()
            await self.page.goto(READER_URL)
            return self
        except Exception:
            await self.context.close()
            raise

    async def __aexit__(self, *_):
        await self.context.close()

    async def read(self, method: str, url: str, **kwargs) -> dict:
        if not allowed_read(method, url):
            raise ValueError("Only verified conversation and message reads are allowed")
        if kwargs.get("params", {}).get("pageNo", 1) > self.max_history_pages:
            raise ValueError("History exceeds the configured page limit")
        if kwargs.get("params"):
            url += ("&" if "?" in url else "?") + urlencode(kwargs["params"])
        # Deliberately omit personal headers and never print credentials or responses.
        headers = {key.lower(): value for key, value in self.session["headers"].items()
                   if key.lower() in ("x-access-token", "content-type", "accept")}
        await asyncio.sleep(0.2)
        value = await self.page.evaluate("""async ({url, method, headers, body}) => {
            const response = await fetch(url, {method, headers, credentials: 'include',
                redirect: 'error', signal: AbortSignal.timeout(30000),
                ...(body === null ? {} : {body: JSON.stringify(body)})});
            if (!response.ok) throw new Error('Source read failed');
            return await response.json();
        }""", {"url": url, "method": method, "headers": headers, "body": kwargs.get("json")})
        if (not isinstance(value, dict) or value.get("code") != 0
                or value.get("success") is False or not isinstance(value.get("data"), dict)):
            raise ValueError("The Duoke session was rejected or the response is invalid")
        return value["data"]
