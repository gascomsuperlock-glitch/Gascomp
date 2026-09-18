# Obsidian folder context

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `obsidian` and its descendants unless a closer context is listed in the workspace map.

Own product and knowledge notes used by the documented export and retrieval workflows.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Duoke catalog specification](../../product/integrations/duoke-catalog.md)
- [Knowledge and replies specification](../../product/integrations/duoke-support.md)
- [AI assistance specification](../../product/features/ai-assistance.md)
- [Knowledge source setup](../../setup/ai-assistance.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| products/ | Find the producing catalog/export workflow and preserve source identity. | Product notes with working links and attributable source fields. |
| knowledge/ | Distinguish approved content from pending history and check the producing workflow. | Correct review state without unrequested activation. |
| customer-support/ | Read curated-answer conventions and website-assistant retrieval contracts. | Verified customer knowledge with the expected metadata. |
| Vault index | Regenerate or edit only according to its owning exporter. | An index matching the intended notes without broken references. |

## Boundaries

- Keep coding-agent instructions outside this vault so they cannot enter customer knowledge scans.
- Do not include private raw conversations in repository notes or reports.
- Preserve generated filenames and external identifiers; source review precedes publication.

## Outputs and verification

Keep the actual files in their existing stable folder. This context is stored outside the data/asset tree and linked from the workspace map.

For documentation-only changes, validate relative links, inspect the final diff including new files, and run `git diff --check`. If producers, retrieval behavior, or rendering change, run the root checks for that implementation.

Existing work: [knowledge handoff](../../work/handoffs/handoff-knowledge-review-v1.md).

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../work/README.md) and [continuity workflow](../../work/workflow.md).
