# GascompCare membership

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `src/features/gascomp-care` and its descendants unless a closer context is listed in the workspace map.

Own member accounts, member sessions, virtual cards, purchases, and manually recorded coverage usage.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [GascompCare specification](../../../docs/product/features/gascomp-care.md)
- [Database and migration specification](../../../docs/product/integrations/supabase.md)
- [Language and compatibility](../../../docs/architecture/language-standard.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Member access | Trace member session, password changes, and server page data. | Members see only their own permitted data. |
| Coverage calculations | Check purchase date, item identity, calendar boundaries, expiry, and claim balance. | Coverage follows the specification with edge-case regression coverage. |
| Administrator account or purchase work | Check authentication, request validation, and immediate persistence. | Verified changes affect only the selected member or purchase. |

## Boundaries

- Do not expose internal usage history or private credentials to customer pages.
- Keep included warranty and paid Care coverage separate; deferred integrations require an explicit product decision.
- Keep business logic within its owning feature; respect server/client boundaries and the root verification rules.
- Treat dated specification status as evidence to verify, not proof of current behavior.

## Outputs and verification

Use `components/` for feature UI, `model/` for domain types and pure logic, `server/` for protected storage/actions, and existing `hooks/` where applicable. Create subfolders only when real modules need them. Update the owning specification and save unfinished progress.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../../docs/work/README.md) and [continuity workflow](../../../docs/work/workflow.md).
