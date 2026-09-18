# Catalog Save and media transport handoff

Updated: 2026-09-18
Status: Awaiting verification

## Objective

Resolve interrupted and slow product Save with photos while preserving staged edits.

## Current evidence

Work is isolated in `/private/tmp/douke-web-save-readback`, branch
`fix/catalog-save-readback`. The owner's main checkout has unrelated uncommitted
work; none is included in this fix.

Compact Save and strict readback commit `87c5b43` reached both main and release.
GitHub Actions run `35332880887` passed. Hostinger Git build failed without useful
logs; exact-commit archive build `01a0b3fe-20b3-72d9-befd-45cd8707d80e` completed
at 10:10:45 UTC. Live protected no-op saves took 836 ms desktop and 1,421 ms mobile,
sending 69 bytes with unchanged catalog readback. This did not verify media uploads.
EKEF-01 already existed as published at 10:03:12 UTC, before this deployment.
EMRC-01 had previously saved at 09:38:51 UTC. Do not create either again as a test.

Controlled invalid JSON probes reproduce the transport failure without writing
catalog data. Chromium sent 512 KB to `/admin/content` and failed at 29,994 ms with
`net::ERR_HTTP2_PROTOCOL_ERROR`; netlog records received RST_STREAM CANCEL and
GOAWAY PROTOCOL_ERROR. No matching Save handler arrival was logged. A 128 KB HTTP/1
probe took 13,098 ms while its application handler took 1 ms; HTTP/1 is not a proven
workaround. A 512 KB invalid request to the read-only Supabase snapshot RPC returned
the expected no-matching-signature 404 in 1.307 seconds. The evidence locates the
reproduced delay/reset before the application handler on the hosting upload path;
it does not identify a particular Hostinger/LiteSpeed timeout or security rule.
Private raw netlogs can contain session details; do not publish them.

The follow-up fix uploads photos directly to Supabase Storage using scoped signed
URLs, then sends metadata-only Save. Completed uploads survive metadata Save
failures in a per-tab cache. Failed uploads stop before catalog persistence. Existing
video uploads already use direct Storage transfer. No schema/environment change.
Behavior is owned by the admin and Supabase specifications linked below.

## Decisions and corrections

The owner identified EMRC-01, then EKEF-01; success for another SKU is not acceptance.
The owner explicitly authorized the Save release and Hostinger deployment. On
2026-09-18 the owner clarified photos/videos were included and the failing attempt
used a new tab opened after 17:10 WIB. The earlier old-tab hypothesis is superseded;
request size alone cannot establish which client version was active. These are
incident-specific facts, not new requirements to reopen tabs repeatedly.

## Verification

Direct-photo candidate: lint, typecheck and production build passed; 260 Node tests
passed, 6 optional tests skipped, no failures. Tests cover binary upload ordering,
metadata-only Save, cached retry, failure retention, origin/session checks, safe
paths, request bounds, MIME/declared-size validation and provider failures.
Six production-build Chromium checks passed at 1440/390 widths: successful photo
Save, failed photo transfer retaining edits and stopping persistence, and interrupted
metadata Save reusing the completed photo on retry. All Save bodies were 594 bytes.
Storage authorization/transfer and Save responses were intercepted in these UI
checks; no production media objects were created. No page errors or overflow.
Release results will be recorded after deployment.
Local evidence: ignored `.data/media-save-diagnosis/` and `.data/save-readback/`.
The earlier compact Save also passed disposable PostgreSQL regression coverage.

## Remaining work and next action

Finish direct-photo browser verification and release through the existing authorized
release branch. Verify live route authorization and unchanged-catalog no-op Save.
A real owner photo/video attempt remains the end-to-end acceptance case. Exact
Hostinger internal reset cause requires provider access logs unavailable here.

## References

- [Admin specification](../../product/features/admin.md)
- [Supabase specification](../../product/integrations/supabase.md)
- [Deployment workflow](../../product/operations/deployment.md)
- [Image upload](../../../src/features/catalog/model/upload-product-images.ts)
- [Save transport](../../../src/features/catalog/model/save-request.ts)
