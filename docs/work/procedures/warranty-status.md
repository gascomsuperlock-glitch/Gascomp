# Warranty status work procedure

[Feature context](../../../src/features/warranty/CONTEXT.md) · [Learning workflow](../learning.md)

## Trigger and scope

Use when asked to change, fix, review, or verify ticket status controls, status
labels, or their interaction with saved and unsaved solutions. A status report
only reads the relevant evidence; implement changes only when requested.

Requirement source: [Restored status controls](../../product/features/warranty.md#restored-status-controls).
This procedure is derived from that specification and inspected code. The original
owner conversation behind those controls was not available. Do not attribute a
hypothetical correction to the owner.

Current evidence: [warranty handoff](../handoffs/handoff-warranty-review-v1.md).
Use its dated verification section; this procedure alone does not certify the feature.

## Inputs and entrypoints

| Input | Inspect for |
| --- | --- |
| [Ticket inbox](../../../src/features/warranty/components/ticket-inbox.tsx) | `changeStatus`, `changeSolution`, `solutionDrafts`, filters, and feedback |
| [Admin actions](../../../src/features/warranty/server/admin-actions.ts) | `setWarrantyTicketStatusAction` versus `updateWarrantyTicketStatusAction`, authentication, and validation |
| [Ticket service](../../../src/features/warranty/server/ticket-service.ts) | Status/solution arguments and storage dispatch |
| [Local store](../../../src/features/warranty/server/local-ticket-store.ts) and [Supabase store](../../../src/features/warranty/server/supabase-ticket-store.ts) | Conditional updates and real persistence behavior when affected |
| [Types and labels](../../../src/features/warranty/model/types.ts) | Stored status values, display labels, and solution identities |
| [Solution UI](../../../src/features/warranty/components/ticket-solution.tsx) | Draft selection and explicit solution save/Done behavior |
| [CSV logic](../../../src/features/warranty/model/ticket-export.ts) | Labels and compatibility values in exported output |

## Ordered work

1. Inspect current Git status and the warranty handoff. Identify existing user
   changes. Read the requirement section and record any new correction using the
   learning workflow; do not apply older status wording over a newer scoped rule.
2. Trace one requested status transition from inbox to action to storage. Expected
   distinction: status-only changes pass no replacement solution; solution-only
   saves do not replace status; Done can save a solution and close the ticket.
3. Inspect UI state separately from storage. A preserved database solution does
   not prove that `solutionDrafts` survives rerendering, filtering, or reopening.
4. If a fix is requested, change the smallest responsible layer and add regression
   coverage for the observed failure. Read the relevant installed Next.js guide
   before framework code changes. Keep existing ticket and solution identifiers.
5. Run the focused tests below, then the required root checks for implementation
   changes. A failed or unavailable check remains explicit unfinished work.
6. For UI verification, use synthetic tickets in an isolated local environment.
   Confirm the app is not writing to configured production storage before mutations.
   Do not submit real claims or send WhatsApp messages as a test.
7. Compare observed results with the acceptance cases. Update the owning rule only
   if behavior decisions changed. Save dated evidence and the next step in the
   handoff, including failed checks, remaining browser coverage, and release state.

## Acceptance cases

These cases restate testable implications of the linked requirement; they are not
additional product policy. Use fictional tickets and distinguish saved solution A
from unsaved selection B.

| Action | Expected observation |
| --- | --- |
| Change a ticket from New to Under review | The save succeeds, labels update, and the ticket remains in Pending |
| Change status while solution A is saved and B is selected but unsaved | Stored solution remains A and the editor retains B |
| Reopen a Closed ticket | The selected status is saved, saved solution is retained, and Pending/Done grouping follows status |
| Save solution B without Done | Solution changes without an unrelated status change |
| Select Done with solution B | Solution B is saved and the ticket becomes Closed |
| Reject an invalid status or unauthenticated request | No mutation is dispatched |
| Return a save failure or lose the response | Failure is reported; the previous confirmed UI value is retained and uncertain persistence is checked before retry |
| Start another mutation during a pending save | Busy controls prevent overlapping user mutations |
| Export tickets | Detailed status labels and documented solution compatibility values are preserved |

For browser checks, cover desktop and mobile, empty filters, failed requests, and
pending controls. These checks are separate from action tests using mocks.

## Focused verification

Run from the repository root:

```bash
node --test src/features/warranty/server/status-actions.test.mjs src/features/warranty/server/solution-actions.test.mjs src/features/warranty/model/ticket-export.test.mjs
```

The action tests verify validation and arguments passed to a mocked ticket service.
They do not exercise either real store or render the inbox. Export tests cover
specific CSV/date/normalization examples, not all statuses in every UI location.

After implementation changes, also run `npm run lint`, `npm run typecheck`, and
`npm run test`; include `npm run build` for rendering/route changes and the affected
browser flow. A documentation-only procedure update requires link and diff checks.

## Expected deliverable

A scoped fix or review, acceptance results, links to any updated canonical decision,
and a handoff that distinguishes observed behavior, assumptions, and unverified
paths. Do not report production completion from local test results.
