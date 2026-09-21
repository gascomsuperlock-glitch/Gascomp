"""Profile refresh must not reset runtime configuration or activate delivery."""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scraping.duoke.reply import desktop_setup as setup
from scraping.duoke.reply.desktop_prompts import PROMPT, SOUL


class InstructionRefreshTests(unittest.TestCase):
    def test_refresh_preserves_configuration_gate_and_paused_schedule(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile = root / ".hermes/profiles/duoke-support"
            (profile / "cron").mkdir(parents=True)
            (profile / ".douke-web-owned").write_text(str(setup.ROOT))
            (profile / "SOUL.md").write_text("old instructions")
            (profile / "config.yaml").write_text("owner settings")
            runtime = root / "runtime"
            runtime.mkdir()
            (runtime / "DELIVERY_ENABLED").write_text("owner gate")
            job = {"id": "fixture", "name": "Duoke automatic replies", "enabled": False,
                   "schedule": "every 1m", "model": "qwen3.5:4b", "prompt": "old instructions"}
            jobs = profile / "cron/jobs.json"
            jobs.write_text(json.dumps({"jobs": [job]}))

            def update(args, **kwargs):
                self.assertEqual(args[3:6], ["cron", "edit", "fixture"])
                saved = json.loads(jobs.read_text())
                saved["jobs"][0]["prompt"] = args[-1]
                jobs.write_text(json.dumps(saved))

            with (patch.object(setup.Path, "home", return_value=root),
                  patch.object(setup, "DUOKE_DESKTOP_DIR", runtime),
                  patch.object(setup.shutil, "which", return_value="hermes"),
                  patch.object(setup.subprocess, "run", side_effect=update) as run):
                setup.refresh_instructions()
                setup.refresh_instructions()
                self.assertEqual(run.call_count, 1)
            self.assertEqual((profile / "config.yaml").read_text(), "owner settings")
            self.assertEqual((runtime / "DELIVERY_ENABLED").read_text(), "owner gate")
            self.assertEqual((profile / "SOUL.md").read_text(), SOUL)
            self.assertEqual(json.loads(jobs.read_text())["jobs"], [{**job, "prompt": PROMPT}])
            self.assertEqual((runtime / "instruction-backup/SOUL.md").read_text(), "old instructions")

    def test_refresh_moves_only_generated_repository_cwd_outside_project(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile = root / ".hermes/profiles/duoke-support"
            profile.mkdir(parents=True)
            (profile / ".douke-web-owned").write_text(str(setup.ROOT))
            runtime = root / "repository/runtime"
            config = {"terminal": {"cwd": str(runtime)}, "model": {"default": "qwen3.5:4b"},
                      "custom_setting": "keep"}
            path = profile / "config.yaml"
            path.write_text(json.dumps(config))
            with (patch.object(setup.Path, "home", return_value=root),
                  patch.object(setup, "DUOKE_DESKTOP_DIR", runtime),
                  patch.object(setup.shutil, "which", return_value="hermes")):
                setup.refresh_instructions()
                migrated = json.loads(path.read_text())
                self.assertEqual(migrated, {**config, "terminal": {"cwd": str(profile / "workspace")}})
                migrated["terminal"]["cwd"] = str(root / "custom-workspace")
                path.write_text(json.dumps(migrated))
                setup.refresh_instructions()
                self.assertEqual(json.loads(path.read_text()), migrated)

    def test_refresh_exposes_concrete_mcp_tools_without_changing_model_or_filters(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile = root / ".hermes/profiles/duoke-support"
            profile.mkdir(parents=True)
            (profile / ".douke-web-owned").write_text(str(setup.ROOT))
            config = setup.profile_config()
            config.pop("tools")
            config["mcp_servers"]["duoke"]["tools"] = {"include": ["duoke_search"]}
            config["custom_setting"] = "keep"
            path = profile / "config.yaml"
            path.write_text(json.dumps(config))
            with (patch.object(setup.Path, "home", return_value=root),
                  patch.object(setup, "DUOKE_DESKTOP_DIR", root / "runtime"),
                  patch.object(setup.shutil, "which", return_value="hermes")):
                setup.refresh_instructions()
                setup.refresh_instructions()
            updated = json.loads(path.read_text())
            self.assertEqual(updated["tools"]["tool_search"]["enabled"], "off")
            self.assertEqual(updated["mcp_servers"]["duoke"]["tools"],
                             {"include": ["duoke_search"], "resources": False, "prompts": False})
            self.assertEqual(updated["model"], config["model"])
            self.assertEqual(updated["custom_setting"], "keep")
            self.assertEqual(json.loads((root / "runtime/instruction-backup/config-before-direct-tools.yaml").read_text()), config)

    def test_failed_login_check_explains_authentication_without_enabling(self):
        import io
        from contextlib import redirect_stdout
        from unittest.mock import AsyncMock
        from scraping.duoke.reply.desktop_browser import DeliveryAdapterError
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / "DELIVERY_ENABLED"
            output = io.StringIO()
            with (patch("sys.argv", ["desktop_setup", "enable", "--send"]),
                  patch.object(setup, "check", AsyncMock(side_effect=DeliveryAdapterError("authentication_required"))),
                  patch.object(setup, "STOP_FILE", Path(directory) / "STOP"),
                  patch.object(setup, "DUOKE_DESKTOP_ENABLED", marker), redirect_stdout(output)):
                self.assertEqual(setup.main(), 2)
            self.assertFalse(marker.exists())
            self.assertIn("authentication_required", output.getvalue())
            self.assertIn("Quit Hermes Desktop", output.getvalue())
            self.assertNotIn("Check Ollama", output.getvalue())
