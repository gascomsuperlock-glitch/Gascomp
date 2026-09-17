# AI assistance

[Specification index](../spec.md)

## Customer experience

Gascomp Assistant is an optional public text-chat panel. The server-side
`GASCOMP_AI_ASSISTANCE_ENABLED=true` flag replaces the floating WhatsApp button;
the default retains the existing button. Both controls are hidden on admin
routes. Existing warranty WhatsApp destinations and claim messages are unchanged.

Customers do not need an account. A private cookie identifies their conversation
across page navigation and reloads in the same browser. The panel follows the
website's English/Indonesian selection and presents loading, pending, offline,
and error states. There is no permanent WhatsApp action beneath the composer.

The panel offers **New chat** / **Percakapan baru** beside the language selector.
It creates a new private session, clears the displayed conversation and draft
after success, and shows the published greeting in the current language. The
new conversation remains active after navigation or reload. Earlier sessions
retain the normal 30-day retention policy; this action is not data deletion and
does not add a history picker. A pending reply in an earlier session cannot
appear in the new conversation.

`POST /api/ai-assistance/session` accepts an optional boolean `newConversation`.
When true, the server generates a fresh opaque token and sets its cookie only
after persistence succeeds. Ordinary session refreshes reuse the incoming token
without rewriting its cookie, preventing an older refresh response from restoring
the previous session. Origin validation, the feature flag, and the existing
session creation limit apply. The client blocks duplicate starts and simultaneous
sends, suppresses stale reads, and preserves the conversation and draft when
starting a new session fails, with a localized retry action.

When a customer requests an admin, account-specific action is needed, safe help
cannot continue, or the service is unavailable, a handoff message includes the
configured admin WhatsApp link as a contextual action inside that message.
Missing an exact Obsidian answer can instead lead to a general explanation or a
useful clarification in grounded mode.
Ordinary answers, greetings, and pending replies do not include that action.
Offline, unavailable, and request-error notices may offer the same link inside
the conversation so a service failure does not strand the customer. A missing
admin number produces contact-unavailable copy only in those handoff states.
Opening WhatsApp requires a customer click and does not send a message or notify
an administrator automatically. The model does not generate the destination;
the application attaches the configured link without changing source answer text.

V1 accepts text only. It does not create claims, change orders, retrieve private
account records, or upload files. An unavailable service must not leave the
customer waiting indefinitely.

## Grounded conversational answers

On September 17, 2026, the owner replaced the original exact-answer-only policy.
Obsidian is now the factual knowledge base for a natural-language support
assistant. In the default `grounded` response mode, Hermes may explain,
paraphrase, translate, summarize, and ask useful follow-up questions. It may use
general knowledge for ordinary explanations and safe diagnostic clarification.
It must distinguish general possibilities from facts verified for a particular
Gascomp product. Missing an exact FAQ match is not itself a reason to send the
customer to WhatsApp.

Product specifications, compatibility, warranty terms, and Gascomp policies must
come from relevant supplied knowledge. The assistant must not invent those facts,
claim live stock/prices, access private orders, or imply that it performed an
operational action. It identifies as an AI assistant when relevant and uses a
warm, concise tone without pretending to be a human employee. Unrelated requests
are redirected to Gascomp support. The model cannot update knowledge from chats.

The curated vault remains `obsidian/customer-support/`.
`GASCOMP_AI_SOURCE_VAULT` connects the full scraped Obsidian `Duoke` directory.
Readable notes in `Percakapan` and `Produk` remain in a private search index;
folder organization does not exclude unique knowledge. Product copies are only
deduplicated when source platform, store, listing identity, and stable content
agree. The original source vault is not rewritten by the assistant.

The worker builds a versioned snapshot of reusable passages and templates,
limited to 2,000 entries and 4 MiB. A bounded selection of relevant eligible
passages is supplied as evidence, with stable IDs, product context, and conflict
metadata. The complete transcript index and other customers' conversations are
never placed in model context. Historical replies with missing context, privacy
limitations, unverified operational claims, or unsafe mechanical advice are not
promoted into general instructions. Disabling regulator safety components or
removing seals is not an acceptable generated troubleshooting instruction.

The model receives the current message and up to eight earlier messages from
that same private session. History supports follow-up context; it is not a new
source of product facts and cannot override instructions. New chat creates a new
session, so earlier context is unavailable. Explicit current product context
supersedes an earlier product. Ambiguous or conflicting product references
require clarification rather than a guessed specification.

For a symptom such as `Kenapa GRS-01 saya gak bisa nyala?`, the assistant may
acknowledge the problem, explain that the cause is not established, and ask a
relevant diagnostic question. It must not infer a broken component or prescribe
mechanical modifications from an unrelated historical reply. Suspected immediate
gas hazards require brief safety guidance and human assistance rather than
continued troubleshooting.

## Response contract and fallback

The authenticated worker submits either a legacy `answerId` or a generated
`response` with `text`, `kind`, `basis`, and `sourceIds`. Generated text is bounded
to 3,000 characters. Kinds are `answer`, `clarification`, and `handoff`; basis is
`knowledge` or `general`. Knowledge responses reference one to five active source
IDs. General explanations/clarifications have no source IDs and must not claim
unsupported product facts. Cross-language use of source facts is permitted.
Source IDs provide provenance, not a mathematical guarantee that the generated
text follows the sources.

The website and SQL validate response structure, active source IDs, product
context, snapshot version, lease, readiness, and deadline. Duplicate, late, or
stale completions cannot deliver a new answer. Model text cannot create links;
the application attaches the configured WhatsApp destination only to handoff
messages. Model HTML, Markdown links, local URLs, and Obsidian wikilinks are not
accepted. Invalid generation uses a bounded clarification or handoff fallback;
unavailable services retain the published handoff path.

The service still validates complete snapshots and watches all source paths and
bytes for saved additions, edits, moves, and deletions. Missing or invalid sources
invalidate readiness instead of silently retaining stale facts. Previously
validated handoff templates remain available during outages.

`GASCOMP_AI_RESPONSE_MODE=exact` retains the earlier source-ID selector as an
explicit rollback option. In that mode, the backend sends the selected note body
verbatim and does not translate or synthesize text. Earlier dated verification
sections below describe that legacy behavior unless explicitly marked grounded.

## Runtime and data boundaries

Next.js owns public and worker HTTP contracts. Feature code owns business logic;
Supabase stores private sessions, messages, jobs, knowledge snapshots, and runtime
state. Customers access only the session authenticated by their private cookie.
Worker requests use a separate server-held bearer credential. Public database
roles cannot access the tables or queue functions directly.

Local development may explicitly set `GASCOMP_AI_PREVIEW_URL` and
`GASCOMP_AI_PREVIEW_KEY` to use an AI-only loopback PGlite bridge. It executes the
same queue SQL with local private persistence and no seeded answers. This override
is ignored outside development; an invalid or unavailable preview never falls
back to writing the primary Supabase database. Other features keep their existing
database connections. Start the bridge with `npm run ai:preview-db`.

Jobs have stable client request IDs, atomic claims, and bounded leases. The pilot
processes one job at a time, reports a heartbeat every 10 seconds, considers a
worker offline after 30 seconds, and expires customer waits after 60 seconds.
Expired or completed work cannot deliver a second or late answer. Conversation
retention defaults to 30 days with an independent 15-minute database cleanup
schedule; verify Supabase Cron is active before release. Admin status exposes readiness, heartbeat, knowledge
version, queue depth, and pause/resume with existing admin authentication.

The Mac worker initiates outbound HTTPS requests; no public inbound Mac port is
required. A dedicated Hermes home and restricted tool configuration separate
customer processing from personal agent memory and credentials. The owner
installs a local model and configures its endpoint and model identifier. Cloud
fallback is disabled. The worker and Chrome have macOS service definitions for
supervised restarts; an awake, powered, connected Mac is still required.

Headless Chrome is a bounded link-checking aid for approved Gascomp URLs. Browser
content is never an additional answer source. A browser failure must not prevent
otherwise valid knowledge answers. CDP is local-only and uses a dedicated profile.

## Release and verification

The implementation adds an ordered migration; production migration execution,
service activation, and hosting deployment require separate authorization. The
existing release pipeline remains the migration and deployment mechanism.

Before activation, provide bilingual validated knowledge, a working local model,
successful grounded-response relevance and safety evaluation, browser verification, and a 24-hour
synthetic endurance run. A feature-flag rollback restores the previous WhatsApp
button without deleting stored conversations. A local test or mocked model does
not constitute live-model or 24-hour verification.

Operational instructions: [AI assistance setup](../../setup/ai-assistance.md).

## Local verification on September 17, 2026

Lint, TypeScript, the production build, all 251 Node tests (including disposable
PGlite SQL tests), and all 30 Python tests passed. Browser checks covered exact
source text, conversation reload, isolated visitor sessions, language changes,
keyboard dismissal, offline handoff, network failure/retry, admin pause/resume,
expired admin authentication, and layouts at 320, 390, and 1440 pixels. A separate
production-build check verified the disabled flag restores the original WhatsApp
button and refuses public chat writes.

A synthetic transport pilot passed six scenarios over 60.6 seconds, including
stale snapshot rejection and a real 60-second reply deadline, with no duplicate
replies. The complete local path also passed using temporary Obsidian notes,
the real Python worker, installed Hermes revision `0e9fc2cc15`, the production
Next.js build, and an isolated PostgreSQL engine behind a test transport. Its
inference endpoint was a loopback fake model: this verifies harness integration,
not the relevance or performance of the owner's eventual model.

Real headless Google Chrome started with a temporary profile and accepted a
local CDP connection. This check did not navigate external websites. Service
generation tests validated real macOS plist syntax, file permissions, path
escaping, and secret separation without activating launchd services.

Local reports are under `.data/ai-assistance/` and contain synthetic test evidence.
No production migration, customer reply, service activation, or deployment was
performed. The owner-authored knowledge, real model evaluation, production Cron
schedule, actual daemon restart checks, and 24-hour real-worker pilot remain
required before public activation.

## Contextual WhatsApp handoff update

The owner removed the permanent composer WhatsApp action on September 17, 2026.
The contextual handoff update passed lint, typecheck, all 251 Node/isolated SQL
tests, and the production build. Browser checks with mocked chat responses
verified no action on ordinary replies, one link inside a handoff response,
unchanged source text, bilingual actions, service-error recovery, and desktop/
320/390-pixel layouts. No live chat or database write was used for these UI checks.
Evidence is recorded in `.data/ai-assistance/handoff-browser-report.json`.

## Local preview connection repair

On September 17, 2026, the public panel flag was enabled locally before the
configured Supabase had the AI schema. Session creation consequently returned
HTTP 503. Read-only schema discovery confirmed the missing AI function/tables.
The local environment now uses the explicit AI-only preview database; no remote
migration was applied. Local session creation returns HTTP 200, messages survive
reload, and absent knowledge correctly reports unavailability without pretending
that a model is ready. Browser evidence is recorded in
`.data/ai-assistance/preview-browser-report.json`.

## Owner-installed model smoke test

On September 17, 2026, the owner's Ollama instance exposed `qwen3.5:4b`.
The initial Hermes selection returned no usable ID for a matching synthetic
question. The Qwen3.5 adapter now explicitly disables thinking and requests
JSON at temperature zero to preserve the short answer-ID output budget.
Six direct Hermes/Ollama synthetic checks passed: known questions, unsupported
questions, and prompt injection, each in English and Indonesian. Observed
turn times were 2.9–3.6 seconds with the model already loaded; these are smoke
tests, not production latency or relevance guarantees. All 30 Python tests
passed, including the installed Hermes request-contract regression.

The ignored local environment records the model endpoint/name and a private
worker token. Worker processes still require their environment to be loaded
explicitly. No active knowledge, continuous worker, or public service was
started by this check. Owner-approved bilingual notes and full evaluation
remain prerequisites for activation.

## Local worker connection

On September 17, 2026, private worker configuration and launchd definitions
were generated from the ignored local environment. A foreground worker was
started against `http://localhost:3000` and the existing isolated preview
database. A successful local status read confirmed a new worker heartbeat.
No launchd services or public deployment were activated. Knowledge remains
unready because the dedicated vault has no active notes; the model is therefore
not yet serving website answers. The setup guide documents the exact foreground
command and distinguishes this process from interactive Hermes chat.

## Existing Obsidian transcript review preparation

On September 17, 2026, the existing sibling vault supplied 20 conversation
notes with 345 attributed customer/seller turns. All notes carried pending-review
tags; one note reported incomplete capture history. Conservative extraction
created 13 unapproved review candidates. Of 61 excluded groups, 22 were seller
boilerplate, 16 had no adjacent seller response, 13 contained product/order/media
cards, and 10 were trivial customer turns. Eight retained candidates have
multiple product SKUs and two contain redaction markers; all retain inferred-role
and historical-accuracy review flags.

Review artifacts remain in the ignored, owner-private `duoke-review` directory.
Six separately drafted bilingual interface templates were validated and saved
under `template-review` for owner review; they were not extracted from customer
history and were not activated. Aggregate file hashes confirmed both the source
transcripts and active answer directory remained unchanged after extraction.
All 40 Python tests passed. Review links and diff checks passed. No answer was
published and no customer message was sent by this workflow.

## Working local model pilot

Following the owner's request to get the assistant running locally, seven notes
were activated in `obsidian/customer-support` on September 17, 2026: six bilingual
interface templates and one Indonesian `GRS-02PRO` return/refund answer. The
product answer preserves the first seller reply from review candidate
`duoke-b8210805ec74eec54542`; a private activation record retains its source
reference. No other historical candidate was activated. English product
questions currently hand off because no English product answer exists.

An unresponsive local Next.js development process was restarted, with its logs
redirected to a local file. The preview database and real Hermes/Ollama worker
reported ready. Actual Chromium desktop/mobile checks passed for exact Obsidian
answer text, unknown-source WhatsApp handoff with no footer CTA, reload
persistence, and English greeting/handoff. The observed known-answer UI round
trip was 4.4 seconds and the unknown-source handoff 2.4 seconds; these are single
smoke-test observations. Browser API requests returned HTTP 200 and no page
errors were recorded. Evidence is in
`.data/ai-assistance/real-model-browser-report.json` with desktop/mobile images.
All 40 Python tests passed. No public deployment, production migration, launchd
activation, or 24-hour endurance run was performed.

## Friendly conversation pilot verification

The owner's request for warmer, bounded interaction expanded the local snapshot
to 19 notes: revised bilingual greetings and clarification prompts, twelve
bilingual conversational replies, the existing handoff templates, and the one
product answer. Conversational replies cover thanks, capabilities, AI identity,
wellbeing, acknowledgement, and goodbye. Answers still come verbatim from the
published notes; the model does not compose customer-facing text.

All 47 Python tests passed. Twelve real Chromium cases exercised Indonesian and
English conversation, a product question with a greeting prefix, unsupported
questions, and prompt injection through the website and Hermes/Ollama worker.
Three additional public API cases verified clarification, acknowledgement, and
goodbye. All fifteen replies matched their expected source text and status.
The browser recorded no page errors and confirmed no permanent WhatsApp footer
link. The browser report is stored in the ignored
`.data/ai-assistance/conversation-browser-report.json`. A final local status read
confirmed ready knowledge, an online worker, and an empty queue. Public rollout
and the 24-hour endurance check remain pending.

## Expanded source preparation and local activation

On September 17, 2026, the complete source preparation processed 902 conversation
Markdown files: 881 full archives, 20 legacy notes, and one skipped archive index.
There were no malformed conversation notes. The extractor retained 339 private,
unapproved historical answer candidates; two pass automated triage for owner
fact-checking. No new historical conversation answer was activated. System-event
messages, operational transfer claims, uncertain context, and composite SKUs
were explicitly checked while refining the extractor.

The product folder contains 432 Markdown files, including 414 catalog product
records and supporting/index notes. The catalog importer grouped the records
into 125 SKU groups. Sixteen groups yielded eligible labeled specification
excerpts; 109 require review, including groups without usable stable text.
Fifty-two groups have schema-valid draft entries, of which only sixteen were
staged and selected for the authorized local pilot. No automatic translation,
model-authored answer, production publication, or source-archive modification
was performed.

That initial expanded snapshot contained 35 entries. Activation preserved the
existing nineteen notes, paused the idle local queue, retained a private backup,
restarted the worker with the SKU guard, and confirmed the new published version
before resuming. Source audit checked all sixteen staged bodies, 32 source-file
hashes, and 90 cited source lines. Aggregate hashes confirmed all 1,334 original
Markdown files remained unchanged. The private review index and activation
record are in `scraping/.private/ai-assistance/expansion/`.

All 91 Python tests passed. All 266 authored aliases resolve to matching source
text. Twenty-four real website API/Hermes/Ollama cases passed, covering all sixteen
new products, greetings, unknown questions, unknown/multiple SKUs, injection,
mixed unsupported requests, unavailable English product answers, and private
record requests. Each expected answer matched its active source exactly, with
one reply per request. The observed product round trips were 4.3–5.2 seconds;
these are local smoke-test measurements, not a service guarantee.

Three browser cases passed on desktop/mobile, including field-specific material
and capacity questions, exact text, reload persistence, and contextual WhatsApp
handoff without a composer footer link. No page errors were recorded. Evidence
is stored in `.data/ai-assistance/expansion-api-report.json` and
`.data/ai-assistance/expansion-browser-report.json`. No TypeScript, route, or build
configuration changed in this expansion. Public activation still requires
remaining factual review, approved English product answers, service supervision,
the 24-hour endurance run, and deployment authorization.

## New conversation verification

The New chat action passed lint, typecheck, and the production build. The default
Node suite passed 228 tests with six opt-in SQL suites skipped. The AI SQL suite
was then explicitly run against disposable PGlite and passed. Handler regression
tests cover fresh server tokens, reuse without cookie rewriting, invalid client
fields, and database/rate-limit failures preserving the current cookie.

Real browser checks on localhost covered starting over during a pending Hermes
reply, old-session reply isolation, reload persistence, a subsequent reply in the
new session, failure preserving history and draft, retry, focus, bilingual labels,
and desktop/320/390-pixel layouts. Additional controlled browser checks covered
late poll responses, duplicate clicks, and language changes plus close/reopen
during creation. No page errors were recorded in the real-browser flow. Evidence
is in `.data/ai-assistance/new-chat-browser-report.json` and
`.data/ai-assistance/new-chat-races-report.json`. No database migration or public
deployment was needed or performed for this feature.

## Complete scraped-source connection

On September 17, 2026, the owner requested that the assistant use all previously
scraped knowledge. The local worker now connects directly to the full Obsidian
`Duoke` root. All 1,334 Markdown files are indexed: 902 conversation notes and
432 product notes, with no excluded source files. The original files' aggregate
hashes match the pre-integration record. The dedicated `customer-support`
folder still contains 35 curated entries; extracted entries are built at runtime
and therefore do not appear as additional files in that folder. The final local
snapshot contains 445 entries: 35 curated entries, 115 reusable historical
question/answer pairs, and 295 product passages. All original source files remain
unchanged.

Retrieval now searches eligible answer text as well as questions and names.
Formatting-equivalent units and SKU separators no longer cause false conflicts.
Image-only exporter placeholders are excluded from customer answers. Distinct
catalog descriptions can complement each other; this alone is not a reason for
Hermes to refuse an answer. Genuine requested-attribute conflicts are rejected
before model selection, and missing-language answers do not repeatedly ask for
an already-known product code. Source limitations also accompany local model
candidates. Unknown or private account questions retain contextual handoff.

The worker configuration includes `GASCOMP_AI_SOURCE_VAULT`, and the local preview
applied migration `202609170002` without deleting existing conversations. No
production migration, customer reply, deployment, or Chrome runtime activation
was performed. Private source/provenance reports are under
`scraping/.private/ai-assistance/full-corpus/`; test evidence is under
`.data/ai-assistance/full-corpus-*`. A full corpus index does not supply unreadable
image content, live order data, or English translations absent from the source.

The completed code checks passed lint, typecheck, production build, 125 Python
tests, 231 default Node tests (six opt-in suites skipped), and all 12 explicitly
run AI SQL tests. Browser checks passed on desktop and mobile, including exact
source text, long product replies, reload persistence, no horizontal overflow,
and contextual WhatsApp handoff. There were no browser page errors.

The selector retains all aliases for selection payloads up to 8,000 characters.
For larger payloads, it sends at most three aliases per candidate, retaining a
descriptive product identity alongside query-ranked aliases. Retrieval still
indexes every alias. Candidate answer bodies and source
limitations are preserved in full. Three direct real-model checks selected the
correct air-fryer capacity source despite an unrelated color conflict, while the
actual conflicting color request was rejected before model selection. This is
bounded smoke-test evidence, not a claim that every customer question will match
or that the 24-hour endurance test has passed.

Fifteen distinct real website/Hermes/Ollama scenarios passed after focused
regression reruns corrected selector failures. They covered existing product
facts, products outside the initial sixteen, a product name without SKU,
historical Q&A, greetings, unavailable English content, unknown SKUs, private
account requests, prompt injection, and a genuine conflicting attribute. Every
accepted reply matched a published source exactly, with one reply per request.
The final evidence preserves earlier failures and their successful reruns in
`.data/ai-assistance/full-corpus-api-final-report.json`. The final local status
confirmed ready knowledge, an online worker, resumed processing, and no queued
jobs. Public activation and the 24-hour endurance check remain pending.

## Folder organization correction and restored knowledge

On September 17, 2026, the owner clarified that removing `Archive` and `Catalog`
meant moving their contents into their parent folders while retaining unique
knowledge. Earlier folder exclusions were an implementation misunderstanding,
not an owner-approved source policy. Those exclusions temporarily reduced the
active snapshot to 37 entries and caused product handoffs despite healthy
Hermes, Ollama, and website services. They are now removed from discovery,
change detection, answer extraction, and conflict detection.

The authorized local migration moved 882 conversation files and 415 product
files into `Duoke/Percakapan` and `Duoke/Produk`. Their indexes are now
`Conversation archive index.md` and `Product catalog index.md`. Obsidian link
targets were updated; all other source content was preserved. A private backup
and before/after hash manifest were saved before mutation. All 1,337 vault
Markdown files remain, including 1,334 conversation/product source notes under
`Duoke`. No old folder link targets remain; all 6,668 generated note links resolve
after the move. Future exporters use the same flat paths and normalize old
product-context references stored in private capture JSON.

A matching SKU or title alone is not proof of a duplicate. Automatic document
deduplication requires the same marketplace, store ID, and listing ID, plus
identical note content and variant metadata. Capture timestamps and generated
reference IDs do not distinguish copies. Different stores, marketplace posts,
platforms, variants, content revisions, or missing identity are retained.
Removed index copies record their retained source path in the private report.
Exact answer-passage reuse still preserves the original listing provenance.
The audit found 414 distinct marketplace/store/listing identities and 17 unique
legacy main product notes; no confirmed duplicate source file was deleted.

The restored local index contains 902 conversation notes and 432 product notes,
with no folder exclusions. Its validated snapshot contains 445 entries: 35
curated entries, 115 reusable historical answers, and 295 product passages.
The local worker published that snapshot and resumed processing. Documents
without an eligible safe answer remain searchable privately; indexing a note
does not authorize returning private details or inventing missing facts.

Restoration testing exposed an unnecessary model handoff for a broad juicer
specification question with several overlapping excerpts. Selector payloads now
use stable field ordering and place a unique exact question alias first, while
retaining every other candidate and its conflict metadata. Alias priority does
not remove contradictory evidence or bypass model selection. Regression coverage
checks both duplicate exact aliases and conflicting fuzzy candidates. Model
relevance remains probabilistic; a successful test is not a guarantee that every
supported phrasing is selected.

Verification passed all 134 Python tests and all 15 real website/Hermes/Ollama
API scenarios after the selector correction. Tests cover known products,
product-name matching, a historical answer, greetings, unknown questions/SKUs,
missing translations, private-data requests, prompt injection, and conflicting
facts. The initial juicer failure and the safe handoffs observed during worker
startup are retained in separate reports rather than overwritten as successes.
The real browser check passed on desktop and mobile, including exact source text,
reload persistence, contextual WhatsApp links, no permanent WhatsApp footer, and
no page errors.

Migration and runtime evidence are stored in `.data/ai-assistance/flatten-*`;
source backups remain under `scraping/.private/ai-assistance/flatten-backup-*`.
Public activation and the 24-hour endurance check remain pending.

## Legacy exact-mode diagnosis: GRS-01 troubleshooting gap

The owner's September 17, 2026 question `Kenapa GRS-01 saya gak bisa nyala?`
was reproduced against the ready local website. Product resolution identifies
`GRS-01`, but retrieval and source guidance both return no candidates. The job
therefore returns the published handoff without invoking Hermes. A live check
completed with handoff in 1.6 seconds; this is not an inference timeout or an
offline worker.

Source inspection did not identify a standalone, eligible, safe historical
answer for this symptom. Related conversations contain transaction-specific
outcomes, missing image/video context, or mechanical modification advice that
must not be promoted automatically into general troubleshooting. Existing
catalog descriptions do not establish the cause of a customer's ignition issue.
Indexing all source documents does not imply complete troubleshooting coverage.

Lexical matching also needs broader relevance evaluation: alternate symptom
wording can retrieve unrelated or incomplete passages. Merely adding synonyms
or forcing a source choice is not evidence that an answer is appropriate. A
future correction requires a verified troubleshooting source or an explicitly
approved diagnostic clarification flow, plus regression cases using the owner's
actual symptom wording. Preserve exact source answers and conflict checks.
The current runtime also does not pass earlier messages to Hermes for follow-up
context; conversation persistence alone does not provide conversational memory.

The earlier 15 passing API scenarios demonstrate their specific product and
handoff cases only; they do not establish comprehensive complaint coverage.
The targeted reproduction is recorded in
`.data/ai-assistance/grs01-diagnosis.json`. No new troubleshooting answer was
invented or published during this diagnosis.

## Grounded response safety review

The generated mode excludes unreviewed/outcome-unverified historical replies from
model evidence and blocks known unsafe regulator modification instructions in
evidence and output. Gas-hazard detection evaluates clauses and negation so a
statement such as no gas smell does not hide a separate positive report of
hissing. Normal ignition complaints remain eligible for clarification.
The prompt explicitly distinguishes missing observations from negative findings.
A regression guard rejects common affirmative claims that a lack of gas smell
rules out leakage, including when a generated reply cites a product source.
These checks reduce known failure modes; they cannot prove every generated
statement correct.

Emergency response wording is informed by official
[ESDM LPG guidance](https://www.esdm.go.id/en/media-center/news-archives/tips-menggunakan-lpg-yang-aman-dan-benar)
and [Ditjen Migas household LPG guidance](https://www.migas.esdm.go.id/post/Aman-Menggunakan-Tabung-LPG-Untuk-Rumah-Tangga).
These sources inform general safety boundaries; the chatbot does not browse
these pages at runtime or treat them as proof of a Gascomp-specific diagnosis.

## Local grounded-mode activation on September 17, 2026

The existing local preview database was backed up and upgraded through migration
`202609170003` without deleting conversations. The worker's private configuration
now explicitly selects `GASCOMP_AI_RESPONSE_MODE=grounded` and continues to use
the owner's local Ollama `qwen3.5:4b` through Hermes. No model was downloaded and no
production database, deployment, or launchd service was changed.

The first real-model evaluation exposed an overly defensive complaint response
and a repeated greeting. The final prompt prioritizes concise acknowledgement,
useful follow-up questions, and honest uncertainty. Safe catalog context can
identify a known product even when its symptom has no exact FAQ match. Echoed
short greetings use the published greeting rather than repeat the customer's
request. General explanations and uncertainty are permitted; mechanical gas
modification advice remains blocked.

All 152 Python tests passed. Lint, typecheck, and the production build passed;
the Node run passed 251 tests with five unrelated optional SQL suites skipped.
The AI SQL queue/provenance/session checks were enabled and passed. Eleven real
website/Hermes/Ollama scenarios passed, covering the owner's GRS-01 complaint,
its follow-up, EHJ-01 source facts, same-session product recall, new-chat isolation,
English translation, greeting, general explanation, unknown code clarification,
explicit admin contact, and a gas-hazard handoff. Observed model-backed website
replies took approximately 7-15 seconds; deterministic handoffs took about one
second. This is a smoke evaluation, not a completeness or accuracy guarantee.

The final desktop/mobile browser run confirmed replies to the GRS-01 complaint
and its installation follow-up, persistence after reload, a WhatsApp link only
on handoff, and cleared product context after New chat. It recorded no page
errors or horizontal mobile overflow. Browser review also exposed an unsupported
diagnosis inside a clarification; the output check now covers clarifications as
well as answers, with regression coverage and a successful browser rerun.
Additional synthetic real-model checks refused a safety-component removal
request and a credential/customer-history injection, and clarified conflicting
product facts and unknown model codes without inventing specifications. Review
of the conflicting-fact response led to a neutral variant/store clarification
instead of an unrelated symptom question; its targeted rerun passed.

Evidence lives in `.data/ai-assistance/grounded-*`, including the initial failure,
the focused rerun, and the combined final report. The source snapshot still
contains 445 entries backed by the complete 1,334-document private source index.
Generated responses do not overwrite either Obsidian vault. Public deployment
and the 24-hour endurance evaluation remain pending.
