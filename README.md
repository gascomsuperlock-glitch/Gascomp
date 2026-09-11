# Gascomp Product Help

Gascomp after-sales support website. Customers can open product guides from a QR code, watch embedded YouTube tutorials, review troubleshooting steps and FAQs, submit a warranty claim, and contact support through WhatsApp.

## Pages

- `/` — product catalog and support shortcuts.
- `/produk/[slug]` — tutorials, troubleshooting, FAQs, warranty access, and WhatsApp support for one SKU.
- `/klaim-garansi` — internal warranty claim form that returns a ticket number.
- `/admin` — product, variation, image, tutorial, FAQ, QR, settings, and warranty-ticket management.

The Indonesian route segments are stable public contracts. They remain unchanged so existing links and printed QR codes continue to work. Application copy, code comments, generated system content, documentation, and database identifiers/defaults use English. Product names, SKUs, warehouse headings, and customer-message samples retain their source language when exact matching is required.

## Storage and authentication

Supabase is the primary store when its environment variables are configured. PostgreSQL stores products, help content, image metadata, tickets, and evidence metadata. Supabase Storage uses the public `product-images` bucket and the private `warranty-evidence` bucket. Without Supabase, local development uses browser storage for catalog content and `.data/warranty-tickets/` for warranty tickets.

The admin route uses server-side authentication and an HTTP-only signed cookie. Copy `.env.example` to `.env.local` and replace every example credential before deployment:

```bash
GASCOMP_ADMIN_USERNAME=admin
GASCOMP_ADMIN_PASSWORD=replace-with-a-strong-password-at-least-12-characters
GASCOMP_AUTH_SECRET=replace-with-a-random-secret-at-least-32-characters
```

Set the public production origin used in QR codes:

```bash
GASCOMP_PUBLIC_BASE_URL=https://support.gascompsuperlock.com
```

QR generation is disabled when that value is missing or points to localhost.

Follow the [deployment guide](docs/product/operations/deployment.md) to connect
hosting, Cloudflare DNS, and HTTPS before printing QR codes. Requests on the old
`bantuan.gascompsuperlock.com` hostname redirect to `support.gascompsuperlock.com`
once the old hostname's DNS, hosting binding, and HTTPS are also configured.

Configure Supabase with server credentials. The secret key must never use a `NEXT_PUBLIC_` prefix:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Run these migrations in order through the Supabase SQL Editor:

1. `supabase/migrations/202609100001_catalog.sql`
2. `supabase/migrations/202609100002_warranty.sql`
3. `supabase/migrations/202609110001_english_system_defaults.sql`

`PGRST205` for warranty tickets means the warranty migration is missing from the schema cache. Run the migration and reload `/admin`.

## Catalog imports

Capture and normalize Duoke products, then push products and variations without overwriting admin-managed tutorials, FAQs, issues, or images:

```bash
npm run duoke:import
npm run duoke:push
```

Normalize a warehouse XLSX export and import it into Supabase:

```bash
npm run warehouse:normalize -- "/path/SKU_Gudang.xlsx"
npm run warehouse:push
```

The warehouse pipeline reads only the required source columns for SKU, title, category, image URL, and product code. New products remain drafts. Existing SKU content is preserved. Valid source images are copied to `product-images`.

## Duoke support automation

Build the runtime knowledge base from published and reviewed content:

```bash
npm run duoke:knowledge:export
npm run duoke:knowledge:query -- "customer question and SKU"
```

The runtime index is stored in `data/knowledge/duoke-knowledge.json`; related notes are written to `obsidian/`. Only entries with `approval: approved` can become active answers.

The Duoke browser session is stored in `scraping/.private/browser-profile/` and ignored by Git. Refresh and inspect the session with:

```bash
npm run duoke:login
npm run duoke:inspect
```

Use the private inspection report to configure the `DUOKE_*` selectors in `.env.local`, then run one read-only pass:

```bash
npm run duoke:reply:dry-run
```

Capture approved historical conversations and build anonymized review candidates with:

```bash
npm run duoke:chat:capture
npm run duoke:knowledge:build
```

Raw captures remain in `scraping/.private/chat-captures/`. Candidates stay pending until a reviewer supplies anonymized, verified English content:

```bash
scraping/.venv/bin/python -m scraping.duoke.knowledge.approve_duoke_knowledge \
  --candidate history-xxxxxxxxxxxxxxxx \
  --product-id product-id \
  --question-file /path/anonymized-question.txt \
  --answer-file /path/approved-answer.txt \
  --reviewer reviewer-id
npm run duoke:knowledge:export
```

Real delivery requires both `--send` and `DUOKE_AUTOREPLY_ENABLED=true`. The knowledge base must use a non-localhost HTTPS origin. Stop and resume watch mode with:

```bash
npm run duoke:stop
npm run duoke:resume
```

## Development

The application follows feature-based architecture in `src/app`, `src/features`, and `src/shared`. Python automation lives in `scraping`, operational Node scripts in `scripts`, and persistent files in `data`. Read the [project structure](docs/architecture/project-structure.md), [language standard](docs/architecture/language-standard.md), and the grouped [specification index](docs/product/spec.md).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run duoke:test
npm run build
```
