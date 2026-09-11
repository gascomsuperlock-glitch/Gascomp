# Supabase storage

[Specification index](../spec.md)

Supabase PostgreSQL is the primary shared database; Supabase Storage holds product images and warranty evidence.

| Requirement | Store |
| --- | --- |
| Products, variations, help content, publication state | PostgreSQL |
| Product image files | Public `product-images` bucket |
| Image metadata and product/variation relationships | PostgreSQL |
| Warranty tickets and evidence metadata | Private PostgreSQL tables |
| Warranty evidence files | Private `warranty-evidence` bucket |
| Duoke source identity and import history | PostgreSQL |
| Product/knowledge graph notes | Project Obsidian vault |

Public clients can read only published products and their related content. Archived products that were published remain readable by their stable URL. Drafts, tickets, evidence, import runs, and all writes require the server-side secret key. Server Actions verify the admin session before protected changes.

The application preserves stable source identities to prevent duplicates. Duoke and warehouse imports update source-owned fields while retaining content maintained by administrators.

Data flow: **Duoke or warehouse → validation/normalization → Supabase → admin panel and customer website**. Obsidian notes are generated from the same product and knowledge records.

Status: catalog, help-content, import-history, warranty-ticket, and evidence tables are implemented. The `product-images` and `warranty-evidence` buckets are configured. See [Supabase setup](../../setup/supabase.md).
