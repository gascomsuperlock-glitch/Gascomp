# Admin workspace composition

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `src/features/admin` and its descendants unless a closer context is listed in the workspace map.

Own dashboard composition, navigation, and cross-feature summaries.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Admin specification](../../../docs/product/features/admin.md)
- [Placement and dependencies](../../../docs/architecture/project-structure.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Dashboard or navigation | Identify the owning feature for each workspace and preserve its local state. | Consistent navigation and summaries. |
| Cross-feature view | Compose feature components rather than moving their business logic here. | A workspace with clear feature ownership and correct save behavior. |

## Boundaries

- Keep catalog staged Save separate from immediate warranty, Care, and service center mutations.
- Other features must not import admin; admin may compose them.
- Keep business logic within its owning feature; respect server/client boundaries and the root verification rules.
- Treat dated specification status as evidence to verify, not proof of current behavior.

## Outputs and verification

Use `components/` for feature UI, `model/` for domain types and pure logic, `server/` for protected storage/actions, and existing `hooks/` where applicable. Create subfolders only when real modules need them. Update the owning specification and save unfinished progress.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../../docs/work/README.md) and [continuity workflow](../../../docs/work/workflow.md).
