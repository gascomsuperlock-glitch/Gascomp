# Duoke automatic replies in Hermes Desktop

[Product contract](../product/integrations/duoke-support.md#target-automatic-replies-through-hermes-desktop) · [Current verification](../work/handoffs/handoff-duoke-hermes-active-v2.md)

Scope: the commands below operate the existing exact-source bridge. The owner's
[corrected target](../product/integrations/duoke-support.md#reference-based-replies-and-continuous-operation)
is full Obsidian admin Q&A reference matching under Hermes with headless Chrome
for 24/7 service. Reference matching coverage and unattended service supervision
still require verification. These foreground startup steps do not establish
24/7 readiness or complete reference coverage for actual replies.

The `duoke-support` Hermes profile exposes four MCP tools: `duoke_status`,
`duoke_search`, `duoke_poll`, and `duoke_reply`. Search reads local Obsidian
references; poll/reply use headless Chrome. Qwen `qwen3.5:4b` chooses
an eligible answer from the connected Obsidian corpus. The bridge sends the exact
answer in its source language. Eligible extracted admin Q&A can supply references;
context, privacy, conflicting-fact, and volatile-claim filters still apply.
All connected stores are in scope.

## Refresh an existing agent

```sh
npm run duoke:desktop -- refresh
```

This synchronizes the owned profile's SOUL and scheduled prompt while preserving
custom settings, paused/running job state, and delivery controls. An old generated
working directory inside the repository is migrated to the profile's private
`workspace/` so the coding repository's AGENTS.md does not override support
behavior. Old instructions and the migrated config are
backed up privately. Reopen the **duoke-support** profile and start a **new chat**.
The new interactive instructions handle greetings as Ayu without tool calls and
use `duoke_search` for knowledge questions. They do not poll the customer inbox
merely because the operator types a greeting or product question.

The primary conversation source is the configured source vault's `Percakapan/`
folder, including its descendants. `duoke_search` reports scanned files,
extracted pairs, exclusions, and available references. It now ranks paired admin
Q&A independently of the website publication pipeline. Historical references
marked `referenceOnly` are context for previews, not automatic delivery candidates.
When only historical return cases match, `historicalMatches` retains source
metadata and `customerReply` supplies a concise WhatsApp handoff without replaying
old processing promises. A contact link still requires a verified official number.
After a bridge code update, fully quit and reopen Hermes Desktop so its MCP
process loads the updated code, then start a fresh `duoke-support` chat.

## Prepare and verify

Run these commands from the repository root. Keep Ollama running with
`qwen3.5:4b` installed, and keep the computer awake while automation is active.

```sh
uv sync --directory scraping
npm run duoke:desktop -- setup
npm run duoke:desktop -- model-context
npm run duoke:desktop -- session --headed
npm run duoke:desktop -- check
```

Sign in in the Chrome window opened by `session --headed`. Wait for
`Private browser session saved. No message was sent.` The check must report
`session: accepted`, `chrome: ready`, and `sendAction: available`. The initial
mode is `preview`. Session files are private and must not be shared.

Setup creates a dedicated local Hermes profile and the paused job
**Duoke automatic replies**. Re-running setup refreshes this generated profile's
configuration and operator prompt; it does not activate delivery or resume jobs.
Do not use it to maintain a manually customized profile.

## Preview in Desktop

Product/support questions should receive customer-ready wording under the
[resolution and WhatsApp contract](../product/integrations/duoke-support.md#customer-problem-resolution-and-whatsapp-handoff).
Verify a known FAQ, a differently worded question, a return request with applicable
policy, and an unresolved issue. Replies must not mention tools, preview/jobs,
source IDs, or internal continuation messages. A verified WhatsApp handoff must
use the configured official contact. A prompt refresh alone does not establish
complete source coverage or enable an outgoing handoff candidate.

Customer introductions must follow the
[Ayu from Gascomp identity contract](../product/integrations/duoke-support.md#customer-facing-identity).
The interactive SOUL implements the named persona; deterministic outgoing
introductions remain pending in the active task. Before treating delivery as ready, verify an introduction,
an identity question, and a product question in preview. Updating documentation
does not update an existing Desktop session, source answer, or scheduled prompt.

1. Open Hermes Desktop and choose the **duoke-support** profile. If it is absent,
   reopen the app so it refreshes its profile list. Start a new chat after setup.
2. Verify the selected model is **qwen3.5:4b** with the local custom provider
   `http://127.0.0.1:11434/v1`.
3. Ask: `Call duoke_status once and report mode and knowledge counts.` The tool
   result must say `preview`; a model's unsupported claim is not verification.
4. Send the operator prompt in
   `scraping/.private/duoke-desktop/desktop-prompt.txt` to process one inbox page.
   The bridge can return previews but cannot send while its delivery gate is off.
   `needsReview` or no eligible jobs is a valid result; it does not prove a reply
   was sent. Do not enable delivery if tools report errors.

The MCP process retains opaque tickets for five minutes. Poll and reply must
happen in the same agent run. Restarting an MCP process invalidates its tickets.

## Recover from truncated responses

If Hermes reports `Response remained truncated after 4 continuation attempts`,
compare Ollama's active context (`ollama ps`) with Hermes `model.context_length`.
The Qwen training maximum is not the window allocated by the local runtime.
The observed failing configuration allocated 4,096 tokens while Hermes discovered
a much larger maximum. The failing Desktop request resumed an old conversation.

```sh
npm run duoke:desktop -- model-context
```

This pins both Ollama `num_ctx` and the dedicated Hermes profile context to
65,536 for the same installed `qwen3.5:4b` weights. Other model parameters are
preserved. The installed Hermes version requires at least 64,000 tokens, so
merely increasing Ollama to 8K or 16K is insufficient for this harness.
A backup alias and the previous config are recorded privately in
`scraping/.private/duoke-desktop/context-backup.json`. Other local clients using
this same model tag also inherit its larger default. No delivery controls or
schedules are activated. `check` rejects a missing or mismatched model override.

Reopen Hermes Desktop, select **duoke-support**, and create a **new chat** rather
than retrying the failing old conversation. Old history is retained. This fixes
context alignment; it does not guarantee faster generation or unlimited history.

Ollama documents context settings for compatible clients in its
[compatibility guide](https://docs.ollama.com/api/openai-compatibility); the repair
uses its [model creation API](https://docs.ollama.com/api/create).

## Enable automatic delivery

After the successful preview, run:

```sh
npm run duoke:desktop -- enable --send
```

This checks the session/model/corpus and enables the bridge's delivery gate.
It does not itself start a polling process. From this point, manually invoking
`duoke_reply` in Desktop can send an eligible customer reply.

Hermes scheduled jobs need an active scheduler. The installed Desktop backend
was observed starting its built-in scheduler for this profile. A separate gateway
is not always required; verify Desktop job runs before starting another process.
If that scheduler is unavailable, the foreground alternative is:

```sh
hermes -p duoke-support gateway run
```

If using the foreground gateway, leave that window running. In Hermes Desktop, under the same profile, open
**Cron**, select **Duoke automatic replies**, and choose **Resume**. The job
checks one page of up to five conversations every minute. Runs can take longer
than a minute with the local model; do not create additional copies to speed it
up. Pagination continues from a private saved cursor across runs.

In another Terminal window, verify:

```sh
hermes -p duoke-support cron status
hermes -p duoke-support cron list
hermes -p duoke-support cron runs
```

The scheduler must be running and the job must be active. A resumed job without
either a Desktop or gateway scheduler will not execute. CLI gateway status alone
may not establish Desktop scheduler health; check actual job runs too. Keep the
Mac awake and Ollama active.

## Monitor and stop

Check Cron run results in Desktop. Private `status.json` and `audit.jsonl` under
`scraping/.private/duoke-desktop/` record polling counts and delivery outcomes.
Only an audit event with `action: sent` and `sent: true` means the bridge observed
the outgoing answer in the conversation history. Confirm the first such answer
in Duoke. A model summary alone is insufficient.

- `preview`: delivery gate is off; nothing sent.
- `needsReview`: no eligible source answer; handle the conversation manually.
- `conversation_changed` / `knowledge_changed`: recheck invalidated the reply.
- `uncertain`: an attempt was reserved, but delivery could not be verified. Review
  Duoke manually. The bridge will not retry that incoming message automatically.
- `error`: inspect the session and local services. Do not clear deduplication
  state to recover from a network or authentication error.

To stop new delivery immediately:

```sh
npm run duoke:desktop -- disable
```

Then **Pause** the job in Desktop and press **Ctrl+C** in its gateway Terminal.
Disabling cannot retract a message already dispatched. The existing shared
`STOP_AUTOREPLY` marker also blocks this bridge. The legacy
`DUOKE_AUTOREPLY_ENABLED` setting does not enable this separate Desktop bridge.

If authentication expires, disable delivery, pause the job, repeat
`session --headed` and `check`, preview again, and then enable and resume.
Never delete `delivery-state.json` to restart: it prevents duplicate or ambiguous
attempts from being repeated.

## Verification boundary

The current dated evidence is in the handoff. Synthetic delivery tests exercise
state checks and a real Chrome page with a simulated Duoke store. These tests do
not prove a real customer message was delivered. The first owner-started live
reply and recurring Desktop schedule are separate acceptance steps.
