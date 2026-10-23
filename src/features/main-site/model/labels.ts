const labels: Record<string, [string, string]> = {
  "/": ["Beranda", "Home"],
  "/product/": ["Produk Gascomp", "Gascomp Products"],
  "/produk/": ["Produk Gascomp", "Gascomp Products"],
  "/shop/": ["Produk Gascomp", "Gascomp Products"],
  "/kontak/": ["Hubungi Kami", "Contact Us"],
  "/hubungi-kami/": ["Hubungi Kami", "Contact Us"],
  "/join-reseller/": ["Menjadi Reseller", "Become a Reseller"],
  "/join-gascomp/": ["Menjadi Reseller", "Become a Reseller"],
  "/about-us/": ["Tentang Kami", "About Us"],
  "/tentang-kami/": ["Tentang Kami", "About Us"],
  "/blog/": ["Artikel dan panduan", "Articles and Guides"],
  "/panduan-instalasi/": ["Edukasi dan panduan", "Learning and Guides"],
  "/privacy-policy-2/": ["Kebijakan Privasi", "Privacy Policy"],
  "/data-deletion/": ["Penghapusan Data", "Data Deletion"],
};
export function pageTitle(
  path: string,
  language: "id" | "en",
  fallback = "Gascomp",
) {
  return labels[path]?.[language === "id" ? 0 : 1] ?? fallback;
}
