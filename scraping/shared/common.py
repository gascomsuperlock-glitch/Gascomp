#!/usr/bin/env python3
"""Shared paths and privacy helpers for the Duoke support automation."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit


from scraping.shared.paths import ROOT


DUOKE_HOST = "web.duoke.com"
DEFAULT_DUOKE_URL = "https://web.duoke.com/?lang=id#/dk/main"

EMAIL_RE = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+", re.I)
PHONE_RE = re.compile(r"(?<!\w)(?:\+?62|0)[\s().-]*(?:\d[\s().-]*){8,13}(?!\w)")
ORDER_RE = re.compile(
    r"\b(?:nomor\s*)?(?:pesanan|order|invoice|resi|tracking)\s*(?:id|no|number|#)?\s*[:#-]?\s*[a-z0-9-]{5,}\b",
    re.I,
)
NAME_RE = re.compile(r"\b(?:nama\s+saya|atas\s+nama|penerima)\s*[:=-]?\s*[a-z][a-z .'-]{2,60}", re.I)
ADDRESS_LINE_RE = re.compile(r"(?im)^\s*(?:alamat|address)\s*[:=-].*$")
URL_RE = re.compile(r"https?://[^\s<>()]+", re.I)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def stable_hash(*parts: object, length: int = 20) -> str:
    raw = "\x1f".join(str(part) for part in parts)
    return hashlib.sha256(raw.encode("utf-8", errors="replace")).hexdigest()[:length]


def sanitize_url(value: str) -> str:
    """Keep a useful endpoint reference without query parameters or fragments."""
    try:
        parsed = urlsplit(value)
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
    except ValueError:
        return ""


def redact_text(value: object) -> str:
    """Remove common customer identifiers before text enters the Obsidian vault."""
    text = str(value or "").replace("\x00", " ")
    text = EMAIL_RE.sub("[EMAIL]", text)
    text = PHONE_RE.sub("[PHONE]", text)
    text = ORDER_RE.sub("[ORDER_NUMBER]", text)
    text = NAME_RE.sub("[NAME]", text)
    text = ADDRESS_LINE_RE.sub("Address: [ADDRESS]", text)
    text = URL_RE.sub("[LINK]", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def load_env_file(path: Path | None = None) -> dict[str, str]:
    result: dict[str, str] = {}
    target = path or ROOT / ".env.local"
    try:
        lines = target.read_text(encoding="utf-8").splitlines()
    except OSError:
        return result
    for line in lines:
        match = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
        if not match:
            continue
        value = match.group(2).strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        result[match.group(1)] = value
    return result


def is_duoke_url(value: str) -> bool:
    try:
        return urlsplit(value).hostname == DUOKE_HOST
    except ValueError:
        return False
