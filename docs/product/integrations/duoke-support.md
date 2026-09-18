# Duoke knowledge and automated replies

[Specification index](../spec.md)

## Knowledge sources and review

For Hermes customer replies, the owner's full connected Obsidian knowledge is
the reference scope, including admin Q&A, product notes, troubleshooting guides,
and return/refund policies where present. The [customer resolution contract](#customer-problem-resolution-and-whatsapp-handoff)
supersedes limiting usable knowledge to starter notes or website-published content.
Use applicable source facts; full coverage does not mean copying every note into
each model prompt or treating case-specific messages as general policy.

The review pipeline below describes legacy capture/approval tools, not a blanket
requirement to reapprove the owner's existing admin Q&A before reference lookup.

The website AI assistance can also preview and extract existing Obsidian
conversation exports from the sibling `douke-chat` vault into its own private
review artifacts. This does not activate the Duoke reply runner or change its
approval pipeline. See [AI assistance setup](../../setup/ai-assistance.md#connect-the-complete-scraped-obsidian-archive)
for the separate transcript review workflow.

```text
Published product content ────────────────┐
                                         ├→ approved runtime knowledge → retrieval → Duoke runner
Authorized historical chat capture       │
  → redaction → pending candidate         │
  → explicit human review and approval ──┘
```

“Learning” means curating and retrieving a knowledge base. The project does not train or fine-tune a model.

## Percakapan as the primary admin reference source

Recorded: 2026-09-18. Source: the owner corrected the agent again and explicitly
identified the Obsidian `Percakapan` folder as the existing answer database.
Reason: the agent still failed to use the supplied conversation knowledge.

Desktop must retrieve adjacent customer/admin Q&A directly from that connected
folder, independently of website publication eligibility. Rank the paired
question, normalize supported equivalent terms (including return/refund/retur),
and prefer applicable admin replies over product descriptions. Retain note
provenance, product scope, and historical qualifications. Do not use an unrelated
sentence elsewhere in a transcript as evidence that its answer matches.

An unrelated attachment elsewhere in a note does not invalidate a self-contained
text pair; an attachment between the question and reply breaks the pair. Private
account details, unclear speaker roles, unsafe repairs, and attachment-dependent
answers remain excluded. Contextual references may inform interactive previews;
`referenceOnly` items cannot be selected for automatic exact-text delivery.
Historical return approvals and processing promises are not current policy: if
no applicable current policy is available, use the WhatsApp handling contract.
For return-only historical matches, the tool returns source metadata under
`historicalMatches`, suppresses the historical answer text, and supplies a concise
`customerReply` handoff. The model must copy that reply without extra policy
claims. A missing verified number must never be replaced with a sample number;
the textual handoff does not prove an automatic transfer or a working contact link.

Acceptance: a differently worded return question retrieves paired conversation
references rather than inbox status or catalog descriptions; unrelated products,
private details, unsafe repairs, and interrupted pairs do not become answers.
Coverage/exclusion counts and actual model checks belong in the
[active task](../../work/handoffs/handoff-duoke-hermes-active-v2.md). This contract
does not claim complete semantic matching or validate every historical answer.

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

## Target: automatic replies through Hermes Desktop

Recorded: 2026-09-18.
Source: the owner requested updating context and the task to automatically send
customer replies using existing Obsidian knowledge, Hermes Desktop as the harness,
and Qwen 3.5:4b (`qwen3.5:4b`) as the model.

The target workflow is: receive a Duoke customer message, retrieve relevant
knowledge from the complete connected Obsidian vault, generate a grounded response
through Hermes Desktop with `qwen3.5:4b`, validate it, and automatically deliver
it to the correct customer conversation through headless Chrome. Eligible replies
do not require manual approval for each message; unresolved questions still follow
the delivery and escalation rules above. Existing Obsidian coverage must not be
reduced to the 35 curated starter notes.

This replaces draft-only operation as the final product objective. The draft
workflow below remains a preparation and verification tool. Its direct Python
Agent invocation does not establish that Hermes Desktop is the harness; the
Desktop integration must be implemented and verified separately. Do not substitute
a standalone Python worker for the requested Desktop harness without recording
and resolving that difference with the owner.

The owner wants step-by-step instructions and will start the automation personally.
This context/task update records the intended automatic-delivery behavior; it does
not request starting processes, clearing stop controls, or sending messages now.
No additional reason for the selected harness/model was stated.

Acceptance: after the owner starts the workflow from the documented Hermes Desktop
setup, an eligible incoming customer message receives one grounded reply using
`qwen3.5:4b` and the existing Obsidian sources. Delivery is verified and recorded;
duplicate processing, a newer message, a seller reply, changed knowledge, and an
active stop control prevent inappropriate delivery. Provide actionable start,
monitor, and stop instructions before the owner runs it.

Implementation gaps and evidence belong in the
[active task](../../work/handoffs/handoff-duoke-hermes-active-v2.md).

### Desktop implementation and owner corrections

Recorded: 2026-09-18. The owner specified every connected Duoke store and the
language already used in Obsidian. No further reason was stated. This supersedes
the draft runner's English-only default for the Desktop delivery path.

The dedicated `duoke-support` Hermes profile uses the local `qwen3.5:4b` model
and a project MCP server with status, search, polling, and reply tools. It retrieves the
full connected corpus, offers eligible source answers, and sends only the exact
selected answer in its original language. Desktop retrieval allows eligible
admin Q&A references; the separate legacy draft path retains its review policy.
Indexing every document does not prove every relevant answer is retrievable.
Unresolved customer questions require the WhatsApp handoff described below;
the current delivery path still needs a verified handoff candidate mechanism.

The delivery bridge uses the authenticated Duoke application's `Chat/send-message`
action. Before sending, it rechecks the latest message, knowledge signature, and
stop/enable controls. It reserves each incoming message before attempting delivery,
then verifies a new seller message with the exact source answer. Uncertain sends
are never automatically retried. Audit records omit customer message text.

Setup creates a paused schedule. The owner enables the private delivery gate,
verifies the Hermes scheduler, and resumes the job in Desktop. The installed
Desktop backend can run its own scheduler; a separate gateway is an alternative,
not always a prerequisite. A window alone does not prove job execution. See the
[operator steps](../../setup/duoke-hermes-desktop.md) and dated handoff for actual
acceptance evidence; source review or simulated delivery is not live acceptance.

### Customer problem resolution and WhatsApp handoff

Recorded: 2026-09-18.
Source: the owner supplied an incorrect return-request reply that discussed
preview mode, inbox jobs, tool names, and internal conversation artifacts. The
owner stated that customers want their problem solved, unanswered cases should
go to WhatsApp, and all existing Obsidian knowledge should support answers.

Decision:

- Respond as Ayu from Gascomp with concise, practical help for the actual issue.
  Customer-facing text must not contain tool names, system/continuation messages,
  profile identifiers, preview status, queue counts, internal citations, or audit
  details. Technical diagnostics belong only in explicitly requested operator
  responses. Desktop product/support questions default to customer reply previews.
- Search the full connected Obsidian reference scope before concluding an answer
  is unavailable. Retrieve admin Q&A and relevant procedures/policies, matching
  equivalent wording and the appropriate product. A bounded reformulated lookup
  can recover a missed match. Catalog descriptions are not substitute policies.
- Distinguish a missing answer from incomplete indexing, failed retrieval,
  restrictive eligibility filters, or incorrect tool selection. Document source
  coverage and why results were excluded; document counts alone prove none of
  these are working. Do not use status or polling results as support knowledge.
- When relevant knowledge cannot resolve the issue, give a brief WhatsApp handoff
  to Gascomp admin using the verified official support contact. Follow the existing
  [support contact configuration](../features/support.md), not a newly invented
  number. Do not claim the case was transferred unless that action occurred.
  A missing contact is an operator configuration issue; never fabricate a link.
- Ask one focused clarification only if it enables a sourced solution. Avoid
  repeated questions or collecting order details when the issue requires admin
  handling. Never promise return eligibility, approval, money, or timing without
  applicable source evidence.

Acceptance: a regulator return request uses applicable Obsidian return guidance
when available. Otherwise it produces a short official WhatsApp handoff with no
operational explanation. A known FAQ with different wording retrieves its admin
answer; an irrelevant product match cannot supply invented policy. An explicit
operator status request can still expose appropriate diagnostics separately.

Implementation evidence: the interactive and scheduled prompt templates are
updated and synchronized through the owned profile refresh. Complete corpus
coverage, robust semantic matching, a verified runtime WhatsApp destination, and
automatic handoff delivery remain acceptance tasks; prompt wording alone does
not implement or verify those capabilities.

### Reference-based replies and continuous operation

Hermes orchestrates the full Obsidian admin-reference workflow and headless Chrome
reads/sends in Duoke. Qwen `qwen3.5:4b` remains the selected local model. Preserve
all-store scope, source-language answers, Ayu, and owner-operated live startup.
The target is supervised 24/7 service with durable state and restart/session
recovery. Headless mode alone does not establish uptime. Customer answers follow
the resolution and WhatsApp contract above; live operation remains unverified.

### Local model context alignment

The allocated Ollama context and Hermes context budget must agree.
`npm run duoke:desktop -- model-context` pins Ollama `num_ctx` and Hermes
`model.context_length` to 65,536 for the existing local `qwen3.5:4b` weights,
with a private backup of the old tag and profile configuration. Setup includes
the Hermes bound; readiness checks reject a missing or different model override.
This avoids interpreting the training maximum as locally allocated capacity.
It does not guarantee faster generation or unlimited history. See the
[recovery procedure](../../setup/duoke-hermes-desktop.md#recover-from-truncated-responses).

## Hermes Agent reply drafts

The first Hermes workflow reads incoming Duoke messages and prepares local
drafts for operator review. It never fills a composer, sends a reply, changes a
conversation, or updates the existing delivery runner's processed state.
Hermes Desktop may remain installed and open; the worker invokes its local
Hermes Agent Python source directly with a dedicated temporary home, disabled
tools, and a loopback model endpoint. It does not automate the Desktop UI.

`scraping/duoke/reply/hermes_drafts.py` uses headless Google Chrome with an
isolated context. A minimal local page served at the Duoke origin reads only
the two verified conversation/history endpoints documented below. No Duoke
application scripts run, and network routing rejects all other requests.
The existing private archive session supplies authentication; credentials and
raw messages are never logged. Saved store filters are retained, and optional
store arguments may narrow that scope. Each pass is bounded and reports when
the conversation limit leaves additional work outside the pass.

Knowledge combines curated `obsidian/customer-support/` notes with the complete
configured Duoke Obsidian archive, including `Percakapan` and `Produk`. The full
source path comes from `--source-vault`, `DUOKE_HERMES_SOURCE_VAULT`,
`GASCOMP_AI_SOURCE_VAULT`, or the saved local website worker's source path, in that
order. `--vault` selects a different curated folder; `--curated-only` explicitly
disables the full archive. An invalid configured archive fails validation rather
than silently falling back to the small curated folder.

All readable archive documents are indexed locally. Source catalog excerpts
expand factual coverage; history remains searchable context for operator review.
Historical replies are marked as requiring review and cannot silently become
approved answers. Related note references are included separately from answer
citations. The worker does not rewrite either vault or upload the complete corpus.
Hermes receives only bounded eligible excerpts and redacted incoming text. English
drafts require validated source IDs; missing evidence, model errors, unsupported
attachments, and clarification/handoff cases require operator review. Reports and
the local check distinguish source file/document counts from extracted answer entries.

Only a complete history whose latest message is from the customer can produce a
draft. The worker rereads history after generation and discards changed messages
or seller replies. Edits to any curated or full-source note during a pass invalidate
its output, even when the extracted answer text is unchanged. Watch mode
reuses unchanged drafts within the running process and replaces the private report
each pass, preventing old drafts from being retained for skipped conversations.
`STOP_AUTOREPLY` also stops this worker. A single-process lock prevents overlapping
draft runners. No service is installed or started automatically.

Results live in ignored `scraping/.private/duoke-drafts/latest.json`, including
hashed conversation/message references, note citations, review status, timestamps,
and zero delivery count. Drafts are suggestions checked at the recorded time;
operators must inspect current conversation context before using them.

See [setup and commands](../../setup/duoke-hermes-drafts.md) and the
[Hermes Duoke handoff](../../work/handoffs/handoff-duoke-hermes-active-v2.md).

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
