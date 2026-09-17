"""Execute each Hermes turn in an isolated, deadline-bound process."""

from __future__ import annotations

import json
import os
import re
import signal
import subprocess
import tempfile
from pathlib import Path

from scraping.ai_assistance.config import Config
from scraping.ai_assistance.knowledge import parse_selection


def compact_candidates(text: str, candidates: list[dict]) -> list[dict]:
    """Keep exact answers and safety metadata while bounding model-only aliases."""
    query_alias = tuple(re.findall(r"\w+", text.casefold()))
    exact = [
        candidate for candidate in candidates
        if any(tuple(re.findall(r"\w+", question.casefold())) == query_alias
               for question in candidate.get("questions", []))
    ]
    # A unique exact alias is stronger ranking evidence than fuzzy answer overlap,
    # but fuzzy candidates remain visible so contradictory source facts still
    # fail closed in the model selector.
    if len(exact) == 1:
        candidates = [exact[0], *(candidate for candidate in candidates
                                  if candidate["id"] != exact[0]["id"])]
    allowed = ("id", "kind", "language", "sku", "answer",
               "sourceFlags", "conflictingAttributes")
    complete = [{**{key: candidate[key] for key in allowed if key in candidate},
                 "questions": candidate.get("questions", [])} for candidate in candidates]
    # Preserve useful source phrasing when the selection context is already
    # small. Only larger payloads need their retrieval aliases condensed.
    if len(json.dumps(complete, ensure_ascii=False)) <= 8000:
        return complete
    query = set(re.findall(r"[\w-]+", text.casefold()))
    compacted: list[dict] = []
    for candidate in candidates:
        questions = candidate.get("questions", [])
        ranked = sorted(
            enumerate(questions),
            key=lambda item: (
                -len(query & set(re.findall(r"[\w-]+", item[1].casefold()))),
                len(item[1]),
                item[0],
            ),
        )
        identity = max(
            (question for question in questions
             if "?" not in question and question.casefold().strip() != str(candidate.get("sku", "")).casefold().strip()),
            key=len,
            default=None,
        )
        relevant: list[str] = []
        for question in [*(questions[index] for index, _ in ranked), identity]:
            if question and question not in relevant:
                relevant.append(question)
            if len(relevant) == 2:
                break
        if identity and identity not in relevant:
            relevant.append(identity)
        for index, _ in ranked:
            if len(relevant) == 3:
                break
            if questions[index] not in relevant:
                relevant.append(questions[index])
        compacted.append({
            **{key: candidate[key] for key in allowed if key in candidate},
            "questions": relevant,
        })
    return compacted


def run_isolated(command: list[str], payload: dict, environment: dict, directory: str, timeout: float) -> str:
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, text=True, env=environment,
                               cwd=directory, start_new_session=True)
    try:
        stdout, _ = process.communicate(json.dumps(payload, ensure_ascii=False), timeout=timeout)
        return stdout if process.returncode == 0 and len(stdout) <= 10000 else ""
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        return ""


class HermesSelector:
    def __init__(self, config: Config):
        self.config = config

    def __call__(self, text: str, candidates: list[dict], timeout: float = 40) -> str | None:
        if not candidates or timeout <= 0:
            return None
        self.config.hermes_home.mkdir(parents=True, exist_ok=True, mode=0o700)
        # Every turn gets a fresh profile. No customer prompts persist between turns.
        with tempfile.TemporaryDirectory(prefix="turn-", dir=self.config.hermes_home) as directory:
            environment = {key: os.environ[key] for key in ("PATH", "LANG", "LC_ALL", "TMPDIR", "SYSTEMROOT") if key in os.environ}
            environment.update({"HERMES_HOME": directory, "PYTHONIOENCODING": "utf-8",
                                "NO_PROXY": "*", "HERMES_TELEMETRY_DISABLED": "1"})
            payload = {"root": str(self.config.hermes_root), "model": self.config.model,
                       "baseUrl": self.config.model_url, "text": text,
                       "candidates": compact_candidates(text, candidates)}
            try:
                raw = run_isolated([self.config.hermes_python, "-I", str(Path(__file__).with_name("hermes_turn.py"))],
                                   payload, environment, directory, min(timeout, 40))
                return parse_selection(raw, candidates)
            except (OSError, ValueError):
                return None
