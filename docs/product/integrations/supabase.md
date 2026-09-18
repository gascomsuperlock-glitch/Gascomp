# Supabase storage

[Specification index](../spec.md)

Supabase PostgreSQL is the primary shared database; Supabase Storage holds product images and warranty evidence.

| Requirement | Store |
| --- | --- |
| Products, variations, help content, publication state | PostgreSQL |
| Tutorial video files | Public `product-videos` bucket; signed admin uploads, MP4/WebM up to 50 MB |
| Tutorial video thumbnails | Public `product-images` bucket under `tutorial-thumbnails/`; signed admin uploads, generated WebP/JPEG/PNG up to 1 MB |
| Product image files | Public `product-images` bucket |
| Image metadata and product/variation relationships | PostgreSQL |
| Warranty tickets and evidence metadata | Private PostgreSQL tables |
| GascompCare accounts, sessions, and login limits | Private PostgreSQL tables; server-only access |
| Service center locations | PostgreSQL; public reads limited to active locations |
| Warranty evidence files | Private `warranty-evidence` bucket; video files up to 50 MB |
| Duoke source identity and import history | PostgreSQL |
| AI assistance sessions, jobs, knowledge snapshots, and runtime status | Private PostgreSQL tables; server and worker access through the application |
| Product/knowledge graph notes | Project Obsidian vault |

Public clients can read only published products and their related content. Archived products that were published remain readable by their stable URL. Drafts, tickets, evidence, import runs, and all writes require the server-side secret key. Server Actions and the admin content-save endpoint verify the admin session before protected changes. The content-save endpoint also verifies the request origin.

The application preserves stable source identities to prevent duplicates. Duoke and warehouse imports update source-owned fields while retaining content maintained by administrators.

Data flow: **Duoke or warehouse → validation/normalization → Supabase → admin panel and customer website**. Obsidian notes are generated from the same product and knowledge records.

Status: catalog, help-content, import-history, warranty-ticket, and evidence tables are implemented. The `product-images` and `warranty-evidence` buckets are configured. See [Supabase setup](../../setup/supabase.md).

## Automated migration baseline

`supabase/release-baseline.json` pins the existing project, hashes of SQL files
before `202609160002`, and the five migration-history entries observed during
release setup on September 16. Historical files are frozen and excluded from
automatic execution. This does **not** mark untracked migrations as applied:
some changes were applied manually, and the optional tutorial source-column
migration remains deferred. Do not use a blanket `supabase db push` against
this history. Reconcile a legacy change separately if it becomes required.

New ordered SQL files from `202609160002` onward are applied through the
Management API by `scripts/supabase/release-migrations.mjs`. The remote name is
`release_<local-version>_<full-SHA256-of-SQL>`, while Supabase assigns the remote
version. This preserves a verifiable local-file identity without changing
Supabase's historical version records. Editing/deleting an applied file,
introducing a migration before an already applied automated migration, changing
legacy SQL, selecting another project, or encountering unexpected remote
history stops the release for review.

Each successful POST must be confirmed in remote history before the next file
or application promotion. No failed POST is automatically retried. After an
ambiguous network failure, inspect remote history and schema before rerunning;
if the recorded name matches, the next run skips it. Database writes through
other clients must not run concurrently with a release. Local and remote CLI
version identifiers intentionally differ for automated releases; the API runner
is the production release mechanism.

The first automated migration expands only the existing warranty solution
constraint to accept `usage_guidance`. Its isolated SQL test verifies historical
row preservation, old/new values, rejected invalid values, and existing RLS.

`202609180001_catalog_save_snapshot.sql` adds a stable, read-only catalog snapshot
function for the admin Save path. It combines settings, products, child content,
and optional video-column capabilities in one database response. Execute permission
is limited to `service_role`; anonymous and authenticated clients cannot call it.
The function does not store another catalog copy or change existing rows.

## Product image diagnosis on September 11, 2026

The live website contains the image URLs recorded in `product_images`, but
sample public image requests return HTTP 400 with `Object not found` / `NoSuchKey`.
The `product-images` bucket is public; listing its root and the `warehouse` and
`products` prefixes returns no objects. There are 29 image metadata records.
This is missing Storage content, rather than a frontend URL or bucket-visibility issue.

The user authorized production recovery from the supplied warehouse workbook.
All 29 referenced images have now been restored to their existing Storage paths.
Twenty-eight JPG files came from their original warehouse links. The replacement
for the manually uploaded `GRS-915` photo came from the exact SKU's workbook link
and was converted to PNG to preserve its existing public URL. No product or image
metadata changed, and no existing Storage object was overwritten.

Verification: all 29 public image URLs return HTTP 200 with image content, the
live Hostinger home page contains all 29 image references, and the `GRS-915`
product page returns HTTP 200 with its restored image. An authenticated request
to the live admin panel rendered 29 image URLs, all accessible. Recovery checksums
and results are recorded locally in `.data/image-recovery/restoration-result.json`
and `.data/image-recovery/production-verification.json`. Restoring the existing
Storage URLs takes effect in the deployed application without a code deployment.
Headless Chromium checks passed on desktop (1440 px) and mobile (390 px):
all nine product images on the first public catalog page and all 29 admin product
images loaded with nonzero natural dimensions. Screenshots and the browser
verification report are stored in `.data/image-recovery/`.

## Tutorial video source migration

`202609110002_tutorial_video_sources.sql` adds nullable `video_url` and
`storage_path` columns to `tutorial_videos`, backfills legacy YouTube links, and
creates the public `product-videos` bucket with a 50 MB limit and MP4/WebM MIME
allowlist. The application also supports the existing schema: it stores all video
source URLs in the legacy `youtube_url` column and derives uploaded file paths
from Storage URLs. When the optional columns exist, saves populate both URL
columns and `storage_path`. This permits rolling deployment without interrupting
Save. No anonymous Storage write policy is introduced. The SQL migration is
prepared locally and has not been applied to production.

On September 11, 2026, the production `product-videos` bucket was created and
verified as public with a 52,428,800-byte limit and only `video/mp4` and
`video/webm` accepted. The metadata SQL migration remains optional and unapplied;
the deployed application can use the existing catalog schema.

### Tutorial upload limit increase

The attempted 150 MB increase on September 11, 2026 was rejected by Supabase
with HTTP 413. The user subsequently chose to retain 50 MB. Application labels,
browser validation, server validation, and the production `product-videos`
bucket now use the same inclusive 52,428,800-byte limit. The unapplied
`202609110003_tutorial_video_upload_limit.sql` migration was withdrawn; no
Storage or plan change is required.

## Tutorial video thumbnail migration

`202609140002_tutorial_video_thumbnails.sql` adds nullable `thumbnail_url` and
`thumbnail_storage_path` columns to `tutorial_videos`. The browser extracts four
frames from a selected MP4/WebM file and uploads only the administrator's chosen
WebP, JPEG, or PNG thumbnail to the existing public `product-images` bucket. The browser
prefers WebP and preserves its actual canvas fallback type when WebP encoding is unavailable. The same metadata
also supports replacing a thumbnail on an existing uploaded tutorial without
re-uploading its video. The customer tutorial list and native player poster read
the saved URL.

The application continues to read tutorial rows before this additive migration.
It does not issue a thumbnail upload URL or save thumbnail metadata until the new
columns are available, so an older database receives an actionable error without
losing the staged editor state.

On September 14, 2026, this migration was applied to production and its remote
history was aligned with local version `202609140002`. Both columns are available,
all eight existing tutorial rows retained the same content checksum, and their new
thumbnail values remained null. The existing `product-images` bucket remained
public with a 5 MB object limit and WebP support. Verification records are stored
locally in `.data/tutorial-thumbnail-migration/`.

## Warranty video upload limit

`202609110004_warranty_video_upload_limit.sql` raises the private
`warranty-evidence` bucket's per-file limit to 52,428,800 bytes (50 MB), matching
warranty video validation. It preserves visibility, allowed MIME types, objects,
and policies. Invoice and photo uploads remain limited to 4 MB by the application.
The Server Action request limit is 72 MB to accommodate all permitted evidence
in one submission. No new public access or upload policy is introduced.

On September 11, 2026, the equivalent production bucket update was applied
through the Storage API and verified: `warranty-evidence` now allows 52,428,800
bytes, remains private, and retains its existing MIME allowlist. No ticket,
evidence object, or access policy was changed.

## Warranty video formats

`202609140001_warranty_video_formats.sql` extends the private warranty bucket's
MIME allowlist with Matroska, AVI, 3GP, MPEG, MPEG-TS, WMV, FLV, and Ogg video.
The application detects containers from bytes, fully verifies video decoding,
and stores canonical video MIME types rather than trusting browser metadata.

On September 14, 2026, the equivalent additive update was applied through the
Storage API and verified: all 15 MIME types are allowed, the bucket remains
private, and its file limit remains 52,428,800 bytes. Existing objects and
access policies are unchanged. Local verification records are in
`.data/warranty-video-formats/bucket-before.json` and `bucket-after.json`.

## Warranty claim eligibility

`202609140003_warranty_claim_eligibility.sql` adds a `BEFORE INSERT` trigger for
new warranty tickets. It rejects future or expired purchase dates and uses a
transaction-level advisory lock to serialize submissions with the same trimmed,
case-insensitive order number and SKU before checking for an existing ticket.
Historical tickets remain unchanged, and the supporting expression index is not
unique so existing duplicate records do not block migration. Apply this migration
before relying on database-level protection for simultaneous submissions.

## Warranty ticket deletion

`202609150001_warranty_ticket_deletion.sql` adds the nullable `deleted_at`
timestamp used for soft deletion. Deleted tickets and their private evidence stay
in PostgreSQL and Storage so claim identity remains available to the one-claim
rule, while application reads omit them from the admin inbox and reject direct
evidence access. Apply this migration before enabling deletion in a Supabase-backed
deployment.

## GascompCare member accounts

`202609150003_gascomp_care_accounts.sql` introduces private member accounts,
hashed sessions, shared login-attempt limits, and transactional authentication
functions. It does not create Care purchases or modify existing warranty rules.
See [GascompCare](../features/gascomp-care.md) for behavior and security boundaries.
On September 15, 2026, the authorized release applied this migration to the
existing production project and aligned its history with local version
`202609150003`. All 247 existing rows across nine application tables and two
Storage metadata tables remained identical. RLS is enabled on all three Care
tables; anonymous readiness calls are denied and the service role is allowed.
No production member or test ticket was created.

Private application-data snapshots, schema definitions, and a data restoration
script are saved under `.data/gascomp-care-release/`. All 247 rows were restored
with relational constraints in a disposable PostgreSQL engine, and the Care
migration preserved that restored data. All 88 Storage files (113,326,093 bytes)
were downloaded and verified by size and SHA-256 readback. This is an
application-data and Storage backup, not a full managed-project/role backup;
`pg_dump` was unavailable because Docker/Podman was not installed.

Without the migration, Care reports unavailability while the existing catalog
and warranty features retain their behavior.


## GascompCare coverage and claim usage

`202609150004_gascomp_care_coverage.sql` adds private Care purchase and approved
claim ledgers. Each verified purchase has a calendar-based period and a quota
of three claims per purchased year. Restricted mutation functions enforce
ownership, normalized unique references, dates, and serialized claim limits;
public roles have no access. Existing account, catalog, warranty, and Storage
records are unchanged. Account order notes are not converted into coverage.

On September 15, 2026, the owner-authorized release applied this migration to
production with history version `202609150004`. No purchases or claims were
created during rollout. A missing coverage migration displays an explicit
coverage error while account access continues.


## GascompCare member deletion

`202609150005_gascomp_care_member_deletion.sql` adds soft deletion with atomic
batch handling and session revocation. Authentication and coverage mutations
reject deleted accounts, including requests racing with deletion. Accounts,
purchases, claims, usernames, and purchase references remain retained; no Storage
or warranty data is removed. The admin list reads only active accounts.

On September 15, 2026, the owner-authorized release applied this migration after
coverage and aligned history version `202609150005`. No member was deleted during
rollout. RLS remains enabled, public roles cannot confirm claims or delete members,
and the service role retains the required protected operations.

Fresh snapshots of 14 pre-existing tables verified all 247 rows unchanged after
both migrations (allowing the added nullable deletion marker). All 88 Storage
files were verified against unchanged remote metadata and local SHA-256 backups.
Data restoration and both migrations passed on a disposable database before the
production changes. Private records are in `.data/gascomp-care-release-2/`.
Application hosting deployment still requires separate verification.

## Service center directory

`202609160001_service_centers.sql` creates an initially empty `service_centers`
table with the location, contact details, opening hours, optional Google Maps
link, required coordinates, and active status. Province codes follow the
[BPS province classification](https://sirusa.web.bps.go.id/metadata/variabel/326536)
covering all 38 Indonesian provinces. Coordinate bounds provide a coarse
Indonesia-area validation; administrators remain responsible for placing pins
at the correct address and province.

RLS is enabled and anonymous/authenticated table grants are revoked for both
reads and writes. The application server uses the server-only service key and
returns only active locations to the directory. Admin mutations verify the
admin session and request origin. Reads are paginated so directories beyond the API row limit
remain complete. Deactivation retains the record for future editing.

When Supabase is entirely unconfigured, single-process local development uses
the ignored `.data/service-centers.json` file, initially absent and treated as an
empty list. File writes are serialized within the process and atomically
replaced. A partially configured database, missing migration, or database error
returns an explicit unavailable state and never switches to local data.

On September 16, 2026, the owner authorized database-backed testing through
localhost. This migration was applied to the configured Supabase project and
aligned with history version `202609160001`. Direct public API access remains
denied, including for active rows. The application has not been deployed; the
live `/service-center` route still returns 404.

Database-backed browser checks used only the local application. The two temporary
location records were removed by exact ID, leaving `service_centers` empty.
Before/after checksums confirmed all 247 existing rows across 16 application and
Storage metadata tables unchanged. Anonymous and authenticated API reads were
verified as denied. Local verification records are in
`.data/service-center-validation/`.

## AI assistance product context migration

`202609170002_ai_assistance_resolved_sku.sql` extends authenticated worker
completion with `resolvedSku` for a uniquely inferred product name or SKU. An
explicit job SKU cannot be overridden. The selected entry must match the
effective context; snapshot, language, lease, and deadline checks remain in
force. The local AI preview applies migrations in order without deleting
conversations. Production application uses the authorized release workflow.

## AI assistance generated response migration

`202609170003_ai_assistance_grounded_responses.sql` adds the grounded response
contract alongside legacy answer-ID completion. Source IDs and response basis
are retained with generated assistant messages. Claims carry a bounded history
from the same session only; customer requests cannot supply a different session
or arbitrary trusted history. Ambiguous product context remains explicit and
permits general clarification without publishing guessed product facts.

Generated completion validates response shape, plain text, active provenance,
product context, readiness, snapshot version, job lease, and deadline. Only
handoff-kind responses enable the contextual WhatsApp link. Existing opaque
cookie access, RLS, private worker credentials, retention, and retry protections
remain in force. The local preview applies this migration after the previous two
AI migrations without deleting stored conversations. Production remains subject
to the authorized release workflow.
