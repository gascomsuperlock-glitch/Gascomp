import type { Product } from "./types";

export type BulkProductStatus = "published" | "archived";

export function canChangeProductStatus(product: Product, status: BulkProductStatus) {
  if (status === "published") return !product.published || product.archived;
  return product.everPublished && !product.archived;
}

export function updateBulkProductStatus(products: Product[], productIds: ReadonlySet<string>, status: BulkProductStatus): Product[] {
  return products.map((product) => {
    if (!productIds.has(product.id) || !canChangeProductStatus(product, status)) return product;
    return {
      ...product,
      published: status === "published",
      archived: status === "archived",
      everPublished: product.everPublished || status === "published",
    };
  });
}
