# Node operational scripts

[Workspace map](../CONTEXT.md) · [Root rules](../AGENTS.md)

## Context

Scope: `scripts` and its descendants unless a closer context is listed in the workspace map.

Own Node-based imports, exports, local operational tooling, and shared script infrastructure.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Placement and dependencies](../docs/architecture/project-structure.md)
- [Duoke catalog specification](../docs/product/integrations/duoke-catalog.md)
- [Knowledge and replies specification](../docs/product/integrations/duoke-support.md)
- [Warehouse import specification](../docs/product/integrations/warehouse.md)
- [Database and migration specification](../docs/product/integrations/supabase.md)
- [AI assistance specification](../docs/product/features/ai-assistance.md)
- [Available commands](../package.json)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| duoke/ | Read the catalog or knowledge specification; inspect exporter/importer side effects. | Validated synchronization or export changes with stable identities. |
| warehouse/ | Inspect normalization inputs and use the import preview when appropriate. | SKU mapping and preservation rules remain intact. |
| catalog/ | Check brochure-to-SKU matching and the description-only update contract. | A scoped preview or authorized update of descriptions. |
| ai-assistance/ | Inspect launch, pilot, and preview behavior for the requested operation. | Reproducible local worker operations and explicit runtime state. |
| supabase/ | Read migration baseline rules and inspect target/history before release work. | Validated connection or migration tooling; production application only when authorized. |
| shared/ | Use centralized paths, environment parsing, and script clients. | Consistent module-relative paths across scripts. |
| scratch/ | Inspect experiments only when relevant to the current task. | Isolated experiments with no application entrypoint dependency. |

## Boundaries

- Inspect command behavior: an export or preview can access services or overwrite local artifacts.
- Do not apply imports/migrations or send customer replies without task authorization.
- Preserve source IDs and admin-managed content; use `shared/paths.mjs`.

## Outputs and verification

Place scripts and adjacent Node tests in their owning subfolder. Output artifacts belong to the documented data/private locations, not arbitrary new directories.

For TypeScript/JavaScript changes, run `npm run lint`, `npm run typecheck`, and `npm run test`. Add `npm run build` for route/rendering/dependency/build changes. For visible changes, check the affected desktop/mobile flow and loading, empty, and error states in a browser when available. Report any blocked checks.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../docs/work/README.md) and [continuity workflow](../docs/work/workflow.md).
