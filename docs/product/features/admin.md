# Admin panel

[Specification index](../spec.md)

## Content management

The Gascomp team can create, view, update, archive, and delete product content. The workflow is draft → review → publish. Drafts are private; published products appear in the public catalog. A product that has ever been published should be archived so its printed QR URL remains valid. Permanent deletion is intended for drafts or incorrect entries.

One administrator role is sufficient for the initial release. `/admin` is protected on the server and redirects visitors without a valid session to `/admin/login`. Credentials come from environment variables; the signed HTTP-only session cookie expires after eight hours.

The public home page header includes an **Admin login** link on desktop and mobile. It opens `/admin/login`; an administrator with a valid session is redirected to `/admin` by the existing login route.

| Object | Supported operations |
| --- | --- |
| Product | Manage SKU, name, model, description, status, and source metadata |
| Variation | Add, edit, and remove names and SKUs per product |
| Image | Upload, preview, replace, link to a variation, set primary, and delete |
| Tutorial | Manage YouTube, Google Drive, TikTok, direct video links, file uploads, titles, descriptions, and duration |
| Issue guide | Manage issue titles, summaries, ordered steps, and warnings |
| FAQ | Add, edit, reorder, and remove questions and answers |
| Settings | Manage the WhatsApp destination and support hours |
| Warranty ticket | Review private submissions and update status |

Images accept JPG, PNG, or WebP up to 8 MB each and six images per product. The browser compresses them to WebP before upload. Admin-managed images and content are preserved when Duoke or warehouse data is imported again.

The dashboard header provides a visible **Save** button. Edits remain staged in the admin form and do not affect the customer website until the administrator selects Save. The button then persists the current product and settings content and reports saving, success, or failure. There is no automatic content save.

Save uses the stable `POST /admin/content` JSON endpoint, which verifies the request origin and admin session before reading up to 40 MB and invoking catalog persistence. This avoids tying the browser save request to a build-specific Server Action identifier. Save failures retain edits in the current tab and distinguish expired sessions, rejected origins, unavailable deployments, oversized uploads, and hosting timeouts. A lost response does not prove that the server failed to save; check the product before retrying.

The dashboard can download one QR code per product when `GASCOMP_PUBLIC_BASE_URL` is configured with a production HTTPS origin. It also exposes Warranty Claim, Gascomp Care, and Service Center actions with the current product and SKU context.

## Dashboard design

The panel adapts the **Dashboard with Collapsible Sidebar** component by **uniquesonu** from [21st.dev](https://21st.dev/community/components?q=panel+admin&preview=%2F%40uniquesonu%2Fcomponents%2Fdashboard-with-collapsible-sidebar).

- Preserve the collapsible navigation, dashboard header, statistics cards, product section, and responsive behavior.
- Use the project Tailwind CSS, TypeScript, shadcn conventions, and `lucide-react` icons.
- Keep customer-facing Gascomp brand rules separate from the admin dashboard reference.
- Operational data replaces reference/demo data; the reference component does not define new business requirements.

Status: the protected admin flow, feature dashboard, product/content editors, image management, QR, settings, and warranty-ticket review are implemented. Supabase is used when configured; local fallback remains available for development.
