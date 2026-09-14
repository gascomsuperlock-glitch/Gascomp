# Product catalog and help

[Specification index](../spec.md)

## Customer flow

From the home page, a customer searches by product name, model, or SKU, chooses a product, and opens its help page. A printed QR code opens the same per-product page directly. Customers do not need an account.

The home page and product help page provide a visible language selector with Indonesian and English options. The selected language applies to customer-facing navigation, help content, FAQs, forms, support actions, and accessibility labels where translations are available. The preference is persisted for later visits; English is used when no preference or translation exists.

The customer confirms the product image, name, and SKU, then watches tutorials or reads issue guides and FAQs. WhatsApp support and a warranty-claim action remain available when self-service content does not resolve the issue.

If a product or tutorial is unavailable, the page presents a clear empty state and a support path. Draft products stay private. Archived products are removed from the catalog but remain accessible by their stable URL for existing QR codes.

## Product help page

| Section | Content |
| --- | --- |
| Product identity | Primary image, gallery, name, model, and SKU |
| Primary actions | Tutorial and troubleshooting shortcuts |
| Usage tutorials | YouTube, Google Drive, TikTok, or uploaded video files |
| Issue-based help | Model-specific issue summaries, steps, and warnings |
| FAQs | Common questions and verified answers |
| Support | WhatsApp, Warranty Claim, Gascomp Care, and Service Center |

Content is available in clear Indonesian and English and remains specific to each model. Technical troubleshooting must be verified by the Gascomp team and must identify when a customer should stop and contact support.

The public **What is happening?** section lists the issue guides entered for that product in the admin **Issues** editor. Opening a guide reveals its ordered troubleshooting steps, optional safety warning, and a contextual WhatsApp support action. When a product has no issue guides, the section shows an explicit localized empty state instead of blank space.

Short product descriptions may be sourced from the verified Gascomp brochure and matched to existing admin products by SKU. A brochure import updates only the `description` field; it does not create products or change names, status, images, tutorials, issue guides, FAQs, or source identity. Explicit catalog aliases may cover formatting differences and documented model variants.

Import result on September 11, 2026: 21 existing admin products received short descriptions from the 2026 brochure. The mapping contains 13 exact SKU matches, two formatting-normalized matches, two verified catalog aliases, and four documented catalog variants. The other 40 brochure SKUs were absent from the current admin catalog and were not created. Database verification confirmed that no product field other than `description` changed.

Priority issue families include products that do not turn on, flame adjustment, and regulators that do not lock. These categories guide content preparation; they do not authorize unverified repair advice.

## Tutorial videos

- Administrators add HTTPS YouTube, Google Drive, TikTok, or direct MP4/WebM URLs, or upload MP4/WebM files up to 50 MB each (52,428,800 bytes).
- One product may have multiple tutorials. Existing YouTube tutorials remain compatible.
- YouTube, Google Drive, and full TikTok video links use embedded players; direct and uploaded files use native browser controls with inline mobile playback. Players do not autoplay.
- Google Drive files must allow anyone with the link to view them; resource keys are preserved. Providers may restrict playback or require third-party cookies. Every recognized source includes an **Open original video** fallback.
- TikTok short share links open the provider page. Use the full `/@user/video/` link for an embedded preview.
- Admin preview uses the same player as the public product page, including loading, invalid-source, and native playback error states.
- Choosing a new MP4/WebM file creates four thumbnail choices from frames inside that video before any upload begins. The administrator selects one frame; the selected browser-generated WebP, JPEG, or PNG thumbnail and video are then uploaded together. Existing uploaded tutorials can generate a new set of frame choices without re-uploading the video.
- The selected thumbnail appears in the admin video order, the customer tutorial list, and as the native video player's poster. A newly uploaded video is not staged in product content until both the video and selected thumbnail finish uploading.
- Manual videos go directly to the public `product-videos` bucket and selected thumbnails go to the public `product-images` bucket using signed upload URLs issued after checking the admin session and request origin. New products must be saved before upload. Only the completed video and thumbnail URLs are staged in the editor; select **Save** to attach them to the product. Cancelling or removing a tutorial can leave an unreferenced upload; unused-file cleanup is an administrative operation.
- Local-only mode supports video links; file uploads require Supabase. Uploaded tutorial files are public, including before their product is published.

Provider references: [TikTok embed player](https://developers.tiktok.com/docs/en/embed-player), [Google Drive sharing](https://support.google.com/drive/answer/2494822?hl=en), and [Supabase signed uploads](https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl).

Status: the catalog, search, product pages, image gallery, tutorials, issue guides, FAQs, support actions, and persisted Indonesian/English interface selector are implemented. Product-authored content uses its stored language until localized content fields are available.
