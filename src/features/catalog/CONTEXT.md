# Catalog and product help

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `src/features/catalog` and its descendants unless a closer context is listed in the workspace map.

Own product help, search, help-content editors, media handling, publication, and product QR components.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Catalog specification](../../../docs/product/features/catalog.md)
- [Admin specification](../../../docs/product/features/admin.md)
- [QR and stable URLs](../../../docs/product/features/qr.md)
- [Language and compatibility](../../../docs/architecture/language-standard.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Public product help | Trace stored product data through search and product-help components. | Model-specific content with localized empty/error states. |
| Content editors and uploads | Trace staged edits, upload validation, and explicit content Save. | Edits persist through the documented save path without losing drafts. |
| QR or publication | Check stable slugs, production origin, and archive behavior. | Existing printed destinations remain usable. |

## Boundaries

- Preserve source identities and admin-owned fields during import changes.
- Do not fabricate product facts or repair guidance.
- Keep business logic within its owning feature; respect server/client boundaries and the root verification rules.
- Treat dated specification status as evidence to verify, not proof of current behavior.

## Outputs and verification

Use `components/` for feature UI, `model/` for domain types and pure logic, `server/` for protected storage/actions, and existing `hooks/` where applicable. Create subfolders only when real modules need them. Update the owning specification and save unfinished progress.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../../docs/work/README.md) and [continuity workflow](../../../docs/work/workflow.md).
