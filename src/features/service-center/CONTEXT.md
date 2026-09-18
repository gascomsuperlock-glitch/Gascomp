# Service center directory

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `src/features/service-center` and its descendants unless a closer context is listed in the workspace map.

Own active public locations, filtering, maps, and protected location administration.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Support and service center specification](../../../docs/product/features/support.md)
- [Database and migration specification](../../../docs/product/integrations/supabase.md)
- [Language and compatibility](../../../docs/architecture/language-standard.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Public directory or map | Trace active-only data, search/province filters, and map synchronization. | Directory and contact actions remain usable when tiles fail. |
| Location administration | Check validation, Save location, deletion, and draft preservation. | Selected location changes persist independently from catalog Save. |
| Maps import | Validate external destinations and handle stale asynchronous responses. | Only validated location values reach the editor. |

## Boundaries

- Do not seed invented service center locations.
- A failed configured database must not be shown as an empty successful result.
- Keep business logic within its owning feature; respect server/client boundaries and the root verification rules.
- Treat dated specification status as evidence to verify, not proof of current behavior.

## Outputs and verification

Use `components/` for feature UI, `model/` for domain types and pure logic, `server/` for protected storage/actions, and existing `hooks/` where applicable. Create subfolders only when real modules need them. Update the owning specification and save unfinished progress.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../../docs/work/README.md) and [continuity workflow](../../../docs/work/workflow.md).
