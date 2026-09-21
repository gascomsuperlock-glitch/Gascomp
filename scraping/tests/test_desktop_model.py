"""Verify context repair is reversible and preserves model/profile behavior."""

import json
import tempfile
import unittest
from pathlib import Path

import httpx

from scraping.duoke.reply.desktop_model import configure_context, MODEL, CONTEXT_LENGTH
from scraping.shared.paths import ROOT


class ModelContextTests(unittest.TestCase):
    def test_backup_before_model_update_and_idempotent_config_alignment(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            (p / ".douke-web-owned").write_text(str(ROOT))
            cfg = {"model": {"default": MODEL, "provider": "custom", "base_url": "http://127.0.0.1:11434/v1"},
                   "agent": {"reasoning_effort": "none"}, "custom": "preserve"}
            (p / "config.yaml").write_text(json.dumps(cfg))
            writes = []
            parameters = "temperature 1"

            def handler(request):
                nonlocal parameters
                path = request.url.path
                data = json.loads(request.content) if request.content else {}
                if path == "/api/show":
                    return httpx.Response(200, json={"parameters": parameters})
                if path == "/api/tags":
                    return httpx.Response(200, json={"models": [{"name": MODEL, "digest": "a" * 64}]})
                writes.append((path, data))
                if path == "/api/create":
                    self.assertEqual(writes[0][0], "/api/copy")
                    self.assertTrue((p / "private/context-backup.json").exists())
                    self.assertEqual(data["parameters"], {"num_ctx": CONTEXT_LENGTH})
                    parameters += f"\nnum_ctx {CONTEXT_LENGTH}"
                return httpx.Response(200, json={"status": "success"})

            with httpx.Client(base_url="http://127.0.0.1:11434", transport=httpx.MockTransport(handler)) as c:
                configure_context(c, p, p / "private")
                configure_context(c, p, p / "private")
            self.assertEqual(len(writes), 2)
            self.assertEqual(json.loads((p / "config.yaml").read_text()),
                             {**cfg, "model": {**cfg["model"], "context_length": CONTEXT_LENGTH}})

    def test_failed_model_update_does_not_claim_a_larger_hermes_context(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            (p / ".douke-web-owned").write_text(str(ROOT))
            cfg = {"model": {"default": MODEL, "provider": "custom", "base_url": "http://127.0.0.1:11434/v1"}}
            (p / "config.yaml").write_text(json.dumps(cfg))

            def handler(request):
                if request.url.path == "/api/show":
                    return httpx.Response(200, json={"parameters": ""})
                if request.url.path == "/api/tags":
                    return httpx.Response(200, json={"models": [{"name": MODEL, "digest": "b" * 64}]})
                if request.url.path == "/api/create":
                    return httpx.Response(500, json={"error": "fixture failure"})
                return httpx.Response(200)

            with httpx.Client(base_url="http://127.0.0.1:11434", transport=httpx.MockTransport(handler)) as c:
                with self.assertRaises(httpx.HTTPStatusError):
                    configure_context(c, p, p / "private")
            self.assertEqual(json.loads((p / "config.yaml").read_text()), cfg)
