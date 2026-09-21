"""Align Ollama's actual context window with the dedicated Hermes profile."""

from __future__ import annotations

import re
from pathlib import Path

import httpx

from scraping.duoke.chat.archive_duoke_chats import private_json
from scraping.shared.common import read_json
from scraping.shared.paths import ROOT, DUOKE_DESKTOP_DIR

MODEL = "qwen3.5:4b"
# Installed Hermes rejects any context below 64,000 tokens during initialization.
CONTEXT_LENGTH = 65536


def context_length(show: dict) -> int | None:
    match = re.search(r"(?m)^num_ctx\s+(\d+)\s*$", show.get("parameters", ""))
    return int(match[1]) if match else None


def configure_context(client: httpx.Client, profile: Path, directory: Path):
    marker = profile / ".douke-web-owned"
    if not marker.is_file() or marker.read_text().strip() != str(ROOT):
        raise ValueError("The Hermes profile must belong to this project")
    config_path = profile / "config.yaml"
    config = read_json(config_path, {})
    model = config.get("model", {})
    if (model.get("default") != MODEL or model.get("provider") != "custom"
            or model.get("base_url", "").rstrip("/") != "http://127.0.0.1:11434/v1"):
        raise ValueError("Context repair requires the dedicated local Qwen profile")

    def request(path, body=None):
        response = client.get(path) if body is None else client.post(path, json=body)
        response.raise_for_status()
        return response.json() if response.content else {}

    shown = request("/api/show", {"model": MODEL})
    if context_length(shown) != CONTEXT_LENGTH:
        models = request("/api/tags")["models"]
        current = next((item for item in models if item["name"] == MODEL), None)
        if current is None or not re.fullmatch(r"[a-f0-9]{64}", current.get("digest", "")):
            raise ValueError("Cannot identify the installed Qwen model for backup")
        backup_name = "qwen3.5:duoke-backup-" + current["digest"][:12]
        backup = next((item for item in models if item["name"] == backup_name), None)
        if backup and backup.get("digest") != current["digest"]:
            raise ValueError("The model backup name is already occupied")
        if not backup:
            request("/api/copy", {"source": MODEL, "destination": backup_name})
        backup_record = directory / "context-backup.json"
        if not backup_record.exists():
            private_json(backup_record, {"model": MODEL, "backupModel": backup_name,
                                        "config": config, "parameters": shown.get("parameters", "")})
        result = request("/api/create", {"model": MODEL, "from": backup_name,
                                        "parameters": {"num_ctx": CONTEXT_LENGTH}, "stream": False})
        if result.get("status") != "success":
            raise ValueError("Ollama did not confirm the context update")
        shown = request("/api/show", {"model": MODEL})
        if context_length(shown) != CONTEXT_LENGTH:
            raise ValueError("Ollama did not persist the requested context size")
    config["model"]["context_length"] = CONTEXT_LENGTH
    private_json(config_path, config)
    print(f"Ollama and Hermes context aligned to {CONTEXT_LENGTH} tokens for {MODEL}. Reopen the profile and start a new chat.")


def repair_context():
    with httpx.Client(base_url="http://127.0.0.1:11434", timeout=120) as client:
        configure_context(client, Path.home() / ".hermes/profiles/duoke-support", DUOKE_DESKTOP_DIR)
