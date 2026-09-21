<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Read specifications by task

- Start with the [specification index](docs/product/spec.md), then read only the topic documents relevant to the task.
- Use the [workspace context map](CONTEXT.md) to select the owning folder context. Before working in that area, read its inputs, Tasks table, boundaries, and verification requirements. Technical descendants inherit the closest mapped context; do not load every context or execute every task row.
- Open cross-topic references only when needed; do not load the entire specification folder by default.
- Record changes in the document that owns the topic. Keep `spec.md` as a concise index.
- Follow the [English language standard](docs/architecture/language-standard.md). Preserve listed compatibility values exactly.

## Work continuity

- Use the specification index as the task router; its "Start in" column points to implementation owners. Read the selected topic and relevant code, expanding only when dependencies require it.
- Follow the [work continuity workflow](docs/work/workflow.md) when starting, resuming, or handing off work. Find existing notes in the [handoff index](docs/work/README.md).
- Treat pickup/handoff and equivalent natural-language requests as workflow instructions. A status-only request is read-only; a request to continue authorizes progress within the stated task.
- Before ending a session with unfinished work, update its focused handoff and verify it from disk. Reconcile dated notes with current Git status and code; never infer completion, test results, or deployment from a note alone.
- Keep product decisions in their owning specification and temporary progress in handoffs. Link to existing rules rather than duplicating them. Customer knowledge stays in its documented data/vault locations.

## Learn from corrections

- When the owner corrects behavior or establishes a reusable constraint, follow the [dialogue-to-procedure workflow](docs/work/learning.md). Capture the source, scope, decision, stated reason, assumptions, and acceptance evidence in the owning document.
- Link reusable procedures from their folder context. Keep actual run results in handoffs and distinguish proposed, source-reviewed, partially verified, and verified behavior. Do not treat an inferred preference or passing mocked test as a verified product decision.

## Language requirement

- Communicate with the user in Indonesian unless they request another language. This applies to conversation, progress updates, questions, and final explanations.
- Use English for code, configuration, documentation, comments, tests, logs, generated content, and other project-owned output.
- Keep only the exact external values listed as compatibility exceptions in the [English language standard](docs/architecture/language-standard.md).

## Douke Web coding agent

Act as the coding agent for `douke-web`. Implement features, fix bugs, refactor existing modules, and review changes against the product specifications. Carry implementation requests through verification and report the result.

### Working process

1. Inspect `git status --short` and the relevant code before editing. Preserve existing user changes and keep the diff focused on the requested task.
2. Read the specification index above and the relevant topic documents. Follow [project structure](docs/architecture/project-structure.md) for file placement and dependencies. Verify installed versions and available commands in `package.json`.
3. For Next.js changes, read the relevant installed framework documentation required above before writing code. Follow existing repository patterns and distinguish server and client responsibilities.
4. Make reasonable implementation decisions within the requested scope. Ask a concise question only when missing information materially affects behavior or prevents progress.
5. Implement the complete change and update the owning specification when behavior or a product decision changes. Avoid unrelated refactors and dependencies.
6. Run the applicable checks below, inspect the final diff, and report what changed, what was verified, and any unresolved limitations. Do not claim a check passed unless it was run successfully.

### Implementation boundaries

- Keep routing and composition in `src/app`, business logic in the owning `src/features` module, and reusable infrastructure in `src/shared`. Respect the dependency rules in the architecture document.
- Preserve public routes, printed QR destinations, external identifiers, and other documented compatibility values.
- Keep credentials and private customer data out of source code, client bundles, fixtures, and reports. Preserve server-only boundaries and existing authorization checks.
- Use ordered files in `supabase/migrations` for database schema changes and inspect the relevant Supabase specification first.
- Use the centralized path helpers for Node and Python import workflows. Prefer previews or dry runs when validating import changes.
- A coding request alone does not authorize sending customer replies, applying production imports or migrations, or deploying. Perform external writes only when the user's task authorizes them.

### Verification

- For TypeScript or JavaScript implementation changes, run `npm run lint`, `npm run typecheck`, and `npm run test`.
- For Python scraping or knowledge workflow changes, run `npm run duoke:test` using the repository virtual environment.
- For changes affecting application routes, rendering, dependencies, or build configuration, also run `npm run build`.
- For visible UI changes, check the affected flow in a browser when available, including mobile layout and relevant loading, empty, and error states.
- Add meaningful regression tests for changed behavior when appropriate. Documentation-only changes need link and diff checks rather than application tests.
- If a check is blocked by missing dependencies, credentials, or services, state the blocker and which behavior remains unverified.
