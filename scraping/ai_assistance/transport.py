"""Small authenticated transport with no redirects or environment proxies."""

from __future__ import annotations

import json
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from scraping.ai_assistance.config import Config


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def json_request(url: str, body: dict | None = None, token: str | None = None, timeout: float = 8) -> dict:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, data=json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None, headers=headers)
    with build_opener(ProxyHandler({}), NoRedirects()).open(request, timeout=timeout) as response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("API response exceeds limit")
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise ValueError("API response must be an object")
        return result


class Transport:
    def __init__(self, config: Config):
        self.config = config

    def post(self, endpoint: str, body: dict) -> dict:
        return json_request(f"{self.config.site_url}/api/ai-assistance/worker/{endpoint}", body, self.config.token)

    def model_ready(self) -> bool:
        try:
            data = json_request(f"{self.config.model_url}/models", timeout=2)
            models = data.get("data")
            return isinstance(models, list) and any(item.get("id") == self.config.model for item in models if isinstance(item, dict))
        except (OSError, ValueError):
            return False
