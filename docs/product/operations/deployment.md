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

Warranty submissions require the executable supplied by the `ffmpeg-static`
dependency. Install dependencies on the deployment host with `npm ci` and allow
that package's installation script to download the binary for the host's OS and
architecture. Do not upload a macOS `node_modules` directory to Linux hosting.
Next.js keeps this package external and includes its executable in the warranty
route's file trace. The runtime must allow child processes and private temporary
files. Verify a valid short video and a damaged video after deployment; if the
decoder is missing or cannot execute, submission returns a field error and no
ticket is saved.

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
