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
| Video | One MP4, WebM, or MOV file up to 50 MB |

Evidence is validated immediately when files are selected. Missing files, empty files, unsupported formats, excessive photo counts, and files above the size limits show an error beside the affected upload field and block submission. No minimum size in KB or MB is defined; every selected file must be non-empty. Videos of 1 MB and 23 MB are accepted when their format and playback are valid. The same validation runs on the server. Failed validation or submission preserves all entered details, consent, and selected files so customers only need to correct the affected field. A ticket confirmation replaces the form only after successful submission.

Video selection and drag-and-drop use the same validation. The browser checks the container signature and loads a video frame before enabling submission. While checking, the form displays a progress message; selecting another file supersedes the earlier result. Unreadable or unsupported playback requires a working export in MP4, WebM, or MOV. Image and PDF validation still checks MIME type, size, and count; it does not decode their contents.

Before creating a ticket or storing evidence, the server uses FFmpeg to decode the entire video and its audio, rejecting decoder errors, truncated media, audio-only files, and files without video frames. Verification has a 30-second processing limit; a timeout asks for a shorter copy, and a missing decoder reports a temporary verification failure. Temporary files are private and removed after each check. These checks cannot restore damaged evidence that was already stored; the customer must supply an intact replacement. A successful decode does not guarantee that every browser supports the video's codec.

The Server Action accepts up to 72 MB per request to accommodate a 50 MB video, a 4 MB invoice, four 4 MB photos, and multipart overhead. Per-file limits still apply.

Supabase stores evidence in the private `warranty-evidence` bucket. Local development stores it under `.data/warranty-tickets/`, which is ignored by Git.

## Warranty rules

Submission does not imply approval. Administrators must evaluate proof of purchase, eligibility period, coverage, and prior warranty use against official Gascomp terms. The warranty duration, start date, covered damage, one-time-use basis, and post-decision procedure still require a final business decision. The system does not automatically reject claims using undefined rules.

Status: form validation, evidence validation, ticket numbers, Supabase/local storage, private admin access, ticket listing, evidence download, and status updates are implemented.
