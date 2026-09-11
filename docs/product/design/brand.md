# Brand identity and public design

[Specification index](../spec.md)

The brand guide is stored in [Gascomp - Guidelines.pdf](<../../brand/Gascomp - Guidelines.pdf>). Brand documentation belongs in `docs/brand/`; assets used directly by the website remain in `public/`.

The visual reference is the [Gascomp Superlock website](https://gascompsuperlock.com/).

- Use the official logo, colors, and typography consistently.
- The current direction uses a navy wordmark, bright blue accents, generous white space, and pill-shaped controls.
- Replace temporary illustrations with approved logo and product-photo assets when those files are available.
- Preserve the agreed help flow: searchable catalog at the root URL and a product-specific help page opened by QR.
- Prioritize mobile use because many customers arrive by scanning packaging. Keep product identity, tutorial access, troubleshooting, and WhatsApp easy to reach.

## Home-page hero

The September 11, 2026 hero redesign follows the PDF's brand palette (printed page 6), A-shaped supergraphic (pages 5 and 9), and typography (page 13):

- Use a solid navy `#021B40` background, cyan `#31B4DD` accents, white headings, and a supporting `#044972` A-shaped motif.
- Set headings in Raleway and supporting text in Open Sans. Latin variable fonts and their OFL licenses are hosted in `public/fonts` and scoped to the hero; the rest of the site retains its existing typography.
- Use a two-column desktop layout and a stacked mobile layout, with a white three-step guide panel and a packaging QR reminder. Decorative graphics are hidden from assistive technology.
- Keep the primary product action and guide-selection steps linked to `#produk`; support actions use the configured WhatsApp number. The hero does not require catalog data or product photography to render.
- Limit this redesign to the hero. The shared header, catalog, help sections, and other routes retain their existing presentation.
