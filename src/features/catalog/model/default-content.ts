import duokeCatalogJson from "@data/catalog/duoke-products.json";
import type { ProductTone, SiteContent, DuokeCatalog } from "@/features/catalog/model/types";

export const duokeCatalog = duokeCatalogJson as DuokeCatalog;

export const tones: ProductTone[] = ["orange", "navy", "green"];

export const DEFAULT_CONTENT: SiteContent = {
  whatsappNumber: "6281234567890",
  supportHours: "Monday–Saturday, 08:00–17:00 WIB",
  products: duokeCatalog.products.map((product, index) => ({
    id: `duoke-${product.storeId ? `${product.storeId}-` : ""}${product.sourceProductId}`,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    model: product.model ?? "",
    description: product.description ?? "",
    tone: tones[index % tones.length],
    published: false,
    archived: false,
    everPublished: false,
    attributes: product.attributes,
    source: {
      provider: "duoke",
      productId: product.sourceProductId,
      storeId: product.storeId ?? undefined,
      syncedAt: duokeCatalog.syncedAt ?? undefined,
    },
    variations: product.variations.map((variation) => ({
      id: `duoke-variation-${product.sourceProductId}-${variation.sourceVariationId}`,
      sourceId: variation.sourceVariationId,
      name: variation.name,
      sku: variation.sku,
      attributes: variation.attributes,
    })),
    images: [],
    videos: [],
    issues: [],
    faqs: [],
  })),
};
