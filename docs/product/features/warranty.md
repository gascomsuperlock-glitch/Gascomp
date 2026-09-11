# Warranty claims and tickets

[Specification index](../spec.md)

## Shared product and ticket data

The admin panel and customer website use the same Supabase data. Published product changes become available across devices without duplicate entry. Drafts remain private. Local fallback exists for development when Supabase is unavailable.

A successful claim receives a unique `GWC-YYYYMMDD-XXXXXX` ticket number. The same number appears in the admin Warranty Tickets view. Product name and SKU are stored as snapshots, while `product_id` links to the current product when a match exists.

Ticket statuses are `new`, `reviewing`, `approved`, `rejected`, and `closed`. Only an administrator with an active session can view personal data, download private evidence, or change status. WhatsApp and Duoke ticket synchronization are outside the current scope.

## Claim submission

Each product page links to `/klaim-garansi` with the product name and SKU prefilled. A claim is created only after the form and every evidence file are stored successfully.

| Required data | Rule |
| --- | --- |
| Customer | Name, email, and WhatsApp number |
| Product | Product selection/name and SKU |
| Purchase | Store, purchase date, order number, and price |
| Issue | Customer description of the problem |
| Invoice | One JPG, PNG, WebP, or PDF up to 4 MB |
| Photos | One to four JPG, PNG, or WebP files up to 4 MB each |
| Video | One MP4, WebM, or MOV file up to 12 MB |

Supabase stores evidence in the private `warranty-evidence` bucket. Local development stores it under `.data/warranty-tickets/`, which is ignored by Git.

## Warranty rules

Submission does not imply approval. Administrators must evaluate proof of purchase, eligibility period, coverage, and prior warranty use against official Gascomp terms. The warranty duration, start date, covered damage, one-time-use basis, and post-decision procedure still require a final business decision. The system does not automatically reject claims using undefined rules.

Status: form validation, evidence validation, ticket numbers, Supabase/local storage, private admin access, ticket listing, evidence download, and status updates are implemented.
