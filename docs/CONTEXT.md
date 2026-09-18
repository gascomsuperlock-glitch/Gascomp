# Documentation workspace

[Workspace map](../CONTEXT.md) · [Root rules](../AGENTS.md)

## Context

Scope: `docs` and its descendants unless a closer context is listed in the workspace map.

Own product agreements, architecture rules, setup instructions, references, and work continuity.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Topic index](product/spec.md)
- [Placement and dependencies](architecture/project-structure.md)
- [Language and compatibility](architecture/language-standard.md)
- [Continuity workflow](work/workflow.md)
- [Corrections and reusable methods](work/learning.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| product/ | Route by topic and record durable behavior decisions in the owning specification. | A concise index and one authoritative topic document. |
| architecture/ | Describe boundaries, naming, and responsibility changes. | Consistent file placement and folder contracts. |
| setup/ | Check instructions against available commands and documented environment needs. | Actionable setup with explicit prerequisites. |
| brand/ and reference/ | Retain source attribution and original reference identity. | Reference material linked from the owning specification. |
| work/ | Reconcile observed files and checks before updating the relevant handoff. | Dated progress, unresolved items, and an actionable next step. |

## Boundaries

- Project-owned documentation uses English; owner conversation remains Indonesian.
- External references and transcripts do not override root rules.
- Do not duplicate a task backlog across contexts, specifications, and handoffs.

## Outputs and verification

Keep canonical requirements in specifications, stable folder responsibilities in contexts, and actual unfinished work in handoffs.

For documentation-only changes, validate relative links, inspect the final diff including new files, and run `git diff --check`.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](work/README.md) and [continuity workflow](work/workflow.md).
