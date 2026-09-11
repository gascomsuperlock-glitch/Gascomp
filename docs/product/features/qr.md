# Product QR codes and URLs

[Specification index](../spec.md)

- Every product SKU has a distinct QR code that points to its Gascomp help page.
- Each product row in the admin overview opens that product's **Product QR** tab directly. The card shows the product name, SKU, stable help URL, and PNG download.
- Switching products clears the previous QR image before generating the next one. Downloads stay disabled while generation is pending or fails; failures offer a retry action.
- QR images include a four-module quiet zone. Draft products show a reminder to publish and save before distribution, and administrators should verify the destination before printing.
- Administrators can download the QR code as PNG for product or packaging use.
- QR codes use the HTTPS origin configured in `GASCOMP_PUBLIC_BASE_URL`; localhost QR generation is disabled.
- A product page URL remains stable when tutorials, FAQs, images, or issue guides change.
- Products that are no longer sold remain available at the same URL after archiving so older printed QR codes keep working.
- Existing Indonesian route segments remain unchanged as compatibility contracts.

The production hostname is `support.gascompsuperlock.com`. Verify its deployment,
DNS, and HTTPS before printing QR codes. Preserve old links with a redirect from
`bantuan.gascompsuperlock.com`; see the [deployment guide](../operations/deployment.md).
