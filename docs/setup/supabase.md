# Set up Gascomp Supabase

1. Open the target Supabase project and inspect existing objects in the Table Editor.
2. For a new project, run these files in order in the SQL Editor:
   - `supabase/migrations/202609100001_catalog.sql`
   - `supabase/migrations/202609100002_warranty.sql`
   - `supabase/migrations/202609110001_english_system_defaults.sql`
   - `supabase/migrations/202609110002_tutorial_video_sources.sql`
   - `supabase/migrations/202609110004_warranty_video_upload_limit.sql`
   - `supabase/migrations/202609140001_warranty_video_formats.sql`
   - `supabase/migrations/202609140002_tutorial_video_thumbnails.sql`
   - `supabase/migrations/202609140003_warranty_claim_eligibility.sql`
   - `supabase/migrations/202609150001_warranty_ticket_deletion.sql`
   - `supabase/migrations/202609150002_warranty_ticket_solution.sql`
   - `supabase/migrations/202609150003_gascomp_care_accounts.sql`
3. Copy the project URL, publishable key, and secret key into `.env.local`. Keep the secret server-only and never give it a `NEXT_PUBLIC_` prefix. The code also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` name when required.
4. Restart the development server after changing environment variables.
5. Create a draft product, upload an image, and publish it. Confirm that public visitors cannot read drafts and another browser can read the published product.
6. Submit a warranty claim and confirm that only an authenticated administrator can query the ticket or download evidence.

If SQL returns `42P07: relation "products" already exists`, do not delete the table or rerun the initial migration blindly. Inspect which migrations already exist and apply only the missing later migrations.

The `product-images` and `product-videos` buckets are public and must contain only customer-visible product photos and tutorials. Video uploads support MP4/WebM up to 50 MB, using signed upload URLs issued by the admin endpoint. The tutorial video migration is optional for existing catalogs: Save detects the schema and supports the legacy URL column. The `product-videos` bucket must exist with the documented size and MIME limits before uploading videos. The `warranty-evidence` bucket is private. Product draft metadata is protected by row-level security, but a known URL in a public bucket remains accessible.

The application and `product-videos` bucket use the same inclusive 52,428,800-byte limit (50 MB). No bucket-limit increase or plan upgrade is required.

For existing projects, apply `202609110004_warranty_video_upload_limit.sql` before deploying the 50 MB warranty-video limit. Keep `warranty-evidence` private. Invoice and photo limits remain 4 MB; the 72 MB Server Action request limit covers combined evidence and multipart overhead.

Run the read-only connection check after configuration:

```bash
npm run supabase:check
```

## GascompCare accounts

For an existing project, inspect and apply only the new GascompCare migration
when explicitly authorized. It uses the existing server-only Supabase URL and
secret configuration; there is no customer signup or dependency on Supabase Auth
email delivery. No new public table grants or Storage buckets are needed.

After the migration in an isolated staging project, open **GascompCare** in the
authenticated admin dashboard, create a fictional test member, and manually
exercise the temporary credentials. Confirm
that first login requires a password change, the member sees only their own card,
and an admin password reset revokes the previous session. Remove test credentials
from delivery drafts and use non-production data for validation.

An account is not a Care purchase: the optional marketplace order reference does
not activate coverage. Marketplace synchronization and actual entitlements remain
deferred. See the [GascompCare specification](../product/features/gascomp-care.md).

The hosting proxy must preserve the public `Host` for same-origin checks and
append or replace `X-Forwarded-For` with a trusted client IP. Member authentication
uses the final valid IP hop for shared limits; missing or invalid values share a
conservative fallback bucket. Verify this behavior on the target hosting setup
before enabling accounts for customers.


## Preserve existing production data when adding GascompCare

Preparing code or publishing it to GitHub does not authorize production database
writes. Obtain separate approval before applying a production migration or
creating production test accounts. The local validation below does not establish
that a production backup or hosting setting has been verified.

1. Confirm the intended production Supabase project without copying secrets into
   reports. Inspect migration history and the existing catalog, warranty, Care,
   and Storage objects. Record private before-migration row counts and content
   checksums for existing product, warranty, evidence, and Storage metadata.
2. Take and verify a restorable database backup. Back up Storage object files
   separately and verify the exported objects; a database backup contains Storage
   metadata, not the image, video, or evidence file bytes. Keep both backups private.
3. If Care is absent and its migration has not been applied, apply only
   `supabase/migrations/202609150003_gascomp_care_accounts.sql` after approval.
   It creates new Care tables and functions within `BEGIN`/`COMMIT` and does not
   replace existing catalog, warranty, or Storage data. Do not rerun the initial
   catalog/warranty migrations, reset the database, replace the full schema,
   truncate tables, or import local preview fixtures into production.
4. If a Care object or migration version already exists, stop and compare the
   installed schema before taking further action. The migration deliberately
   rejects a name collision instead of replacing existing accounts. If an SQL
   session is left in an aborted transaction, issue `ROLLBACK`; do not drop the
   conflicting object or remove its data to force the migration through.
5. Compare existing-data counts and checksums against the private baseline.
   Perform the comparison in a controlled window or account for authorized live
   writes. Confirm Storage visibility and representative existing image/evidence
   accessibility separately. Verify Care tables, function grants, RLS, and
   `care_schema_ready()` through authorized server access.
6. Deploy the application following the
   [existing-site release procedure](../product/operations/deployment.md#gascompcare-release-to-an-existing-site).
   If application rollback is needed, redeploy the previous application revision
   while retaining the additive Care tables and any new member data. Do not use a
   database reset or drop Care tables as an application rollback mechanism.

The disposable SQL regression suite seeds fictional existing products, tickets,
evidence references, buckets, and object metadata. It verifies that the Care
migration leaves every seeded row unchanged and that reapplying it fails without
changing existing Care accounts or the older data. It also tests account isolation,
role access, rate limits, expiry, and password-transaction rollback. This verifies
migration behavior locally; it does not back up or inspect a production project.
