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
| Video | One video file up to 50 MB: MP4/M4V, MOV, WebM/MKV, AVI, 3GP/3G2, MPEG, TS/MTS/M2TS, WMV/ASF, FLV, or OGV |

Evidence is validated immediately when files are selected. Missing files, empty files, unsupported formats, excessive photo counts, and files above the size limits show an error beside the affected upload field and block submission. No minimum size in KB or MB is defined; every selected file must be non-empty. Videos of 1 MB and 23 MB are accepted when their format and playback are valid. The same validation runs on the server. Failed validation or submission preserves all entered details, consent, and selected files so customers only need to correct the affected field. A ticket confirmation replaces the form only after successful submission.

Video selection and drag-and-drop use the same validation. The browser checks the container signature and attempts to load a video frame before enabling submission. A missing browser codec or a preview timeout defers playback validation to the server; it does not classify the file as damaged. While checking, the form displays a progress message; selecting another file supersedes the earlier result. Empty files and unrecognized containers are rejected at selection. Damage that requires full decoding is reported beside the video field on submission. The picker accepts video MIME types and common video extensions when browsers omit MIME metadata. The server detects the actual container from bytes and stores its canonical video MIME type; changing a filename cannot bypass decoding. Image and PDF validation still checks MIME type, size, and count; it does not decode their contents.

Before creating a ticket or storing evidence, the server uses FFmpeg compiled to WebAssembly in an isolated Node worker to decode the entire video and its audio, rejecting decoder errors, truncated media, audio-only files, and files without video frames. The verification output preserves input time bases and variable frame timestamps so valid MOV screen recordings do not fail because of output timestamp rounding. Verification has a 30-second processing limit; a timeout asks for a shorter copy, and a missing decoder reports a temporary verification failure. The check uses memory only, with no native executable or disk temporary files; the worker is terminated after each check. These checks cannot restore damaged evidence that was already stored; the customer must supply an intact replacement. A successful decode does not guarantee that every browser supports the video's codec. The admin inbox provides a private Download video link so evidence can also be opened in a compatible device player.

The Server Action accepts up to 72 MB per request to accommodate a 50 MB video, a 4 MB invoice, four 4 MB photos, and multipart overhead. Per-file limits still apply.

## Admin video preview

Ticket Inbox opens video previews inline with native playback controls and mobile inline playback. A preview is prepared only after selecting **Preview video**, with loading, retry, expired-session, and playback-error states. Closing the preview cancels its request and releases the browser object URL. Videos do not autoplay.

The authenticated evidence endpoint accepts `preview=1` to prepare a private MP4 copy in memory using the installed FFmpeg worker. Compatible H.264 video is remuxed without re-encoding; other video codecs are converted to H.264 with a maximum 1280-pixel dimension, and the first audio track is converted to AAC. MP4 metadata is placed before media data for browser playback. Conversion is limited to one concurrent job per server process, 30 seconds, and 64 MB output. When conversion cannot finish, the administrator can retry or download the original file. Preview generation never overwrites evidence or writes to Storage.

Original attachment URLs remain stable. Downloads return the original bytes, filename, and MIME type. Evidence responses support single byte ranges (`206`, `Content-Range`, and `Accept-Ranges`), unsatisfiable ranges (`416`), and `HEAD`; every request checks the admin session and uses `private, no-store` caching. The browser fetches each prepared preview once and uses a temporary object URL for playback and seeking.

Video inspection and preview workers run as native Node entrypoints in development and production. Their `node:worker_threads` constructors are imported at runtime with `webpackIgnore: true`; output tracing still includes the worker files and FFmpeg assets. This lets FFmpeg initialize its own WASM imports rather than having the bundler resolve the WASM import namespace as an npm package.

Supabase stores evidence in the private `warranty-evidence` bucket. Local development stores it under `.data/warranty-tickets/`, which is ignored by Git.

## Admin notifications

The protected admin header includes a warranty notification bell. It checks for new and updated tickets every 30 seconds while the dashboard tab is visible and checks immediately when the tab becomes visible again. A badge shows unread updates, a dropdown lists recent ticket activity, and an in-app alert appears when a change is detected while the dashboard is open.

Read state is stored in the administrator's browser and records the latest observed status and update timestamp for each ticket. On the first visit, existing tickets with `new` status are unread. Opening a ticket or selecting **Mark all read** clears the corresponding badge. Status changes made in the current dashboard use the server timestamp immediately so they do not create a redundant notification on the next refresh.

Notifications remain inside the protected admin panel. Email, WhatsApp, operating-system push notifications, and background delivery while the dashboard is closed are outside the current scope.

## Warranty rules

Submission does not imply approval. New claims are limited to one per order number and product SKU, compared case-insensitively after trimming surrounding whitespace. All existing ticket statuses count, including rejected and closed tickets; another order or SKU remains eligible. There is no unit serial number, so multiple units of the same SKU in one order share this limit.

The purchase date must be valid, cannot be in the future, and must be within one calendar year using the Asia/Jakarta date. The first anniversary remains eligible; February 29 anniversaries fall on February 28 in non-leap years. Server validation rejects expired claims before storing evidence. Administrators still verify the invoice and coverage.

Migration `202609140003_warranty_claim_eligibility.sql` adds database enforcement that serializes concurrent submissions for the same identity without changing historical tickets. It is prepared locally and requires application before production concurrency protection is active. Application checks cover existing tickets; local storage uses an exclusive per-identity directory lock. A crashed local process may leave a lock requiring operator cleanup.

Status: form validation, evidence validation, ticket numbers, Supabase/local storage, private admin access, ticket listing, evidence download, status updates, and in-app admin notifications are implemented.
