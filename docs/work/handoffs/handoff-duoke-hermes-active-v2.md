# Duoke Hermes Desktop automatic replies handoff

Updated: 2026-09-18
Status: In progress

## Objective

Deliver the [reference-based continuous workflow](../../product/integrations/duoke-support.md#reference-based-replies-and-continuous-operation):
use the full Obsidian admin Q&A database for matching Duoke questions, with Hermes
as harness and headless Chrome as read/send interface. Preserve Qwen `qwen3.5:4b`,
all-store scope, source-language behavior, Ayu, and owner-operated live startup.

## Current evidence

Latest Percakapan repair (2026-09-18): the owner explicitly identified that folder
as the admin-answer database. The existing corpus indexed all notes but routed
Desktop evidence through website publication eligibility and whole-note media
flags. Added `conversation_references.py`: direct adjacent-pair extraction,
question-level ranking, canonical return synonyms, deduplication, explicit product
scope, bounded evidence, and per-pair media handling. Search prioritizes these
references; polling uses only eligible paired exact answers. Contextual/monetary
and return references remain preview-only, with private/unsafe material excluded.
Legacy draft and website extraction behavior is unchanged.

Read-only audit of the actual connected source:
`/Users/surya/Documents/douke-chat/knowledge/approved/Douke Knowledge Base/Duoke/Percakapan`.
902 files scanned, 339 adjacent Q&A pairs extracted, 246 reference pairs retained,
93 excluded by the new privacy/context/safety/size checks, and one unparsed note.
These are extraction counts, not 902 guaranteed answers. Existing pairing also
excludes 512 boilerplate seller runs, 125 trivial customer runs, 285 customer runs
without adjacent seller replies, 13 card runs, and 13 trivial seller runs. Mixed
boilerplate/useful replies and unparsed content still need a separate coverage
review. No source notes were edited or published.

The owner's synthetic regulator-return query now returns paired conversation
references. Actual local Qwen response composition was tested with the real
read-only search output injected as a tool result; this is not an end-to-end
Hermes tool-selection or Desktop UI test. The initial model result added an
unsupported warehouse destination and repeated a historical processing claim;
strengthened SOUL, but another probe still copied the old claim. The bridge now
suppresses historical return answer text, retaining matched source metadata, and
provides a fixed customer handoff. A third probe without fixed wording invented a
special-handling rationale; the final contract supplies `customerReply` verbatim.
Final probe evidence is recorded below. These failed intermediate checks show
why prompt caveats alone were insufficient.

Refreshed the actual owned Hermes profile instructions. Delivery remains disabled;
no Chrome/inbox call or customer send was made. Existing running Desktop MCP
processes require a restart to load the changed Python implementation.


Latest owner correction: a return-request reply exposed internal tool names,
preview/inbox status, and continuation artifacts rather than helping the customer.
The owner requires useful answers from all Obsidian references and WhatsApp
handoff when unresolved. The example is summarized here without copying the
full conversation. This supplies the previously missing incorrect-response case.

Updated `desktop_prompts.py` and refreshed the actual project-owned SOUL and
scheduled prompt: customer support previews must use reference search, give
practical customer-only wording, and use a bounded reformulated lookup before
fallback. Internal diagnostics are only for explicit operator requests. The
prompt requires official WhatsApp handoff without inventing a destination or
claiming an unperformed transfer. The scheduler cannot invent a handoff candidate;
implementing that delivery mechanism remains below. This is not proof that every
existing note is searchable or that a verified WhatsApp destination is available.

Latest repair: the owner reported `Response remained truncated after 4
continuation attempts` at 2026-09-18T06:33:47Z. The corresponding Desktop log
resumed the old session with 21 history messages. Ollama `/api/ps` showed a
4,096-token runtime window, while `/api/show` advertised a 262,144-token training
maximum and the profile had no context override. Earlier calls approached 4,096
total tokens with only 28-30 output tokens. This supports a context mismatch as
the truncation cause, rather than a missing Obsidian connection.

Added `desktop_model.py` and `duoke:desktop -- model-context`: back up the current
local model tag, reuse its weights with `num_ctx: 65536`, verify persistence, then
set the owned Hermes profile context to the same value. Applied successfully;
other sampling parameters, the selected model, job activation, and delivery
controls were preserved. Setup now pins the same Hermes bound and check rejects
an unaligned Ollama model. The backup record is private. Other clients of this
local model tag inherit its context default.

The current Desktop backend log also showed its built-in cron scheduler starting
for two profiles, including duoke-support. Corrected the operator guide: a
separate gateway is an alternative, not an unconditional prerequisite. No job
was resumed or created as part of this repair.

The owner reported incorrect Hermes agent behavior after the documentation-only
updates. The actual project-owned profile still used the scheduled inbox prompt
as SOUL, had no Ayu instruction, and used a working directory inside this coding
repository. Recent Desktop session metadata confirmed assistant messages still
introduced a Duoke assistant. No private transcripts are copied into this note.

Implemented and applied these fixes:

- `desktop_prompts.py` separates interactive SOUL from `DUOKE_INBOX_PASS`.
  Greetings/identity questions use Ayu without tool calls; product questions use
  a read-only local reference search. Inbox operations require an explicit pass.
- `duoke_search` is a fourth MCP tool. It returns bounded Obsidian evidence with
  source-note references without opening Chrome, reading customer conversations,
  generating tickets, or sending messages, even when delivery is enabled.
- Desktop loading opts into admin references. Conversation provenance alone no
  longer blocks usable extracted admin Q&A. Substantive privacy, context,
  conflicting-fact, volatile-claim, and unsafe-advice filters remain. Legacy draft
  loading retains its previous review behavior. This is not arbitrary access to
  every raw transcript line or proof of complete semantic retrieval coverage.
- `npm run duoke:desktop -- refresh` updates owned SOUL and the scheduled prompt,
  with private backups and verification of preserved activation/model/schedule.
  It also migrates the old generated repository cwd into the profile workspace;
  custom cwd/settings are preserved. Tests cover refresh idempotence and migration.
- Applied refresh to `~/.hermes/profiles/duoke-support`. Verified SOUL and job prompt
  equal current constants, the job remains paused, and the delivery gate remains
  absent. No inbox pass, browser read, real send, or gateway startup occurred in
  this repair session. Old Desktop sessions must be reopened as new chats.

The first real Qwen greeting test after SOUL refresh still answered as a coding
project assistant. After migrating the cwd outside the repository, the actual
installed Hermes CLI backend returned the exact Ayu introduction for a new `halo`
turn, with zero tool calls. This confirms that one scenario; it is not a GUI test
or proof that all model outputs follow the policy.

Earlier implementation includes guarded Chrome delivery, pre-send message/source
checks, persistent deduplication, reservation before sending, and post-send
verification. Ambiguous attempts are not automatically retried. Earlier live
read-only checks accepted the owner's login and scanned five conversations with
four skips, one needs-review result, zero errors, and zero sends. Those historical
checks do not establish current browser authentication or live delivery success.
Pre-existing warranty, source knowledge, and other workspace edits are preserved.

## Remaining work and decisions

- The Percakapan retrieval repair is implemented and locally checked. Continue auditing the owner-designated Obsidian knowledge scope,
  including admin Q&A, FAQs, procedures, and return/refund guidance beyond the
  currently selected source folders. Record included/excluded files, extraction
  results, question-answer pairing, ranking, and eligibility exclusions. Fix
  uncovered sources and missed matches instead of assuming insufficient knowledge.
- Reproduce the owner's regulator-return example with both applicable policy
  evidence and no applicable evidence. Verify known/rephrased FAQs and ensure
  customer output excludes operational names, preview/jobs, and continuation text.
- Resolve the official configured WhatsApp contact through the existing support
  configuration, expose a validated handoff result, and connect it to guarded
  customer delivery. The current exact-source candidate flow cannot send an
  arbitrary handoff; do not mistake a prompt instruction for an implemented path.
- Owner: reopen the Desktop profile and start a new chat to validate the repaired
  behavior in the actual UI. The owner has now provided the incorrect return
  response; use that scenario as the next regression case.
- Extend representative admin Q&A matching tests, including equivalent wording,
  conflicting/unrelated products, absent references, and full corpus coverage.
  Exact-source outgoing delivery remains narrower than grounded composition.
- Implement deterministic greeting/identity handling in the outgoing customer
  path. The interactive SOUL fix does not add a no-model greeting interceptor to
  Desktop or change an old source answer's introduction.
- Latency remains unresolved: the successful greeting's model request took
  **39.8 seconds**, 3,266 input tokens and 13 output tokens, with zero tool calls.
  The earlier coding-assistant result took 36.4 seconds. No speedup is claimed.
  Investigate model/runtime performance separately from inbox polling delays.
- Define an always-on host, supervised runtime, session-expiry recovery, durable
  state, health reporting, and a 24-hour soak test. No 24/7 deployment or live
  delivery acceptance has been established.
- Owner-operated live startup and first verified customer send remain outstanding.

## Decisions and corrections

Owner, 2026-09-18: customer replies must solve the issue without internal system
explanations; use all Obsidian knowledge as reference and hand off unresolved
cases to WhatsApp. Reason stated: customers only want their problems resolved.
See the [canonical correction](../../product/integrations/duoke-support.md#customer-problem-resolution-and-whatsapp-handoff).
The internal return/status response is not an acceptable fallback. This supersedes
the prompt's generic instruction to keep asking for missing context when admin
handling is needed. No refund policy or new WhatsApp number was supplied.

Canonical requirements are in the [product specification](../../product/integrations/duoke-support.md).
The owner requires full admin Q&A references, Hermes/headless Chrome, Ayu identity,
faster responses, all connected stores, and personally starting live automation.

2026-09-18 repair: the latest report authorizes troubleshooting incorrect agent
behavior. Separating interactive chat from a scheduled inbox task and isolating
its cwd are implementation fixes supported by inspected configuration and the
actual model test. No model substitution or live activation was inferred.

## Verification

Percakapan repair: `npm run duoke:test` passed **187 tests**, including return
synonyms without a SKU, direct source-note provenance, preview-only policy
references, unrelated versus intervening media, wrong/unknown product scopes,
private/unsafe/unrelated answers, plus existing delivery controls. Real local
source search reproduced the owner's return query without accessing Duoke.
Final local Qwen composition probe returned the exact fixed customer handoff,
`finish_reason: stop`, in 5.4 seconds, using four matched historical source
references represented as metadata. No tool/system status or old processing
promise appeared. This time measures that one warm direct Ollama request, not
Hermes end-to-end latency or a general performance improvement.
This does not establish complete semantic coverage, live sending, Desktop UI
behavior, or automatic WhatsApp delivery. No JS/TS or application route changes.
The source's official WhatsApp destination has not been verified; no sample
website default was adopted. The handoff currently has no contact link.



Latest customer-reply correction, 2026-09-18: updated documentation and prompt
templates, then ran profile refresh to synchronize SOUL and the existing scheduled
prompt. Delivery and activation controls were not changed. The Python regression
suite, file links, diff whitespace, and synchronized instructions were checked.
No live customer reply, model-output acceptance, new corpus import, or WhatsApp
transfer was performed. Existing tests do not establish the new reply wording,
complete knowledge coverage, or a working WhatsApp delivery path.

Latest truncation repair, 2026-09-18:

- `npm run duoke:test`: **183 passed**, including backup-before-mutation,
  idempotence, preserved profile settings, and failed model-update handling.
- Intermediate 16K Ollama OpenAI-compatible request with synthetic history: **5,770 input
  tokens**, 16 output tokens, `finish_reason: stop`, 18.84 seconds, named Ayu
  greeting. `/api/ps` then confirmed **16,384** runtime context tokens. This is a
  local inference test, not a customer send or complete Desktop regression.
  Hermes subsequently rejected 16K because its installed minimum is 64,000;
  the final configuration was raised to **65,536** on both sides.
- Final real Hermes CLI backend test at 65,536: new `halo` turn returned the
  exact Ayu introduction successfully. Ollama `/api/ps` confirmed 65,536 context
  and approximately 5.82 GB model/VRAM allocation. All 183 Python tests were
  rerun successfully after selecting this final bound. Desktop UI replay of the
  originally failing history was not performed.
- An initial long-history probe disconnected while Ollama restarted; the later
  probe above completed. No inference-speed improvement is claimed.
- Profile config and model parameters were read back; documentation links and
  `git diff --check` checked. No browser/inbox access or customer send.
- A fresh Desktop chat remains the owner UI acceptance step; the failing old
  conversation was not deleted or modified.

Latest repair, current uncommitted working tree on this Mac, 2026-09-18:

- `npm run duoke:test`: **181 passed**. Added tests for read-only lookup even with
  delivery enabled, admin reference eligibility with legacy behavior preserved,
  retained account-specific blocking, and instruction refresh/config migration.
- Real MCP stdio tools/list exposed status/search/poll/reply. `duoke_search` on a
  product question returned two references, `sent: false`, and 1,334 indexed
  source documents (902 conversation, 432 product), 35 curated notes, and 445
  combined entries. Raw source content was not printed in the run report.
- Real installed Hermes + local Qwen returned the exact Ayu introduction after
  cwd migration. Stored message metadata confirms zero tool calls. The model
  latency above is measured; no inference-speed improvement is claimed.
- Profile and paused scheduled prompt were refreshed and read back. Delivery
  remained disabled; no customer messages were sent.
- `git diff --check` and relative documentation links passed; saved handoff read
  back. No JavaScript/TypeScript, dependencies, rendering, or build configuration
  changed in this repair, so app checks were not rerun.
- Earlier checks: 177 Python tests, lint/typecheck/build, and 236 JS passes with
  six skips. These precede this repair and do not verify its new behavior.

## Next action

Restart Desktop to load the repaired MCP, then verify a fresh customer-preview
chat uses Percakapan with no internal diagnostics. Review mixed boilerplate and
remaining source exclusions. Implement the validated WhatsApp fallback through the delivery bridge and
verify customer-only wording against both known and unknown questions in a fresh
Desktop chat. Keep the remaining performance and continuous-operation work open.

## References

- [Contract](../../product/integrations/duoke-support.md)
- [Python context](../../../scraping/CONTEXT.md)
- [Operator steps](../../setup/duoke-hermes-desktop.md)
- [Instructions](../../../scraping/duoke/reply/desktop_prompts.py)
- [MCP tools](../../../scraping/duoke/reply/desktop_mcp.py)
- [Delivery service](../../../scraping/duoke/reply/desktop_service.py)
- [Profile setup and refresh](../../../scraping/duoke/reply/desktop_setup.py)
- [Service tests](../../../scraping/tests/test_desktop_service.py)
- [Profile tests](../../../scraping/tests/test_desktop_setup.py)
- [Context alignment](../../../scraping/duoke/reply/desktop_model.py)
- [Context repair tests](../../../scraping/tests/test_desktop_model.py)
