# Online catalog save diagnosis and persistence change

Updated: 2026-09-18
Status: Owner retry is blocked before the application handler; browser origin required

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
- The recovery diff is confined to catalog persistence and response handling,
  focused regression tests, one Supabase migration, and the owning documents.
  Extensive pre-existing workspace changes were preserved.
- The recovery release is deployed from commit `ffd37cdbdfc383082826e8fa37037752a48f9e33`.
  GitHub Actions run `35322095226` passed verification, migration preview/apply/
  verification, and main promotion. Hostinger Git deployment
  `01a0b389-1689-7275-9c0a-54f51536f68f` completed successfully on Node 22.
- Migration `202609180001_catalog_save_snapshot.sql` is applied and verified.
  The service-role-only snapshot function returns the complete persistence
  snapshot through one database request; anonymous and authenticated roles are
  denied. No catalog values were changed by deployment or verification.

### Reproduction after the first persistence release

The owner retried after commit `406abc3` reached Hostinger and reported the same
interrupted response. An authenticated production no-op Save then returned HTTP
200 but required approximately 33 seconds before response headers arrived. The
112,134-byte JSON confirmation crossed LiteSpeed over HTTP/2 with Brotli encoding;
the encoded body was about 22 KB. An earlier identical check had taken 6 seconds,
confirming large latency variance before any catalog mutation.

The deployed persistence implementation still made nine Supabase HTTP reads to
assemble the existing catalog and detect optional video columns. Runtime logs
contained no application save error, and a read-only database check found no new
product from the failed attempt. A recovery change replaces those reads with one
service-role-only SQL snapshot and sends an identity-encoded response with an
explicit UTF-8 byte length. It also logs an opaque request ID, status, duration,
request size, and product count without catalog values or credentials.

Hostinger archive builds use Node 20. A manual build of the same verified source
on the configured Node 22 runtime failed before producing build logs, matching the
automatic Git-build failure. Runtime alignment alone therefore did not provide a
deployable recovery.

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
included in its output. The pending changes in the primary workspace belong to
another task and remain preserved there.

### Access blocker and support packet

A further read-only attempt to retrieve the last hour of Hostinger runtime logs
still failed with an OAuth refresh/sign-in requirement. No Hostinger connector
was available in the current tool catalog. A credential-free support packet was
prepared at `.data/catalog-save-diagnosis/hostinger-support.txt` for the owner to
send to Hostinger or use when providing the requested runtime/proxy logs. No
message was sent to any external party. This access blocker was later resolved,
as recorded below.

### Recovery deployment and latest owner retry

Runtime-log access was restored before the recovery release. Direct production
snapshot RPC completed in approximately 1.5 seconds and returned 42 products.
Four authenticated no-op browser Saves completed with HTTP 200 in 2.8 to 10.4
seconds. The application handler itself took 0.6 to 3.6 seconds and logged only
opaque request IDs, duration, request bytes, and product count. Responses used
identity encoding, an exact UTF-8 content length, and `no-store, no-transform`.

The owner then retried Save from the existing tab and reported the same
interrupted-response message. Two immediate Hostinger runtime-log reads, including
one after an additional wait, contained no new catalog-save request. The last
save entry remained the controlled verification request. An unauthenticated POST
to `https://support.gascompsuperlock.com/admin/content` reaches the deployed route
and returns the expected HTTP 401 with the new request headers. This narrows the
current failure to the browser, connection, request upload, or an unexpected
origin/redirect before the Next.js handler. It is not evidence of a Supabase
persistence failure. The exact address-bar URL of the edit-bearing tab is now
required. The tab must remain open and unrefreshed so its React-only edits survive.

## Remaining work and decisions

- Obtain the exact address-bar URL from the owner's edit-bearing tab and compare
  it with the canonical production origin before changing server routing.
- Preserve the tab while diagnosing. Do not ask the owner to refresh, navigate,
  sign out, or close it until the unsaved catalog state is recovered.
- If the origin is canonical, reset only the browser connection and correlate the
  next retry with runtime logs. If it differs, make its POST path reach the save
  handler without a redirect before retrying.
- After the request reaches the handler, verify the owner's product by readback;
  an interrupted response alone does not prove rollback.
- The existing full-content request protocol has no durable client-side draft.
  Add recovery storage after the current tab is rescued so later reloads cannot
  discard an edit-bearing payload.

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
- `npm run test`: 242 passed, 6 optional tests skipped, 0 failed. The new
  PGlite tests cover new products, preserved existing rows, child content and
  order, unchanged retry, settings, archive/media retention, draft deletion,
  and read failures before writes. Supabase transport and Storage are mocked;
  relational constraints and readback use real disposable PostgreSQL.
- `npm run build`: passed for the final persistence implementation.
- Read-only production snapshot persistence in disposable PGlite passed with and
  without a synthetic image; image Storage was mocked. No writes were sent to
  the live project.
- Live authenticated Chromium no-op Saves returned HTTP 200 after deployment;
  no catalog values were changed. The owner's later retry did not reach the
  application handler and remains unresolved.
- Scoped diff, documentation links, and whitespace checked. Local verification
  logs, source hashes, and a three-file release patch are under
  `.data/catalog-save-diagnosis/` (ignored). Do not publish private diagnostics.

## Next action

Get the full URL shown in the address bar of the still-open admin tab. Use that
origin to choose a connection reset or a redirect-free server route, then monitor
the owner's next Save attempt and verify the stored product by readback.

The owner confirmed the exact canonical URL. Add request-arrival logging before
session and body handling, deploy it, then correlate one retry from the preserved
tab. This separates a request that never reaches Next.js from an interrupted body
upload or later handler failure without logging catalog values.

## References

- [Admin specification](../../product/features/admin.md)
- [Persistence](../../../src/features/catalog/server/content-store.ts)
- [Database regression tests](../../../src/features/catalog/server/content-store.test.mjs)
- [Save transport](../../../src/features/catalog/model/save-request.ts)
