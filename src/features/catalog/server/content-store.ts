import "server-only";
import { DEFAULT_CONTENT } from "@/features/catalog/model/default-content";
import type { SiteContent } from "@/features/catalog/model/types";
import { createAdminSupabaseClient, createPublicSupabaseClient, isSupabaseConfigured } from "@/shared/integrations/supabase/server";
import { type Row, text, statusFromProduct, mapProduct } from "@/features/catalog/model/product-mappers";

import { uploadNewImages } from "@/features/catalog/server/product-images";

export type StorageMode = "local" | "supabase" | "static";

export type LoadedSiteContent = {
  content: SiteContent;
  storageMode: StorageMode;
  error?: string;
};

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

  const productRows = ((productsResult.data ?? []) as Row[]).filter((product) => includeDrafts || product.status === "published" || (product.status === "archived" && product.ever_published === true));
  const settings = settingsResult.data as Row | null;
  return {
    whatsappNumber: text(settings?.whatsapp_number, DEFAULT_CONTENT.whatsappNumber),
    supportHours: text(settings?.support_hours, DEFAULT_CONTENT.supportHours),
    products: productRows.map((product) => mapProduct(
      product,
      (variationsResult.data ?? []) as Row[],
      (imagesResult.data ?? []) as Row[],
      (videosResult.data ?? []) as Row[],
      (issuesResult.data ?? []) as Row[],
      (faqsResult.data ?? []) as Row[],
    )),
  };
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

export async function persistSiteContent(input: SiteContent): Promise<SiteContent> {
  assertContent(input);
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");

  const existingProductsResult = await client.from("products").select("id, ever_published");
  const existingImagesResult = await client.from("product_images").select("storage_path");
  throwOnError(existingProductsResult);
  throwOnError(existingImagesResult);

  const content = await uploadNewImages(input);
  const currentIds = new Set(content.products.map((product) => product.id));
  const existingProducts = (existingProductsResult.data ?? []) as Array<{ id: string; ever_published: boolean }>;

  throwOnError(await client.from("site_settings").upsert({
    id: true,
    whatsapp_number: content.whatsappNumber.slice(0, 30),
    support_hours: content.supportHours.slice(0, 160),
  }));

  for (const oldProduct of existingProducts) {
    if (currentIds.has(oldProduct.id)) continue;
    if (oldProduct.ever_published) {
      throwOnError(await client.from("products").update({ status: "archived" }).eq("id", oldProduct.id));
    } else {
      throwOnError(await client.from("products").delete().eq("id", oldProduct.id));
    }
  }

  const productRows = content.products.map((product) => ({
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

  const productIds = content.products.map((product) => product.id);
  for (const table of ["product_images", "product_variations", "tutorial_videos", "product_issues", "faq_items"] as const) {
    await runInBatches(productIds, 250, (batch) => client.from(table).delete().in("product_id", batch));
  }

  const variationRows = content.products.flatMap((product) => product.variations.map((item, position) => ({ id: item.id, product_id: product.id, name: item.name, sku: item.sku, source_variation_id: item.sourceId ?? null, attributes: item.attributes ?? [], position })));
  const imageRows = content.products.flatMap((product) => product.images.map((item, position) => ({ id: item.id, product_id: product.id, variation_id: item.variationId ?? null, name: item.name, storage_path: item.storagePath, public_url: item.url, alt: item.alt, is_primary: item.isPrimary, position })));
  const videoRows = content.products.flatMap((product) => product.videos.map((item, position) => ({ id: item.id, product_id: product.id, title: item.title, description: item.description, youtube_url: item.youtubeUrl, duration: item.duration, position })));
  const issueRows = content.products.flatMap((product) => product.issues.map((item, position) => ({ id: item.id, product_id: product.id, title: item.title, summary: item.summary, steps: item.steps, warning: item.warning ?? null, position })));
  const faqRows = content.products.flatMap((product) => product.faqs.map((item, position) => ({ id: item.id, product_id: product.id, question: item.question, answer: item.answer, position })));

  await runInBatches(variationRows, 500, (batch) => client.from("product_variations").insert(batch));
  await runInBatches(imageRows, 500, (batch) => client.from("product_images").insert(batch));
  await runInBatches(videoRows, 500, (batch) => client.from("tutorial_videos").insert(batch));
  await runInBatches(issueRows, 500, (batch) => client.from("product_issues").insert(batch));
  await runInBatches(faqRows, 500, (batch) => client.from("faq_items").insert(batch));

  const referencedPaths = new Set(content.products.flatMap((product) => product.images.map((image) => image.storagePath).filter(Boolean)));
  const abandonedPaths = ((existingImagesResult.data ?? []) as Array<{ storage_path: string }>).map((item) => item.storage_path).filter((item) => item && !referencedPaths.has(item));
  if (abandonedPaths.length) {
    const removal = await client.storage.from("product-images").remove(abandonedPaths);
    if (removal.error) console.error("Unused product images could not be removed", removal.error);
  }

  return content;
}

export async function getPublicProductBySlug(slug: string) {
  const loaded = await loadPublicSiteContent();
  return loaded.content.products.find((product) => product.slug === slug);
}
