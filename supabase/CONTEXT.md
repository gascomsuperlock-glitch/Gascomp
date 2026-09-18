# Database migration workspace

[Workspace map](../CONTEXT.md) · [Root rules](../AGENTS.md)

## Context

Scope: `supabase` and its descendants unless a closer context is listed in the workspace map.

Own ordered migration files and the pinned release baseline.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Database and migration specification](../docs/product/integrations/supabase.md)
- [Database setup](../docs/setup/supabase.md)
- [Release script context](../scripts/CONTEXT.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| migrations/ | Read the affected feature specification and release baseline; add an ordered migration for a new schema change. | Reviewable SQL preserving historical identities and access policy. |
| release-baseline.json | Reconcile against the documented release protocol and actual evidence. | A baseline change only when the requested release task requires it. |

## Boundaries

- Do not rename or rewrite frozen/applied migrations for naming consistency.
- Do not infer that a local SQL file has been applied remotely.
- Production application requires authorization and the documented history reconciliation.

## Outputs and verification

New schema changes use ordered SQL files and meaningful local schema tests where appropriate. Coordinate consumers in their owning feature.

Run applicable local schema tests and root checks for changed consumers. Do not use a live migration as a test. Documentation-only edits use link and diff checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../docs/work/README.md) and [continuity workflow](../docs/work/workflow.md).
