# Domain and deployment

[Specification index](../spec.md)

- Connect the Gascomp Help Center to `support.gascompsuperlock.com`, replacing `bantuan.gascompsuperlock.com` to follow the English language standard. Confirm the deployment target before changing DNS.
- The deployment needs a server runtime for admin authentication, Server Actions, Supabase access, and warranty claims.
- Configure production Supabase, admin-authentication, and `GASCOMP_PUBLIC_BASE_URL` environment variables in the application host.
- Enable HTTPS and verify customer pages, admin login, images, QR targets, claim submission, and private evidence access through the final domain.
- Preserve existing website and email services. Limit DNS changes to records required by the chosen hostname.
- Keep product help paths stable because printed QR codes depend on them.

Open decisions: available hosting services, application deployment target, deployment access, and Cloudflare DNS access.

## DNS diagnosis on September 11, 2026

The domain's published nameservers are `damien.ns.cloudflare.com` and
`kenia.ns.cloudflare.com`. Direct A queries to `damien.ns.cloudflare.com` and
queries through `1.1.1.1` returned `NXDOMAIN` for both support hostnames.
Neither hostname exists in the active DNS zone at the time of the check.
Creating a subdomain in Hostinger alone does not publish it in this
Cloudflare-managed zone. DNS failure prevents checking hosting and HTTPS;
their state is still unknown.

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

## Legacy links

`next.config.ts` issues HTTP 308 redirects from the exact
`bantuan.gascompsuperlock.com` hostname to `https://support.gascompsuperlock.com`,
preserving paths and query parameters. Existing route segments such as
`/produk/[slug]` remain stable. Verify an old product URL redirects to its new
equivalent after both hostnames are connected.

## Status

The environment example, application redirect, and deployment instructions are
prepared locally. No production environment, DNS, hosting, or certificate
settings were changed. Hosting target details and account access are needed to
complete deployment and verify the live site.

## Provider references

- [Hostinger: Connect a custom domain to a Node.js application](https://www.hostinger.com/support/how-to-connect-a-custom-domain-to-a-node-js-application/)
- [Cloudflare: Create subdomain records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-subdomain/)
