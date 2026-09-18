# English language standard

English is the canonical language for all project-owned writing and identifiers.

## Agent conversation

Use Indonesian when conversing with the project owner, including progress updates, questions, and final explanations, unless they request another language. This conversation preference does not change the English requirement for project-owned artifacts below.

## Required English project content

- Source-level user interface copy, accessibility labels, metadata, default values, and prefilled messages must be authored in English unless they are localized customer-facing translations.
- Source-code comments, test descriptions, fixture labels, validation errors, logs, and CLI help/output.
- Documentation, generated reports, Obsidian headings, generated questions/answers, and bot messages.
- Database tables, columns, constraints, policies, enum-like values, comments, and system defaults.
- New TypeScript/JavaScript file names in `kebab-case` and Python file names in `snake_case`.

## Owner-requested interface labels

- Warranty solution options retain `Klaim Garansi`, `Kirim Barang Kurang`, `Kirim Barang Salah`, `Retur/Refund`, `Kirim sparepart`, `Refund dana sebagian`, and `Edukasi cara pemakaian/kendala`, including spreadsheet values.
- The claim order field retains `order number/No.Resi/No Pesanan` in both languages.

## Compatibility exceptions

Exact external values must remain unchanged when translation would damage identity, matching, or existing links:

- The owner-requested post-claim WhatsApp message remains exactly `kak, aku sudah claim garansi` in every interface language.
- Imported product names, SKUs, category values, filenames, and provider-specific IDs.
- Warehouse XLSX headers such as `Nomor SKU`, `Judul`, and `Kode Produk` because they are source-schema keys.
- Captured customer messages and Indonesian tokens used by privacy filters or retrieval matching.
- Exact Obsidian source answers delivered by the Duoke Hermes Desktop bridge retain their source language, as requested by the owner; see the [Duoke contract](../product/integrations/duoke-support.md#desktop-implementation-and-owner-corrections).
- The owner-requested Indonesian support introduction is `Saya Ayu dari Gascomp, ada yang bisa saya bantu?`; see the [customer-facing identity contract](../product/integrations/duoke-support.md#customer-facing-identity).
- Stable public routes and fragments such as `/produk`, `/klaim-garansi`, `/tiket`, `/lampiran`, and `#kendala`.
- Third-party URLs, selector values, protocol values, locale codes, and time-zone identifiers.
- Migration predicates may contain exact legacy non-English values solely to replace them with English equivalents.

Code around these values, including variable names, comments, errors, reports, and UI labels, must remain English. New public routes should use English unless a compatibility decision explicitly requires another value.

## Customer language selection

- Customer-facing pages must support Indonesian and English.
- Provide a visible language selector so customers can choose `Indonesian` or `English`.
- Apply the selected language consistently to navigation, headings, help content, FAQs, forms, validation messages, support actions, accessibility labels, and metadata where localized values exist.
- Persist the customer's language preference for subsequent visits and use English as the fallback when no preference or translation exists.
- Keep source code, documentation, configuration, database identifiers, logs, and operator-facing content in English. Indonesian customer-facing translations are localized content, not a replacement for the project language standard.
