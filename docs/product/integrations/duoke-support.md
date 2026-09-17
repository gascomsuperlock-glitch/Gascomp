# Duoke knowledge and automated replies

[Specification index](../spec.md)

## Knowledge sources and review

Published admin content is the primary approved source. Historical Duoke conversations may create anonymized review candidates, but old support replies never become active answers automatically.

The website AI assistance can also preview and extract existing Obsidian
conversation exports from the sibling `douke-chat` vault into its own private
review artifacts. This does not activate the Duoke reply runner or change its
approval pipeline. See [AI assistance setup](../../setup/ai-assistance.md#reuse-existing-duoke-conversation-notes)
for the separate transcript review workflow.

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

## Full conversation archive

`scraping/duoke/chat/archive_duoke_chats.py` exports the conversations available
to an authorized account using HTTPX. The verified read endpoints are
`POST /api/v1/im/conversation/queryConversationList` and
`GET /api/v1/im/message/list` on `https://web.duoke.com`. This transport allows
only those method/path pairs. It follows conversation cursors until `hasMore`
is false, requests every message page, deduplicates source message IDs, and
compares the unique count against `totalSize`. Unexpected pagination, changing
totals, or mismatched conversation identities cannot produce a complete result.

The session configuration stays in the ignored
`scraping/.private/chat-archive/session.json`. It contains `headers`, `list_url`,
`list_body`, and `message_url` obtained from verified browser requests; never
commit or print these credentials. Refresh this file from a newly authorized
session if authentication expires. Raw history, the list snapshot, and the
content-free completion manifest remain under the centralized `CHAT_ARCHIVE_DIR`.
Capture defaults to three concurrent conversations, with globally paced requests
and bounded retries for transport errors, HTTP 429, and server errors.

```bash
scraping/.venv/bin/python -m scraping.duoke.chat.archive_duoke_chats \
  --vault "/absolute/path/to/existing/Obsidian vault"
```

Add `--resume` to reuse the previous completed list snapshot and unchanged,
complete history files. Omit it for a fresh enumeration that includes newly
created conversations. Resume does not discover conversations created since
the saved list snapshot.

Notes and `Conversation archive index.md` are written directly to
`Duoke/Percakapan/` inside the specified vault. The distinct index name avoids
colliding with owner-authored notes in that directory.
Source conversation/shop/platform identities produce stable hashed filenames;
manually written content below the archive marker is retained on subsequent
runs. Use a private vault whose archive directory is ignored by Git. The owner's
existing `douke-chat` vault already ignores its entire `Duoke/Percakapan/` tree.

Transcripts retain the source language. Generated headings and metadata use
English, with UTC timestamps. Sender code 1 maps to customer and 2 to seller;
other codes remain unknown. Notes apply automated redaction, which is not a
guarantee that every identifier is removed. Attachment binaries are not
downloaded, and full source payloads remain in the private JSON archive.
These notes are unreviewed historical sources; exporting them does not approve
answers, import them into the application, or activate automated replies.

Verified capture on 2026-09-17: the unfiltered list ended after 18 pages with
881 conversations across seven stores (596 Shopee, 281 TikTok, four Lazada).
All 901 history pages were read, yielding 13,449 unique messages. Each history
matched the source total; all 881 transcript notes and index links were checked.
The returned messages span 2026-04-14 through 2026-09-17 UTC. This describes the
history returned to this account during the run, not deleted or inaccessible
provider history. The notes are in the owner's existing Obsidian vault under
`Duoke/Percakapan/`, and local verification counts are saved in
`scraping/.private/chat-archive/verification.json`.
