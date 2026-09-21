# Application routes

[Workspace map](../../CONTEXT.md) · [Root rules](../../AGENTS.md)

## Context

Scope: `src/app` and its descendants unless a closer context is listed in the workspace map.

Own URL contracts, page/layout composition, route handlers, metadata, and route-level loading/error states.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Placement and dependencies](../../docs/architecture/project-structure.md)
- [QR and stable URLs](../../docs/product/features/qr.md)
- [Language and compatibility](../../docs/architecture/language-standard.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Page or navigation changes | Locate the route and read the context of the feature it composes. Keep rendering composition here. | A route using the owning feature and preserving documented URLs. |
| API or form endpoints | Trace the request into its feature handler and retain origin/session checks. | A thin route contract with feature-owned validation and persistence. |
| Metadata or route states | Check the installed Next.js guide for the relevant file convention. | Correct metadata and localized loading/error behavior. |

## Boundaries

- Read the relevant guide under `node_modules/next/dist/docs/` before framework changes.
- Preserve printed QR destinations and documented route segments.
- Place reusable business behavior in features, not route folders.

## Outputs and verification

Keep route files here and implementation changes in the selected feature; update the owning specification when behavior changes.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../docs/work/README.md) and [continuity workflow](../../docs/work/workflow.md).
