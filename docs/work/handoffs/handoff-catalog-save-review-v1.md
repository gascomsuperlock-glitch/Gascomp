# Online catalog save diagnosis and persistence change

Updated: 2026-09-18
Status: Awaiting verification

## Objective

Restore new-product Save at `https://support.gascompsuperlock.com/admin`.
The owner reports an interrupted save response that persists after retrying.

## Current evidence

- The owner confirmed that the failing new product has **no photos**. This
  supersedes the image-upload hypothesis. Experimental direct-image-upload
  changes made during diagnosis were completely removed from the final diff.
- The live browser sends catalog JSON to `/admin/content`; a new blank product
  produces approximately 112 KB. Small invalid requests return expected HTTP
  400 before persistence. A 128 KB padding probe returned in 2.8 seconds; a
  2 MB probe hit the diagnostic client's 60-second timeout. These timings do
  not establish the cause of the owner's photo-free failure.
- Production catalog reads and disposable PGlite persistence tests succeeded.
  The prior implementation rewrote all products and all five child tables on
  every Save. In the disposable copy, adding a blank product performed 11
  database mutations. The new implementation performs one product upsert for
  that same scenario, with prerequisite reads running concurrently.
- The final diff is confined to the catalog persistence module, its new database
  regression tests, the owning admin specification, and this handoff/index.
  Extensive pre-existing workspace changes were preserved.
- No production catalog Save, upload, deployment, database mutation, or migration
  was performed. No schema migration is needed for this change.
- Runtime logs remain unavailable: the existing Hostinger OAuth refresh requires
  sign-in. The exact transport failure has not been reproduced or attributed to
  a specific hosting timeout. This is a verified persistence improvement, not
  proof that the live incident is resolved.

### Follow-up: HTTP/2 transport error

The owner subsequently reported `net::ERR_HTTP2_PROTOCOL_ERROR` on
`/admin/warranty-tickets`. This endpoint performs a read for warranty notifications
(every 30 seconds and when the tab becomes visible); it is separate from the
catalog Save endpoint. Its rejected request is caught by the notification UI and
does not directly disable catalog Save. The report is evidence of a transport
failure, not proof of a product validation error or of the earlier write-volume
hypothesis.

Read-only live checks on 2026-09-18 returned HTTP 200 for all four combinations of
HTTP/1.1 versus HTTP/2 and identity versus compressed responses. All connections
resolved directly to `145.223.108.57`; those probes do not establish that
Cloudflare is proxying requests. Three subsequent authenticated Chromium reads
also returned valid successful JSON from the ticket endpoint. The reported
HTTP/2 error was not reproduced, so an intermittent hosting/proxy/connection or
client-specific issue remains possible. No app or hosting configuration was
changed for this follow-up, and no deployment authorization was given.
Protocol comparison results are in the ignored local file
`.data/catalog-save-diagnosis/http-protocol.json`; no customer payloads were
included in its output. Prior pending changes are now staged by another actor;
preserve the index and do not infer that they have been deployed.

## Remaining work and decisions

- Deploy only the scoped change after owner authorization under root AGENTS.md.
- Check the owner's product before retrying, because an interrupted response
  does not prove rollback. Verify the deployed photo-free Save flow and readback.
- If transport failure persists, obtain failed-request Network status/timing and
  hosting runtime logs; restore Hostinger authentication as needed.
- The existing full-content request protocol and nontransactional writes remain.
  This change does not introduce concurrent-editor conflict detection or automatic
  mutation retries.

## Decisions and corrections

Source: owner clarification on 2026-09-18, “no photos.” Scope: this incident.
Decision: investigate photo-free persistence and remove the unrelated experimental
image-upload change. Reason: images are not present in the failing workflow.
Agent inference: unnecessary sequential whole-catalog mutations can increase
exposure to hosting timeouts; the exact live failure remains unconfirmed.
The durable behavior is recorded in the [admin specification](../../product/features/admin.md).

Acceptance: adding a new blank product persists that product without deleting or
rewriting existing product guides. Retry without further edits performs no writes.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed after the final build.
  An intermediate run encountered stale generated types from the removed
  experimental image route; the subsequent build regenerated those artifacts.
- `npm run test`: 241 passed, 6 optional tests skipped, 0 failed. The five new
  PGlite tests cover new products, preserved existing rows, child content and
  order, unchanged retry, settings, archive/media retention, draft deletion,
  and read failures before writes. Supabase transport and Storage are mocked;
  relational constraints and readback use real disposable PostgreSQL.
- `npm run build`: passed for the final persistence implementation.
- Read-only production snapshot persistence in disposable PGlite passed with and
  without a synthetic image; image Storage was mocked. No writes were sent to
  the live project.
- Live authenticated Chromium inspection confirmed the existing Save request
  and failure UI. No valid live mutation was sent. The final change affects
  persistence only; no visible UI was changed. Browser testing of the discarded
  image-upload experiment is not acceptance evidence for this change.
- Scoped diff, documentation links, and whitespace checked. Local verification
  logs, source hashes, and a three-file release patch are under
  `.data/catalog-save-diagnosis/` (ignored). Do not publish private diagnostics.

## Next action

Correlate the reported HTTP/2 failure with hosting logs and the failing browser
request before treating the prepared persistence optimization as an incident fix.
Deployment of that scoped change still requires owner authorization and online
verification; preserve staged work from other actors. Production success is pending.

## References

- [Admin specification](../../product/features/admin.md)
- [Persistence](../../../src/features/catalog/server/content-store.ts)
- [Database regression tests](../../../src/features/catalog/server/content-store.test.mjs)
- [Save transport](../../../src/features/catalog/model/save-request.ts)
