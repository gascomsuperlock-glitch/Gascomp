# Knowledge handoff

Updated: 2026-09-18
Status: Awaiting verification

## Objective

Preserve the existing knowledge and product-note changes until their provenance and
intended publication state can be reviewed. No new knowledge refresh or publication
was requested during the documentation organization task.

## Current evidence

Git status shows a modified runtime knowledge index, vault index, and existing
product note; a deleted approved tutorial note; and untracked FAQ, issue, and product
notes. These changes were present before this task. Their content was not audited,
regenerated, renamed, or imported during this task. File naming and placement alone
do not establish approval or correctness.

## Remaining work and decisions

Determine which existing workflow produced the changes and whether the note deletion
and additions match the intended source changes. Verify stable identities, links,
and approval metadata using the owning specifications. Do not assume these are
manual notes or disposable output. Publication and production state are unverified.

## Verification

Only the working-tree inventory and integration specifications were inspected.
Knowledge content, generated links, and pipeline behavior remain unverified.
If Python workflow code changes, run `npm run duoke:test` using the repository
virtual environment; follow the root checks for any JavaScript changes. Prefer
local previews when available and inspect command behavior before running exporters
that may access services or overwrite files.

## Next action

When asked to resume knowledge work, review the current diff and the producing
export/import workflow to establish provenance and the intended change, then
validate the affected records without exposing customer data in reports.

## References

- [Knowledge and replies specification](../../product/integrations/duoke-support.md)
- [Catalog synchronization specification](../../product/integrations/duoke-catalog.md)
- [Knowledge exporter](../../../scripts/duoke/export-duoke-knowledge.mjs)
- [Runtime knowledge directory](../../../data/knowledge/)
- [Knowledge vault](../../../obsidian/)
- [Centralized Node paths](../../../scripts/shared/paths.mjs)
- [Centralized Python paths](../../../scraping/shared/paths.py)
