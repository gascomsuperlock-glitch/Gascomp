import type { ProductImage, Product } from "@/features/catalog/model/types";

export function createSlug(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || `product-${Date.now()}`;
}

export function getPrimaryProductImage(product: Product) {
  return product.images.find((image) => image.isPrimary) ?? product.images[0];
}

export function getProductImageSource(image?: ProductImage) {
  return image?.url || image?.dataUrl || "";
}
