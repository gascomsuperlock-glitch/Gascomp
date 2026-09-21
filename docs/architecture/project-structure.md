# Project structure

The project uses **feature-based architecture**. Business responsibilities define module boundaries; Next.js provides the routing and composition layer.

```text
src/
  app/                            # Pages, layouts, metadata, route handlers, global CSS
  features/
    auth/                         # Admin sign-in, session, and sign-out
    catalog/                      # Public catalog, product help, editors, QR, content
    warranty/                     # Claims, tickets, status, and evidence
    gascomp-care/                 # Member accounts, sessions, and virtual cards
    service-center/               # Indonesian locations, public map, and location administration
    ai-assistance/                # Grounded customer chat, worker contracts, and runtime controls
    admin/                        # Dashboard, navigation, cross-feature overview
  shared/
    components/                   # Brand, header, and reusable UI
    lib/                          # IDs, class names, YouTube/WhatsApp helpers, icon types
    integrations/supabase/        # Server-only client creation
scraping/
  ai_assistance/                  # Dedicated Obsidian index and local Hermes worker
  duoke/{catalog,chat,knowledge,reply}/
  warehouse/                      # XLSX reading and normalization
  shared/                         # Paths, JSON, environment, privacy helpers
  tests/                          # Unit tests and temporary fixtures
  .private/                       # Private runtime data; ignored by Git
  .venv/                          # Local Python environment; ignored by Git
scripts/
  duoke/                          # Supabase import and knowledge export
  warehouse/                      # Warehouse preview and import
  supabase/                       # Connection checks
  shared/                         # Paths, environment, script clients
  scratch/                        # Manual experiments; never application entrypoints
data/{catalog,knowledge,reports}/
docs/{architecture,product,reference,setup,brand,work}/
Skill/<skill-name>/                # Repository skill sources; see Skill/CONTEXT.md
obsidian/                         # Knowledge vault; stable location
public/                           # Public URL assets; stable location
supabase/migrations/              # Ordered database migrations; stable location
```

## Placement and dependency rules

- `app` composes features and owns Next.js route contracts. Business logic and Server Actions belong to their owning feature.
- `admin` may compose catalog, warranty, GascompCare, service-center, and authentication modules. Features must not import `app` or `admin`.
- `shared` must not import features or routes. ESLint enforces the main alias dependency boundaries.
- A feature may use `components`, `hooks`, `model`, and `server` when those folders contain real modules. Do not create empty convention folders.
- Import client and server modules directly. Do not combine them in a barrel export. Database and filesystem modules use `server-only`; Server Actions use `use server`.
- `@/*` resolves to `src/*`; `@data/*` resolves to root `data/*`. Relative imports are allowed within one cohesive module. Use `import type` for type-only dependencies.
- TypeScript and JavaScript files use `kebab-case`; React components use `PascalCase`; Python files and packages use `snake_case`. Framework-reserved files, migrations, source files, and public assets keep their required names.

## Data ownership and compatibility

| Location | Contents |
| --- | --- |
| `data/catalog` | Normalized Duoke and warehouse catalogs |
| `data/knowledge` | Runtime knowledge, reviewed entries, bot messages |
| `data/reports` | Synchronization, import, and preview reports |
| `.data/warranty-tickets` | Local tickets and evidence; ignored by Git |
| `scraping/.private` | Browser sessions, captures, audits, state, stop marker |
| `obsidian` | Product and knowledge notes |

Python paths are centralized in `scraping/shared/paths.py`; Node scripts use `scripts/shared/paths.mjs`. Paths resolve from module locations rather than the process working directory.

Public URLs, npm command names, CLI arguments, session cookies, local-storage keys, JSON schemas, database schema identifiers, and source-provider values remain compatible. Direct Python invocations use modules:

```bash
scraping/.venv/bin/python -m scraping.duoke.knowledge.approve_duoke_knowledge --help
```

## Language standard

English is required for application copy, comments, documentation, CLI messages, validation errors, system-generated content, database identifiers, and system defaults. See [Language standard](language-standard.md) for exact exceptions. Stable Indonesian route segments remain unchanged to preserve existing links and printed QR codes. Imported product names, SKUs, warehouse headers, and captured customer text retain their source values.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run duoke:test
npm run build
```

Node model tests live beside their modules as `*.test.mjs`. Python tests use the project virtual environment. Browser checks cover the catalog, product detail, login/logout, editor, QR, warranty submission, ticket status, and private evidence access.

Product requirements are grouped in the [topic index](../product/spec.md). Database setup is documented in [Supabase setup](../setup/supabase.md).

## Folder context contracts

The root [CONTEXT.md](../../CONTEXT.md) maps responsibilities to folder contexts.
Before working in a selected area, load its context explicitly through that map.
A context owns the area's purpose, input references, supported task/process/output
table, boundaries, and verification. Root AGENTS.md remains the global rule owner;
product specifications remain the behavior owner. Contexts link those sources and
must be updated alongside responsibility or placement changes.

Application routes, shared infrastructure, each feature, scripts, scraping,
Supabase, and docs have local `CONTEXT.md` files. Their technical descendants
inherit that context; scripts, scraping, and docs include dispatch rows for child
folders. Add a more specific context only when that child needs distinct guidance,
and link it from its parent or the workspace map. No automatic editor discovery
of `CONTEXT.md` is assumed.

Data, Obsidian, and public asset contexts live in `docs/architecture/folder-contexts/`
to avoid inserting agent instructions into generated data, knowledge ingestion,
or publicly served assets. Dependency folders, caches, private runtime state, and
third-party reference repositories do not receive project context scaffolding.

Keep context filenames stable. The status/version handoff naming convention does
not apply to persistent folder contracts. A context's Tasks table describes work
that can be requested; only actual requested work belongs in dated handoffs.

## Work continuity documents

`docs/work/workflow.md` owns the procedure for pickup and handoff.
`docs/work/README.md` indexes focused notes in `docs/work/handoffs/`.
Create one note per actual workstream when continuity is needed; do not scaffold
empty notes for every feature. Handoffs record dated observations and next steps,
not product requirements or customer knowledge. Use the [workflow](../work/workflow.md)
for ownership, maintenance, and verification rules. Handoff artifacts use
`handoff-<topic>-<status>-v<version>.md`; the workflow owns the status mapping and
rename procedure. Stable instruction files and topic specifications keep their
existing names.

## Reusable work procedures

`docs/work/learning.md` owns extraction of goals, corrections, sources, reasons,
assumptions, and acceptance evidence from dialogue. Focused methods live in
`docs/work/procedures/` with stable descriptive filenames and are linked from the
owning context. Product decisions stay in the topic specification; actual run
results stay in handoffs. Procedures describe the steps, not a duplicate backlog.

### Decision: derive procedures from observed work

Recorded: 2026-09-18

Source: the owner supplied Jake's dialogue/context explanation and requested that
missing parts of this project's workflow be completed and clarified.

Decision: retain the existing folder contexts and supplement recurring tasks with
source-attributed decisions, concrete procedures, acceptance cases, and dated
verification. Start with status/solution work in warranty.

Reason: the preceding discussion identified a gap between folder responsibilities
and a method supported by actual work. Selecting warranty as the initial example
was the agent's proposal in that discussion; it is not a newly recovered warranty
product requirement.

Supersedes: None. This extends folder contracts and continuity documentation.

Acceptance: a status/solution request can reach the procedure through the warranty
context, then find its requirement, entrypoints, expected results, and evidence.
See the [procedure](../work/procedures/warranty-status.md) and
[dated warranty evidence](../work/handoffs/handoff-warranty-review-v1.md).

## Methodology references

The agreed structure follows feature-based architecture and the repository methodology references:

- https://www.skool.com/cliefnotes/classroom/036893d9?md=3dfa0ebc083349e4928e6b8e3b54b7fd
- https://www.skool.com/cliefnotes/classroom/d3907117?md=f7a33a9888604a08a7e48bb876682691
- https://www.skool.com/cliefnotes/classroom/2a86a1d1?md=c7a59d0fa0c145549dc9126470b7f82f

The public pages expose module titles and require an authenticated account for lesson content. The implementation agreement remains: routing in `src/app`, features in `src/features`, reusable modules in `src/shared`, and static assets in `public`.
