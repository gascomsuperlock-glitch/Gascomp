# English language standard

English is the canonical language for all project-owned writing and identifiers.

## Required English content

- User interface copy, accessibility labels, metadata, default values, and prefilled messages.
- Source-code comments, test descriptions, fixture labels, validation errors, logs, and CLI help/output.
- Documentation, generated reports, Obsidian headings, generated questions/answers, and bot messages.
- Database tables, columns, constraints, policies, enum-like values, comments, and system defaults.
- New TypeScript/JavaScript file names in `kebab-case` and Python file names in `snake_case`.

## Compatibility exceptions

Exact external values must remain unchanged when translation would damage identity, matching, or existing links:

- Imported product names, SKUs, category values, filenames, and provider-specific IDs.
- Warehouse XLSX headers such as `Nomor SKU`, `Judul`, and `Kode Produk` because they are source-schema keys.
- Captured customer messages and Indonesian tokens used by privacy filters or retrieval matching.
- Stable public routes and fragments such as `/produk`, `/klaim-garansi`, `/tiket`, `/lampiran`, and `#kendala`.
- Third-party URLs, selector values, protocol values, locale codes, and time-zone identifiers.
- Migration predicates may contain exact legacy non-English values solely to replace them with English equivalents.

Code around these values, including variable names, comments, errors, reports, and UI labels, must remain English. New public routes should use English unless a compatibility decision explicitly requires another value.
