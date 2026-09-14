# Gascomp specification index

Specifications are grouped by topic to keep each working context small. Read the document relevant to the task and open another topic only when a dependency requires it.

## Task contexts

| Topic | Document | Read for |
| --- | --- | --- |
| Product overview and scope | [overview](overview.md) | Purpose, users, initial scope, success indicators, open decisions |
| Product catalog and help | [catalog](features/catalog.md) | Search, product pages, issues, FAQs, tutorial videos |
| Admin panel | [admin](features/admin.md) | Authentication, CRUD, drafts/publication, images, dashboard |
| Product QR codes and URLs | [qr](features/qr.md) | Per-SKU QR, stable URLs, archived-guide retention |
| Customer support channels | [support](features/support.md) | WhatsApp, Gascomp Care, Service Center |
| Warranty claims and tickets | [warranty](features/warranty.md) | Form, evidence, ticket number, status, private access, policy |
| Duoke catalog synchronization | [duoke-catalog](integrations/duoke-catalog.md) | Scrapling, source fields, idempotent import, Obsidian product graph |
| Supabase storage | [supabase](integrations/supabase.md) | Shared database, Storage, access rules, migrations |
| Warehouse SKU import | [warehouse](integrations/warehouse.md) | XLSX normalization, SKU matching, images, import result |
| Duoke knowledge and replies | [duoke-support](integrations/duoke-support.md) | Historical chat, review, approval, retrieval, runner, audit, stop control |
| Brand identity and public design | [brand](design/brand.md) | Gascomp reference, logo, color, typography, mobile design |
| Domain and deployment | [deployment](operations/deployment.md) | Hostinger, hostname, DNS, HTTPS, server runtime, production environment |
| Project structure | [architecture](../architecture/project-structure.md) | File placement, dependencies, naming, methodology |
| English language standard | [language](../architecture/language-standard.md) | Canonical language and compatibility exceptions |

## Maintenance rules

- Keep `spec.md` as a concise index. Put details in the document that owns the topic.
- Read `overview.md` only when the task needs overall product context.
- Follow cross-topic links as needed; do not load the entire specification set by default.
- Record decision and status changes in one owning document without duplicating them elsewhere.
- Add a new focused document and index row when a new independent topic appears.
- Treat implementation status as a dated note and verify current behavior in code.
- Use English as the standard language for every task and all project-owned output, including code, configuration, documentation, comments, tests, logs, generated content, and operator-facing copy.
- Customer-facing product experiences must support both Indonesian and English and provide a language selector.
- Preserve exact external values only when they are listed as compatibility exceptions in the [English language standard](../architecture/language-standard.md).
