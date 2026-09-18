# Data folder context

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `data` and its descendants unless a closer context is listed in the workspace map.

Own normalized catalog records, runtime knowledge, and synchronization reports.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Placement and dependencies](../project-structure.md)
- [Duoke catalog specification](../../product/integrations/duoke-catalog.md)
- [Knowledge and replies specification](../../product/integrations/duoke-support.md)
- [Warehouse import specification](../../product/integrations/warehouse.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| catalog/ | Identify the normalizer/importer and inspect stable source identities. | Validated normalized records with explicit provenance. |
| knowledge/ | Trace the exporter/review pipeline and approval metadata. | Knowledge consistent with the intended published/reviewed source. |
| reports/ | Generate through the owning workflow and distinguish preview from applied results. | Dated, non-sensitive reports with actual outcomes. |

## Boundaries

- Do not rename generated files independently of their producers and consumers.
- Do not treat a generated record as a manual instruction or proof of approval.

## Outputs and verification

Keep the actual files in their existing stable folder. This context is stored outside the data/asset tree and linked from the workspace map.

For documentation-only changes, validate relative links, inspect the final diff including new files, and run `git diff --check`. If producers, retrieval behavior, or rendering change, run the root checks for that implementation.

Existing work: [knowledge handoff](../../work/handoffs/handoff-knowledge-review-v1.md).

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../work/README.md) and [continuity workflow](../../work/workflow.md).
