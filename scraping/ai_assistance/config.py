"""Explicit local-only model configuration; no personal Hermes environment loading."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from scraping.shared.paths import AI_ASSISTANCE_HERMES_HOME, AI_ASSISTANCE_VAULT


def loopback_url(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        return (parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "::1", "localhost")
                and not parsed.username and not parsed.password and not parsed.query and not parsed.fragment)
    except ValueError:
        return False


@dataclass(frozen=True)
class Config:
    site_url: str
    token: str
    model_url: str
    model: str
    hermes_root: Path
    hermes_python: str
    hermes_home: Path
    vault: Path
    chrome_cdp_url: str
    browser_hosts: frozenset[str]
    source_vault: Path | None = None
    response_mode: str = "grounded"

    @classmethod
    def from_env(cls) -> "Config":
        root = Path(os.environ.get("GASCOMP_AI_HERMES_ROOT") or "~/.hermes/hermes-agent").expanduser().resolve()
        interpreter = root / "venv" / "bin" / "python"
        config = cls(
            site_url=os.environ.get("GASCOMP_AI_SITE_URL", "").rstrip("/"),
            token=os.environ.get("GASCOMP_AI_WORKER_TOKEN", ""),
            model_url=(os.environ.get("GASCOMP_AI_MODEL_BASE_URL") or "http://127.0.0.1:11434/v1").rstrip("/"),
            model=os.environ.get("GASCOMP_AI_MODEL", ""),
            hermes_root=root,
            hermes_python=os.environ.get("GASCOMP_AI_HERMES_PYTHON") or (str(interpreter) if interpreter.exists() else sys.executable),
            hermes_home=Path(os.environ.get("GASCOMP_AI_HERMES_HOME") or str(AI_ASSISTANCE_HERMES_HOME)).expanduser().resolve(),
            vault=Path(os.environ.get("GASCOMP_AI_VAULT") or str(AI_ASSISTANCE_VAULT)).expanduser().resolve(),
            chrome_cdp_url=os.environ.get("GASCOMP_AI_CHROME_CDP_URL") or "http://127.0.0.1:9222",
            browser_hosts=frozenset(value.strip().lower() for value in (os.environ.get("GASCOMP_AI_BROWSER_HOSTS") or "support.gascompsuperlock.com").split(",") if value.strip()),
            source_vault=Path(os.environ["GASCOMP_AI_SOURCE_VAULT"]).expanduser().resolve()
            if os.environ.get("GASCOMP_AI_SOURCE_VAULT") else None,
            response_mode=(os.environ.get("GASCOMP_AI_RESPONSE_MODE") or "grounded").strip().lower(),
        )
        config.validate()
        return config

    def validate(self) -> None:
        parsed = urlsplit(self.site_url)
        if (not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment
                or parsed.path not in ("", "/") or (parsed.scheme != "https" and not loopback_url(self.site_url))):
            raise ValueError("GASCOMP_AI_SITE_URL must be an HTTPS origin (loopback HTTP is allowed for development)")
        if len(self.token) < 32:
            raise ValueError("GASCOMP_AI_WORKER_TOKEN must contain at least 32 characters")
        if not self.model or not loopback_url(self.model_url):
            raise ValueError("A model name and loopback HTTP model endpoint are required")
        if not loopback_url(self.chrome_cdp_url):
            raise ValueError("Chrome CDP must use loopback HTTP")
        if self.hermes_home == (Path.home() / ".hermes").resolve() or self.hermes_home == self.hermes_root:
            raise ValueError("Use a dedicated Hermes home")
        if not (self.hermes_root / "run_agent.py").is_file():
            raise ValueError("Hermes source is unavailable")
        if self.response_mode not in ("grounded", "exact"):
            raise ValueError("GASCOMP_AI_RESPONSE_MODE must be grounded or exact")
