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
docs/{architecture,product,reference,setup,brand}/
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

## Methodology references

The agreed structure follows feature-based architecture and the repository methodology references:

- https://www.skool.com/cliefnotes/classroom/036893d9?md=3dfa0ebc083349e4928e6b8e3b54b7fd
- https://www.skool.com/cliefnotes/classroom/d3907117?md=f7a33a9888604a08a7e48bb876682691
- https://www.skool.com/cliefnotes/classroom/2a86a1d1?md=c7a59d0fa0c145549dc9126470b7f82f

The public pages expose module titles and require an authenticated account for lesson content. The implementation agreement remains: routing in `src/app`, features in `src/features`, reusable modules in `src/shared`, and static assets in `public`.
