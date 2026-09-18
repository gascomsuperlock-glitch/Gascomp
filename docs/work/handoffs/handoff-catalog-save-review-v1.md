# Catalog Save performance and confirmation handoff

Updated: 2026-09-18
Status: Awaiting verification

## Objective

Reduce new-product Save transfer time and distinguish interrupted responses from
confirmed persistence while preserving the owner's edits and existing catalog.

## EMRC-01 successful retry and Save performance follow-up

The owner identified EMRC-01 as the failing product; earlier EHC-01 success was
not evidence for this request. EMRC-01 was absent during the failed retry, while
a small control request proved arrival logging was functional. The subsequent
owner retry succeeded: request arrival was 2026-09-18 09:38:48.750 UTC, completion
was HTTP 200 after 2,770 ms, and request size was 214,981 bytes. Database readback
confirmed the published EMRC-01 row created at 09:38:51.073 UTC and 44 products.
The owner then reported that Save was too slow. No local patch had been deployed,
so that success is not attributed to the prepared changes. The exact cause of
the earlier transport interruption remains unproven.

A scoped implementation is ready in `/private/tmp/douke-web-save-readback`, branch
`fix/catalog-save-readback`, based on `5486035`. The editor sends changed products,
explicit removals, and changed settings instead of the entire catalog. The server
merges these into its existing protected snapshot, preserves unrelated content,
and returns only changed products/settings for client reconciliation. Legacy full
Save requests remain supported. Interrupted responses use authenticated readback
and confirm success only for matching complete content. No automatic write retry
or migration is introduced. Same-product concurrent edits remain last-writer wins;
readback conservatively cannot confirm newly uploaded image bytes.

Read-only measurement of the current 44-product database snapshot, treating the
persisted EMRC-01 as the added product, produced 115,144 full-request bytes versus
1,112 changed-request bytes (99.0% smaller). Full response was 115,171 bytes versus
1,189 compact-response bytes. These are snapshot measurements, not a reconstruction
of every byte in the owner's 214,981-byte request.

Verification: lint, typecheck, production build passed. Node suite: 255 passed,
6 optional skipped, 0 failed. Real disposable PGlite tests cover one-snapshot,
one-upsert new-product saves, retry no-op, unrelated additions/settings, explicit
removal, archive/media preservation, duplicate-URL rejection, and failed reads
before writes. Six production-build Chromium flows passed at desktop/mobile widths
1440/390: real application save into a loopback-only storage simulation, interrupted
response with matching readback, and missing readback retaining edits. Each sent
one POST; blank new-product bodies were 395 bytes. There were no page errors or
horizontal overflow. Browser recovery responses are mocked; real database behavior
is covered separately by disposable PostgreSQL. No production writes were made.

A separate local Chromium network test at 16 KiB/s upload and 50 ms latency measured
7,229 ms for a 116,323-byte full request and 68 ms for a 399-byte compact request.
Both went through the real application route into simulated local storage. These
numbers isolate transport overhead and do not promise production latency or prove
that Hostinger's intermittent protocol error is fixed. Evidence is in the worktree's
ignored `.data/save-readback/` folder.

Release authorized on 2026-09-18: the owner explicitly approved pushing through
the release branch and deploying this prepared Save change to Hostinger. At this
recording, the candidate is locally verified and awaiting release execution.
Before release, reconcile latest `main` because separate QR work is active. After an
authorized release, verify the exact Hostinger revision and real Save timing, preserve
any still-unsaved old tab, and check product readback before retrying writes.

Decision/correction source: owner clarification on 2026-09-18 identified EMRC-01 and
then requested faster saving. Scope: catalog Save. Acceptance: adding one product
transfers only its changes, preserves other catalog rows, and confirms the result;
a different product's successful Save is never treated as the failing product's
success. The owning behavior is in the isolated worktree's admin specification.

## EKEF-01 follow-up and release preparation

On 2026-09-18 the owner reported another failed new-product Save for EKEF-01.
Read-only queries at 10:00:13, 10:00:34, and 10:01:16 UTC found no matching product
or variation, and the owner confirmed the browser showed an error. No catalog Save
entry appeared in the current runtime log. No successful duration can be assigned
to that failed request.

Hostinger reports an archive deployment completed at 09:46:10 UTC following a
failed Git build for `5486035`. GitHub `main` and `release` are at `5486035`.
The changes since the prior base concern QR rendering only; the compact Save and
readback implementation is not in production. The isolated branch was advanced
without conflicts to `5486035`, preserving those QR changes, and verification
was repeated before preparing the Save release. Access to the owner's edit-bearing
browser tab was unavailable; no matching admin tab was exposed by the local Chrome
or Safari session. Preserve that tab until its unsaved fields can be recovered or
copied into a newly loaded editor after an authorized release.

The owner subsequently explicitly authorized the prepared release. No release
execution had occurred at the time these diagnostic observations were recorded.

## Remaining work and next action

Use the owner-authorized production release workflow for the reviewed change.
The candidate has been reconciled with `5486035`; inspect Hostinger
build state, and measure the affected production Save and database readback.
Local verification is complete; no production speed improvement is claimed yet.
The historical protocol failure still lacks a definitive transport root cause.

## References

- [Admin specification](../../product/features/admin.md)
- [Release workflow](../../product/operations/deployment.md)
- [Change envelope](../../../src/features/catalog/model/content-changes.ts)
- [Save transport](../../../src/features/catalog/model/save-request.ts)
- [Persistence](../../../src/features/catalog/server/content-store.ts)
