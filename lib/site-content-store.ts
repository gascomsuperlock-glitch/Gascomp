import "server-only";

import { randomBytes } from "node:crypto";
import {
  DEFAULT_CONTENT,
  type Product,
  type ProductImage,
  type ProductTone,
  type SiteContent,
} from "@/lib/content";
import {
  createAdminSupabaseClient,
  createPublicSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

type StorageMode = "local" | "supabase" | "static";

export type LoadedSiteContent = {
  content: SiteContent;
  storageMode: StorageMode;
  error?: string;
};

type Row = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function statusFromProduct(product: Product) {
  if (product.archived && product.everPublished) return "archived";
  return product.published ? "published" : "draft";
}

function mapProduct(
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
    source: row.source_provider === "duoke" ? {
      provider: "duoke",
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

async function loadFromSupabase(includeDrafts: boolean): Promise<SiteContent> {
  const client = includeDrafts
    ? createAdminSupabaseClient()
    : createPublicSupabaseClient() ?? createAdminSupabaseClient();
  if (!client) throw new Error("Konfigurasi Supabase belum lengkap.");

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
    return { content: DEFAULT_CONTENT, storageMode: "local", error: "Supabase belum dapat dibaca; website memakai data lokal." };
  }
}

export async function loadAdminSiteContent(): Promise<LoadedSiteContent> {
  if (!isSupabaseConfigured()) return { content: DEFAULT_CONTENT, storageMode: "local" };
  try {
    return { content: await loadFromSupabase(true), storageMode: "supabase" };
  } catch (error) {
    console.error("Supabase admin content load failed", error);
    return { content: DEFAULT_CONTENT, storageMode: "local", error: "Koneksi Supabase gagal. Perubahan sementara disimpan di browser ini." };
  }
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Format gambar produk tidak didukung.");
  return { mimeType: match[1], bytes: Uint8Array.from(Buffer.from(match[2], "base64")) };
}

function safePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100);
}

async function uploadNewImages(content: SiteContent) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase belum dikonfigurasi.");

  const products: Product[] = [];
  for (const product of content.products) {
    const images: ProductImage[] = [];
    for (const image of product.images) {
      if (!image.dataUrl?.startsWith("data:")) {
        images.push(image);
        continue;
      }

      const { mimeType, bytes } = parseDataUrl(image.dataUrl);
      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
      const storagePath = `products/${safePathPart(product.id)}/${safePathPart(image.id)}-${randomBytes(5).toString("hex")}.${extension}`;
      const upload = await client.storage.from("product-images").upload(storagePath, bytes, {
        contentType: mimeType,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const { data } = client.storage.from("product-images").getPublicUrl(storagePath);
      images.push({ ...image, dataUrl: undefined, url: data.publicUrl, storagePath });
    }
    products.push({ ...product, images });
  }
  return { ...content, products };
}

function assertContent(content: SiteContent) {
  if (!content || !Array.isArray(content.products) || content.products.length > 5000) throw new Error("Data konten tidak valid.");
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const product of content.products) {
    if (!product.id || !product.slug || !product.sku || !product.name) throw new Error("Produk belum memiliki identitas lengkap.");
    if (ids.has(product.id) || slugs.has(product.slug)) throw new Error("ID atau alamat produk duplikat.");
    if (product.images.length > 6 || product.videos.length > 50 || product.faqs.length > 100) throw new Error(`Konten ${product.sku} melewati batas yang diizinkan.`);
    ids.add(product.id);
    slugs.add(product.slug);
  }
}

function throwOnError(result: { error: unknown }) {
  if (result.error) throw result.error;
}

export async function persistSiteContent(input: SiteContent): Promise<SiteContent> {
  assertContent(input);
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase belum dikonfigurasi.");

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

  for (const product of content.products) {
    throwOnError(await client.from("products").upsert({
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

    for (const table of ["product_variations", "product_images", "tutorial_videos", "product_issues", "faq_items"] as const) {
      throwOnError(await client.from(table).delete().eq("product_id", product.id));
    }

    if (product.variations.length) throwOnError(await client.from("product_variations").insert(product.variations.map((item, position) => ({ id: item.id, product_id: product.id, name: item.name, sku: item.sku, source_variation_id: item.sourceId ?? null, attributes: item.attributes ?? [], position }))));
    if (product.images.length) throwOnError(await client.from("product_images").insert(product.images.map((item, position) => ({ id: item.id, product_id: product.id, variation_id: item.variationId ?? null, name: item.name, storage_path: item.storagePath, public_url: item.url, alt: item.alt, is_primary: item.isPrimary, position }))));
    if (product.videos.length) throwOnError(await client.from("tutorial_videos").insert(product.videos.map((item, position) => ({ id: item.id, product_id: product.id, title: item.title, description: item.description, youtube_url: item.youtubeUrl, duration: item.duration, position }))));
    if (product.issues.length) throwOnError(await client.from("product_issues").insert(product.issues.map((item, position) => ({ id: item.id, product_id: product.id, title: item.title, summary: item.summary, steps: item.steps, warning: item.warning ?? null, position }))));
    if (product.faqs.length) throwOnError(await client.from("faq_items").insert(product.faqs.map((item, position) => ({ id: item.id, product_id: product.id, question: item.question, answer: item.answer, position }))));
  }

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
