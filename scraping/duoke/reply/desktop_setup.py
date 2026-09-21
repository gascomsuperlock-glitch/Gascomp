"""Prepare an isolated Hermes Desktop profile; only the owner enables delivery."""

from __future__ import annotations

import argparse
import asyncio
import json
import shutil
import subprocess
from pathlib import Path

import httpx
from playwright.async_api import async_playwright, Error as BrowserError

from scraping.duoke.chat.archive_duoke_chats import private_json
from scraping.duoke.reply.desktop_browser import DesktopBrowser, DeliveryAdapterError, DUOKE_WORKSPACE_URL
from scraping.duoke.reply.desktop_service import DesktopService
from scraping.duoke.reply.desktop_prompts import PROMPT, SOUL
from scraping.duoke.reply.desktop_model import CONTEXT_LENGTH, context_length, repair_context
from scraping.shared.common import DEFAULT_DUOKE_URL, is_duoke_url, read_json
from scraping.shared.paths import (ROOT, PROFILE_DIR, CHAT_ARCHIVE_DIR, DUOKE_DESKTOP_DIR,
                                   DUOKE_DESKTOP_STORAGE, DUOKE_DESKTOP_ENABLED, STOP_FILE)


PROFILE_NAME = "duoke-support"


def profile_config():
    return {
        "model": {"default": "qwen3.5:4b", "provider": "custom", "base_url": "http://127.0.0.1:11434/v1",
                  "context_length": CONTEXT_LENGTH},
        "agent": {"max_turns": 20, "reasoning_effort": "none", "coding_context": "off",
                  "disabled_toolsets": ["kanban"]},
        "terminal": {"cwd": str(Path.home() / ".hermes/profiles" / PROFILE_NAME / "workspace")},
        "platform_toolsets": {"cli": ["duoke"], "cron": ["duoke"]},
        "tools": {"tool_search": {"enabled": "off"}},
        "cron": {"model": "qwen3.5:4b", "model_provider": "custom"},
        "mcp_servers": {"duoke": {"command": str(ROOT / "scraping/.venv/bin/python"),
                                   "args": ["-m", "scraping.duoke.reply.desktop_mcp"],
                                   "env": {"PYTHONPATH": str(ROOT)}, "timeout": 120,
                                   "tools": {"resources": False, "prompts": False}}},
    }


def setup_profile():
    home = Path.home() / ".hermes"
    target = home / "profiles" / PROFILE_NAME
    marker = target / ".douke-web-owned"
    if target.exists() and not marker.exists():
        raise ValueError("The duoke-support profile already exists and is not owned by this project")
    hermes = shutil.which("hermes")
    if not hermes:
        raise ValueError("Hermes CLI is unavailable")
    if not target.exists():
        subprocess.run([hermes, "profile", "create", PROFILE_NAME, "--no-alias", "--no-skills"], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        marker.write_text(str(ROOT) + "\n")
    # The config is JSON, which is also valid YAML. No personal keys are copied.
    (target / "workspace").mkdir(exist_ok=True, mode=0o700)
    private_json(target / "config.yaml", profile_config())
    (target / ".env").write_text("OPENAI_API_KEY=local-only\nOPENAI_BASE_URL=http://127.0.0.1:11434/v1\nHERMES_TELEMETRY_DISABLED=1\n")
    (target / ".env").chmod(0o600)
    (target / "SOUL.md").write_text(SOUL)
    DUOKE_DESKTOP_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    (DUOKE_DESKTOP_DIR / "desktop-prompt.txt").write_text(PROMPT)
    job_marker = DUOKE_DESKTOP_DIR / "schedule-created.json"
    if not job_marker.exists():
        subprocess.run([hermes, "-p", PROFILE_NAME, "cron", "create", "every 1m", PROMPT,
                        "--name", "Duoke automatic replies", "--model", "qwen3.5:4b", "--provider", "custom",
                        "--reasoning-effort", "none", "--deliver", "local", "--paused",
                        "--paused-reason", "Owner starts this job from Hermes Desktop after preview"],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        private_json(job_marker, {"profile": PROFILE_NAME, "name": "Duoke automatic replies", "createdPaused": True})
    print("Profile duoke-support is ready. Its schedule is created paused; no automation was started.")


def refresh_instructions():
    """Update owned instructions without overwriting settings or activating a job."""
    target = Path.home() / ".hermes/profiles" / PROFILE_NAME
    marker = target / ".douke-web-owned"
    if not marker.is_file() or marker.read_text().strip() != str(ROOT):
        raise ValueError("Run setup first; the selected profile must belong to this project")
    hermes = shutil.which("hermes")
    if not hermes:
        raise ValueError("Hermes CLI is unavailable")
    jobs_path = target / "cron/jobs.json"
    before = read_json(jobs_path, {"jobs": []})["jobs"]
    owned = [job for job in before if job.get("name") == "Duoke automatic replies"]
    if len(owned) > 1:
        raise ValueError("Multiple matching jobs exist; reconcile them before refreshing")
    backup = DUOKE_DESKTOP_DIR / "instruction-backup"
    backup.mkdir(parents=True, exist_ok=True, mode=0o700)
    for source, name in ((target / "SOUL.md", "SOUL.md"), (jobs_path, "jobs.json")):
        destination = backup / name
        if source.exists() and not destination.exists():
            shutil.copy2(source, destination)
            destination.chmod(0o600)
    # Earlier generated profiles used a directory inside the coding repository,
    # causing Hermes to inject the project's coding AGENTS.md into support chat.
    # Migrate only that exact generated value; preserve custom settings.
    config_path = target / "config.yaml"
    try:
        config = json.loads(config_path.read_text())
    except (ValueError, OSError):
        config = {}
    if config.get("terminal", {}).get("cwd") == str(DUOKE_DESKTOP_DIR):
        destination = backup / "config.yaml"
        if not destination.exists():
            shutil.copy2(config_path, destination)
            destination.chmod(0o600)
        (target / "workspace").mkdir(exist_ok=True, mode=0o700)
        config["terminal"]["cwd"] = str(target / "workspace")
        private_json(config_path, config)
    server = config.get("mcp_servers", {}).get("duoke", {})
    if server.get("args") == ["-m", "scraping.duoke.reply.desktop_mcp"]:
        before = json.dumps(config, sort_keys=True)
        # The small local model must see the four concrete MCP schemas rather
        # than first discover them through Hermes' generic tool-call bridge.
        config.setdefault("tools", {}).setdefault("tool_search", {})["enabled"] = "off"
        server.setdefault("tools", {}).update({"resources": False, "prompts": False})
        if json.dumps(config, sort_keys=True) != before:
            destination = backup / "config-before-direct-tools.yaml"
            if not destination.exists():
                shutil.copy2(config_path, destination)
                destination.chmod(0o600)
            private_json(config_path, config)
    for job in owned:
        if job.get("prompt") != PROMPT:
            subprocess.run([hermes, "-p", PROFILE_NAME, "cron", "edit", job["id"],
                            "--prompt", PROMPT], check=True, capture_output=True, text=True)
            after = read_json(jobs_path, {"jobs": []})["jobs"]
            updated = next((item for item in after if item["id"] == job["id"]), None)
            if not updated or updated.get("prompt") != PROMPT:
                raise ValueError("Scheduled prompt update was not saved")
            if any(updated.get(key) != job.get(key) for key in ("enabled", "model", "schedule")):
                raise ValueError("Unexpected schedule configuration change; inspect the private backup")
    (target / "SOUL.md").write_text(SOUL)
    (target / "SOUL.md").chmod(0o600)
    (DUOKE_DESKTOP_DIR / "desktop-prompt.txt").write_text(PROMPT)
    print("Instructions refreshed. Reopen the Desktop profile and start a new chat. Delivery controls were not changed.")


async def capture_session(headed=False):
    session = read_json(CHAT_ARCHIVE_DIR / "session.json", {})
    if not session.get("list_url"):
        raise ValueError("The verified archive session template is missing")
    async with async_playwright() as playwright:
        context = await playwright.chromium.launch_persistent_context(str(PROFILE_DIR), headless=not headed)
        try:
            async def capture(request):
                if is_duoke_url(request.url):
                    try:
                        headers = await request.all_headers()
                    except BrowserError:
                        return
                    if headers.get("x-access-token"):
                        session["headers"] = headers
            context.on("request", capture)
            page = context.pages[0] if context.pages else await context.new_page()
            await page.goto(DUOKE_WORKSPACE_URL, wait_until="domcontentloaded", timeout=60000)
            if headed:
                print("Sign in in the Duoke window. Waiting for the authenticated workspace...", flush=True)
            await page.wait_for_function("() => !!document.querySelector('#app')?.__vue__?.$store?.state.System?.user?.uid",
                                         timeout=300000 if headed else 30000)
            await page.wait_for_timeout(3000)
            storage = await context.storage_state()
            for origin in storage["origins"]:
                # Do not import old composer drafts or cached IM messages into automation.
                origin["localStorage"] = [item for item in origin["localStorage"]
                                          if not item["name"].startswith(("TIM_", "MYJ_unsent_"))]
            storage["origins"] = [origin for origin in storage["origins"] if is_duoke_url(origin["origin"])]
            storage["cookies"] = [cookie for cookie in storage["cookies"] if cookie["domain"].lstrip(".").endswith("duoke.com")]
            private_json(DUOKE_DESKTOP_STORAGE, storage)
            private_json(CHAT_ARCHIVE_DIR / "session.json", session)
        finally:
            await context.close()
    print("Private browser session saved. No message was sent.")


async def check():
    async with httpx.AsyncClient(timeout=5) as client:
        response = await client.get("http://127.0.0.1:11434/api/tags")
        response.raise_for_status()
        if "qwen3.5:4b" not in {item["name"] for item in response.json().get("models", [])}:
            raise ValueError("The required qwen3.5:4b model is unavailable")
        shown = await client.post("http://127.0.0.1:11434/api/show", json={"model": "qwen3.5:4b"})
        shown.raise_for_status()
        if context_length(shown.json()) != CONTEXT_LENGTH:
            raise ValueError("Run model-context to align the local model and Hermes context windows")
    browser = DesktopBrowser()
    try:
        service = DesktopService(browser)
        status = await service.status()
        await browser.prepare_send()
        data = await browser.read("POST", browser.session["list_url"], json={**browser.session["list_body"],
                                  "size": 1, "offset": 0, "shopIdList": [], "filterGroups": []})
        if not isinstance(data.get("list"), list):
            raise ValueError("Duoke inbox read failed")
        print(json.dumps({**status, "chrome": "ready", "session": "accepted", "sendAction": "available", "sent": 0}))
    finally:
        await browser.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["setup", "refresh", "model-context", "session", "check", "enable", "disable"])
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--send", action="store_true", help="Explicitly enable the Desktop delivery gate")
    args = parser.parse_args()
    try:
        if args.action == "setup":
            setup_profile()
        elif args.action == "refresh":
            refresh_instructions()
        elif args.action == "model-context":
            repair_context()
        elif args.action == "session":
            asyncio.run(capture_session(args.headed))
        elif args.action == "check":
            asyncio.run(check())
        elif args.action == "enable":
            if not args.send:
                raise ValueError("Use enable --send to enable Desktop delivery")
            if STOP_FILE.exists():
                raise ValueError("The shared stop marker is active; resolve it before enabling")
            asyncio.run(check())
            private_json(DUOKE_DESKTOP_ENABLED, {"enabledBy": "owner-command", "model": "qwen3.5:4b"})
            print("Desktop delivery enabled. Start the prepared schedule yourself in Hermes Desktop.")
        else:
            DUOKE_DESKTOP_ENABLED.unlink(missing_ok=True)
            print("Desktop delivery disabled. Other runners were not changed.")
        return 0
    except Exception as error:
        print(f"Desktop setup failed ({type(error).__name__}).")
        if isinstance(error, DeliveryAdapterError):
            print(f"Duoke readiness failed: {error.reason}.")
            if error.reason == "authentication_required":
                print("Quit Hermes Desktop before running session --headed to refresh the saved login. Run check before enabling or resuming.")
            else:
                print("Duoke page or chat connection is not ready. Inspect connectivity and the browser before resuming.")
        elif isinstance(error, ValueError):
            print(str(error))
        else:
            print("Check Ollama and run session --headed to sign in again. Then run check before enabling delivery.")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
