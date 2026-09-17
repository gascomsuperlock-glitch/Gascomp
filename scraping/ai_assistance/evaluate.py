"""Check source retrieval coverage without publishing notes or contacting a model."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from scraping.ai_assistance.knowledge import build_snapshot, retrieve
from scraping.shared.paths import AI_ASSISTANCE_VAULT


def evaluate_snapshot(snapshot: dict) -> dict:
    """Exercise every authored alias using only context present in the question.

    Equivalent source bodies are acceptable; a different or absent answer is a
    coverage failure. The report intentionally contains IDs, not customer text.
    This checks candidate retrieval, not a real model's selection accuracy.
    """
    checks = 0
    failures = []
    kinds = Counter()
    languages = Counter()
    for entry in snapshot["entries"]:
        kinds[entry["kind"]] += 1
        languages[entry["language"]] += 1
        if entry["kind"] == "handoff":
            continue
        for index, question in enumerate(entry["questions"]):
            checks += 1
            candidates = retrieve(snapshot, question, entry["language"])
            if not any(candidate["answer"] == entry["answer"] for candidate in candidates):
                failures.append({"id": entry["id"], "aliasIndex": index,
                                 "candidateIds": [candidate["id"] for candidate in candidates]})
    return {"mode": "offline-alias-retrieval", "knowledgeVersion": snapshot["version"],
            "entries": len(snapshot["entries"]), "kinds": dict(sorted(kinds.items())),
            "languages": dict(sorted(languages.items())), "aliasChecks": checks,
            "failures": failures, "passed": not failures,
            "modelEvaluated": False, "publicationPerformed": False}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault", type=Path, default=AI_ASSISTANCE_VAULT)
    args = parser.parse_args(argv)
    try:
        report = evaluate_snapshot(build_snapshot(args.vault))
    except (OSError, ValueError):
        print(json.dumps({"passed": False, "error": "Knowledge validation failed",
                          "publicationPerformed": False}))
        return 1
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
