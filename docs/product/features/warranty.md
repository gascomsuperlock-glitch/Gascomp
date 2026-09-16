# Warranty claims and tickets

[Specification index](../spec.md)

## Shared product and ticket data

The admin panel and customer website use the same Supabase data. Published product changes become available across devices without duplicate entry. Drafts remain private. Local fallback exists for development when Supabase is unavailable.

A successful claim receives a unique `GWC-YYYYMMDD-XXXXXX` ticket number. The same number appears in the admin Warranty Tickets view. Product name and SKU are stored as snapshots, while `product_id` links to the current product when a match exists.

The admin workflow displays Pending and Done. Stored statuses remain compatible: `closed` means Done; `new`, `reviewing`, `approved`, and `rejected` mean Pending. Only an administrator with an active session can view personal data, download private evidence, or change status. WhatsApp and Duoke ticket synchronization are outside the current scope.

## Claim submission

Each product page links to `/klaim-garansi` with the product name and SKU prefilled. A claim is created only after the form and every evidence file are stored successfully. After successful submission, the browser opens the configured admin WhatsApp number in the same tab with the opening message `kak, aku sudah claim garansi`, followed by the saved ticket number and an absolute link to `/admin/login?ticket=...` on the current website origin. The link retains its ticket selection through login and opens the protected Warranty Tickets view with that number prefilled in search and its details visible. Invalid ticket parameters fall back to the normal dashboard; unmatched tickets show the inbox empty state. The customer sends the message in WhatsApp. Failed or rejected submissions remain on the form. The success screen retains the ticket number and a manual WhatsApp link if automatic navigation is blocked; without a configured number, it keeps the ticket confirmation.

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

The claim form sends multipart evidence to the Node Route Handler at
`POST /warranty/claims`, which reuses the existing claim validation and ticket
service. The endpoint checks the request origin and enforces a 72 MB body limit,
including streamed requests without a Content-Length header. The legacy Server
Action retains the same limit. This accommodates a 50 MB video, a 4 MB invoice,
four 4 MB photos, and multipart overhead. Per-file limits still apply.

### Submission progress and bounded storage

The browser reports actual upload percentage, then switches to video verification
and saving. Reaching 100% upload does not imply a saved claim. A longer-running
submission explains that large files can take several minutes on mobile networks.
The form remains mounted and retains details, consent, and selected files after
validation or transport failure. Errors receive focus so customers submitting from
the bottom of a long form can immediately see the explanation. Duplicate clicks
are blocked synchronously.

A stalled upload stops after 45 seconds without progress; the complete browser
request is limited to ten minutes. After upload, confirmation has a 105-second
limit. A lost response or timeout reports that the submission outcome is unknown
and asks the customer to check with support before retrying. The browser never
automatically resubmits or invents a successful ticket. The endpoint also limits
incoming upload inactivity to 45 seconds and total upload duration to ten minutes.

Server-side full video decoding and evidence privacy remain unchanged. Supabase
storage starts the largest evidence first and uploads at most three files at once.
Evidence metadata is inserted in one batch after every upload succeeds. Provider
requests have individual deadlines (15 seconds for database calls, 40 seconds for
Storage) within a 50-second total save budget. Failure waits for started uploads
to settle before attempting cleanup of this submission's paths and ticket, with
an independent eight-second cleanup budget. Cleanup failures log a generic
operator diagnostic without customer data and may require reconciliation.

This change needs an application release and no database migration. A 46.4 MB
customer video prompted the investigation; without the original recording and
request logs, its exact failure stage is unconfirmed. Upload progress and bounded
requests address the previously opaque waiting state; parallel storage reduces
sequential provider round trips. Connection bandwidth and video decoding complexity
still affect total submission time.

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

## Ticket selection and deletion

The inbox uses a compact claim list and a separate detail panel on wide screens.
Phones and tablets show the list or the selected ticket, with Back to Tickets
restoring focus to the selected row. Search covers ticket number, customer name,
email, phone, product, SKU, and order number. All, Pending, and Done filters can be
combined with search. Results show 20 rows initially with Show More Tickets for
additional results. Empty results offer Clear Filters; a new inbox explains where
claims will appear. Dates and times use Asia/Jakarta consistently.

On phones below 640 px, the inbox uses a compact heading and Pending badge,
collapsed export summary, and tighter spacing so ticket rows appear sooner.
Search retains an accessible label, and text inputs and selects use 16 px text.
The mobile ticket header hides idle catalog Save/Cancel controls and the normal
storage notice. Unsaved catalog changes, saving, and save failures keep those
controls available; storage errors remain visible. Wider layouts retain the
existing dashboard controls and workspace presentation.

Ticket details group the reported issue, customer contact, purchase information,
private evidence, and resolution. Evidence cards show file names, type, and size;
video previews load on request. Unsubmitted solution selections remain available
when switching tickets or filters within the inbox. The export report is collapsible
and uses all tickets independently of the list filters. Select Tickets reveals bulk
checkboxes and deletion controls, keeping them separate from ordinary ticket review.

The admin inbox supports individual checkboxes, selecting all search results, clearing selection, deleting one ticket, and deleting up to 100 selected tickets per request. Search changes clear selection. Deletion requires confirmation and takes effect immediately, independently of catalog Save/Cancel. Controls are disabled during deletion or status updates. Partial failures remove only successfully deleted tickets and keep the remaining selection available for retry.

Deletion marks tickets as deleted instead of erasing claim history. Deleted tickets are excluded from the inbox and notifications; direct evidence access is denied. Their order/SKU identity and private evidence remain stored, so the one-claim rule still applies. The `deleted_at` column from `202609150001_warranty_ticket_deletion.sql` was added to production on September 15, 2026 under one-time authorization for that column only. No other migrations or migration-history writes were performed. Read-only verification confirmed that the API can read the column, all seven existing tickets are unchanged, and no tickets are marked deleted. The authorization is exhausted; any further production write requires new explicit authorization. Local records use `deletedAt` with the same behavior.

After an individual or bulk deletion finishes, a modal reports success, failure, or partial success with the deleted/requested count and any error details. It also appears for transport failures without claiming that the server definitely did not delete the tickets. The modal stays open until OK or Escape, then returns focus to inbox search. Cancelling the initial confirmation does not show a result modal. Existing inline notices remain available after dismissal.

## Solutions and spreadsheet export

Administrators select one of six owner-requested solution labels: `Klaim Garansi`,
`Kirim Barang Kurang`, `Kirim Barang Salah`, `Retur/Refund`, `Kirim sparepart`, or
`Refund dana sebagian`. These exact labels are explicitly requested exceptions to
English operator copy; database values remain English. Done is the only primary
save action: it saves the selected solution and sets the stored status to `closed`,
confirming completion. Done remains available without a selected solution.
There is no separate Save solution button. After completion, Edit solution exposes
the dropdown and Done saves the correction while preserving completion status.
Edit solution changes only the solution and update timestamp, including on Done
tickets; it does not reopen a ticket or edit customer submissions. Deleted tickets
cannot be updated. All writes require an active administrator session.

Migration `202609150002_warranty_ticket_solution.sql` adds a nullable, constrained
solution column. Historical solutions stay unset; historical statuses are preserved.
On September 15, 2026, this migration was applied to production under explicit
authorization for the solution column. Read-only SQL and application API checks
confirmed the nullable text column and all six allowed values. Checksums confirmed
that all seven existing tickets and 19 evidence metadata records were unchanged;
all historical solutions remain null. Only this migration's SQL was executed;
no other migration or migration-history update was applied. Verification records
are stored locally in `.data/warranty-solution-migration/`.

The inbox exports UTF-8 CSV compatible with Excel and Google Sheets through the
protected `/admin/warranty-tickets/export?start=YYYY-MM-DD&end=YYYY-MM-DD` endpoint.
Administrators choose start and end dates, initially covering the earliest through
today in Asia/Jakarta. The earliest date follows the first available submission;
both date inputs allow dates only from that day through today, independently of
inbox search or selection. The current-day limit refreshes while the panel is open
and when it becomes visible again. With no data, export is disabled.
The server validates real dates and rejects reversed ranges and future end dates. The report includes both
selected days: midnight on the first day through, but excluding, midnight after the
last day in Asia/Jakarta. Export includes all active
tickets regardless of status, inbox search, or checkbox selection; deleted tickets
and private evidence URLs are excluded. Database reads are paginated. Columns begin
with date, name, phone, order/tracking number, issue, product, status, and solution,
followed by ticket number, SKU, email, store, purchase date, price, and updated time.
An empty date range exports headers with an explicit empty-result message. Export errors
and expired sessions remain visible in the inbox. Formula-like customer values are
escaped. Import phone and order columns as text to retain leading zeros and long IDs.

The claim form's order field uses the owner's exact label
`order number/No.Resi/No Pesanan` in both interface languages. The field retains its
existing key and claim identity rules.

## Submission performance verification on September 16, 2026

Local verification passed lint, typecheck, the production build, and 160 Node
tests; four optional SQL tests were skipped because their test runtime was not
configured. Regression coverage includes upload/processing timeouts, transport
failures, case-sensitive browser multipart boundaries, streamed body limits,
origin checks, bounded provider requests, concurrent uploads, and failure cleanup.

Chromium exercised the production build against a loopback-only Supabase
simulation. A synthetic 46.4 MiB MP4 passed the existing full decoder and completed
all six evidence uploads before confirmation. Browser network throttling verified
partial upload percentages and the separate processing stage. The synthetic file
uses a short valid recording plus an MP4 free box to test transport size; it does
not reproduce the customer's recording, duration, or decoding cost. Mobile and
desktop checks covered error focus, preservation of all fields and selected files,
video field errors, and no horizontal overflow or page JavaScript errors.

A separate read-only check reached the configured Supabase database and confirmed
the private evidence bucket's 50 MiB limit. All synthetic writes stayed in the
local simulation; no customer records or production Storage objects were changed.
Evidence is stored locally under `.data/warranty-speed/`. The owner subsequently
authorized pushing this change to GitHub and deploying it to Hostinger. See the
[release record](../operations/deployment.md#warranty-submission-performance-release-on-september-16-2026)
for production verification scope.
