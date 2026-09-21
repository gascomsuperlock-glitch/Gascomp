# Admin panel

[Specification index](../spec.md)

## Content management

The separate **GascompCare** workspace manages customer member accounts and
virtual card previews. See [GascompCare](gascomp-care.md) for account creation,
password resets, immediate persistence, and the deferred purchase integration.

The Gascomp team can create, view, update, archive, and delete product content. The workflow is draft → review → publish. Drafts are private; published products appear in the public catalog. A product that has ever been published should be archived so its printed QR URL remains valid. Permanent deletion is intended for drafts or incorrect entries.

One administrator role is sufficient for the initial release. `/admin` is protected on the server and redirects visitors without a valid session to `/admin/login`. Credentials come from environment variables; the signed HTTP-only session cookie expires after eight hours.

The public home page header includes an **Admin login** link on desktop and mobile. It opens `/admin/login`; an administrator with a valid session is redirected to `/admin` by the existing login route.

| Object | Supported operations |
| --- | --- |
| Product | Manage SKU, name, model, description, status, and source metadata |
| Variation | Add, edit, and remove names and SKUs per product |
| Image | Upload, preview, replace, link to a variation, set primary, and delete |
| Tutorial | Manage and reorder YouTube, Google Drive, TikTok, direct video links, file uploads, administrator-selected thumbnails, titles, descriptions, and duration |
| Issue guide | Add, edit, reorder, and remove issue titles, summaries, ordered troubleshooting steps, and optional safety warnings |
| FAQ | Add, edit, reorder, and remove questions and answers |
| Settings | Manage the WhatsApp destination and support hours |
| Service Center | Add, edit, activate, deactivate, and delete Indonesian locations; see [support](support.md) |
| Warranty ticket | Review private submissions and update status |

Images accept JPG, PNG, or WebP up to 8 MB each and six images per product. The browser compresses them to WebP before upload. Admin-managed images and content are preserved when Duoke or warehouse data is imported again.

In Supabase mode, Save first requests a single-path signed upload from the protected
`POST /admin/images/upload` endpoint and sends each new photo directly to Storage.
Only the resulting URL and storage path enter the catalog Save JSON, avoiding large
base64 request bodies through the application host. Authorization accepts safe new
product/image IDs without creating database rows, requires an admin session and
trusted origin, and bounds the JSON body to 4 KB. Image transfer failure stops before
catalog persistence and preserves edits. Completed uploads are reused on retries
in the same tab; changed image bytes require a new upload. The server still accepts
legacy inline images from older tabs. Unreferenced uploads may remain after Cancel.


The dashboard header provides a visible **Save** button. Edits remain staged in the admin form and do not affect the customer website until the administrator selects Save. The button then persists the current product and settings content and reports saving, success, or failure. There is no automatic content save.

The **Manage content** product list supports bulk publication and archiving. Administrators can use **Publish all** or **Archive all**, search by name/model/SKU to act on all matching results, or select individual products with checkboxes. The select-all checkbox selects the current results and shows a mixed state for partial selection. Changing the search clears selection; opening an editor does not change it. With a selection, actions apply only to selected products; otherwise they apply to the full visible result set. Button counts show products whose status will change. Empty results and actions with no eligible products are disabled, and bulk controls are disabled while saving.

Bulk archive skips products that have never been published and keeps existing slugs and QR destinations intact. Bulk publish can restore archived products. These actions only stage status changes, preserve all other product content, and report the changed count with a reminder to select **Save**. The existing save flow handles persistence and retains staged edits if saving fails.

Save uses the stable `POST /admin/content` JSON endpoint, which verifies the request origin and admin session before reading up to 40 MB and invoking catalog persistence. This avoids tying the browser save request to a build-specific Server Action identifier. Save failures retain edits in the current tab and distinguish expired sessions, rejected origins, unavailable deployments, oversized uploads, and hosting timeouts. A lost response does not prove that the server failed to save. After a transport
failure, gateway error, or invalid response, the client makes one authenticated,
uncached, read-only database check with a ten-second deadline. It reports Saved
only when all submitted content matches the stored catalog, including settings and
ordered help content. The check never automatically repeats a write and never uses
local fallback data. Missing products, partial saves, pending image uploads whose
bytes cannot be verified, and unavailable readback retain edits and an uncertainty
message. Diagnose the specific product ID/SKU reported by the owner; successful
saving of another product does not establish success for the failing request.

The editor sends only new or edited products, explicit removed product IDs, and
changed settings relative to its last successful Save. The server merges these
changes into its current protected snapshot, preserving untouched products and
settings, including unrelated additions from another session. It returns only the
saved changed products and settings, which the editor merges into its submitted
content. Existing tabs can still send the original full-content protocol. No write
is retried automatically and same-product concurrent edits still have no conflict
resolution.

Persistence compares incoming content with stored content and writes only new or
changed products and changed settings. A service-role-only database function returns
the settings, catalog rows, and optional video-schema capabilities as one consistent
snapshot, avoiding multiple hosting-to-database requests before each Save. Adding a
new product without help content requires one product upsert, with no child-record
deletion or rewriting of other products. Existing deletion/archive rules and the
explicit Save/Cancel workflow still apply. Storage cleanup is scoped to replaced or
permanently deleted products; archiving retains their images and tutorial thumbnails.

The save response uses an explicit UTF-8 byte length and disables intermediary
transformation so the Hostinger HTTP/2 proxy does not have to recompress the catalog
confirmation. Server logs identify each attempt by an opaque request ID and record
request arrival before session or body processing, followed by status, timing, request
size, and product count on completion. They do not record catalog values or credentials.

Persistence compares incoming content with stored content and writes only new or
changed products and changed settings. Adding a new product without help content
requires one product upsert, with no child-record deletion or rewriting of other
products. Required catalog reads and optional video-schema checks run concurrently.
Existing deletion/archive rules and the explicit Save/Cancel workflow still apply.
Storage cleanup is scoped to replaced or permanently deleted products; archiving
retains their images and tutorial thumbnails.

The dashboard can download one QR code per product when `GASCOMP_PUBLIC_BASE_URL` is configured with a production HTTPS origin. It also exposes Warranty Claim, Gascomp Care, and Service Center actions with the current product and SKU context.

The separate **Service Centers** workspace uses an explicit **Save location** action for each location. Its edits and persistence are independent of catalog Save/Cancel. See [Service Center administration](support.md#service-center-administration) for required fields, map selection, and visibility.

## Help content workspace

The product picker and editor use a master-detail layout on wide screens (1280 px and above). The product list stays available beside the editor, with its own bounded scroll area. Product rows show a readable name, SKU, status badge, and an explicit active state.

On smaller screens, the workspace shows one pane at a time. Selecting a product or adding one opens the editor immediately and moves focus to its heading. **Back to Products** returns focus to the active product in the list, or to search when that product is outside the current results. Search text, bulk selections, the current editor section, and staged product edits remain intact when moving between panes. Adding a product opens Information; an overview shortcut opens its requested section.

The default picker emphasizes search and opening a guide. **Bulk Actions** reveals selection checkboxes and publication/archive controls; **Done Selecting** closes them and clears the selection. Search changes also clear selection. Opening a product does not alter the bulk selection. Existing bulk scope, eligibility, counts, and staged-save rules continue to apply.

The editor header shows the full product name, SKU, model, publication status, and an **Open Guide** link for published or archived products. Status copy reminds administrators that changes require Save. Information, Images, Video, Issues, FAQ, and Product QR are grouped separately from customer support actions. Image, video, issue-guide, and FAQ counts appear beside their section labels. On narrow phones, a labeled **Editor Section** selector exposes every section without horizontal scrolling.

On phones below 640 px, Help Content uses tighter spacing around the storage
notice, editor header, publication controls, and form. Save and Cancel remain
available in the dashboard header. Product names occupy up to two lines in the
picker; the editor retains the full name. The section selector and editor form
fields use 16 px text. FAQ fields span their card below the number and delete
control. Troubleshooting step inputs span their row below the number and action
buttons, leaving enough room to read and edit the text.

The **Issues** section explains that each issue guide represents one customer symptom shown under **What is happening?** on the public product page. Administrators provide a title, short explanation, ordered troubleshooting steps, and an optional safety warning. Issue guides and individual steps can be reordered or removed. All edits remain staged until Save.

## Overview workspace

The Overview starts with clear **Manage Products** and **Add Product** actions, followed by summary cards for published products, tutorial videos, FAQ answers, and open warranty tickets. Counts use locale-aware number formatting and remain informational rather than acting as ambiguous navigation targets.

The **Product Library** supports search by name, model, or SKU and filters for All, Published, Draft, and Archived products. Each product card presents the product identity, status, and image/video/FAQ counts before offering explicit **Edit Guide** and **QR Tools** actions. Selecting either action opens the matching Help content editor section and moves focus to the selected product heading. **Manage Products** opens the Help content product picker without selecting the first product implicitly.

The library renders eight matching products initially and adds eight at a time through **Show More Products**. Search or status changes reset the visible group. Empty catalog and no-result states provide a direct recovery action. All controls retain visible keyboard focus, and the layout stacks without horizontal page overflow on small screens.

## Tutorial order

The Video tab includes a compact, numbered **Video Order** list above the video editors. Administrators can drag a handle onto another row to move that video into the target position. Up/down buttons provide touch and keyboard alternatives; focused handles also support the Up and Down arrow keys. The first and last positions disable unavailable moves. A live announcement confirms the new position and reminds the administrator to select **Save**.

Reordering applies to uploaded files and linked tutorials. List numbers and editor numbers follow the current array order immediately. Video IDs, file URLs, storage paths, metadata, staged edits, and active upload components retain their identity. Dropping outside the list or cancelling a drag leaves the order unchanged. Reordering is disabled while saving.

Changes use the existing staged-save workflow: Save persists array order as consecutive tutorial `position` values (or as array order in local storage). Reloaded editors and public product guides use the saved order. No database migration or file re-upload is required.

## Uploaded video thumbnails

Selecting an MP4/WebM file prepares four local frame choices before uploading. The administrator chooses one thumbnail and explicitly starts the upload; the product editor is updated only after the selected browser-generated WebP, JPEG, or PNG thumbnail and video have both reached Storage. Existing uploaded tutorials provide a **Choose another thumbnail** action that reads frames from the stored video and changes only its thumbnail.

Thumbnail changes remain staged until Save. The selected image is visible in the video editor preview and Video Order list, then appears in the customer tutorial list and as the native player poster after Save. The thumbnail upload endpoint checks the request origin, admin session, saved product identity, file type and size, and database thumbnail columns before issuing a single-path signed Storage upload.

## Dashboard design

The panel adapts the **Dashboard with Collapsible Sidebar** component by **uniquesonu** from [21st.dev](https://21st.dev/community/components?q=panel+admin&preview=%2F%40uniquesonu%2Fcomponents%2Fdashboard-with-collapsible-sidebar).

- Preserve the collapsible navigation, dashboard header, statistics cards, product section, and responsive behavior.
- Use the project Tailwind CSS, TypeScript, shadcn conventions, and `lucide-react` icons.
- Keep customer-facing Gascomp brand rules separate from the admin dashboard reference.
- Operational data replaces reference/demo data; the reference component does not define new business requirements.

Status: the protected admin flow, feature dashboard, product/content editors, image management, QR, settings, and warranty-ticket review are implemented. Supabase is used when configured; local fallback remains available for development.

The header **Cancel** button restores all product and settings edits to the last successful Save (or initial loaded content). It clears save errors and unsaved state without writing to the database. Cancel is disabled while saving and when there are no staged changes. Uploaded files can remain unreferenced after cancellation.
