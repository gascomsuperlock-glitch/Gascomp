# Duoke knowledge and automated replies

[Specification index](../spec.md)

## Knowledge sources and review

Published admin content is the primary approved source. Historical Duoke conversations may create anonymized review candidates, but old support replies never become active answers automatically.

```text
Published product content ────────────────┐
                                         ├→ approved runtime knowledge → retrieval → Duoke runner
Authorized historical chat capture       │
  → redaction → pending candidate         │
  → explicit human review and approval ──┘
```

“Learning” means curating and retrieving a knowledge base. The project does not train or fine-tune a model.

## Implemented modules

- `scripts/duoke/export-duoke-knowledge.mjs` exports published FAQs, issue guides, and valid tutorials from Supabase. Short or incomplete entries are skipped and reported.
- `scraping/duoke/chat/capture_duoke_chats.py` captures only conversations selected by an authorized operator and stores raw payloads privately.
- `scraping/duoke/knowledge/build_duoke_knowledge.py` identifies customer/support turns, redacts personal data, and creates pending Obsidian candidates.
- `scraping/duoke/knowledge/approve_duoke_knowledge.py` requires a reviewer to provide an anonymized question and verified English answer before activation.
- `scraping/duoke/knowledge/knowledge_engine.py` resolves product/SKU context and deterministically ranks approved answers.
- `scraping/duoke/reply/duoke_auto_reply.py` supports dry-run and send modes, stable message identity, duplicate prevention, pre-send rechecks, delivery verification, and content-free audit logs.

Indonesian words remain in the redaction and retrieval dictionaries because they match external customer messages. System prompts, generated answers, reports, logs, documentation, and operator-facing output use English.

## Delivery rules

- Missing or ambiguous product context produces an approved clarification only when clarification delivery is enabled.
- Low-confidence or unanswered questions are escalated to support.
- A conversation is skipped when its latest message came from support or its stable identity was already processed.
- The runner re-reads the latest message immediately before delivery and verifies that the reply appears afterward.
- Product tutorial links point to the Gascomp page, not directly to YouTube.
- Send mode requires both `--send` and `DUOKE_AUTOREPLY_ENABLED=true`.
- Send mode rejects HTTP and localhost knowledge-base origins.
- `scraping/.private/STOP_AUTOREPLY` stops watch mode until `npm run duoke:resume` removes it.

## Operator workflow

```bash
npm run duoke:login
npm run duoke:inspect
npm run duoke:chat:capture
npm run duoke:knowledge:build
npm run duoke:knowledge:export
npm run duoke:reply:dry-run
```

The operator must select the correct store and history period, configure selectors from the authorized account, inspect the private audit, and verify the dry run before enabling delivery.

Status: the data pipeline, Obsidian review flow, approval path, retrieval engine, audit, stop control, and headless runner are implemented. Production history capture, selector verification, and real delivery require a refreshed authorized Duoke session. No customer message was sent during implementation.
