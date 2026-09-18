# Shared infrastructure

[Workspace map](../../CONTEXT.md) · [Root rules](../../AGENTS.md)

## Context

Scope: `src/shared` and its descendants unless a closer context is listed in the workspace map.

Own reusable UI, language infrastructure, general helpers, and the server-only Supabase client.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Placement and dependencies](../../docs/architecture/project-structure.md)
- [Language and compatibility](../../docs/architecture/language-standard.md)
- [Brand specification](../../docs/product/design/brand.md)
- [Database and migration specification](../../docs/product/integrations/supabase.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| components/ | Check consuming features and accessibility before changing reusable UI. | Reusable components without feature imports. |
| lib/ | Identify all call sites and maintain documented helper contracts. | General utilities with appropriate regression coverage. |
| integrations/supabase/ | Trace server consumers and environment handling. | Server-only client infrastructure without exposed secrets. |

## Boundaries

- Do not import features or routes into shared modules.
- Keep client and server modules directly imported rather than mixing them in a barrel.

## Outputs and verification

Update the shared module and any necessary consumer adjustments; keep domain policy in features.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../docs/work/README.md) and [continuity workflow](../../docs/work/workflow.md).
