import type { SiteContent } from "./types";

const LEGACY_SAMPLE_IDS = new Set(["product-adjuster", "product-lock", "product-ignition"]);

function translateLegacyDefaults(product: SiteContent["products"][number]) {
  const originalName = product.name;
  const name = !product.source && originalName === "Produk Baru" ? "New Product" : originalName;
  return {
    ...product,
    name,
    model: !product.source && product.model === "Nama model" ? "Model name" : product.model,
    description: !product.source && product.description === "Tambahkan ringkasan bantuan untuk produk ini."
      ? "Add a short support summary for this product."
      : product.description,
    variations: (product.variations ?? []).map((variation) => ({
      ...variation,
      name: variation.name === "Variasi baru" ? "New variation" : variation.name,
    })),
    images: (product.images ?? []).map((image) => ({
      ...image,
      alt: image.alt === `Foto ${originalName}` ? `Photo of ${name}` : image.alt,
    })),
    videos: (product.videos ?? []).map((video) => ({
      ...video,
      title: video.title === "Tutorial baru" ? "New tutorial" : video.title,
    })),
    faqs: (product.faqs ?? []).map((faq) => ({
      ...faq,
      question: faq.question === "Pertanyaan baru" ? "New question" : faq.question,
      answer: faq.answer === "Tuliskan jawaban untuk pelanggan." ? "Write an answer for the customer." : faq.answer,
    })),
  };
}

export function migrateContent(parsed: SiteContent, defaults: SiteContent): SiteContent {
  const migratedProducts = parsed.products
    .filter((product) => !LEGACY_SAMPLE_IDS.has(product.id))
    .map((product) => {
      const translated = translateLegacyDefaults(product);
      return {
        ...translated,
        sku: product.sku ?? product.slug.toUpperCase(),
        archived: product.archived ?? false,
        everPublished: product.everPublished ?? product.published ?? false,
        variations: translated.variations,
        images: translated.images,
      };
    });
  const mergedProducts = [...migratedProducts];

  for (const importedProduct of defaults.products) {
    const existingIndex = mergedProducts.findIndex((product) =>
      product.source?.provider === "duoke" &&
      product.source.productId === importedProduct.source?.productId &&
      product.source.storeId === importedProduct.source?.storeId,
    );

    if (existingIndex === -1) {
      mergedProducts.push(importedProduct);
      continue;
    }

    const existing = mergedProducts[existingIndex];
    mergedProducts[existingIndex] = {
      ...existing,
      sku: importedProduct.sku,
      name: importedProduct.name,
      model: importedProduct.model,
      description: importedProduct.description,
      variations: importedProduct.variations,
      attributes: importedProduct.attributes,
      source: importedProduct.source,
    };
  }

  return {
    ...parsed,
    supportHours: parsed.supportHours === "Senin–Sabtu, 08.00–17.00 WIB"
      ? "Monday–Saturday, 08:00–17:00 WIB"
      : parsed.supportHours,
    products: mergedProducts,
  };
}
