# Douke Web workspace context

[Root rules](AGENTS.md) · [Product task map](docs/product/spec.md) · [Work handoffs](docs/work/README.md)

## Purpose

Maintain the Gascomp product-help application and its catalog, warranty, member,
service-center, and support workflows. The owner's current request supplies the
mission; folder contexts define where and how that work is handled.

## Select a folder context

Read the matching product specification, then only the context for the area you
will inspect or change. Each context lists inputs, supported tasks, boundaries,
outputs, and verification. Follow another context only for a real dependency.

| Folder scope | Context | Responsibility |
| --- | --- | --- |
| `src/app/` | [Read context](src/app/CONTEXT.md) | Routes and composition |
| `src/shared/` | [Read context](src/shared/CONTEXT.md) | Reusable infrastructure |
| `src/features/auth/` | [Read context](src/features/auth/CONTEXT.md) | Admin authentication |
| `src/features/catalog/` | [Read context](src/features/catalog/CONTEXT.md) | Catalog and product help |
| `src/features/warranty/` | [Read context](src/features/warranty/CONTEXT.md) | Warranty claims and tickets |
| `src/features/gascomp-care/` | [Read context](src/features/gascomp-care/CONTEXT.md) | GascompCare membership |
| `src/features/service-center/` | [Read context](src/features/service-center/CONTEXT.md) | Service center directory |
| `src/features/ai-assistance/` | [Read context](src/features/ai-assistance/CONTEXT.md) | Customer AI assistance |
| `src/features/admin/` | [Read context](src/features/admin/CONTEXT.md) | Admin workspace composition |
| `scripts/` | [Read context](scripts/CONTEXT.md) | Node operations |
| `scraping/` | [Read context](scraping/CONTEXT.md) | Python workflows |
| `supabase/` | [Read context](supabase/CONTEXT.md) | Schema and release baseline |
| `docs/` | [Read context](docs/CONTEXT.md) | Documentation |
| `Skill/` | [Read context](Skill/CONTEXT.md) | Repository agent skills |
| `data/` | [Read context](docs/architecture/folder-contexts/data.md) | External context for data |
| `obsidian/` | [Read context](docs/architecture/folder-contexts/obsidian.md) | External context for obsidian |
| `public/` | [Read context](docs/architecture/folder-contexts/public.md) | External context for public |

## Dispatch and inheritance

- `src/` routes to application, shared, or feature ownership above. `src/features/` routes by feature; it does not own cross-feature business logic.
- Technical descendants such as `components/`, `model/`, `server/`, route segments, and operational subpackages inherit the closest listed context. Scripts, scraping, and docs contexts contain task rows for their child folders.
- The contexts for data, Obsidian, and public assets live under documentation to keep agent instructions outside generated, ingested, or publicly served content.
- Root configuration work starts with [project structure](docs/architecture/project-structure.md), [package commands](package.json), and the applicable topic specification. Inspect consumers before changing build, lint, dependency, or deployment configuration.
- Dependency folders, caches, private runtime state, Git internals, and third-party reference checkouts are not task destinations to scaffold. Inspect them only when needed for the requested work. Existing `awesome-codex-subagents/` is reference material whose ownership is recorded in the handoff index.
- If no folder matches, return to the product task map, identify the smallest owning area, and add a context only if a new responsibility exists. Do not search every folder by default.
- Duoke automation work starts in the [Python context](scraping/CONTEXT.md) and follows the [Hermes Desktop automatic-reply target](docs/product/integrations/duoke-support.md#target-automatic-replies-through-hermes-desktop). Current implementation gaps belong in the linked work handoff.
- The [corrected Duoke concept](docs/product/integrations/duoke-support.md#reference-based-replies-and-continuous-operation) uses the full Obsidian admin Q&A database as answer references, Hermes as the harness, and headless Chrome for continuous customer service. Greeting optimization is secondary; 24/7 readiness requires separate operational verification.

## Tasks and current state

A context's Tasks table is a reusable work contract, not a request to execute every
row. The current user request defines the task and authorization. Use the handoff
index for actual unfinished work; do not invent per-folder backlog items.

`CONTEXT.md` files are explicitly loaded through these links and root instructions;
this workflow does not depend on an editor automatically loading that filename.
Use the [continuity workflow](docs/work/workflow.md) to save progress, and verify
current files before treating any handoff as current truth.

Capture reusable corrections with the [learning workflow](docs/work/learning.md).
For a recurring task, use the concrete procedure linked by its folder context;
check dated evidence before assuming that method is verified.
