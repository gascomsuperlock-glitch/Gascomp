# Python capture and knowledge workflows

[Workspace map](../CONTEXT.md) · [Root rules](../AGENTS.md)

## Context

Scope: `scraping` and its descendants unless a closer context is listed in the workspace map.

Own authorized capture, normalization, knowledge preparation, Duoke reply automation, and the separate customer-assistance worker.

## Inputs

Read the relevant references for the requested task, not every linked document.

- [Primary Percakapan reference retrieval](../docs/product/integrations/duoke-support.md#percakapan-as-the-primary-admin-reference-source)
- [Customer resolution, full Obsidian references, and WhatsApp handoff](../docs/product/integrations/duoke-support.md#customer-problem-resolution-and-whatsapp-handoff)

- [Placement and dependencies](../docs/architecture/project-structure.md)
- [Duoke catalog specification](../docs/product/integrations/duoke-catalog.md)
- [Knowledge and replies specification](../docs/product/integrations/duoke-support.md)
- [Hermes Desktop automatic-reply target](../docs/product/integrations/duoke-support.md#target-automatic-replies-through-hermes-desktop)
- [Reference-based replies and continuous operation](../docs/product/integrations/duoke-support.md#reference-based-replies-and-continuous-operation)
- [Interactive chat versus scheduled execution](../docs/product/integrations/duoke-support.md#interactive-chat-and-scheduled-execution)
- [Customer-facing identity: Ayu from Gascomp](../docs/product/integrations/duoke-support.md#customer-facing-identity)
- [Response latency and greeting handling](../docs/product/integrations/duoke-support.md#response-latency)
- [Warehouse import specification](../docs/product/integrations/warehouse.md)
- [AI assistance specification](../docs/product/features/ai-assistance.md)
- [AI worker setup](../docs/setup/ai-assistance.md)

## Tasks

These are responsibilities triggered by the current request, not an automatic backlog.

| When asked to work on | Process | Expected result |
| --- | --- | --- |
| duoke/catalog/ | Trace authorized product capture through normalization or archive generation. | Stable product identities and reviewable catalog output. |
| duoke/chat/ | Inspect authorized capture/archive scope and private storage. | Preserved source history with privacy-aware derived notes. |
| duoke/knowledge/ | Map and index the full existing Obsidian admin Q&A database; preserve question-answer associations, product context, provenance, and updates. Distinguish reusable admin answers from unrelated transcript content. | Matching customer questions retrieve applicable admin answer references without an arbitrary starter-note limit. |
| duoke/reply/ | Follow the reference-based, continuous-operation contract: Hermes orchestrates Obsidian retrieval and headless Chrome delivery; measure latency and verify supervised recovery alongside delivery guards. | Grounded Ayu replies with traceable admin sources and a verified path to unattended 24/7 operation; distinguish requirements from observed runtime behavior. |
| ai_assistance/ | Check corpus inputs, grounding, job protocol, and response validation. | Grounded website assistance consistent with server contracts. |
| warehouse/ | Validate XLSX schema, identities, and normalization reports. | Normalized source-owned data with explicit rejected rows. |
| shared/ | Use module-relative paths and privacy/environment helpers. | Reusable infrastructure without hardcoded working-directory assumptions. |
| tests/ | Use temporary synthetic inputs and the repository virtual environment. | Meaningful regression coverage without live customer data. |

## Boundaries

- Use `shared/paths.py` and `python -m` package entrypoints.
- Keep `.private/`, `.venv/`, and `__pycache__/` outside documentation scaffolding.
- A dry-run or worker command may access external services; inspect the selected operation first.
- Do not activate reply delivery, production imports, or knowledge approval solely because a task row exists.

## Outputs and verification

For Hermes customer replies, verify that known questions retrieve applicable
admin answers and unresolved issues receive an official WhatsApp handoff. Keep
tool/status/queue information out of customer text. Audit all connected Obsidian
source folders and retrieval exclusions before attributing missed answers to a
lack of knowledge; corpus counts alone are insufficient evidence.

For owner-operated Hermes Desktop replies, use the
[setup, preview, start, monitor, and stop procedure](../docs/setup/duoke-hermes-desktop.md).

Keep code in the owning package and tests in `tests/`; preserve documented schemas and output locations.

For Python changes, run `npm run duoke:test` through the repository virtual environment. Keep validation local or use an appropriate authorized preview; report unavailable service checks separately.

For an unrelated request, return to the workspace map. For unfinished work, use the
[handoff index](../docs/work/README.md) and [continuity workflow](../docs/work/workflow.md).
