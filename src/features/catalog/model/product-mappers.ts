import type { Product, ProductTone } from "@/features/catalog/model/types";

export type Row = Record<string, unknown>;

export function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function statusFromProduct(product: Product) {
  if (product.archived && product.everPublished) return "archived";
  return product.published ? "published" : "draft";
}

export function mapProduct(
  row: Row,
  variations: Row[],
  images: Row[],
  videos: Row[],
  issues: Row[],
  faqs: Row[],
): Product {
  const status = text(row.status, "draft");
  return {
    id: text(row.id),
    slug: text(row.slug),
    sku: text(row.sku),
    name: text(row.name),
    model: text(row.model),
    description: text(row.description),
    tone: text(row.tone, "orange") as ProductTone,
    published: status === "published",
    archived: status === "archived",
    everPublished: Boolean(row.ever_published),
    attributes: jsonArray(row.attributes),
    source: row.source_provider === "duoke" || row.source_provider === "warehouse-xlsx" ? {
      provider: row.source_provider,
      productId: text(row.source_product_id),
      storeId: text(row.source_store_id) || undefined,
      syncedAt: text(row.source_synced_at) || undefined,
    } : undefined,
    variations: variations
      .filter((item) => item.product_id === row.id)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((item) => ({
        id: text(item.id),
        name: text(item.name),
        sku: text(item.sku),
        sourceId: text(item.source_variation_id) || undefined,
        attributes: jsonArray(item.attributes),
      })),
    images: images
      .filter((item) => item.product_id === row.id)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((item) => ({
        id: text(item.id),
        name: text(item.name),
        url: text(item.public_url),
        storagePath: text(item.storage_path),
        alt: text(item.alt),
        variationId: text(item.variation_id) || undefined,
        isPrimary: Boolean(item.is_primary),
      })),
    videos: videos
      .filter((item) => item.product_id === row.id)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((item) => ({
        id: text(item.id),
        title: text(item.title),
        description: text(item.description),
        youtubeUrl: text(item.youtube_url),
        duration: text(item.duration),
      })),
    issues: issues
      .filter((item) => item.product_id === row.id)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((item) => ({
        id: text(item.id),
        title: text(item.title),
        summary: text(item.summary),
        steps: jsonArray<string>(item.steps),
        warning: text(item.warning) || undefined,
      })),
    faqs: faqs
      .filter((item) => item.product_id === row.id)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((item) => ({
        id: text(item.id),
        question: text(item.question),
        answer: text(item.answer),
      })),
  };
}
