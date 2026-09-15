# Brand identity and public design

[Specification index](../spec.md)

The brand guide is stored in [Gascomp - Guidelines.pdf](<../../brand/Gascomp - Guidelines.pdf>). Brand documentation belongs in `docs/brand/`; assets used directly by the website remain in `public/`.

The visual reference is the [Gascomp Superlock website](https://gascompsuperlock.com/).

- Use the official logo, colors, and typography consistently.
- Browser icons use the official A-shaped supergraphic described on printed pages 2 and 5 of the brand guide, in white on Gascomp navy `#021B40`. `src/app/icon.svg` supplies the scalable icon, and `src/app/favicon.ico` provides 16, 32, and 48 pixel fallbacks with the same design.
- The current direction uses the official navy wordmark, saturated Gascomp blue, cyan, generous spacing, and pill-shaped controls. The September 14, 2026 update adds lime-yellow and coral accents following the owner’s preference for a bold, colorful website.
- Replace temporary illustrations with approved logo and product-photo assets when those files are available.
- Preserve the agreed help flow: searchable catalog at the root URL and a product-specific help page opened by QR.
- Prioritize mobile use because many customers arrive by scanning packaging. Keep product identity, tutorial access, troubleshooting, and WhatsApp easy to reach.

## Public home-page design

The September 14, 2026 redesign covers the home page and shared public header:

- Use Gascomp blue `#0035B9` for the hero, navy `#021B40` for text and the contact section, cyan `#31B4DD`, lime-yellow `#DAEF69`, coral `#FFB39D`, and warm off-white `#FFFDF7` surfaces.
- Keep the official logo. The hero uses locally hosted Raleway headings and Open Sans supporting text; the rest of the site retains Manrope. Existing font files and licenses remain in `public/fonts`.
- Use large, expressive headings, a tilted guide illustration built from HTML/CSS, a QR reminder, colorful help cards, and clear product cards. Decorative graphics remain hidden from assistive technology.
- Keep product selection as the primary action. Quick links lead to product guides, warranty support, and contact details. Preserve `#produk`, `#bantuan`, `#hubungi`, product URLs, and the configured WhatsApp destination.
- Keep the catalog searchable by name, model, and SKU. Provide a labeled search, a result announcement, a clear-search action, and support links when no results or published guides are available.
- Stack content on mobile. Keep visible keyboard focus, a skip link, touch-friendly actions, readable contrast, and reduced-motion support. Product cards use content visibility to limit rendering work for large catalogs.
- The admin dashboard retains its own design system. Public product-help and warranty forms retain their existing layouts.
