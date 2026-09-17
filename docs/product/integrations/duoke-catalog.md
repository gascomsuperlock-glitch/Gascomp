# Duoke catalog synchronization

[Specification index](../spec.md)

## Scope

Capture product data from [Duoke](https://web.duoke.com/#/dk/main/chat) through an authorized browser session, normalize it with Scrapling, synchronize it with the Gascomp admin catalog, and generate related notes in the project Obsidian vault.

- Capture product SKU, source identity, store identity when required, name, model, description, attributes, variations, and source timestamps.
- Preserve source product names, SKUs, punctuation, leading zeros, variation values, and provider identifiers exactly.
- Do not invent missing fields or replace them with demo content.
- The catalog capture excludes conversations, messages, attachments, and customer personal data.
- Fields that are missing, malformed, or conflicting go to a review report instead of being silently guessed.

## Pipeline

```text
Authorized Duoke browser session
  → product-only response capture
  → normalization and validation
  → data/catalog/duoke-products.json
  → data/reports/duoke-sync-report.json
  → Obsidian product/variation notes
  → idempotent Supabase import
```

The capture filter rejects chat-, message-, customer-, contact-, and order-related responses. It also removes sensitive-shaped fields from accepted product payloads. Private browser profiles and raw captures remain under `scraping/.private/` and are ignored by Git.

The importer matches the stable provider/store/product identity. Re-importing updates source-owned product fields and variations while preserving admin-owned status, images, tutorials, FAQs, and issue guides. Conflicting source identities are excluded and recorded for review.

Commands:

```bash
npm run duoke:login
npm run duoke:import
npm run duoke:push
```

Status: the capture, normalization, reports, Obsidian generation, and Supabase importer are implemented. A fresh authorized Duoke session is required to capture current production catalog data.

## Optional asynchronous HTTP transport

HTTPX is installed in `scraping/.venv` and declared in `scraping/pyproject.toml`
with resolved versions in `scraping/uv.lock`. Reproduce the installation from the
repository root with `uv sync --project scraping --locked --inexact`.

The reusable helper is `scraping/shared/async_http.py`. Import it with:

```python
from scraping.shared.async_http import fetch_pages

# Inside an async function, using an already verified GET endpoint and session:
results = await fetch_pages(
    endpoint=endpoint,
    headers=authorized_headers,
    cookies=authorized_cookies,
    pages=range(1, 4),
    page_parameter="page",
    concurrency=3,
)
failed_pages = [result for result in results if isinstance(result, Exception)]
if failed_pages:
    raise RuntimeError("The batch is incomplete; handle failed pages before importing.")
```

The endpoint, authentication, page parameter, page numbering, and filters must
match a verified read request from the authorized Duoke session. The helper uses
one client, preserves query filters, defaults to three concurrent requests and a
30-second HTTPX timeout, and returns JSON or an exception for each page in input
order. Redirects are not followed. It does not retry automatically; callers must
handle authentication expiry, rate limits (including `Retry-After`), and failed
pages before declaring a capture complete. Use finite batches; dependent cursor
pagination requires sequential requests.

This module is transport infrastructure only. It does not discover endpoints,
transfer browser sessions, save data, or replace the existing catalog capture.
Future catalog integration must retain the product-only filtering, private
capture storage through `scraping.shared.paths`, and existing normalization.
Keep authentication local and never log raw exceptions that may contain request
URLs or private payloads. Live Duoke connectivity and throughput are unverified.

## Product catalog in the conversation vault

`scraping/duoke/catalog/archive_duoke_products.py` captures the product catalog
from `POST https://web.duoke.com/api/v1/dk/unity/product/list` and writes product
notes into the same authorized Obsidian vault as the conversation archive.
Only Douke is a data source. Marketplace names identify channels returned by
Douke; the exporter never fetches marketplace pages, image URLs, or media URLs.

The private session and authorized shop inventory are stored under
`scraping/.private/product-archive/`. The session contains `headers` and the
verified `list_url`; the shop inventory retains only shop metadata needed for
catalog reads. Raw product captures and verification counts use the centralized
`PRODUCT_ARCHIVE_DIR`. The exporter selects product and variant fields, excluding
account credentials and customer data.

```bash
scraping/.venv/bin/python -m scraping.duoke.catalog.archive_duoke_products \
  --fetch --vault "/absolute/path/to/existing/Obsidian vault"
```

Omit `--fetch` to regenerate notes and links from the saved local catalog.
Refresh the private session from verified authenticated Douke browser requests
if it expires. `messageItemIds` must be an empty string when requesting the
unfiltered catalog. The API can return `hasNextPage: false` before the last
page; enumeration uses the page count and total product count instead. Every
page must belong to the expected shop and platform, and every completed shop
must have exactly the expected number of unique source product identities.
A null catalog response is reported separately from an empty, complete catalog.

Product notes live directly under `Duoke/Produk/`, alongside the uniquely named
`Product catalog index.md`. Notes include the source product name, exact product
and variant SKUs, source IDs, full available description, attributes, price and
stock snapshots, and media URL values supplied by Douke. Media are not embedded
or downloaded. Products from different shops or with different source IDs remain
separate even when their SKUs match. Missing source values remain explicitly
missing. A store-grouped index links all products.

The exporter adds product context to the existing private conversation wrapper
without modifying source message payloads. Matching is scoped to the same
platform and shop and uses explicit product-card IDs, unambiguous exact source
names or SKUs, or bounded SKU mentions in message text. An unknown explicit ID,
truncated name, ambiguous name/SKU, or SKU substring cannot silently identify a
product. Conversation notes link products beside the referring message and in a
related-products section; product notes link back to the referring conversations.
These links establish references, not proof of the purchased variant or an
approved troubleshooting answer.

Stable source identities determine filenames, and manual content below the
archive marker survives regeneration. After refreshing the conversation archive,
rerun the product exporter to rebuild product context. This export does not
publish catalog data to Supabase or activate AI answers.

Verified capture on 2026-09-17: Douke returned 414 products and 550 variants from
12 completed marketplace catalog queries, including one empty catalog. The
Facebook channel returned no catalog data and was reported separately. There
are 412 text descriptions and two image-only descriptions; image URL values
are retained as references without fetching or embedding external media.
One product SKU and 23 variant SKUs are missing in the source.

The catalog links 2,388 messages in 755 of the 881 archived conversations to
112 referenced products. Another 116 message references are ambiguous and have
review markers in their transcripts, with content-free references recorded in
`scraping/.private/product-archive/context-review.json`. All 13,449 source messages
remain intact. Verification checked 5,371 generated product/conversation links;
counts are saved in `scraping/.private/product-archive/link-verification.json`.
