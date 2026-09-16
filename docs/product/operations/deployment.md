# Domain and deployment

[Specification index](../spec.md)

- Connect the Gascomp Help Center to `support.gascompsuperlock.com`, replacing `bantuan.gascompsuperlock.com` to follow the English language standard. Confirm the deployment target before changing DNS.
- The deployment needs a server runtime for admin authentication, Server Actions, Supabase access, and warranty claims.
- Configure production Supabase, admin-authentication, and `GASCOMP_PUBLIC_BASE_URL` environment variables in the application host.
- Enable HTTPS and verify customer pages, admin login, images, QR targets, claim submission, and private evidence access through the final domain.
- Preserve existing website and email services. Limit DNS changes to records required by the chosen hostname.
- Keep product help paths stable because printed QR codes depend on them.

Open items: hosting dashboard access, production environment verification, and Cloudflare DNS access.

## DNS diagnosis on September 11, 2026

The domain's published nameservers are `damien.ns.cloudflare.com` and
`kenia.ns.cloudflare.com`. Direct A queries to `damien.ns.cloudflare.com` and
queries through `1.1.1.1` returned `NXDOMAIN` for both support hostnames.
Neither hostname exists in the active DNS zone at the time of the check.
Creating a subdomain in Hostinger alone does not publish it in this
Cloudflare-managed zone. DNS failure prevents checking hosting and HTTPS;
their state is still unknown.

## Follow-up TLS diagnosis on September 11, 2026

At 06:31 UTC, `support.gascompsuperlock.com` resolved to Cloudflare proxy
addresses and a live HTTPS request returned HTTP 525. The earlier NXDOMAIN
observation no longer describes this hostname. Cloudflare is reachable, but
its TLS handshake with the configured origin fails. The origin address,
hostname binding, and certificate still require verification; the response
alone does not identify which origin setting is wrong.

Check the `support` DNS record against the application's hosting target,
confirm the custom hostname is attached to that application, and verify that
the origin serves HTTPS for this exact hostname. Do not change unrelated DNS
records or weaken the zone's SSL mode as a workaround.

At 06:34 UTC, a direct request to the user-supplied origin `145.223.108.57`
with the `support.gascompsuperlock.com` Host header returned HTTP 200 and the
Gascomp Help Center page over HTTP. The response identified Hostinger and
LiteSpeed. A direct HTTPS request with the same hostname/SNI reached port 443
but failed with `tlsv1 alert internal error`. This reproduces the TLS failure
without Cloudflare; HTTP routing reaches the expected application, while
origin HTTPS remains broken. Certificate provisioning or the hostname's TLS
configuration must be checked in Hostinger.

Hostinger recommends temporarily setting the affected A record to **DNS only**
while completing SSL installation. Keep `145.223.108.57` as the target, inspect
the SSL status for the exact support hostname, and retry a failed installation
if offered. Verify direct HTTPS before restoring proxying. Switching to DNS
only alone does not repair the origin's TLS failure.

Reference: [Hostinger failed Lifetime SSL installation](https://www.hostinger.com/support/5613445-how-to-fix-a-failed-lifetime-ssl-installation-in-hostinger/).

Reference: [Cloudflare error 525](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-525/).

## HTTPS verification on September 11, 2026

At 07:13 UTC, direct origin HTTPS and the public hostname both returned HTTP
200 with certificate verification enabled. The certificate matched
`support.gascompsuperlock.com` and was issued by Google Trust Services. DNS
resolved directly to `145.223.108.57`. This supersedes the earlier origin TLS
failure; subsequent changes to Cloudflare proxying require a separate check.

## Connection procedure

1. Identify the application's hosting service and its supplied IP address or
   CNAME target. This Next.js application needs a compatible server runtime.
2. Connect `support.gascompsuperlock.com` to the application in the hosting
   dashboard. For a Hostinger Node.js app on a temporary domain, use
   **Websites → Connect domain** and follow its instructions.
3. In Cloudflare's `gascompsuperlock.com` zone, add a record named `support`.
   Use an A record for the provider's IPv4 address or a CNAME for its hostname,
   following the provider's required record type, proxy setting, and ownership
   verification records. Do not guess the target from the main website's IP.
   Keep existing nameservers, apex, `www`, and mail records unchanged.
4. Set `GASCOMP_PUBLIC_BASE_URL=https://support.gascompsuperlock.com` and the
   Supabase and admin variables from `.env.example` in production. Apply the
   required database migrations. For standard Node.js hosting, build with
   `npm run build` and start with `npm run start`.
5. Complete HTTPS and verify the new site before routing the old hostname to
   the same application. The old hostname also needs DNS, a hosting binding,
   and HTTPS for its redirect to work.
6. Verify customer pages, admin login, images, QR destinations, a controlled
   warranty submission, and private evidence access. Regenerate support
   knowledge exports if they contain localhost or old-hostname links.

## Warranty video verification runtime

Warranty submissions decode videos using the single-threaded WebAssembly build
in `@ffmpeg/core`, inside a Node.js worker thread. This replaces `ffmpeg-static`:
native executable verification returned an unavailable error in production.
No executable download, child process, or writable temporary directory is needed.
`npm ci` installs the JavaScript and WASM assets with the dependency itself.

Next.js keeps the package external and explicitly traces its UMD JavaScript,
WASM file, package manifest, and the unbundled worker entrypoint. Start the app
from its project root, as with `npm run start`, so the worker path resolves in
both regular and standalone deployments. The runtime must support Node worker
threads and WebAssembly. Each check owns an in-memory filesystem and its worker
is terminated after completion, failure, or a 30-second timeout. Verify actual
valid and damaged submissions after deployment, not only metadata validation.

## Legacy links

`next.config.ts` issues HTTP 308 redirects from the exact
`bantuan.gascompsuperlock.com` hostname to `https://support.gascompsuperlock.com`,
preserving paths and query parameters. Existing route segments such as
`/produk/[slug]` remain stable. Verify an old product URL redirects to its new
equivalent after both hostnames are connected.

## Status

The environment example, application redirect, and deployment instructions are
prepared locally. No production environment, DNS, hosting, or certificate
settings were changed by the agent. The user-supplied Hostinger origin serves
the expected home page and passed HTTPS verification. The live admin login
page reports that authentication is not configured; production credentials
and the latest application deployment still require verification.

## Provider references

- [Hostinger: Connect a custom domain to a Node.js application](https://www.hostinger.com/support/how-to-connect-a-custom-domain-to-a-node-js-application/)
- [Cloudflare: Create subdomain records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-subdomain/)

## Tutorial video limit deployment on September 11, 2026

Commit `6e89c7f949a3ae2ae546ba88c2b41be9f7f62482` was pushed to `main`
and verified live at `https://support.gascompsuperlock.com` at 09:28 UTC.
The production admin displays the 150 MB tutorial upload limit; desktop browser
checks reported no JavaScript errors and the mobile layout had no horizontal
overflow. An authenticated upload authorization request for 157,286,401 bytes
returned HTTP 400 with the new 150 MB validation message. The isolated release
passed lint, typecheck, all 31 Node tests, and the production build.

Storage is still blocked separately: Supabase rejected the bucket-limit increase
with HTTP 413, and a subsequent read confirmed the existing 52,428,800-byte limit.
Uploads above 50 MB remain unavailable until the project-wide Storage limit and
bucket limit can be raised. See [Supabase storage](../integrations/supabase.md#tutorial-upload-limit-increase).
The verification report is stored locally at
`.data/video-limit-deployment/production-verification.json`.

### Restore the supported 50 MB limit

At the user's request, commit `0830ac5` restores the tutorial upload limit to
50 MB (52,428,800 bytes) and removes the unapplied bucket-limit increase migration.
It passed lint, typecheck, all 33 Node tests, and the production build before
being pushed to `main`. The production upload endpoint was verified to reject
52,428,801 bytes with HTTP 400 and the 50 MB validation message. Supabase's
`product-videos` bucket was independently verified at 52,428,800 bytes.
This supersedes the earlier 150 MB application rollout; no Storage increase
or plan upgrade is needed.

## Hero release and duplicate deployment targets on September 11, 2026

The intended automatic release path is GitHub repository
`gascomsuperlock-glitch/Gascomp`, branch `main`, to
`support.gascompsuperlock.com`.

Commit `38660e4ee07a47833bec4b123d994f3d0eeac547` contains the brand-guideline
hero redesign. The push triggered Git builds for both support hostnames at
09:42:14 UTC. The `bantuan` build completed, while the `support` build failed
after four seconds and returned no build log. Hostinger reports that both
Node.js website records share the document root `public_html/bantuan`.
The shared directory and duplicate triggers are confirmed; the API results
do not establish the exact cause of the failed Git build.

A source archive from the same commit was explicitly deployed to `support`.
Build `01a08fdb-1a04-71ec-be8f-a3fb349aaf50` completed at 09:46:13 UTC.
This manual release does not repair the GitHub auto-deployment mapping.

The website-level GitHub connection must be reviewed in hPanel so that only
`support` receives releases from this repository. The available Hostinger
hosting API exposes builds and build settings, but no operation to change
or disconnect a website's GitHub repository. Do not delete either website
as a connection-reset workaround: both records currently share application
files. Preserve the legacy hostname's redirect and existing public paths.

## Warranty video limit deployment on September 11, 2026

Commit `7e6c99d` was deployed and verified on the production claim form.
Warranty videos now allow up to 50 MB, matching the private `warranty-evidence`
bucket. Videos of 1 MB and 23 MB are accepted; nonempty smaller videos remain
allowed. The request limit is 72 MB to cover all evidence and multipart overhead.

Complete local claims passed with playable synthetic 1 MB, 23 MB, and 50 MB
videos, including a 70 MB combined-evidence request. Production transport and
size validation passed for the same sizes using an intentionally invalid name
to prevent ticket creation. A synthetic 23 MB video was also uploaded to private
production Storage, its recorded size checked, and the test object removed.
Desktop/mobile checks had no JavaScript errors or horizontal overflow. Lint,
typecheck, all 34 Node tests, and the production build passed. Verification is
recorded locally in `.data/warranty-video-limit/production-verification.json`.


## GascompCare release to an existing site

The repository's application commands are `npm run build` (`next build --webpack`)
and `npm run start` (`next start`). Neither command applies a database migration,
resets Supabase, imports fixtures, or uploads Storage objects. There is currently
no `.github` workflow directory in this checkout. This does not verify external
Hostinger/GitHub deployment settings, which can run commands outside the repository.

Before an authorized release:

1. Inspect the hosting deployment target, branch, build/start commands, and any
   pre/post-deploy hooks. Confirm that the intended existing Supabase project and
   server-only credentials remain configured. Preserve the existing public domain,
   product QR paths, Storage buckets, and customer data. Resolve the previously
   documented duplicate deployment targets before assuming a push has one target.
2. Follow the [Supabase preservation procedure](../../setup/supabase.md#preserve-existing-production-data-when-adding-gascompcare):
   verify independent database and Storage-file backups, inspect the installed
   schema, and obtain specific approval before applying only the missing additive
   Care migration. Do not add database reset, full-schema replacement, or local
   fixture import to an automatic build or startup hook.
3. Keep local preview configuration and fictional accounts out of the production
   environment. Do not enable `GASCOMP_LOCAL_HTTP_PREVIEW` on the hosting service.
   Production customer and administrator cookies must keep their HTTPS protection.
4. Run repository verification and deploy the reviewed application revision only
   when authorized. If the Care migration is absent, Care must show its unavailable
   state rather than creating a schema or fake member data during startup.
5. Compare private before/after data baselines, check existing catalog pages,
   product images and printed-QR destinations, and verify that private warranty
   evidence remains protected. Validate Care login and password rotation in staging;
   any production account creation or test claim needs explicit authorization.
6. If the application needs rollback, restore the previous application revision
   and retain the additive Care schema and member records. Do not delete tables,
   restore an old database over live writes, or remove Storage files as an app rollback.

Local tests establish that the Care migration preserves seeded existing rows and
fails safely on an already-existing Care table. They do not establish that remote
backups, deployment hooks, project credentials, or migration history are correct.
No production migration, push, deployment, or hosting change is authorized by this
preparation alone.


### GascompCare release preparation on September 15, 2026

The owner authorized a GitHub push and Hostinger deployment. The reviewed release
includes Care account management, mandatory password replacement with an
8-character minimum, member cards, public navigation, and the existing mobile
admin improvements. Care purchases and entitlement activation remain deferred.
Lint, typecheck, all 117 Node tests (including SQL), and the production build
passed. Chromium and WebKit verified member creation, an eight-character password
replacement, session persistence, logout, and subsequent login locally.

The additive Care migration was applied and existing data preservation verified;
see [Supabase integration](../integrations/supabase.md#gascompcare-member-accounts).
Local preview variables, fictional members, backups, and credentials remain
outside the release. Initial production checks found the home and warranty pages
available and `/gascomp-care/login` returning 404. The available GitHub API
reported no repository webhooks, Actions runs, deployment records, or commit
statuses establishing the Hostinger release mapping. Hostinger hosting access
was not connected in this session; a successful push alone must not be reported
as a verified hosting deployment.


### Coverage, claim confirmation, and deletion release

The owner authorized the next GitHub push and Hostinger deployment. The release
adds customer remaining-claim/expiry views, administrator purchase records and
Confirm Claim, member selection, and single/bulk soft deletion. It passed lint,
typecheck, all 147 Node tests, production build, and local browser workflows,
including confirmation limits, deletion retries, access revocation, history
preservation, and mobile layouts.

Both new database migrations (`202609150004` and `202609150005`) are applied;
existing data preservation is recorded in the
[Supabase specification](../integrations/supabase.md#gascompcare-member-deletion).
No fixture accounts or purchases were copied to production. Hostinger hosting
access was still unavailable in this session; the plugin search found only
Hostinger Mail for that provider. A push is not proof of hosting deployment.

### Service Center release on September 16, 2026

The owner authorized pushing the Service Center directory, interactive map,
administrator location management, and Google Maps link import without an API
key to `main`, and confirmed that Hostinger automatic deployment is configured.
The release targets the existing `support.gascompsuperlock.com` application.
Lint, typecheck, the production build, and 146 Node tests passed; three unrelated
optional tests were skipped. Local browser checks covered real Google Maps
imports, explicit field replacement, stale responses, database persistence,
administrator authentication, and mobile layout without horizontal overflow.

The additive migration `202609160001` is already applied. The release readiness
query confirmed zero service center rows, enabled RLS, and no table read access
for `anon` or `authenticated`. No migration or fixture import is required during
deployment. Administrators populate locations after release.

Hostinger hosting tools are unavailable in this session, so provider build
settings and logs cannot be inspected directly. The GitHub API exposes no
repository hooks, Actions runs, or deployment records for the current mapping.
Verify the public route after the push before reporting the release as live.
