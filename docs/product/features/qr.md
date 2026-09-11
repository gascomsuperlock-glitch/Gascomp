# Product QR codes and URLs

[Specification index](../spec.md)

- Every product SKU has a distinct QR code that points to its Gascomp help page.
- Administrators can download the QR code as PNG for product or packaging use.
- QR codes use the HTTPS origin configured in `GASCOMP_PUBLIC_BASE_URL`; localhost QR generation is disabled.
- A product page URL remains stable when tutorials, FAQs, images, or issue guides change.
- Products that are no longer sold remain available at the same URL after archiving so older printed QR codes keep working.
- Existing Indonesian route segments remain unchanged as compatibility contracts.

The production hostname is `support.gascompsuperlock.com`. Verify its deployment,
DNS, and HTTPS before printing QR codes. Preserve old links with a redirect from
`bantuan.gascompsuperlock.com`; see the [deployment guide](../operations/deployment.md).
