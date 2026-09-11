<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Read specifications by task

- Start with the [specification index](docs/product/spec.md), then read only the topic documents relevant to the task.
- Open cross-topic references only when needed; do not load the entire specification folder by default.
- Record changes in the document that owns the topic. Keep `spec.md` as a concise index.
- Follow the [English language standard](docs/architecture/language-standard.md). Preserve listed compatibility values exactly.

## Language requirement

- Use English as the standard language for every task, including code, configuration, documentation, comments, tests, logs, generated content, and other project-owned output.
- Keep only the exact external values listed as compatibility exceptions in the [English language standard](docs/architecture/language-standard.md).
