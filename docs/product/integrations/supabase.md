# Supabase storage

[Specification index](../spec.md)

Supabase PostgreSQL is the primary shared database; Supabase Storage holds product images and warranty evidence.

| Requirement | Store |
| --- | --- |
| Products, variations, help content, publication state | PostgreSQL |
| Tutorial video files | Public `product-videos` bucket; signed admin uploads, MP4/WebM up to 50 MB |
| Product image files | Public `product-images` bucket |
| Image metadata and product/variation relationships | PostgreSQL |
| Warranty tickets and evidence metadata | Private PostgreSQL tables |
| Warranty evidence files | Private `warranty-evidence` bucket |
| Duoke source identity and import history | PostgreSQL |
| Product/knowledge graph notes | Project Obsidian vault |

Public clients can read only published products and their related content. Archived products that were published remain readable by their stable URL. Drafts, tickets, evidence, import runs, and all writes require the server-side secret key. Server Actions and the admin content-save endpoint verify the admin session before protected changes. The content-save endpoint also verifies the request origin.

The application preserves stable source identities to prevent duplicates. Duoke and warehouse imports update source-owned fields while retaining content maintained by administrators.

Data flow: **Duoke or warehouse → validation/normalization → Supabase → admin panel and customer website**. Obsidian notes are generated from the same product and knowledge records.

Status: catalog, help-content, import-history, warranty-ticket, and evidence tables are implemented. The `product-images` and `warranty-evidence` buckets are configured. See [Supabase setup](../../setup/supabase.md).

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
