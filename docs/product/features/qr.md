# Product QR codes and URLs

[Specification index](../spec.md)

- Every product SKU has a distinct QR code that points to its Gascomp help page.
- Each product row in the admin overview opens that product's **Product QR** tab directly. The card shows the product name, SKU, stable help URL, and PNG download.
- Switching products clears the previous QR image before generating the next one. Downloads stay disabled while generation is pending or fails; failures offer a retry action.
- QR images include a four-module quiet zone. Draft products show a reminder to publish and save before distribution, and administrators should verify the destination before printing.
- Administrators can download the QR code as PNG for product or packaging use.
- Product QR previews and downloaded PNGs remain plain, without a centered logo. They retain level H error correction and the four-module quiet zone. Existing product destinations and previously exported QR files remain unchanged.
- A separate, single homepage QR points to exactly `https://support.gascompsuperlock.com`. Only this QR includes the official centered Gascomp wordmark on white backing, at 26% of the image width with 1.25% padding and its original aspect ratio. It is a standalone PNG export, not a replacement for product QR codes.
- QR codes use the HTTPS origin configured in `GASCOMP_PUBLIC_BASE_URL`; localhost QR generation is disabled.
- A product page URL remains stable when tutorials, FAQs, images, or issue guides change.
- Products that are no longer sold remain available at the same URL after archiving so older printed QR codes keep working.
- Existing Indonesian route segments remain unchanged as compatibility contracts.

The production hostname is `support.gascompsuperlock.com`. Verify its deployment,
DNS, and HTTPS before printing QR codes. Preserve old links with a redirect from
`bantuan.gascompsuperlock.com`; see the [deployment guide](../operations/deployment.md).

## Centered logo decision

Corrected: 2026-09-18. After requesting one separate homepage QR and preserving
existing product QRs, the owner clarified that the centered logo is only for the QR
pointing to `https://support.gascompsuperlock.com`. This supersedes the earlier
implementation that added the logo to every product QR. No additional reason was
stated. Acceptance: product previews/downloads contain no logo and retain their
product URLs; the standalone homepage PNG retains its logo and decodes to the exact
homepage URL. Existing printed codes and saved exports are not modified or deleted.
Error correction is not a guarantee of physical scan reliability: check printed
samples at the intended size on multiple phones before distribution.
