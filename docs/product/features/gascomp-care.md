# GascompCare membership and warranty extensions

[Specification index](../spec.md)

## Product agreement

GascompCare is paid additional protection for one specific purchased item, separate
from the product's included warranty. One Care unit provides one year of coverage
and up to three additional claims. Two units provide two years and up to six
additional claims; N units provide N years and up to 3 × N additional claims.
The Care purchase date starts coverage, not the login date or the date an operator
enters the purchase. One account has one virtual member card; future coverage
records will identify the specific item being protected.

The owner's latest description of the included product warranty allows one to
three claims. Its exact policy remains to be defined separately. The existing
[Warranty Claim](warranty.md) implementation still enforces its documented
one-claim rule and is unchanged by this feature.

Marketplace order synchronization, purchase recording, coverage issuance,
activation verification, working QR codes, claims and balance deductions are
deferred. Policies for purchases on different dates, refunds, and allocation
between included warranty and Care also remain deferred. Account creation does
not issue coverage, reset a balance, or activate a warranty.

## Customer access

The public header provides a visible **GascompCare** menu on desktop and mobile,
including the home, product guide, and warranty form pages. Existing public routes,
printed product QR destinations, and legacy support-contact links remain stable.

- `/gascomp-care` requires a member session and shows only that member's profile
  and virtual card.
- `/gascomp-care/login` accepts username and password. Accounts are created by an
  administrator; there is no public signup or automatic message delivery.
- `/gascomp-care/change-password` requires the current password and confirmation
  of the replacement. Temporary credentials require this step before member access.
- Customers can sign out and change their password. Forgotten passwords are
  handled by an administrator after the customer contacts support.

Customer pages support English and Indonesian using the existing language
preference. Metadata, validation and accessibility labels are localized. Account
pages are excluded from indexing and member data is not publicly cached.

The real member card shows the official Gascomp identity, customer name, and a
permanent member number. It states that Care purchase details are not available
yet. It does not show a usable QR, claim balance, expiration date, or unverified
coverage status. An account is usable even while purchase details are unavailable.

## Admin account management

**GascompCare** appears after **Warranty tickets**. Administrators can search
members by name, username, or member number, browse 20 results per page, create
accounts, inspect a member, and reset passwords. The initial list is empty.

Creation collects name, username, WhatsApp number, and an optional Shopee order
reference. That reference is an operator note, not a verified purchase or an
entitlement. Usernames are unique after lowercase normalization and use 3–32
ASCII letters, digits, dots, underscores, or hyphens.

The server generates a stable member number and random temporary password. The
temporary password is returned only after creation or reset so an administrator
can copy it for manual delivery through WhatsApp or marketplace chat. Dismissal
or navigation clears the visible credentials. Existing passwords cannot be read.
If a successful response is lost, an administrator can find the account and reset
the password rather than create another account.

Password reset requires confirmation, revokes existing sessions, and requires a
password change at the next login. Member operations persist immediately and do
not use the catalog's Save/Cancel workflow. Unsaved catalog edits survive moving
between dashboard views.

A separate card preview is labeled **Sample** and uses fictional data, one year,
up to three claims, and a nonfunctional QR placeholder. It never represents a
customer's actual purchase or coverage.

## Authentication and storage

### One local website

Use `npm run dev` at `http://localhost:3000` for all application features. The
development command explicitly reserves port 3000; a second invocation must not
silently create a different local website. The earlier website on port 3100 is
retired. Administrator credentials come from the normal project configuration.

Optional `GASCOMP_CARE_PREVIEW_URL` and `GASCOMP_CARE_PREVIEW_KEY` variables in
the ignored `.env.local` connect only GascompCare to the existing loopback test
database. The catalog, ordinary warranty workflow, and their configured Supabase
connection remain unchanged. The database listener is a background service, not
a second website. Keep it running to retain the current in-memory test members.

This override is available only in development and permits only an HTTP loopback
database. Invalid or incomplete settings, or an unavailable preview database,
report unavailability without falling back to the primary database. Production
builds and `npm run start` ignore both preview variables and use the configured
Supabase project. Local test members are never copied to production by a Git push,
build, or migration. See [Supabase setup](../../setup/supabase.md) for preserving
existing database and Storage content during an explicitly authorized rollout.

### Sessions

Member authentication is separate from the existing admin authentication. Supabase
stores accounts, hashed sessions and shared login-attempt counters. There is no
local-storage or mock-auth fallback when Supabase is unavailable. The interface
reports temporary unavailability and does not issue credentials or a session.

Passwords use asynchronous Node scrypt with N=32768, r=8, p=3, a random salt per
password, and a 64 MiB memory bound. Customer passwords use 8–128 characters.
Only the password hash and parameters are stored. Passwords and session tokens
must not appear in logs or member-list responses.

Sessions use random tokens stored as hashes in the database and expire after
eight hours. The separate member cookie is HTTP-only, SameSite=Lax, scoped to
`/gascomp-care`, and Secure in production. Logout revokes the server session.
Password changes and resets atomically invalidate old sessions. A session awaiting
password replacement can only change the password or sign out.

Normal local development supports HTTP cookies without an extra flag. For a
separate production-build check on loopback, `GASCOMP_LOCAL_HTTP_PREVIEW=true`
allows WebKit/Safari to retain sessions over HTTP; the current development
launcher does not set this flag.
Both admin and member cookie writes omit Secure only when that flag is enabled
and the request has an exact matching HTTP Origin/Host on `localhost`, `127.0.0.1`,
or `[::1]`. HTTPS, non-loopback hosts, malformed/mismatched origins, and deployments
without the flag retain Secure. Cookie path, HTTP-only, SameSite, expiration,
password verification, and database session revocation remain unchanged.

Every protected read and mutation verifies the current server-side session.
Member identity comes from that session, not a client-supplied member ID. Admin
account operations verify an admin session; mutations also verify request origin.
Row-level security and database grants restrict member tables and functions to
server-side access. Database operations enforce credential-version checks to
prevent concurrent logins from restoring access after a reset.

Login attempts are limited across server instances using database counters:
five attempts per username and 30 per IP in 15 minutes. Local development
(`NODE_ENV=development`) skips login and password-change counters for exact
matching loopback Origin/Host requests (`localhost`, `127.0.0.1`, or `[::1]`).
Existing local counters do not block these requests. All production requests,
including `support.gascompsuperlock.com`, retain database-backed limits. Password
verification, origin checks, and session requirements still apply locally. Invalid credentials use
the same public response whether the username exists or not.
Password-change attempts use separate counters so a successful fifth login does
not prevent the mandatory first password change. The trusted reverse proxy must
append or replace `X-Forwarded-For`; the application uses its final validated IP.
Missing or invalid IPs share a conservative `unknown` bucket.

Migration `202609150003_gascomp_care_accounts.sql` prepares this storage without
altering warranty tickets, catalog data, evidence, or existing admin sessions.
It must be applied before functional member authentication is available. The
authorized production migration is recorded in the
[Supabase integration specification](../integrations/supabase.md#gascompcare-member-accounts).

## Verification

Run lint, typecheck, Node tests, and production build. Cover account creation and
duplicates; valid/invalid credentials; shared rate limits; mandatory password
replacement; expiry/logout/reset; concurrent credential changes; cross-member
isolation; and separation of member/admin access. Exercise SQL against a disposable
test database and check anonymous database grants.

Browser verification covers desktop/mobile, both languages, empty/loading/error
states, temporary credential dismissal, public navigation, password workflows,
and preservation of staged catalog edits. Use fictional members in an isolated
test database, never production customer records.

### Local verification on September 15, 2026

Lint, typecheck, the production build, and 93 Node tests passed. The optional SQL
suite was run separately with `CARE_PGLITE_MODULE` pointing to a temporary PGlite
installation: all eight tests passed against a disposable PostgreSQL engine,
including role grants, session expiry, stale credential rejection, limits, and
transaction rollback. This engine uses a single connection; live multi-connection
contention and hosting proxy behavior remain deployment checks.

Chromium checks passed against the production Next build connected to the
disposable database through a local REST adapter. They exercised account creation,
duplicates, search/pagination, login, mandatory password replacement, reset,
logout, expiry, ownership isolation, rate limits, outages/retry, both languages,
metadata, mobile/desktop navigation, and preservation of staged catalog edits.
No browser page errors occurred. Reports and fictional-account screenshots are
under `.data/gascomp-care-validation/`, ignored by Git. The production database
and website were not changed.

### HTTP preview session regression

WebKit reproduced a loopback preview failure: the production build returned a
Secure cookie over HTTP, which WebKit discarded. The action response displayed
the password-change form, but its next submission had no session and reported
expiry. Chromium accepted the loopback cookie, so the initial Chromium-only
verification missed this browser difference.

The explicit loopback-only cookie policy above fixes the preview for both admin
and member login. Four regression tests cover opt-in behavior, matching origins,
HTTPS/external-host protection, and malformed origins. Lint, typecheck, build, and
97 application tests passed. Chromium and WebKit both retained the session through
first password replacement, page reload, logout, and login with the new password;
admin login also passed in both engines. Local diagnostic records are stored in
`.data/gascomp-care-validation/session-probe-before.json` and `session-probe.json`.
Existing preview member accounts and the production database were preserved.

### Unified local website verification

The website now runs only on `http://localhost:3000`; the former port 3100
process was stopped. The existing disposable Care gateway remains running to
retain manual test accounts. Chromium and WebKit passed admin login, member
creation, mandatory password replacement, reload, logout, and subsequent login
on port 3000. The updated session probe waits for rendered forms rather than a
fixed delay, accommodating development compilation.

Lint, typecheck, build, and all 113 Node tests passed with the optional SQL engine
enabled. Tests cover production ignoring preview variables, invalid or unavailable
preview connections never falling back to the primary database, and preservation
of existing rows when adding or accidentally repeating the Care migration.
No production migration, push, or deployment was performed.
