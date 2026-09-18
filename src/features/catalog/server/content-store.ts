import "server-only";
import { isDeepStrictEqual } from "node:util";
import { DEFAULT_CONTENT } from "@/features/catalog/model/default-content";
import type { Product, SiteContent } from "@/features/catalog/model/types";
import { createAdminSupabaseClient, createPublicSupabaseClient, isSupabaseConfigured } from "@/shared/integrations/supabase/server";
import { jsonArray, type Row, text, statusFromProduct, mapProduct } from "@/features/catalog/model/product-mappers";

import { videoRecords } from "@/features/catalog/model/video-records";
import { getVideoUrl, parseVideoSource } from "@/features/catalog/model/video-source";

import { uploadNewImages } from "@/features/catalog/server/product-images";
import { applyContentChanges, isContentChanges, type ContentSaveInput } from "@/features/catalog/model/content-changes";

export type StorageMode = "local" | "supabase" | "static";

export type LoadedSiteContent = {
  content: SiteContent;
  storageMode: StorageMode;
  error?: string;
};

type CatalogRows = {
  settings: Row | null;
  products: Row[];
  variations: Row[];
  images: Row[];
  videos: Row[];
  issues: Row[];
  faqs: Row[];
};

type AdminSaveSnapshot = {
  content: SiteContent;
  extendedVideoSchema: boolean;
  thumbnailSchema: boolean;
};

function contentFromRows(rows: CatalogRows, includeDrafts: boolean): SiteContent {
  const productRows = rows.products.filter((product) => includeDrafts || product.status === "published" || (product.status === "archived" && product.ever_published === true));
  return {
    whatsappNumber: text(rows.settings?.whatsapp_number, DEFAULT_CONTENT.whatsappNumber),
    supportHours: text(rows.settings?.support_hours, DEFAULT_CONTENT.supportHours),
    products: productRows.map((product) => mapProduct(product, rows.variations, rows.images, rows.videos, rows.issues, rows.faqs)),
  };
}

export async function loadFromSupabase(includeDrafts: boolean): Promise<SiteContent> {
  const client = includeDrafts
    ? createAdminSupabaseClient()
    : createPublicSupabaseClient() ?? createAdminSupabaseClient();
  if (!client) throw new Error("Supabase configuration is incomplete.");

  let productsQuery = client.from("products").select("*").order("created_at", { ascending: true });
  if (!includeDrafts) productsQuery = productsQuery.in("status", ["published", "archived"]);

  const [settingsResult, productsResult, variationsResult, imagesResult, videosResult, issuesResult, faqsResult] = await Promise.all([
    client.from("site_settings").select("*").eq("id", true).maybeSingle(),
    productsQuery,
    client.from("product_variations").select("*").order("position"),
    client.from("product_images").select("*").order("position"),
    client.from("tutorial_videos").select("*").order("position"),
    client.from("product_issues").select("*").order("position"),
    client.from("faq_items").select("*").order("position"),
  ]);

  const firstError = [settingsResult, productsResult, variationsResult, imagesResult, videosResult, issuesResult, faqsResult]
    .find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return contentFromRows({
    settings: settingsResult.data as Row | null,
    products: (productsResult.data ?? []) as Row[],
    variations: (variationsResult.data ?? []) as Row[],
    images: (imagesResult.data ?? []) as Row[],
    videos: (videosResult.data ?? []) as Row[],
    issues: (issuesResult.data ?? []) as Row[],
    faqs: (faqsResult.data ?? []) as Row[],
  }, includeDrafts);
}

export async function loadPublicSiteContent(): Promise<LoadedSiteContent> {
  if (!isSupabaseConfigured()) return { content: DEFAULT_CONTENT, storageMode: "local" };
  try {
    return { content: await loadFromSupabase(false), storageMode: "static" };
  } catch (error) {
    console.error("Supabase public content load failed", error);
    return { content: DEFAULT_CONTENT, storageMode: "local", error: "Supabase is unavailable; the website is using local data." };
  }
}

export async function loadAdminSiteContent(): Promise<LoadedSiteContent> {
  if (!isSupabaseConfigured()) return { content: DEFAULT_CONTENT, storageMode: "local" };
  try {
    return { content: await loadFromSupabase(true), storageMode: "supabase" };
  } catch (error) {
    console.error("Supabase admin content load failed", error);
    return { content: DEFAULT_CONTENT, storageMode: "local", error: "The Supabase connection failed. Temporary changes are stored in this browser." };
  }
}

export function assertContent(content: SiteContent) {
  if (!content || !Array.isArray(content.products) || content.products.length > 5000) throw new Error("Content data is invalid.");
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const product of content.products) {
    if (!product.id || !product.slug || !product.sku || !product.name) throw new Error("A product is missing required identity fields.");
    if (ids.has(product.id) || slugs.has(product.slug)) throw new Error("A product ID or URL is duplicated.");
    if (product.images.length > 6 || product.videos.length > 50 || product.faqs.length > 100) throw new Error(`Content for ${product.sku} exceeds the allowed limits.`);
    for (const video of product.videos) {
      const url = getVideoUrl(video);
      if (url && !parseVideoSource(url)) throw new Error(`A tutorial for ${product.sku} has an unsupported video URL.`);
    }
    ids.add(product.id);
    slugs.add(product.slug);
  }
}

export function throwOnError(result: { error: unknown }) {
  if (result.error) throw result.error;
}

export async function runInBatches<T>(
  items: T[],
  size: number,
  operation: (batch: T[]) => PromiseLike<{ error: unknown }>,
) {
  for (let index = 0; index < items.length; index += size) {
    throwOnError(await operation(items.slice(index, index + size)));
  }
}

function comparableProduct(product: Product) {
  return JSON.parse(JSON.stringify({
    ...product,
    attributes: product.attributes ?? [],
    everPublished: product.everPublished || product.published,
    variations: product.variations.map((variation) => ({ ...variation, attributes: variation.attributes ?? [] })),
    videos: product.videos.map((video) => ({
      ...video,
      youtubeUrl: video.videoUrl ?? video.youtubeUrl ?? "",
      videoUrl: video.videoUrl ?? video.youtubeUrl ?? "",
    })),
    issues: product.issues.map((issue) => ({ ...issue, warning: issue.warning || undefined })),
  }));
}

function snapshotRows(value: unknown): CatalogRows | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Record<string, unknown>;
  const settings = snapshot.settings;
  if (settings !== null && (typeof settings !== "object" || Array.isArray(settings))) return null;
  for (const key of ["products", "variations", "images", "videos", "issues", "faqs"]) {
    if (!Array.isArray(snapshot[key])) return null;
  }
  return {
    settings: settings as Row | null,
    products: jsonArray<Row>(snapshot.products),
    variations: jsonArray<Row>(snapshot.variations),
    images: jsonArray<Row>(snapshot.images),
    videos: jsonArray<Row>(snapshot.videos),
    issues: jsonArray<Row>(snapshot.issues),
    faqs: jsonArray<Row>(snapshot.faqs),
  };
}

async function loadAdminSaveSnapshot(client: ReturnType<typeof createAdminSupabaseClient>): Promise<AdminSaveSnapshot> {
  if (!client) throw new Error("Supabase is not configured.");
  const snapshotResult = await client.rpc("catalog_admin_save_snapshot");
  if (!snapshotResult.error) {
    const rows = snapshotRows(snapshotResult.data);
    if (!rows) throw new Error("The catalog save snapshot is invalid.");
    const raw = snapshotResult.data as Record<string, unknown>;
    return {
      content: contentFromRows(rows, true),
      extendedVideoSchema: raw.extended_video_schema === true,
      thumbnailSchema: raw.thumbnail_schema === true,
    };
  }
  // Permit a rolling deployment before the additive snapshot migration reaches PostgREST.
  if (!["42883", "PGRST202"].includes(snapshotResult.error.code)) throw snapshotResult.error;
  const [content, videoSchema, thumbnailSchema] = await Promise.all([
    loadFromSupabase(true),
    client.from("tutorial_videos").select("video_url, storage_path").limit(0),
    client.from("tutorial_videos").select("thumbnail_url, thumbnail_storage_path").limit(0),
  ]);
  if (videoSchema.error && !["42703", "PGRST204"].includes(videoSchema.error.code)) throw videoSchema.error;
  if (thumbnailSchema.error && !["42703", "PGRST204"].includes(thumbnailSchema.error.code)) throw thumbnailSchema.error;
  return {
    content,
    extendedVideoSchema: !videoSchema.error,
    thumbnailSchema: !thumbnailSchema.error,
  };
}

export async function persistSiteContent(requested: ContentSaveInput): Promise<SiteContent> {
  const changes = isContentChanges(requested) ? requested : null;
  if (!changes) assertContent(requested as SiteContent);
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");

  // One protected RPC snapshot replaces nine independent HTTP reads on each Save.
  const snapshot = await loadAdminSaveSnapshot(client);
  const existingContent = snapshot.content;
  const input = changes ? applyContentChanges(existingContent, changes) : requested as SiteContent;
  assertContent(input);
  const extendedVideoSchema = snapshot.extendedVideoSchema;
  const hasThumbnailSchema = snapshot.thumbnailSchema;
  if (!hasThumbnailSchema && input.products.some((product) => product.videos.some((video) => video.thumbnailUrl || video.thumbnailStoragePath))) {
    throw new Error("Tutorial thumbnails cannot be saved until the tutorial thumbnail migration is applied.");
  }

  const existingProducts = existingContent.products;
  const existingById = new Map(existingProducts.map((product) => [product.id, product]));
  // Compare the JSON representation received by the browser, ignoring object key order
  // and optional undefined fields. Array order remains meaningful for help content.
  const changed = input.products.filter((product) => {
    const existing = existingById.get(product.id);
    return !existing || !isDeepStrictEqual(comparableProduct(product), comparableProduct(existing));
  });
  const uploaded = await uploadNewImages({ ...input, products: changed });
  const changedById = new Map(uploaded.products.map((product) => [product.id, product]));
  const content = { ...input, products: input.products.map((product) => changedById.get(product.id) ?? product) };
  const currentIds = new Set(content.products.map((product) => product.id));

  if (content.whatsappNumber !== existingContent.whatsappNumber || content.supportHours !== existingContent.supportHours) {
    throwOnError(await client.from("site_settings").upsert({
      id: true,
      whatsapp_number: content.whatsappNumber.slice(0, 30),
      support_hours: content.supportHours.slice(0, 160),
    }));
  }

  for (const oldProduct of existingProducts) {
    if (currentIds.has(oldProduct.id)) continue;
    if (oldProduct.everPublished) {
      throwOnError(await client.from("products").update({ status: "archived" }).eq("id", oldProduct.id));
    } else {
      throwOnError(await client.from("products").delete().eq("id", oldProduct.id));
    }
  }

  const productRows = uploaded.products.map((product) => ({
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      model: product.model,
      description: product.description,
      tone: product.tone,
      status: statusFromProduct(product),
      ever_published: product.everPublished || product.published,
      attributes: product.attributes ?? [],
      source_provider: product.source?.provider ?? null,
      source_product_id: product.source?.productId ?? null,
      source_store_id: product.source?.storeId ?? "",
      source_synced_at: product.source?.syncedAt ?? null,
    }));
  await runInBatches(productRows, 250, (batch) => client.from("products").upsert(batch));

  // New products have no child records to replace. Never rewrite an unchanged guide.
  const productIds = uploaded.products.filter((product) => existingById.has(product.id)).map((product) => product.id);
  for (const table of ["product_images", "product_variations", "tutorial_videos", "product_issues", "faq_items"] as const) {
    await runInBatches(productIds, 250, (batch) => client.from(table).delete().in("product_id", batch));
  }

  const variationRows = uploaded.products.flatMap((product) => product.variations.map((item, position) => ({ id: item.id, product_id: product.id, name: item.name, sku: item.sku, source_variation_id: item.sourceId ?? null, attributes: item.attributes ?? [], position })));
  const imageRows = uploaded.products.flatMap((product) => product.images.map((item, position) => ({ id: item.id, product_id: product.id, variation_id: item.variationId ?? null, name: item.name, storage_path: item.storagePath, public_url: item.url, alt: item.alt, is_primary: item.isPrimary, position })));
  const videoRows = videoRecords(uploaded.products, extendedVideoSchema, hasThumbnailSchema);
  const issueRows = uploaded.products.flatMap((product) => product.issues.map((item, position) => ({ id: item.id, product_id: product.id, title: item.title, summary: item.summary, steps: item.steps, warning: item.warning ?? null, position })));
  const faqRows = uploaded.products.flatMap((product) => product.faqs.map((item, position) => ({ id: item.id, product_id: product.id, question: item.question, answer: item.answer, position })));

  await runInBatches(variationRows, 500, (batch) => client.from("product_variations").insert(batch));
  await runInBatches(imageRows, 500, (batch) => client.from("product_images").insert(batch));
  await runInBatches(videoRows, 500, (batch) => client.from("tutorial_videos").insert(batch));
  await runInBatches(issueRows, 500, (batch) => client.from("product_issues").insert(batch));
  await runInBatches(faqRows, 500, (batch) => client.from("faq_items").insert(batch));

  const referencedPaths = new Set(content.products.flatMap((product) => product.images.map((image) => image.storagePath).filter(Boolean)));
  const replacedProducts = existingProducts.filter((product) => changedById.has(product.id) || (!currentIds.has(product.id) && !product.everPublished));
  const abandonedPaths = replacedProducts.flatMap((product) => product.images.map((image) => image.storagePath))
    .filter((path): path is string => Boolean(path) && !referencedPaths.has(path));
  if (abandonedPaths.length) {
    const removal = await client.storage.from("product-images").remove(abandonedPaths);
    if (removal.error) console.error("Unused product images could not be removed", removal.error);
  }

  const referencedThumbnailPaths = new Set(content.products.flatMap((product) => product.videos
    .map((video) => video.thumbnailStoragePath)
    .filter((path): path is string => Boolean(path))));
  const abandonedThumbnailPaths = replacedProducts.flatMap((product) => product.videos.map((video) => video.thumbnailStoragePath))
    .filter((item): item is string => typeof item === "string" && item.length > 0 && !referencedThumbnailPaths.has(item));
  if (abandonedThumbnailPaths.length) {
    const removal = await client.storage.from("product-images").remove(abandonedThumbnailPaths);
    if (removal.error) console.error("Unused tutorial thumbnails could not be removed", removal.error);
  }

  return content;
}

export async function getPublicProductBySlug(slug: string) {
  const loaded = await loadPublicSiteContent();
  return loaded.content.products.find((product) => product.slug === slug);
}
