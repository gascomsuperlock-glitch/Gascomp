# Customer AI assistance

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `src/features/ai-assistance` and its descendants unless a closer context is listed in the workspace map.

Own the public chat panel, admin runtime controls, API handlers, sessions, and worker-facing database contracts.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [AI assistance specification](../../../docs/product/features/ai-assistance.md)
- [Database and migration specification](../../../docs/product/integrations/supabase.md)
- [Worker setup](../../../docs/setup/ai-assistance.md)
- [Language and compatibility](../../../docs/architecture/language-standard.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Customer conversation | Trace client session state, requests, and response ownership. | Localized states and new conversations without stale replies. |
| Worker/API contract | Coordinate schema and protocol changes with the Python worker. | Compatible requests, job lifecycle, and failure handling. |
| Answer behavior | Read the grounded-answer policy and applicable knowledge source contracts. | Product facts remain grounded and handoff actions follow policy. |

## Boundaries

- Keep customer conversation data private and respect session/origin validation.
- This module is separate from the Duoke automatic reply runner.
- Customer chat cannot approve knowledge or claim operational actions occurred.
- Keep business logic within its owning feature; respect server/client boundaries and the root verification rules.
- Treat dated specification status as evidence to verify, not proof of current behavior.

## Outputs and verification

Use `components/` for feature UI, `model/` for domain types and pure logic, `server/` for protected storage/actions, and existing `hooks/` where applicable. Create subfolders only when real modules need them. Update the owning specification and save unfinished progress.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../../docs/work/README.md) and [continuity workflow](../../../docs/work/workflow.md).
