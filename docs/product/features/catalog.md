# Product catalog and help

[Specification index](../spec.md)

## Customer flow

From the home page, a customer searches by product name, model, or SKU, chooses a product, and opens its help page. A printed QR code opens the same per-product page directly. Customers do not need an account.

The customer confirms the product image, name, and SKU, then watches tutorials or reads issue guides and FAQs. WhatsApp support and a warranty-claim action remain available when self-service content does not resolve the issue.

If a product or tutorial is unavailable, the page presents a clear empty state and a support path. Draft products stay private. Archived products are removed from the catalog but remain accessible by their stable URL for existing QR codes.

## Product help page

| Section | Content |
| --- | --- |
| Product identity | Primary image, gallery, name, model, and SKU |
| Primary actions | Tutorial and troubleshooting shortcuts |
| Usage tutorials | One or more embedded YouTube videos |
| Issue-based help | Model-specific issue summaries, steps, and warnings |
| FAQs | Common questions and verified answers |
| Support | WhatsApp, Warranty Claim, Gascomp Care, and Service Center |

Content uses clear English and remains specific to each model. Technical troubleshooting must be verified by the Gascomp team and must identify when a customer should stop and contact support.

Short product descriptions may be sourced from the verified Gascomp brochure and matched to existing admin products by SKU. A brochure import updates only the `description` field; it does not create products or change names, status, images, tutorials, issue guides, FAQs, or source identity. Explicit catalog aliases may cover formatting differences and documented model variants.

Import result on September 11, 2026: 21 existing admin products received short descriptions from the 2026 brochure. The mapping contains 13 exact SKU matches, two formatting-normalized matches, two verified catalog aliases, and four documented catalog variants. The other 40 brochure SKUs were absent from the current admin catalog and were not created. Database verification confirmed that no product field other than `description` changed.

Priority issue families include products that do not turn on, flame adjustment, and regulators that do not lock. These categories guide content preparation; they do not authorize unverified repair advice.

## Tutorial videos

- Administrators add YouTube URLs; the application does not host tutorial video files.
- One product may have multiple tutorials.
- Videos play in an embedded YouTube player on the Gascomp page.
- YouTube still owns the player and may display its standard branding and links.
- Admin preview allows the selected link and content to be checked before publication.

Status: the catalog, search, product pages, image gallery, tutorials, issue guides, FAQs, and support actions are implemented.
