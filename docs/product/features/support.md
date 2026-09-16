# Customer support channels

[Specification index](../spec.md)

Product support exposes these service actions:

| Action | Destination |
| --- | --- |
| Warranty Claim | Internal `/klaim-garansi` flow with product and SKU context |
| Gascomp Care | Official Gascomp customer-contact page |
| Service Center | Internal `/service-center` directory, retaining product and SKU query context from product actions |

The website also provides a separate **GascompCare** member navigation link.
Member login and paid extensions are documented in [GascompCare](gascomp-care.md).
The brand is always written as “Gascomp.” External contact actions open the official Gascomp site in a new tab.

WhatsApp links use the configured support number and include a short English product/issue context when available. Customers can edit the message before sending it. The support-hours setting is displayed on the home page.

A logo-only WhatsApp button remains fixed in the bottom-right corner on public application routes. It is hidden on `/admin` and all `/admin/` subroutes, including admin login. It opens a chat with the configured Gascomp admin number in a new tab. The button respects mobile safe areas and is hidden when no support number is configured.

## Service Center directory

The September 16, 2026 implementation introduces `/service-center`, accessible from the shared public navigation, product support, and existing admin product service action. The directory starts empty: no sample or inferred business locations are seeded.

- Customers search by center name, city/regency, or address and filter by any of Indonesia's 38 provinces. Province codes follow [BPS metadata](https://sirusa.web.bps.go.id/metadata/variabel/326536). English and Indonesian province labels accompany localized interface copy and the existing language selector.
- Only active locations appear in public page data, search results, and map markers. Search and province filters combine. All provinces remain selectable even without a location.
- Cards show the center name, province, city/regency, address, and optional opening hours, phone, and WhatsApp actions. Google Maps opens the saved HTTPS link or the location coordinates when no link is supplied.
- An interactive Leaflet map uses OpenStreetMap tiles and visible attribution. Markers follow filters; selecting a card focuses its marker, and selecting a marker highlights its card. The empty map shows Indonesia without fabricated markers. Locations, directions, and contact actions remain usable when tiles fail to load.
- Empty directory, no matching results, map loading/failure, and data-unavailable states have explicit messages. Database errors are not represented as an empty directory. Support links lead to the existing contact section.
- Map tiles are requested directly by the browser under the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). The public map requires no geocoding, bulk tile fetching, API key, or customer location permission.

## Service Center administration

The protected admin sidebar includes **Service Centers** as a separate workspace. Administrators can list/search, add, edit, deactivate, and reactivate locations. There is no permanent delete action.

Required fields are name, province, city/regency, address, latitude, and longitude. Phone, WhatsApp, opening hours, and Google Maps URL are optional. The map picker and coordinate inputs refer to the same location. New forms start without coordinates. Server validation checks known Indonesian province codes, finite coordinates within Indonesia's bounding range, field limits, phone formatting, and HTTPS Google Maps destinations. The bounding range is a coarse geographic guard, not a province boundary or land-boundary verification; administrators must verify each point and address.

**Save location** persists only the current location immediately and makes its active status effective publicly. Catalog Save/Cancel does not apply to this workspace. Failures preserve form values. Switching admin workspaces retains the mounted form, and abandoning a changed location inside this workspace asks the operator to discard changes. The UI supports desktop and mobile editing.

Every admin list request checks the existing admin session; mutations additionally verify the request origin. Supabase is the primary store with a separate ordered migration and server-only reads and writes. Anonymous and Supabase-authenticated API clients cannot access the table; the application server returns only active locations to directory pages. A missing or failed configured database reports unavailability instead of silently using local data. Development without Supabase uses an initially absent `.data/service-centers.json` file shared by the local admin and public server. This file mode is for single-process development only. See [Supabase storage](../integrations/supabase.md) for migration status.

Status: the owner authorized connecting local testing to the configured Supabase database on September 16, 2026, then authorized a GitHub push and Hostinger deployment after local verification. Migration `202609160001` is applied with server-only table access. Temporary test locations are removed after verification. See the [release record](../operations/deployment.md#service-center-release-on-september-16-2026) for deployment readiness and verification scope.

## Local verification on September 16, 2026

Lint, TypeScript, and the production build passed. The Node suite passed 131 tests
with three unrelated optional tests skipped; the service-center migration test
ran against a disposable PGlite database and verified empty initialization,
server-only database access, denied direct public reads/writes, and coordinate/province constraints.

Chromium checks covered empty/populated directories, all province options,
combined filtering, synchronized markers, bilingual persistence, admin creation,
editing, deactivation/reactivation, map coordinate selection, retained drafts,
expired-session rejection, and storage failure/retry. Public layouts were checked
at 320, 390, and 1440 pixels and admin editing at 390 pixels. No page errors or
horizontal overflow occurred. Map tile responses were mocked to avoid automated
third-party downloads; tile failures were tested separately. Live map-provider
availability and production deployment remain outside this local verification.
All temporary location records were removed, leaving the directory empty.

## Supabase-backed local verification on September 16, 2026

The owner requested testing with the configured database while keeping the new
application local until deployment. Chromium exercised the same directory and
admin flows at `http://localhost:3000` using real Supabase persistence, including
reload, edits, active/inactive visibility, and expired-session rejection. Two
uniquely identified fictional centers were created and removed by their exact IDs.
The directory is empty again and no local fallback file was written. Direct
public API reads were denied even while active fixture rows existed.

Before/after counts and content checksums verified all 247 existing rows across
16 application and Storage metadata tables unchanged. The local report is
`.data/service-center-validation/database-preservation.json`; browser results are
in `database-browser-report.json` in the same directory. No hosting release or
public tunnel was created. The existing local development server remains available
for the owner's review using the configured local admin credentials.

## Google Maps link auto-fill

Administrators can paste a Google Maps place Share link at the top of the location
editor. Pasting starts a server-side lookup automatically; typing a link and
leaving the field also starts lookup. **Read Google Maps link** retries it.
No Google API key or additional database migration is required.

The server follows HTTPS redirects only through supported Google Maps hosts and
reads the selected place from public Maps data. When the initial HTML declares a
same-origin `/maps/preview/place` resource, it reads that resource once. There is
no login, CAPTCHA solving, executable page evaluation, geocoding service, or
Google Places API. Requests have bounded redirects, a 12-second timeout, and a
3 MB response limit, and do not forward admin cookies or credentials. Both admin
authentication and a matching request origin are required before any lookup.

Available name, full address, city/regency, recognized Indonesian province,
phone, regular opening hours, and selected-place coordinates fill empty fields.
The parser ignores camera coordinates and unrelated search results. Explicit
foreign countries or coordinates outside the Indonesian bounds are rejected.
Coordinates from a pin-only link can produce a partial result requiring manual
name/address entry. Missing or unsupported fields remain unchanged and are listed
for review. A phone number is never automatically copied to WhatsApp.

Existing form values are retained. **Replace matching fields** lets the operator
explicitly replace only the returned fields after confirmation. A changed link,
closed editor, or discarded draft invalidates an older lookup response. Automatic
lookup never saves a location: the administrator reviews and corrects the draft,
then selects **Save location**. The existing Supabase persistence and visibility
rules remain in effect.

This is a best-effort parser of public Google Maps page data, whose undocumented
structure may change. Unsupported links, provider blocks, and network failures
show a manual-entry/retry message without discarding the form. It cannot guarantee
complete details for every shared link. Maps pages are requested in English for the admin interface; imported place
names and addresses retain the values provided by Google. The owner authorized deployment after local verification.

Local verification passed lint, TypeScript, the production build, and 146 Node
tests (three unrelated optional tests skipped). Fifteen import regressions cover
public data parsing, current/legacy regular hours, province matching, foreign
places, malformed responses, pin versus camera coordinates, redirect/resource
restrictions, response limits, and admin authentication/origin checks.

Chromium verified automatic paste using a real public Google Maps short link,
manual-field preservation, explicit replacement, invalid-link errors, stale
response rejection, mobile layout, and expired-session handling. A reviewed,
uniquely named inactive test record was saved to the configured Supabase database,
reloaded, and removed by exact ID. Existing location identities and visibility
were unchanged. No location is saved during lookup. The real public Monas response
also verified extraction of current-format weekly opening hours. Reports and the
local browser script are under `.data/service-center-maps/`.
