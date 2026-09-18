# Admin authentication

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `src/features/auth` and its descendants unless a closer context is listed in the workspace map.

Own administrator login, session verification, and logout. Member authentication belongs to GascompCare.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Admin specification](../../../docs/product/features/admin.md)
- [Placement and dependencies](../../../docs/architecture/project-structure.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Login or logout | Trace form submission through server actions and session helpers. | Correct redirects and session lifecycle. |
| Protected operations | Check both the entrypoint and the owning server mutation. | Unauthorized requests remain rejected. |

## Boundaries

- Keep credentials and cookie signing on the server.
- Do not merge administrator and member session contracts.
- Keep business logic within its owning feature; respect server/client boundaries and the root verification rules.
- Treat dated specification status as evidence to verify, not proof of current behavior.

## Outputs and verification

Use `components/` for feature UI, `model/` for domain types and pure logic, `server/` for protected storage/actions, and existing `hooks/` where applicable. Create subfolders only when real modules need them. Update the owning specification and save unfinished progress.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../../docs/work/README.md) and [continuity workflow](../../../docs/work/workflow.md).
