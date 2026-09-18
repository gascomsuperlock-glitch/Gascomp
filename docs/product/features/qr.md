# Product QR codes and URLs

[Specification index](../spec.md)

- Every product SKU has a distinct QR code that points to its Gascomp help page.
- Each product row in the admin overview opens that product's **Product QR** tab directly. The card shows the product name, SKU, stable help URL, and PNG download.
- Switching products clears the previous QR image before generating the next one. Downloads stay disabled while generation is pending or fails; failures offer a retry action.
- QR images include a four-module quiet zone. Draft products show a reminder to publish and save before distribution, and administrators should verify the destination before printing.
- Administrators can download the QR code as PNG for product or packaging use.
- The preview and downloaded PNG include the official Gascomp wordmark in the center on a white backing. The wordmark keeps its aspect ratio at 26% of the image width, with padding of 1.25% on each side; generation retains level H error correction and the four-module quiet zone. Logo loading failures use the existing generation error/retry state.
- QR codes use the HTTPS origin configured in `GASCOMP_PUBLIC_BASE_URL`; localhost QR generation is disabled.
- A product page URL remains stable when tutorials, FAQs, images, or issue guides change.
- Products that are no longer sold remain available at the same URL after archiving so older printed QR codes keep working.
- Existing Indonesian route segments remain unchanged as compatibility contracts.

The production hostname is `support.gascompsuperlock.com`. Verify its deployment,
DNS, and HTTPS before printing QR codes. Preserve old links with a redirect from
`bantuan.gascompsuperlock.com`; see the [deployment guide](../operations/deployment.md).

## Centered logo decision

Recorded: 2026-09-18. The owner explicitly requested a centered logo after discussing
scan reliability; placing it outside the QR does not meet that request. The existing
official wordmark is the implementation choice. Acceptance requires the logo in both
the preview and downloaded PNG, with unchanged product destinations and successful
digital decoding. Error correction is not a guarantee of physical scan reliability:
check printed samples at the intended size on multiple phones before distribution.
