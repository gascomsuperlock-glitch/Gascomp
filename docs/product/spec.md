# Gascomp specification index

Specifications are grouped by topic to keep each working context small. Read the document relevant to the task and open another topic only when a dependency requires it.

## Task contexts

| Topic | Document | Read for | Start in |
| --- | --- | --- | --- |
| Product overview and scope | [overview](overview.md) | Purpose, users, initial scope, success indicators, open decisions | [README](../../README.md) |
| Product catalog and help | [catalog](features/catalog.md) | Search, product pages, issues, FAQs, tutorial videos | [catalog](../../src/features/catalog/) |
| Admin panel | [admin](features/admin.md) | Authentication, CRUD, drafts/publication, images, dashboard | [admin](../../src/features/admin/), [auth](../../src/features/auth/), [catalog](../../src/features/catalog/) |
| Product QR codes and URLs | [qr](features/qr.md) | Per-SKU QR, stable URLs, archived-guide retention | [QR component](../../src/features/catalog/components/qr-code-card.tsx), [routes](../../src/app/) |
| Customer support channels | [support](features/support.md) | WhatsApp, Gascomp Care, Service Center | [catalog](../../src/features/catalog/), [service center](../../src/features/service-center/) |
| AI assistance | [ai-assistance](features/ai-assistance.md) | Obsidian-grounded conversational chat, Hermes worker, WhatsApp handoff, runtime controls | [feature](../../src/features/ai-assistance/), [worker](../../scraping/ai_assistance/), [operations](../../scripts/ai-assistance/) |
| Warranty claims and tickets | [warranty](features/warranty.md) | Form, evidence, ticket number, status, private access, policy | [warranty](../../src/features/warranty/) |
| GascompCare membership | [gascomp-care](features/gascomp-care.md) | Member accounts, login, virtual cards, planned paid warranty extensions | [gascomp-care](../../src/features/gascomp-care/) |
| Duoke catalog synchronization | [duoke-catalog](integrations/duoke-catalog.md) | Scrapling, source fields, idempotent import, Obsidian product graph | [capture](../../scraping/duoke/catalog/), [scripts](../../scripts/duoke/) |
| Supabase storage | [supabase](integrations/supabase.md) | Shared database, Storage, access rules, migrations | [client](../../src/shared/integrations/supabase/), [migrations](../../supabase/migrations/) |
| Warehouse SKU import | [warehouse](integrations/warehouse.md) | XLSX normalization, SKU matching, images, import result | [normalization](../../scraping/warehouse/), [import](../../scripts/warehouse/) |
| Duoke knowledge and replies | [duoke-support](integrations/duoke-support.md) | Historical chat, review, approval, retrieval, runner, audit, stop control | [knowledge](../../scraping/duoke/knowledge/), [reply runner](../../scraping/duoke/reply/), [export](../../scripts/duoke/export-duoke-knowledge.mjs) |
| Brand identity and public design | [brand](design/brand.md) | Gascomp reference, logo, color, typography, mobile design | [shared components](../../src/shared/components/), [routes and styles](../../src/app/), [assets](../../public/) |
| Domain and deployment | [deployment](operations/deployment.md) | Hostinger, hostname, DNS, HTTPS, server runtime, production environment | [configuration](../../next.config.ts), [package commands](../../package.json) |
| Project structure | [architecture](../architecture/project-structure.md) | File placement, dependencies, naming, methodology | [source](../../src/), [scripts](../../scripts/), [scraping](../../scraping/) |
| English language standard | [language](../architecture/language-standard.md) | Canonical language and compatibility exceptions | [agent instructions](../../AGENTS.md) |

For work continuity, use the [workflow](../work/workflow.md) and [handoff index](../work/README.md). If a task does not match a row, use the project structure document to locate its owner before expanding the search.

Use the [folder context map](../../CONTEXT.md) for the selected implementation area’s inputs, tasks, outputs, and verification.

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
