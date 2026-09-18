# Warranty claims and tickets

[Specification index](../spec.md)

## Shared product and ticket data

The admin panel and customer website use the same Supabase data. Published product changes become available across devices without duplicate entry. Drafts remain private. Local fallback exists for development when Supabase is unavailable.

A successful claim receives a unique `GWC-YYYYMMDD-XXXXXX` ticket number. The same number appears in the admin Warranty Tickets view. Product name and SKU are stored as snapshots, while `product_id` links to the current product when a match exists.

The admin workflow displays Pending and Done. Stored statuses remain compatible: `closed` means Done; `new`, `reviewing`, `approved`, and `rejected` mean Pending. Only an administrator with an active session can view personal data, download private evidence, or change status. WhatsApp and Duoke ticket synchronization are outside the current scope.

## Claim submission

### Product search for shared legacy QR codes

The existing `/klaim-garansi` form also supports entry without product parameters,
including the shared legacy QR destination. Product name and SKU are linked,
searchable selectors backed by the same catalog as the public home page. Only
published, non-archived products appear; drafts become selectable after publication
and loading the updated catalog. Search matches name, model, or SKU in either
field. Every result displays both name and SKU. Selecting either field fills both;
typing a unique exact name or SKU also resolves the pair. Duplicate names require
an explicit result selection. Editing or clearing a selected value clears the old
pair until another product is resolved, and unselected search text cannot be
submitted as a product.

Existing product links resolve their SKU to the current published catalog name.
Name-only links resolve only unique exact names. Unknown, unpublished, or archived
linked products show a selection notice rather than accepting arbitrary URL text.
Selection survives failed submission with the rest of the form. The selectors
support keyboard navigation and localized loading, empty, and validation feedback.
Other claim fields, evidence processing, and submission behavior stay unchanged.

The form header and success screen use a **Back to home** link to `/`, which is
`https://support.gascompsuperlock.com/` in production. After the claim page mounts,
a same-URL history entry also routes one-step browser/phone Back to home instead
of the referring product page or legacy website. Existing framework history state
is preserved, remounts/reloads do not stack extra entries, and the visible home
link consumes the same entry. The home destination replaces the original claim
entry so another Back from home can leave normally. Listeners are removed when
leaving the claim page. This behavior requires JavaScript and a browser that
honors the added history entry; closing the scan app or jumping multiple history
entries is outside the page's control.
The intended Cloudflare redirect for the printed `/dll/` URL is
`https://support.gascompsuperlock.com/klaim-garansi`. Activating that external rule
and deploying the application are separate operations.

### Claim processing

On mobile and desktop, successful submission starts same-tab WhatsApp navigation
directly in the response handler, after the server confirms the saved ticket.
Customers do not need to press a second Continue button in the normal flow.
The confirmation first shows an opening status. A manual WhatsApp link appears
only if the page remains after 2.5 seconds, or immediately if navigation throws.
The recovery message confirms that the ticket is already saved and must not be
submitted again. Failed, incomplete, or unconfirmed submissions never open
WhatsApp. A missing configured number keeps the ticket confirmation. Browsers,
in-app webviews, and the operating system may still require confirmation to open
the external WhatsApp application; the site cannot bypass those controls.

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

### Video compression before upload

Video selection starts optional compression on the customer's device, while the
rest of the form stays editable. The original selection must pass the existing
50 MB size and container/playback checks first. Files up to 2 MiB are already
small and skip compression. Larger supported files run in a dedicated worker
using Mediabunny and the browser's WebCodecs encoders; the media library is loaded
only when the worker starts. No video is uploaded during preparation.

Compression preserves the full duration, orientation, aspect ratio, and audio.
The output fits within 1280 by 720 pixels (or 720 by 1280 for portrait), without
upscaling, with a 1.2 Mbps target video bitrate. Compatible AAC audio is copied;
otherwise audio is encoded with a 96 kbps target. MP4/H.264 is preferred, with
WebM/VP8 as a supported-device alternative. HDR, unsupported codecs/containers,
and multiple video/audio tracks retain the original rather than losing evidence.
Tracks may not be silently discarded. Output duration and track counts are
checked, and a compressed file is used only when it is non-empty and at least
10% smaller. Fragmented MP4 writes media incrementally, allowing the output size
guard to stop conversions that grow beyond the useful size before finalization.

The form shows preparation percentage and before/after size in both languages.
Submit remains available while the selected video is being prepared. One valid
click locks submission, retains that form snapshot, waits for the current video
validation/compression task, and automatically uploads its result. Preparation
status is shown separately from upload percentage; preparation must never display
an upload percentage before a request starts. Invalid evidence stops the queued
submission with an error and preserves the form. Further clicks cannot enqueue
another request, and leaving the form cancels continuation before upload starts.
The pending notice asks customers to wait until completion and explains that
WhatsApp opens after the claim is saved; a second click is unnecessary.
Customers can skip compression and send the original. Preparation is limited to
60 seconds; worker errors, unsupported browsers, and unavailable worker assets
also fall back to the original with an explicit notice. Replacing a selection
or leaving the form terminates its worker; stale results cannot replace a newer
file. Small or fallback files remain subject to full server validation.

Only the multipart upload uses the prepared copy. The original file stays in the
picker, and both the form and prepared copy survive a failed submission so retry
does not require another compression. The server still fully decodes the uploaded
video before saving the ticket and evidence in private Storage; only metadata is
stored in the database. WhatsApp opens only after successful saving. Compression
reduces transferred/stored bytes when supported; total time and compression ratio
depend on the recording, device and network. No universal speed guarantee applies.

## Admin video preview

Ticket Inbox opens video previews inline with native playback controls and mobile
inline playback. Selecting **Preview video** immediately attaches the existing
protected evidence URL to the browser player with metadata preloading; there is
no initial full-file JavaScript fetch or server conversion. Initial loading ends
when metadata is available, including on browsers that defer media frames until
Play. Videos do not autoplay. Native seeking uses authenticated single byte ranges.
Closing or switching the preview releases the player and cancels its media request.

Supabase evidence streams through the application without buffering the complete
object. Every request checks the admin session and ticket deletion state, including
HEAD and range requests. Private Storage credentials remain on the server; no
signed URL or provider redirect is exposed. Metadata calls have 15-second deadlines
and Storage streaming has a 120-second bound. Incorrect content lengths, invalid
upstream ranges, and truncated or oversized streams are rejected. Local evidence
retains the existing in-memory range response. Original downloads remain unchanged.

If the browser reports an unsupported or undecodable format, the client first
checks access with HEAD, then automatically requests `preview=1` once. HTTP access
and network failures show appropriate errors without triggering conversion. An
expired session asks the administrator to sign in again. The fallback creates a
private MP4 copy in memory with FFmpeg: compatible H.264 video is remuxed; other
codecs are converted to H.264 within a 1280-pixel maximum dimension, with AAC audio
and metadata before media. Reading the full original is limited to 30 seconds,
and conversion to one concurrent job per server process, 30 seconds, and 64 MB
output. Client fallback fetch has a 75-second deadline, after an access check of
at most 10 seconds. Original metadata loading has a 30-second deadline. Errors
provide Retry preview and Download video; retry starts with the original again.

The converted fallback uses a temporary object URL which is revoked on close,
retry, or failure. Conversion never overwrites original evidence or writes to
Storage. All evidence responses use private, no-store caching; original responses
support single byte ranges (`206`, `Content-Range`, and `Accept-Ranges`), unsatisfiable
ranges (`416`), and HEAD without downloading a Storage object body.

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

Administrators select one of seven owner-requested solution labels: `Klaim Garansi`,
`Kirim Barang Kurang`, `Kirim Barang Salah`, `Retur/Refund`, `Kirim sparepart`,
`Refund dana sebagian`, or `Edukasi cara pemakaian/kendala`. These exact labels are
explicitly requested exceptions to
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

Migration `202609160002_warranty_usage_guidance_solution.sql` expands the existing
solution constraint with the English stored value `usage_guidance`. The admin
dropdown, saved solution, and spreadsheet export display its exact owner-requested
label `Edukasi cara pemakaian/kendala`. All six previous values, null solutions,
ticket statuses, and historical records remain unchanged. This additive migration
is prepared locally and has not been applied to production; apply it before
saving the new option in a Supabase-backed deployment. A read-only check of the
configured Supabase database confirmed the expected constraint name and its six
existing values; no production schema or ticket data was changed.

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


## Compression and usage guidance verification on September 16, 2026

Lint, typecheck, production build, and all 197 Node tests passed, including the
new solution migration exercised in isolated PGlite PostgreSQL. Chromium verified
nine local browser flows, including compression, actual multipart upload to the
production-build route, full server decoding, private-storage simulation, success
before WhatsApp navigation, failure retention, skip, stale-selection cancellation,
50 MB validation, both languages, and unsupported-browser fallback. WebKit also
compressed the same source and enabled submission without JavaScript errors.

An eight-second synthetic 1080p recording with audible tone measured 22,196,824
bytes before compression and approximately 1.3 MB after Chromium compression
(1280 by 720, with AAC audio retained). Preparation took approximately one second
on the test computer. On a simulated 256 KiB/s upload connection, submission and
local server/storage confirmation took approximately 7.4 seconds. These are local
measurements, not a production or phone speed guarantee. A separate padded
46.4 MiB file verified compatibility with the originally reported upload size.

The admin browser saved and reloaded `usage_guidance` and exported its exact label
against the local service simulation. SQL tests separately verified the real
constraint migration and preservation of existing values, statuses, and rows.
All synthetic claims and admin writes stayed local; WhatsApp navigation was
intercepted without sending a message. Reports and screenshots are stored under
`.data/warranty-compression/`. The owner authorized pushing the verified change
to GitHub after local verification. The production solution migration remains
pending, and deployment must be verified separately from the GitHub push.


## Single-click submission and direct preview verification on September 16, 2026

The owner reported clicking Submit while video preparation was still active and
needing to click again afterwards. Submission now waits for that same preparation
task and continues automatically. Local Chromium checks confirmed exactly one
multipart request even after additional submit events, retained the compressed
upload copy, and reached WhatsApp only after successful server validation/saving.
Network failures preserved the original selection and all form details. Navigating
away during preparation prevented any claim request from being sent.

Production-build browser checks also covered direct MP4 preview, seeking, closing,
legacy AVI conversion, expired-session errors without conversion, and mobile
layout. A local 21 MB recording reached native preview before full transfer;
these local timings do not establish production speed. WebKit loaded metadata
without a lingering spinner and played the same MP4 after Play. Its HTTP-only
loopback check used a short-lived session signed with the local simulation secret;
production Secure-cookie settings were not changed.

Lint, typecheck, production build, and all 206 Node tests passed. New streaming
regressions exercise the installed Supabase SDK, ranges, HEAD, deleted-ticket
access, upstream failures, bounded byte counts, and cancellation before headers
and during transfer. A read-only check through the local app against configured
Supabase returned anonymous 401, authenticated HEAD 200 with no body, and Range
206 with exactly two bytes. Private caching and absence of redirects were verified.
No customer records or Storage objects were written. Synthetic browser writes
stayed in a loopback simulation and WhatsApp navigation was intercepted without
sending a message. Reports are under `.data/warranty-preview/` and
`.data/warranty-preview-speed/`. This fix has not been pushed or deployed.

## Restored status controls

Ticket details expose an immediate-save **Ticket status** dropdown with New, Under review, Approved, Rejected, and Closed. The same detailed labels appear on ticket badges, notifications, and CSV exports. Existing All/Pending/Done filters remain completion groups: Pending contains every non-closed status, and Done contains Closed.

Changing status preserves saved solutions and unsaved solution selections, including when reopening a closed ticket. Resolution's Done action still saves the selected solution and closes the claim. Status controls are disabled during ticket mutations, show success or error feedback, and keep the previous saved value if the request fails. Status updates require an authenticated administrator and server-side validation; no database migration is required.
