"""Connect curated answers and the complete existing Duoke Obsidian archive."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from scraping.ai_assistance.knowledge import note_files, parse_note
from scraping.ai_assistance.sources import SourceIndex, bundle_signature, load_bundle
from scraping.shared.common import load_env_file, read_json
from scraping.shared.paths import AI_ASSISTANCE_SERVICE_ENV


def configured_source() -> Path | None:
    values = {**load_env_file(), **os.environ}
    value = values.get("DUOKE_HERMES_SOURCE_VAULT") or values.get("GASCOMP_AI_SOURCE_VAULT")
    if not value:
        saved = read_json(AI_ASSISTANCE_SERVICE_ENV, {})
        value = saved.get("GASCOMP_AI_SOURCE_VAULT") if isinstance(saved, dict) else None
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError("The configured source vault must be a path")
    return Path(value).expanduser().absolute()


@dataclass
class KnowledgeBundle:
    snapshot: dict
    citations: dict
    index: SourceIndex | None
    signature: str
    counts: dict
    conversations: list[dict] = field(default_factory=list)


def load_knowledge(vault: Path, source: Path | None = None, *, admin_references=False) -> KnowledgeBundle:
    initial = bundle_signature(vault, source)
    snapshot, corpus = load_bundle(vault, source)
    citations = {parse_note(path.read_text(encoding="utf-8"))["id"]:
                 [{"note": str(path.relative_to(vault))}] for path in note_files(vault)}
    counts = {"curatedNotes": len(citations), "sourceFiles": 0, "indexedDocuments": 0,
              "conversationDocuments": 0, "productDocuments": 0, "excludedSourceFiles": 0,
              "extractedEntries": 0, "combinedEntries": len(snapshot["entries"])}
    index = None
    if corpus:
        report = corpus["report"]
        counts.update({"sourceFiles": report["sourceFiles"],
                       "indexedDocuments": report["includedDocuments"],
                       "conversationDocuments": report["sourceKindCounts"].get("conversation", 0),
                       "productDocuments": report["sourceKindCounts"].get("product", 0),
                       "excludedSourceFiles": report["excludedSourceFiles"],
                       "extractedEntries": len(corpus["entries"])})
        evidence = []
        for item in corpus["candidateEvidence"]:
            flags = set(item.get("flags", []))
            if item["sourceKind"] == "conversation":
                if admin_references:
                    # Owner-designated admin Q&A is a reference source in Desktop.
                    # Preserve substantive privacy/context/volatile-content flags.
                    flags.difference_update({"historical_reply_requires_review",
                                             "outcome_not_verified", "source_review_status_unverified"})
                else:
                    flags.add("historical_reply_requires_review")
            evidence.append({**item, "flags": sorted(flags)})
        index = SourceIndex(corpus["documents"], evidence)
        for document in corpus["documents"]:
            for identifier in document["entryIds"]:
                reference = {"note": document["path"], "vault": "source",
                             "sourceKind": document["sourceKind"]}
                if reference not in citations.setdefault(identifier, []):
                    citations[identifier].append(reference)
    conversations = []
    if admin_references and source:
        from scraping.duoke.reply.conversation_references import load_references
        conversations, reference_counts = load_references(source)
        counts.update(reference_counts)
    if bundle_signature(vault, source) != initial:
        raise ValueError("Knowledge changed during loading")
    return KnowledgeBundle(snapshot, citations, index, initial, counts, conversations)
