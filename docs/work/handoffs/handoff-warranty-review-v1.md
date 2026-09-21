# Warranty handoff

Updated: 2026-09-18
Status: Awaiting verification

## Objective

Preserve and make resumable the pre-existing ticket status changes. The observed
implementation restores explicit status controls; the original implementation
request and prior verification results were not available in this organization task.

## Current evidence

The existing working-tree diff adds an immediate-save status selector to the ticket
inbox, an authenticated status Server Action, and detailed labels for ticket statuses.
The warranty specification already documents the intended behavior under "Restored
status controls". The export test is modified and `status-actions.test.mjs` is
untracked. These changes predate the documentation organization task and were left intact.

## Remaining work and decisions

Review implementation against the owning specification, including preservation of
saved solutions and unsaved selections, failed saves, and pending/done grouping.
The current completion, commit, and deployment state must be checked when resumed;
an uncommitted diff is not evidence of a deployment.

## Decisions and corrections

The current documentation request adds a reusable verification procedure, not new
warranty behavior. The product requirement remains "Restored status controls" in
the owning specification. Its original owner conversation is unavailable; no
historical correction or rationale was inferred from the implementation.

## Verification

Evidence level: Partially verified.

On 2026-09-18, Node v26.8.1 ran the following against the local working tree:

```bash
node --test src/features/warranty/server/status-actions.test.mjs src/features/warranty/server/solution-actions.test.mjs src/features/warranty/model/ticket-export.test.mjs
```

Result: 6 tests passed, 0 failed. Node emitted the existing module-type warning;
the command exited successfully. Action tests use mocked sessions, cache
revalidation, and ticket persistence. They verify rejected unauthorized/invalid
requests, the status/solution arguments dispatched, and action failure reporting.
Export tests verify their specific date, CSV, and normalization cases. These
results do not prove real database preservation, unsaved UI draft preservation,
all status labels, or desktop/mobile behavior.

Repository HEAD: `2eb4550ef570ad0006e92c4daf90e5172940223b`; tested files included uncommitted changes.
The content hashes below identify the inspected test inputs independently of HEAD.

| File | SHA-256 at verification |
| --- | --- |
| `src/features/warranty/server/status-actions.test.mjs` | `f078d0a96b884755474809eb3e67fd9edd499e243093a0b7679c8e0994554688` |
| `src/features/warranty/server/solution-actions.test.mjs` | `af60b12993bcc405ba3559b76ea4a0f3936f2532b468623bd376b81167a45001` |
| `src/features/warranty/model/ticket-export.test.mjs` | `b0563f6b1c2428fbfeb0a172b21495edcee43852fda4e4ab0f4de2aa15768c66` |
| `src/features/warranty/server/admin-actions.ts` | `6ac90bb6a5022aa8243a885d3ed8444ca7313dd63a360bd7345f64dfd52e5b20` |
| `src/features/warranty/model/types.ts` | `264535d297a8496d9c2e7c6f40af2884ce0db73386bd97d3dc7a1cc7dca1f738` |
| `src/features/warranty/model/ticket-export.ts` | `580b2a52bf28a00a1aeb77330a4f92480249774cbf5addbab364680c9d69f179` |
| `src/features/warranty/model/ticket-mappers.ts` | `869b6bd590da9067d974c49009537d910e6a320aaee00e60bf40f5b774112f8e` |

Full lint, typecheck, test suite, build, browser acceptance cases, and real-store
verification were not run in this documentation task. They remain required when
completing the implementation. The new procedure is partially verified only for
the checks above; production/deployment state remains unverified.

## Next action

When asked to continue warranty work, follow the [status procedure](../procedures/warranty-status.md), compare the current files with the evidence above, and complete the outstanding acceptance checks. Re-run focused tests when relevant inputs changed; resolve failures within the requested scope.

## References

- [Reusable status procedure](../procedures/warranty-status.md)

- [Warranty specification](../../product/features/warranty.md)
- [Ticket inbox](../../../src/features/warranty/components/ticket-inbox.tsx)
- [Status labels](../../../src/features/warranty/model/types.ts)
- [Admin actions](../../../src/features/warranty/server/admin-actions.ts)
- [Status action tests](../../../src/features/warranty/server/status-actions.test.mjs)
- [Export tests](../../../src/features/warranty/model/ticket-export.test.mjs)
