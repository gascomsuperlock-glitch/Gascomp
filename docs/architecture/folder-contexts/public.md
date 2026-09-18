# Public folder context

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `public` and its descendants unless a closer context is listed in the workspace map.

Own files served directly under public URLs, including fonts, licenses, and brand assets.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Brand specification](../../product/design/brand.md)
- [QR and stable URLs](../../product/features/qr.md)
- [Placement and dependencies](../project-structure.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Brand assets | Locate consumers and the approved brand reference before replacement. | Correct assets with stable referenced URLs. |
| fonts/ | Check font consumers and retain supplied license files. | Working fonts and preserved licensing. |
| Asset cleanup | Trace all consumers and documented URL contracts before removal or renaming. | No broken application or externally shared asset links. |

## Boundaries

- Do not place internal CONTEXT.md or task notes inside publicly served asset folders.
- Do not rename externally referenced assets merely to apply workflow status naming.

## Outputs and verification

Keep the actual files in their existing stable folder. This context is stored outside the data/asset tree and linked from the workspace map.

For documentation-only changes, validate relative links, inspect the final diff including new files, and run `git diff --check`. If producers, retrieval behavior, or rendering change, run the root checks for that implementation.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../work/README.md) and [continuity workflow](../../work/workflow.md).
