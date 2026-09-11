# Set up Gascomp Supabase

1. Open the target Supabase project and inspect existing objects in the Table Editor.
2. For a new project, run these files in order in the SQL Editor:
   - `supabase/migrations/202609100001_catalog.sql`
   - `supabase/migrations/202609100002_warranty.sql`
   - `supabase/migrations/202609110001_english_system_defaults.sql`
   - `supabase/migrations/202609110002_tutorial_video_sources.sql`
3. Copy the project URL, publishable key, and secret key into `.env.local`. Keep the secret server-only and never give it a `NEXT_PUBLIC_` prefix. The code also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` name when required.
4. Restart the development server after changing environment variables.
5. Create a draft product, upload an image, and publish it. Confirm that public visitors cannot read drafts and another browser can read the published product.
6. Submit a warranty claim and confirm that only an authenticated administrator can query the ticket or download evidence.

If SQL returns `42P07: relation "products" already exists`, do not delete the table or rerun the initial migration blindly. Inspect which migrations already exist and apply only the missing later migrations.

The `product-images` and `product-videos` buckets are public and must contain only customer-visible product photos and tutorials. Video uploads support MP4/WebM up to 50 MB, using signed upload URLs issued by the admin endpoint. The tutorial video migration is optional for existing catalogs: Save detects the schema and supports the legacy URL column. The `product-videos` bucket must exist with the documented size and MIME limits before uploading videos. The `warranty-evidence` bucket is private. Product draft metadata is protected by row-level security, but a known URL in a public bucket remains accessible.

Run the read-only connection check after configuration:

```bash
npm run supabase:check
```
