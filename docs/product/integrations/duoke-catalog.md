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
