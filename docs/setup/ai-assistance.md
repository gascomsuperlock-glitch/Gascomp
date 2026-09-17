# AI assistance setup

[Behavior specification](../product/features/ai-assistance.md)

## Prerequisites and boundaries

- Apply the ordered AI assistance migrations through `202609170003` to an isolated
  development database first.
  Use the existing release workflow for a subsequently authorized production release.
- Configure `GASCOMP_AI_ASSISTANCE_ENABLED=true` on the development website and a
  distinct random `GASCOMP_AI_WORKER_TOKEN` of at least 32 characters. Keep the
  public deployment flag false until acceptance checks pass.
- The Mac needs the repository Python environment, a Hermes installation with
  working dependencies, an owner-installed local model endpoint, and Chrome.
- The Mac must remain powered, awake, and connected. Process supervision cannot
  guarantee service during sleep, a power outage, or network loss.

The website stores knowledge and conversations in private Supabase tables.
Nothing in this setup authorizes production writes or sends WhatsApp messages.
Never expose the local model endpoint, Chrome debugging port, or worker token to
the internet or client bundle.

### Independent retention scheduler

The migration provides a private `gascomp_ai_cleanup()` function and registers
`gascomp-ai-retention` every 15 minutes when `pg_cron` is already installed.
Cleanup deletes sessions older than 30 days and cascades their messages/jobs,
including while AI chat is disabled. The practical retention window is about
30 days plus the scheduler interval. The function also runs during normal queue
operations, but queue traffic is not a substitute for the scheduler.

Before public activation, verify the named job exists and is active in
`cron.job`. If the migration reports that `pg_cron` is absent, enable Supabase
Cron through the authorized database setup, then register the job:

```sql
select cron.schedule(
  'gascomp-ai-retention',
  '*/15 * * * *',
  'select public.gascomp_ai_cleanup();'
);
```

Monitor job execution through Supabase Cron. Database scheduler configuration is
not applied by a local code check or the Mac service generator.

## Local preview without a production migration

For local UI and worker development, set `GASCOMP_AI_PREVIEW_URL` to
`http://127.0.0.1:54330` and `GASCOMP_AI_PREVIEW_KEY` to a distinct random value
of at least 32 characters in `.env.local`. Run `npm run ai:preview-db` in one
terminal and `npm run dev` in another. Keep the preview database process running
while using the chat panel.

The preview bridge runs the ordered AI SQL migrations inside local PGlite, storing
private data in `.data/ai-assistance/preview/postgres`. Only the AI feature uses
this override; the catalog and other features keep their existing connections.
It is explicit, development-only configuration. Invalid settings or a stopped
preview server cause unavailability, never a fallback write to the main database.
Production builds ignore these variables. No sample knowledge or replies are
seeded, and no Supabase migration is applied by this command.

An empty preview database can open and preserve a conversation, but reports the
assistant as unavailable until approved knowledge and a ready worker exist.
Configuring storage does not start a model. The local database survives process
restarts, refuses incompatible migration fingerprints, and performs retention
cleanup while its process is running. Do not use this development bridge as a
production database service.

## Knowledge authoring

Read [the vault authoring guide](../../obsidian/customer-support/README.md).
Author both English and Indonesian versions of the
greeting, clarification, and handoff templates, then add verified product answers.
Do not use real customer chat as a fixture or copy private account data into notes.

In the default `grounded` mode, note bodies are factual reference material.
Hermes can explain, paraphrase, and translate relevant passages while preserving
product facts. It can give general explanations and ask useful clarifying
questions when an exact source answer is absent. Keep private account data,
unverified claims, and unsafe repair instructions out of reusable knowledge.
Use clear product names, SKUs, source questions, and verified facts rather than
trying to author every possible customer wording.

The worker watches saved changes, validates the full folder, and publishes a
versioned snapshot. Invalid edits disable readiness rather than silently serving
stale facts. Published bilingual greeting/handoff templates remain useful for
initial display and service failures. The worker does not write to the notes.

`GASCOMP_AI_RESPONSE_MODE=exact` restores the original ID-selection behavior:
only the selected note body is sent, without translation or paraphrasing.
Conversational aliases and `conversation-` entries remain supported in that
mode. The grounded mode uses recent same-session history and no longer needs an
exact greeting or small-talk alias to have an ordinary support conversation.

### Connect the complete scraped Obsidian archive

Set `GASCOMP_AI_SOURCE_VAULT` in the worker's private environment to the `Duoke`
parent containing both `Percakapan` and `Produk`, for example:

```text
/Users/surya/Documents/douke-chat/knowledge/approved/Douke Knowledge Base/Duoke
```

The worker indexes readable Markdown files in both trees, builds exact reusable
answer passages, and merges them with the dedicated answer vault. It watches
all sources for saved changes, including additions, moves, and deletions.
Conversation and product captures live directly in `Percakapan` and `Produk`;
their index notes are `Conversation archive index.md` and
`Product catalog index.md`. Folder organization does not exclude unique knowledge.
Product copies are deduplicated only when marketplace/store/listing identity and
content agree. SKU equality alone cannot remove a different store, listing,
variant, or unidentified source.
Do not copy the original transcripts into the public answer folder. Private
customer/account details, operational promises, volatile prices/stock, and
unresolved facts do not become customer answers. Documents without eligible
answers remain searchable locally and can guide a clarification or handoff.
The complete private transcript index is never included in a model prompt or
browser response.

Preview extraction and optionally write private audit artifacts:

```bash
scraping/.venv/bin/python -m scraping.ai_assistance.corpus \
  --source "../douke-chat/knowledge/approved/Douke Knowledge Base/Duoke" \
  --write
```

The command writes only to ignored `scraping/.private/ai-assistance/full-corpus`:
`corpus.json`, `report.json`, and generated staged entries. It does not activate
knowledge or change either source vault. The live worker reads the original
source directory directly; staging is not an extra activation step. Combined
publication must fit 2,000 entries and 4 MiB; the complete private corpus has a
separate size and is not uploaded.

The optional `import_duoke --write-review` and `import_products --write-review`
commands still prepare manually editable review material. Their narrow pilot
eligibility rules no longer limit the full-source runtime. Do not edit generated
corpus artifacts to author permanent answers: put curated final answers in
`obsidian/customer-support/`. Grounded mode can translate verified source facts into the selected chat language.
Exact mode still requires source text in that language.

When upgrading an existing local preview, stop its process and restart
`npm run ai:preview-db` to apply migration `202609170003` while retaining existing
conversations. This adds bounded same-session history and validated generated
responses while preserving legacy exact responses, leases, and version checks.
Restart the worker after
adding the source path to `worker-environment.json`; changing `.env.local` alone
does not update its existing private configuration.

## Worker configuration

Set environment variables in the worker process, separately from the website's
environment. `.env.example` documents names but is not a secret store.

| Variable | Purpose |
| --- | --- |
| `GASCOMP_AI_SITE_URL` | HTTPS website origin; loopback HTTP is for local development only |
| `GASCOMP_AI_WORKER_TOKEN` | Same dedicated bearer secret as the website |
| `GASCOMP_AI_MODEL_BASE_URL` | Owner-installed loopback model API endpoint |
| `GASCOMP_AI_MODEL` | Exact identifier accepted by that endpoint |
| `GASCOMP_AI_RESPONSE_MODE` | `grounded` (default) for natural responses; `exact` for the legacy selector |
| `GASCOMP_AI_HERMES_ROOT` | Optional Hermes source installation path |
| `GASCOMP_AI_HERMES_PYTHON` | Optional Python interpreter containing Hermes dependencies |
| `GASCOMP_AI_VAULT` | Optional curated answer directory; default `obsidian/customer-support` |
| `GASCOMP_AI_SOURCE_VAULT` | Optional full scraped `Duoke` root containing `Percakapan` and `Produk` |
| `GASCOMP_AI_CHROME_CDP_URL` | Local Chrome debugging endpoint |
| `GASCOMP_AI_BROWSER_HOSTS` | Explicit allowlist for optional link probes |

The Hermes harness uses a separate private home and disables personal context,
personal memory, unrelated tools, and cloud fallback. Grounded responses carry
plain text, a response kind, a general/knowledge basis, and validated source IDs.
Recent website chat history is limited to the current session; it does not enable
personal Hermes memory. Invalid generations use a published fallback.

### Connect the local website worker

The interactive Hermes chat and the website worker are separate processes.
Selecting Ollama in `hermes model` configures interactive Hermes; the website
uses the explicit worker configuration described above.

For local development, put the worker variables in the ignored `.env.local`,
with `GASCOMP_AI_SITE_URL=http://localhost:3000`, then generate the private
configuration once (Node must support `--env-file`):

```bash
node --env-file=.env.local scripts/ai-assistance/launchd.mjs --generate
```

This copies only the allowed worker variables into a private file and generates
service definitions without installing or activating launchd. If those files
already exist, edit the private configuration instead of regenerating it.
With Ollama, the local preview database, and Next.js running, start the worker:

```bash
node scripts/ai-assistance/worker-launcher.mjs scraping/.private/ai-assistance/services/worker-environment.json
```

Keep that terminal open; `Ctrl+C` stops the worker. Run only one worker for the
pilot. Changes to `.env.local` do not update this generated private copy; keep
the worker token synchronized with the website and restart affected processes.
Never paste the private configuration into chat or commit it.

A recent heartbeat confirms the worker can reach the website. With an empty
vault it reports `ready=false`; the admin `workerOnline` field requires both
readiness and a recent heartbeat, so it remains false until knowledge is valid.
Provide one greeting, clarification, and handoff for each language, together
with approved answer notes. The running worker automatically validates and
publishes saved notes to its configured local website.

```bash
# Local validation only; no website publication or customer reply.
npm run ai:check

# Explicitly publish knowledge and process at most one queued message.
npm run ai:once

# Continuous worker: publication, heartbeat, and bounded job processing.
npm run ai:watch

# Optional bounded browser check. Page contents never become answer knowledge.
npm run ai:probe-links
```

The worker model and endpoint are explicit owner configuration.
For the owner's downloaded `qwen3.5:4b`, use model base URL
`http://127.0.0.1:11434/v1`. The selector disables thinking for `qwen3.5:*`
models and requests JSON with temperature zero, so reasoning does not consume
the 80-token answer-ID budget. This setting does not replace relevance testing.
The endpoint must implement OpenAI-compatible chat completions and expose
`/models` relative to the configured API base; its model list must contain the
configured identifier before the worker reports ready.
A mocked selector is suitable for integration tests but is not proof of
real-model relevance or latency.

### Current working localhost pilot

The local pilot combines 35 curated template/conversation/product notes with
reusable excerpts from all 1,334 scraped source notes (902 conversation notes
and 432 product notes), producing 445 active entries. The former `Archive` and
`Catalog` contents have been moved into their parent folders with updated links;
all unique knowledge remains eligible. Counts of publishable answers can change
as sources are edited or conflicts are resolved; indexed documents are not
necessarily answer entries.

Open `http://localhost:3000`, choose Indonesian, and ask a product question such
as `Apa bahan PISAU-6SET?`. The grounded model explains relevant source facts naturally and may ask a
follow-up question. Also test the actual complaint `Kenapa GRS-01 saya gak bisa
nyala?`, then answer its clarification in the same chat. A fresh New chat must not
remember that context. English responses may translate Indonesian source facts;
unsupported specifications must remain explicitly unknown.

Keep the local database, Next.js server, Ollama, and foreground worker running.
Automatic launchd startup, production deployment, and the 24-hour endurance test
remain separate release steps. See the behavior specification for dated test
results and the limits of each local verification.

## Acceptance and rollback

1. Validate bilingual notes and known, unknown, ambiguous, and product-specific
   questions against the selected local model. Verify factual grounding, useful
   clarification, history isolation, and rejection of unsafe repair instructions.
   Include the owner's GRS-01 symptom and its follow-up, not only specifications.
2. Verify desktop/mobile chat, language, session continuity, and WhatsApp handoff.
3. Verify cross-session access denial, worker authentication, invalid snapshots,
   duplicate submissions, restart, network loss, timeout, and stale results.
4. Exercise pause/resume from **AI Assistance** in the existing admin panel.
5. Complete a 24-hour synthetic pilot on an isolated website/database. Record
   elapsed duration, accepted jobs, handoffs, timeouts, duplicate replies, and
   restart recovery. Do not use customer accounts or claim this passed after a
   shorter smoke test.
6. Only after owner-approved publication and deployment, enable the production
   feature flag. Check the deployed revision and actual customer flow.

Pause stops new AI processing while retaining the handoff path. For UI rollback,
set `GASCOMP_AI_ASSISTANCE_ENABLED=false` and redeploy: the original floating
WhatsApp control returns and stored conversations are retained. Rotate both
copies of the worker token together if it is exposed. For response-mode rollback,
set `GASCOMP_AI_RESPONSE_MODE=exact` in the private worker environment and restart
only the worker; keep the additive database migration and existing chats.

## Mac services

The service generator previews by default and never calls `launchctl`. Supply the
worker variables above through your trusted local environment, then run:

```bash
npm run ai:services
npm run ai:services -- --generate
```

Generation creates `scraping/.private/ai-assistance/services/` with owner-only
permissions, two launchd property lists, and `worker-environment.json`. The token
is stored only in that private JSON file, never in a plist, process argument, or
preview output. Existing files are not overwritten. Edit that file privately to
change configuration; keep mode `600` and restart the worker afterward. Never
paste the JSON into a report or commit it. The launcher reads it at startup,
passes only explicit worker variables and basic OS variables to Python, and
does not inherit personal provider credentials. Launchd does not source shell
profiles or `.env` files.

The generated worker uses the repository's `scraping/.venv/bin/python`; the
separate Hermes interpreter defaults to `<GASCOMP_AI_HERMES_ROOT>/venv/bin/python`.
Configure `GASCOMP_AI_HERMES_PYTHON` if your Hermes installation uses another
interpreter. The absolute Node executable used during generation is also stored
in the worker plist. Regenerate service files after moving the repository or
changing that executable. No dependencies are installed by the generator.

Chrome defaults to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
uses its own private profile, and binds CDP to `127.0.0.1`. Generated services
require `GASCOMP_AI_CHROME_CDP_URL=http://127.0.0.1:PORT` (default port `9222`).
Check that the port is free before activation; never reuse a personal browser
profile or expose CDP through a public tunnel. The independent Chrome service
can fail without restarting the worker. Both services restart on failure with a
15-second launch throttle. Logs are private `worker.log` and `chrome.log` files
inside the service directory; periodically inspect their size and rotate them
while the services are stopped. Worker logs must remain generic and must not
contain customer messages or credentials.

After explicit runtime activation is authorized, validate the generated plists
and bootstrap them into the current login session from the repository root:

```bash
AI_SERVICE_DIR="$PWD/scraping/.private/ai-assistance/services"
plutil -lint "$AI_SERVICE_DIR/com.gascomp.ai-assistance.chrome.plist"
plutil -lint "$AI_SERVICE_DIR/com.gascomp.ai-assistance.worker.plist"
launchctl bootstrap "gui/$(id -u)" "$AI_SERVICE_DIR/com.gascomp.ai-assistance.chrome.plist"
launchctl bootstrap "gui/$(id -u)" "$AI_SERVICE_DIR/com.gascomp.ai-assistance.worker.plist"
launchctl print "gui/$(id -u)/com.gascomp.ai-assistance.worker"
```

These bootstrap commands activate the worker and therefore can publish knowledge
and process queued customer messages. Do not run them merely to validate setup.
For an authorized automatic start at login, copy the validated plist files into
`~/Library/LaunchAgents/` with mode `600`; keep the JSON in its private location.
Services run only while that user is logged in. A reboot requires login again,
and a logout ends the user services. An awake Mac, stable power, network, and the
local model server are separate operational requirements. Launchd does not keep
the computer awake or start the owner's model server.

For an authorized restart after changing configuration:

```bash
launchctl kickstart -k "gui/$(id -u)/com.gascomp.ai-assistance.worker"
```

Pause/resume in the admin panel controls AI processing without unloading the
services. To stop local processing and Chrome entirely:

```bash
launchctl bootout "gui/$(id -u)/com.gascomp.ai-assistance.worker"
launchctl bootout "gui/$(id -u)/com.gascomp.ai-assistance.chrome"
```

If automatic login startup was configured, also remove only these two Gascomp
plists from `~/Library/LaunchAgents/`. Keep the private configuration and source
notes for recovery. The website will consider the worker offline after its
heartbeat expires and retain the WhatsApp handoff. Do not consider process
restart checks a substitute for the 24-hour pilot.

## Synthetic transport pilot

`npm run ai:pilot` is a dry run: it performs no requests or writes. The explicit
`--run` mode replaces knowledge with synthetic fixtures, creates synthetic chat
sessions, and simulates worker selection through the real website endpoints.
Use an exclusive disposable website and database with no real customer data,
notes, other workers, or tunnels. Apply the migration to that database first,
point the local website's Supabase configuration at it, and enable the feature.
Both website and database origins must be loopback. The isolation environment
variable is the operator's confirmation that the website actually uses that
disposable database; the pilot cannot inspect a server's database configuration.

Provide `GASCOMP_AI_WORKER_TOKEN` through the environment, matching the disposable
website's token. Do not put the secret in CLI arguments. Then run:

```bash
export GASCOMP_AI_SITE_URL=http://localhost:3100
export GASCOMP_AI_PILOT_DATABASE_URL=http://127.0.0.1:54329
export GASCOMP_AI_PILOT_ISOLATED=true
npm run ai:pilot
npm run ai:pilot -- --run --duration-seconds 60
# Transport endurance, using only synthetic fixtures and a simulated worker:
npm run ai:pilot -- --run --duration-seconds 86400
```

The smoke test takes at least 60 seconds plus setup because it verifies the real
customer deadline. This is a legacy exact-response transport check, not an
evaluation of grounded conversational quality. It checks bilingual exact-source
answers, unknown-question handoff,
duplicate submissions and completions, session continuity and isolation, source
replacement during an active job, simulated offline/recovery, and rejection of
a late result. The requested duration is a minimum; initial scenarios finish
even if that duration has elapsed. Longer runs then alternate language-specific
known answers with five seconds between cycles, staying below session limits.
The tool disables its simulated worker readiness after completion or caught failure and leaves the
synthetic fixture database available for inspection; discard that database
afterward. Never reuse it for production.

Content-free JSON reports are written beneath ignored `.data/ai-assistance/pilot/`
using repository-root paths. Reports contain scenario outcomes, elapsed time,
request latency totals/maxima, answer/handoff counts, late-result rejections,
and duplicate reply counts. A failed scenario exits nonzero. Reports omit
message text, response bodies, tokens, and cookies.

This checks website/database transport with a simulated selector. Offline
recovery is simulated through heartbeat state; it does not restart launchd,
Chrome, or Hermes. It does not validate actual model relevance, browser behavior,
model latency, or real process restart recovery. A successful short smoke test
is not a 24-hour result. Full acceptance still needs the owner's configured local
model, approved bilingual notes, actual service restart checks, and a separate
24-hour run with the real Hermes worker in an isolated environment.
