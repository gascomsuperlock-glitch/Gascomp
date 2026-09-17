# Customer support answer vault

This folder contains curated answers and bilingual templates for Gascomp
Assistant. The worker can also read the complete scraped Obsidian archive through
`GASCOMP_AI_SOURCE_VAULT`. In default grounded mode, Hermes uses these sources to
write natural explanations, translations, and follow-up questions. Product facts
must remain grounded; general explanations must not invent product details.
Set `GASCOMP_AI_RESPONSE_MODE=exact` for the legacy verbatim-answer behavior.

## Current local pilot

This folder contains 35 curated entries, including sixteen earlier catalog
excerpts. The worker also indexes all 1,334 notes from the connected Obsidian
source: 902 conversation notes and 432 product notes. The former `Archive` and
`Catalog` contents now live directly in `Duoke/Percakapan` and `Duoke/Produk`.
Their index notes are `Conversation archive index.md` and
`Product catalog index.md`; no source folder is excluded. The combined snapshot
has 445 entries: 35 curated entries and 410 eligible exact source passages.

Duplicate products require matching marketplace/store/listing identity and note
content. Different stores, posts, variants, and content revisions are retained;
a SKU match alone does not justify removing a note. The migration preserved all
original notes and updated only their paths and Obsidian link targets.

Grounded mode can explain Indonesian source facts in the selected language.
Exact mode requires source text in that language. Try `Apa bahan PISAU-6SET?` with Indonesian selected.
See the [full-source setup workflow](../../docs/setup/ai-assistance.md#connect-the-complete-scraped-obsidian-archive)
for the connection, private reports, and release checks.

## Authoring format

The `conversation-` ID prefix is reserved for short conversational replies such
as thanks, acknowledgements, identity, wellbeing, available help, and goodbyes.
Use `kind: answer` and explicit full-message aliases in `questions`. Greetings
and clarifications also require full-message alias matches after bounded
politeness/spelling normalization. Do not place product facts under this prefix.
In exact mode, conversational matching must not hide an additional unsupported question.

Copy `answer.md.example` to a `.md` file and replace every placeholder. Each Markdown file represents one answer in one language. The worker ignores this README, hidden files, and files that do not end in `.md`. Do not use symlinks.

The authoring schema remains compatible with both response modes. Source bodies
are preserved in the snapshot; grounded responses may paraphrase them.

The first line must be `---`, followed by a JSON metadata object, then a closing `---` line. The remaining body is the reusable source passage (and the final customer-facing answer in exact mode). Every character after the closing delimiter's newline is preserved, including leading blank lines, whitespace, and the final newline. CRLF is normalized to LF when reading. The worker never rewrites the original note. Only exact response mode requires the displayed answer to match its body verbatim. Ordinary text and public HTTPS links work; Obsidian wikilinks and local/non-HTTPS destinations are rejected.

Required metadata:

- `id`: stable lowercase ASCII identifier, up to 80 characters, using letters, digits, `.`, `_`, or `-`.
- `kind`: `answer`, `greeting`, `clarification`, or `handoff`.
- `language`: `en` or `id`.
- `questions`: one to 50 nonempty questions or alternate phrasings in that language, each up to 500 characters. These are retrieval aliases, not answer text.
- `sku`: optional exact product SKU, only for `answer` entries. Leave absent for general answers.

Before activation, provide exactly one `greeting`, one `clarification`, and one `handoff` for **each** language. Author both fallback languages explicitly so service failures never depend on model translation. The handoff text should explain that the customer can choose WhatsApp, without claiming a message has been sent. The website attaches the configured WhatsApp link inside the handoff message, without changing its answer text. It does not show a permanent WhatsApp action beneath the composer.

The body must be nonempty and at most 12,000 characters. Each note is limited to 64 KB and the combined snapshot to 2,000 entries. The complete serialized publication, including metadata and JSON overhead, must fit within 4 MiB of UTF-8 data. IDs must be unique across both languages; use separate IDs such as `welcome-en` and `welcome-id`.

The worker checks for changes every second, invalidates the current version before replacing it, and publishes a full validated snapshot. A malformed note, missing template, deleted source, or duplicate ID disables source answering. The backend retains the last published handoff templates for outages. Edits during a model turn prevent its old answer from being sent.

Snapshot versions are SHA-256 of the UTF-8, compact JSON array of entries sorted by ID, with each object's keys sorted alphabetically and Unicode kept unescaped. Empty optional SKU metadata is omitted. Answer whitespace is part of the hash.

Use `scraping/.venv/bin/python -m scraping.ai_assistance.worker --check` after configuring the worker environment. This validates local configuration and knowledge without connecting to the website or a model. `--watch` and `--once` publish to the configured website and must be used only when that publication is authorized. `--probe-links` uses local Chrome to inspect allowlisted HTTPS links; browser content never becomes answer material.
