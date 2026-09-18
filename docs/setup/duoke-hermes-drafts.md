# Duoke reply drafts with Hermes

[Behavior specification](../product/integrations/duoke-support.md#hermes-agent-reply-drafts)

This guide covers the existing draft-only Python worker. The owner's updated
target is [automatic delivery through Hermes Desktop with Qwen 3.5:4b](../product/integrations/duoke-support.md#target-automatic-replies-through-hermes-desktop).
These commands do not implement that Desktop workflow or send customer replies.
The new task must provide separate step-by-step setup and operation instructions.

## Local prerequisites

- Google Chrome, the repository Python environment, and the installed Hermes
  Agent source with its Python environment.
- An available local OpenAI-compatible model endpoint. The worker uses the
  existing `GASCOMP_AI_MODEL` unless `DUOKE_HERMES_MODEL` overrides it.
- The authorized archive session at `scraping/.private/chat-archive/session.json`.
  Its schema and verified endpoints are owned by the
  [archive specification](../product/integrations/duoke-support.md#full-conversation-archive).
  An expired token must be refreshed from an authorized browser session; the
  worker never prints session content.
- Curated Markdown notes following the
  [answer vault schema](../../obsidian/customer-support/README.md#authoring-format).

The [Hermes Python library](https://hermes-agent.nousresearch.com/docs/guides/python-library)
provides the Agent interface. The existing isolated adapter disables agent tools,
personal context, memory, persistence, and external model fallbacks. Hermes
Desktop itself does not need to be controlled or reconfigured.

## Configuration

Set optional overrides in `.env.local` or the worker's environment:

| Variable | Default |
| --- | --- |
| `DUOKE_HERMES_ROOT` | `GASCOMP_AI_HERMES_ROOT`, then `~/.hermes/hermes-agent` |
| `DUOKE_HERMES_PYTHON` | `<Hermes root>/venv/bin/python` |
| `DUOKE_HERMES_MODEL` | `GASCOMP_AI_MODEL` |
| `DUOKE_HERMES_MODEL_BASE_URL` | `http://127.0.0.1:11434/v1` |
| `DUOKE_HERMES_SOURCE_VAULT` | `GASCOMP_AI_SOURCE_VAULT`, then the saved local AI worker source path |

Use `--vault /absolute/path/to/curated/answers` to override
`obsidian/customer-support/`. This is the curated layer, not the entire database.
The full source is connected separately through `--source-vault` or the source
configuration above. It must point to the `Duoke` directory containing both
`Percakapan` and `Produk`; no copying or reformatting of those notes is needed.
The saved path is read from
`scraping/.private/ai-assistance/services/worker-environment.json`; only the source
path is reused, not website credentials or other worker settings.

The local check reports curated notes, source files, indexed documents by kind,
excluded files, extracted passages, and combined entries. It validates source
configuration and session structure without checking live Chrome/authentication
or model connectivity. Use `--curated-only` only to intentionally disable the full
source. A missing or invalid configured source otherwise fails the check.

```bash
npm run duoke:drafts:check
npm run duoke:drafts -- --limit 5
npm run duoke:drafts:check -- --source-vault "/absolute/path/to/Duoke"
npm run duoke:drafts -- --shop-id STORE_ID --limit 5
npm run duoke:drafts -- --watch --interval 30 --limit 5
```

`--shop-id` is repeatable and cannot expand the saved session's store filter.
`--session` selects a private session file. `--max-history-pages` defaults to 20;
larger conversations produce review errors rather than drafts from partial history.
Limits apply per pass. Watch mode revisits the bounded current list; it does not
guarantee draining every conversation in a large inbox. `limited: true` records
that the source has more conversations outside the current pass.

## Review and stop

Open `scraping/.private/duoke-drafts/latest.json` locally. Entries with
`status: draft` contain English draft text and relative Obsidian note citations.
For citations with `vault: source`, resolve the note against the report's
`sourceVault`; other citations resolve against `vault`. `relatedNotes` lists
search hits for operator context, including historical notes marked
`requiresReview`; these are not automatically approved answer evidence.
`needs_review` means the worker could not produce a validated grounded answer;
`error` indicates a failed conversation read or generation step. Reports contain
hashed source references, so use the private archive to map a reference to its
conversation when necessary. No customer text appears in terminal summaries.
Keep these artifacts private and outside commits.

The report is replaced each pass. It contains `checkedAt` timestamps and is not
a live guarantee that the customer has sent no later messages. Check the current
conversation before manually using a draft. These commands have no send mode.

`npm run duoke:stop` also stops draft processing. An existing stop marker is
preserved. The shared `duoke:resume` command clears the marker for both this
worker and the separate delivery runner, so only resume as an authorized operator
after checking the other runner's state. Ctrl-C ends this process. No background
service is installed by these commands.

## Verification

Run `npm run duoke:test` for the regression suite. The draft tests exercise real
headless Google Chrome against synthetic API responses, including request
allowlisting, stale-message rejection, knowledge changes, stop behavior, source
validation, and unchanged-draft reuse. They do not contact customer accounts or
require a running model. Model availability must be checked separately.
