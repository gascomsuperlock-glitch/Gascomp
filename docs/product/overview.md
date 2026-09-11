# Product overview and scope

[Specification index](spec.md)

## Purpose

Gascomp customers need clear usage guidance, embedded tutorial videos, troubleshooting, FAQs, warranty claims, and access to support after purchase. The Help Center aims to reduce avoidable returns caused by setup or usage confusion and makes help easy to reach through a QR code on the product or packaging.

Primary users are customers who already own a Gascomp product. Gascomp staff use the admin panel to maintain product help and review warranty tickets.

English is the standard language for project-owned interface copy, documentation, generated content, and database defaults. Exact external source values and stable public URLs follow the compatibility rules in the [language standard](../architecture/language-standard.md).

## Language requirement

Use English as the standard language for every task and all project-owned output, including code, configuration, documentation, comments, tests, logs, generated content, and user-facing copy. Preserve exact external values only when they are listed as compatibility exceptions in the [language standard](../architecture/language-standard.md).

## Initial scope

- Dynamic product catalog with name, model, and SKU search.
- One stable help page and one reusable QR code per SKU.
- Product identity, image gallery, embedded YouTube tutorials, issue guides, and FAQs.
- WhatsApp, Gascomp Care, and Service Center access.
- Warranty claim form, private evidence, ticket number, and admin status review.
- Protected admin tools for products, variations, images, tutorials, issues, FAQs, settings, QR codes, and tickets.
- Shared Supabase storage with local development fallbacks.
- Duoke catalog import, reviewed knowledge export, and guarded reply automation.

Customers do not need an account. The initial release does not include a public forum, customer-to-customer questions, real-time content updates, or automatic warranty decisions. Tutorial videos use YouTube; warranty evidence videos use private file upload.

## Success indicators

- Fewer returns related to setup or usage confusion.
- Fewer repetitive support questions.

Numeric targets, baseline data, evaluation period, and measurement method still require a business decision.

## Open content and business inputs

- Verified product names, photos, SKUs, tutorial links, FAQs, and troubleshooting instructions.
- Final WhatsApp number and external support destinations.
- Official warranty duration, start date, coverage, one-time-use basis, and post-decision process.
- Final production hostname, deployment service, and approved brand assets.

Status: the initial catalog, product help, admin, Supabase, QR, warranty, import, and knowledge workflows are implemented. Production content, credentials, selectors, warranty policy, hostname, and deployment still require final operational values.
