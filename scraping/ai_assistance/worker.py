"""Website queue worker. Remote writes occur only in --once or --watch modes."""

from __future__ import annotations

import argparse
import json
import signal
import threading
from datetime import datetime, timezone
from pathlib import Path

from scraping.ai_assistance.config import Config
from scraping.ai_assistance.knowledge import build_snapshot, resolve_product_context, retrieve
from scraping.ai_assistance.sources import SourceIndex, bundle_signature, load_bundle
from scraping.ai_assistance.selector import HermesSelector
from scraping.ai_assistance.transport import Transport


class Worker:
    def __init__(self, vault: Path, transport, selector, source_vault: Path | None = None,
                 responder=None):
        self.vault = vault
        self.transport = transport
        self.selector = selector
        self.source_vault = source_vault
        self.responder = responder
        self.source_index: SourceIndex | None = None
        self.snapshot: dict | None = None
        self.signature: str | None = None
        self.lock = threading.Lock()
        self.stop = threading.Event()

    def sync_knowledge(self) -> None:
        try:
            signature = bundle_signature(self.vault, self.source_vault)
        except (OSError, ValueError):
            signature = "invalid"
        with self.lock:
            if signature == self.signature:
                return
            self.snapshot = None
            self.source_index = None
        # A changed or removed source is invalidated remotely before any replacement.
        self.transport.post("knowledge", {"ready": False})
        try:
            snapshot, corpus = load_bundle(self.vault, self.source_vault)
            index = SourceIndex(corpus["documents"], corpus.get("candidateEvidence")) if corpus else None
            if signature != bundle_signature(self.vault, self.source_vault):
                raise ValueError("Knowledge changed before publication")
        except (OSError, ValueError):
            with self.lock:
                self.signature = signature
            return
        self.transport.post("knowledge", {"ready": True, "snapshot": snapshot})
        with self.lock:
            self.snapshot = snapshot
            self.signature = signature
            self.source_index = index

    def heartbeat(self) -> None:
        with self.lock:
            snapshot = self.snapshot
        self.transport.post("heartbeat", {
            "ready": snapshot is not None and self.transport.model_ready(),
            "knowledgeVersion": snapshot["version"] if snapshot else None,
        })

    def process_one(self) -> bool:
        job = self.transport.post("claim", {}).get("job")
        if not job:
            return False
        selected = None
        generated = None
        resolved_sku = None
        with self.lock:
            snapshot = self.snapshot
            signature = self.signature
            source_index = self.source_index
        try:
            expires = datetime.fromisoformat(job["expiresAt"].replace("Z", "+00:00"))
            remaining = (expires - datetime.now(timezone.utc)).total_seconds() - 3
            if snapshot and snapshot["version"] == job["knowledgeVersion"] and remaining > 0:
                if self.responder is not None:
                    result = self.responder(job, snapshot, source_index, min(remaining, 38))
                    generated, resolved_sku = result.response, result.resolved_sku
                else:
                    candidates = retrieve(snapshot, job["text"], job["language"], job.get("sku"))
                    resolved_sku = resolve_product_context(snapshot, job["text"], job.get("sku"))
                    if source_index:
                        candidates = source_index.guide(snapshot, job["text"], job["language"], candidates, job.get("sku"))
                    if candidates:
                        selected = self.selector(job["text"], candidates, min(remaining, 40))
                        if selected not in {entry["id"] for entry in candidates}:
                            selected = None
            # Re-read disk even if the watcher has not reached its next tick.
            if bundle_signature(self.vault, self.source_vault) != signature:
                selected = None
                generated = None
            with self.lock:
                if not self.snapshot or self.signature != signature or self.snapshot["version"] != job["knowledgeVersion"]:
                    selected = None
                    generated = None
        except (OSError, ValueError, KeyError, TypeError):
            selected = None
            generated = None
        completion = {"jobId": job["id"], "leaseToken": job["leaseToken"],
                      "knowledgeVersion": job["knowledgeVersion"],
                      **({"resolvedSku": resolved_sku} if resolved_sku else {})}
        if self.responder is None:
            completion["answerId"] = selected
        else:
            if generated is None:
                from scraping.ai_assistance.responder import safe_fallback

                language = job.get("language") if job.get("language") in ("id", "en") else "id"
                generated = safe_fallback(language, handoff=True)
            completion["response"] = generated
        self.transport.post("complete", completion)
        return True

    def background(self, action, interval: float) -> None:
        while not self.stop.is_set():
            try:
                action()
            except (OSError, ValueError):
                # No raw server/provider exception or message content enters the logs.
                print("Worker connection unavailable", flush=True)
            self.stop.wait(interval)

    def watch(self) -> None:
        threads = [threading.Thread(target=self.background, args=(self.sync_knowledge, 1), daemon=True),
                   threading.Thread(target=self.background, args=(self.heartbeat, 10), daemon=True)]
        for thread in threads:
            thread.start()
        try:
            self.background(self.process_one, 1)
        finally:
            self.stop.set()
            for thread in threads:
                thread.join(timeout=10)
            try:
                self.transport.post("heartbeat", {"ready": False, "knowledgeVersion": None})
            except (OSError, ValueError):
                pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="Validate local configuration and knowledge without network access")
    mode.add_argument("--once", action="store_true", help="Publish knowledge and process at most one remote job")
    mode.add_argument("--watch", action="store_true", help="Watch knowledge and process remote jobs continuously")
    mode.add_argument("--probe-links", action="store_true", help="Inspect approved Gascomp links using local Chrome CDP")
    args = parser.parse_args(argv)
    try:
        config = Config.from_env()
        if args.check:
            snapshot, corpus = load_bundle(config.vault, config.source_vault)
            print(json.dumps({"ready": True, "knowledgeVersion": snapshot["version"], "entries": len(snapshot["entries"]),
                              "indexedDocuments": len(corpus["documents"]) if corpus else 0}))
            return 0
        if args.probe_links:
            from scraping.ai_assistance.browser import probe_links

            results = probe_links(build_snapshot(config.vault), config)
            print(json.dumps({"links": results}))
            return 0 if all(result["ok"] for result in results) else 1
        responder = None
        if config.response_mode == "grounded":
            from scraping.ai_assistance.hermes_response import HermesResponseGenerator
            from scraping.ai_assistance.responder import GroundedResponder

            responder = GroundedResponder(HermesResponseGenerator(config))
        worker = Worker(config.vault, Transport(config), HermesSelector(config), config.source_vault,
                        responder=responder)
        if args.once:
            worker.sync_knowledge()
            worker.heartbeat()
            worker.process_one()
        else:
            for signum in (signal.SIGINT, signal.SIGTERM):
                signal.signal(signum, lambda *_: worker.stop.set())
            worker.watch()
        return 0
    except (OSError, ValueError):
        print("Worker is not ready. Verify configuration, approved knowledge, and service connectivity.", flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
