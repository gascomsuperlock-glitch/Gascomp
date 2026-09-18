# Warranty claims and tickets

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

## Context

Scope: `src/features/warranty` and its descendants unless a closer context is listed in the workspace map.

Own claim eligibility, submission, private evidence, ticket status, resolutions, and exports.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Warranty specification](../../../docs/product/features/warranty.md)
- [Admin specification](../../../docs/product/features/admin.md)
- [Database and migration specification](../../../docs/product/integrations/supabase.md)
- [Language and compatibility](../../../docs/architecture/language-standard.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| Claim submission or evidence | Trace input validation, transport, decoding, and storage confirmation. | A claim is confirmed only after required storage succeeds. |
| Ticket status or solutions | Check inbox state, authenticated actions, and status/solution persistence together. | Changes follow the owning specification and preserve unrelated saved/draft values. |
| Export or private downloads | Check filters, labels, authorization, and evidence access. | Correct exports and protected evidence access. |

For status and solution work, follow the [concrete procedure](../../../docs/work/procedures/warranty-status.md) and check its linked evidence before reuse.

## Boundaries

- Preserve ticket identifiers, compatibility labels, and private storage boundaries.
- Do not infer the current status-label requirement from older dated paragraphs; reconcile the relevant specification section and current request.
- Ordinary warranty work does not automatically allocate GascompCare usage.
- Keep business logic within its owning feature; respect server/client boundaries and the root verification rules.
- Treat dated specification status as evidence to verify, not proof of current behavior.

## Outputs and verification

Use `components/` for feature UI, `model/` for domain types and pure logic, `server/` for protected storage/actions, and existing `hooks/` where applicable. Create subfolders only when real modules need them. Update the owning specification and save unfinished progress.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

Existing work: [status-control handoff](../../../docs/work/handoffs/handoff-warranty-review-v1.md). Verify its dated observations before continuing.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../../../docs/work/README.md) and [continuity workflow](../../../docs/work/workflow.md).
