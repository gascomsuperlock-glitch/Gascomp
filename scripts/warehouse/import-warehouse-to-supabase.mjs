import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseConfig, createScriptSupabaseClient } from "../shared/supabase.mjs";
import { root } from "../shared/paths.mjs";

const { url, secret } = getSupabaseConfig();
if (!url || !secret) throw new Error("The Supabase configuration is incomplete.");

const sourcePath = resolve(root, "data/catalog/warehouse-products.json");
if (!existsSync(sourcePath)) {
  throw new Error("Run warehouse:normalize before importing into Supabase.");
}
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
if (source.schemaVersion !== 1 || source.source !== "warehouse-xlsx" || !Array.isArray(source.products)) {
  throw new Error("The warehouse data format is invalid.");
}

const supabase = createScriptSupabaseClient(url, secret);
const dryRun = process.argv.includes("--dry-run");
const productColumns = [
  "id", "slug", "sku", "name", "model", "description", "tone", "status", "ever_published",
  "attributes", "source_provider", "source_product_id", "source_store_id", "source_synced_at",
].join(",");
const [productsResult, imagesResult] = await Promise.all([
  supabase.from("products").select(productColumns),
  supabase.from("product_images").select("id,product_id"),
]);
if (productsResult.error) throw productsResult.error;
if (imagesResult.error) throw imagesResult.error;

const existingProducts = productsResult.data || [];
const existingIds = new Set(existingProducts.map((item) => item.id));
const existingSlugs = new Set(existingProducts.map((item) => item.slug));
const imagesByProduct = new Map();
for (const image of imagesResult.data || []) {
  if (!imagesByProduct.has(image.product_id)) imagesByProduct.set(image.product_id, []);
  imagesByProduct.get(image.product_id).push(image);
}
const bySource = new Map(
  existingProducts
    .filter((item) => item.source_provider === "warehouse-xlsx" && item.source_product_id)
    .map((item) => [String(item.source_product_id), item]),
);
const bySku = new Map();
for (const product of existingProducts) {
  const key = String(product.sku).trim().toLocaleLowerCase("id-ID");
  if (!bySku.has(key)) bySku.set(key, []);
  bySku.get(key).push(product);
}

function safePart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100);
}

function uniqueId(sourceProductId) {
  const base = `warehouse-${safePart(sourceProductId)}`;
  if (!existingIds.has(base)) return base;
  return `${base}-${createHash("sha1").update(String(sourceProductId)).digest("hex").slice(0, 8)}`;
}

function uniqueSlug(preferred, sourceProductId) {
  if (!existingSlugs.has(preferred)) return preferred;
  const suffix = createHash("sha1").update(String(sourceProductId)).digest("hex").slice(0, 8);
  return `${preferred.slice(0, 90)}-${suffix}`;
}

function writeRow(product, current, id, slug, tone) {
  return {
    id,
    slug,
    sku: product.sku,
    name: product.name,
    model: product.model || "",
    description: current?.description || "",
    tone: current?.tone || tone,
    status: current?.status || "draft",
    ever_published: current?.ever_published || false,
    attributes: current?.attributes || [],
    source_provider: "warehouse-xlsx",
    source_product_id: product.sourceProductId,
    source_store_id: "",
    source_synced_at: source.syncedAt,
  };
}

const rowsToUpsert = [];
const resolvedProducts = [];
const report = {
  source: "warehouse-xlsx",
  sourceFile: source.sourceFile,
  sourceSha256: source.sourceSha256,
  importedAt: new Date().toISOString(),
  sourceProducts: source.products.length,
  createdProducts: 0,
  updatedImportedProducts: 0,
  matchedExistingProducts: 0,
  uploadedImages: 0,
  productsWithoutImage: 0,
  imageErrors: [],
  reviewItems: [],
};

for (const [index, product] of source.products.entries()) {
  const sourceMatch = bySource.get(String(product.sourceProductId));
  const skuMatches = bySku.get(String(product.sku).trim().toLocaleLowerCase("id-ID")) || [];
  if (!sourceMatch && skuMatches.length > 1) {
    report.reviewItems.push({ sku: product.sku, reason: "Multiple database products use this SKU; the import was skipped." });
    continue;
  }
  const current = sourceMatch || skuMatches[0];
  if (current && current.source_provider !== "warehouse-xlsx") {
    report.matchedExistingProducts += 1;
    resolvedProducts.push({ source: product, productId: current.id });
    continue;
  }
  if (current) {
    rowsToUpsert.push(writeRow(product, current, current.id, current.slug, current.tone));
    resolvedProducts.push({ source: product, productId: current.id });
    report.updatedImportedProducts += 1;
    continue;
  }
  const id = uniqueId(product.sourceProductId);
  const slug = uniqueSlug(product.slug, product.sourceProductId);
  existingIds.add(id);
  existingSlugs.add(slug);
  rowsToUpsert.push(writeRow(product, null, id, slug, ["orange", "navy", "green"][index % 3]));
  resolvedProducts.push({ source: product, productId: id });
  report.createdProducts += 1;
}

if (dryRun) {
  const previewPath = resolve(root, "data/reports/warehouse-import-preview.json");
  const potentialImages = resolvedProducts.filter(
    (item) => !imagesByProduct.has(item.productId) && Boolean(item.source.imageUrl),
  ).length;
  writeFileSync(previewPath, `${JSON.stringify({ ...report, mode: "dry-run", potentialImages }, null, 2)}\n`);
  process.stdout.write(
    `Preview: ${report.createdProducts} will be created, ${report.updatedImportedProducts} will be updated, ` +
    `${report.matchedExistingProducts} existing SKUs will be preserved, and up to ${potentialImages} images will be copied.\n`,
  );
  process.exit(0);
}

for (let index = 0; index < rowsToUpsert.length; index += 50) {
  const result = await supabase.from("products").upsert(rowsToUpsert.slice(index, index + 50), { onConflict: "id" });
  if (result.error) throw result.error;
}

const allowedImageHosts = [
  "bigseller.pro", "shopee.co.id", "susercontent.com", "ibyteimg.com", "tiktokcdn.com",
];

function allowedImageUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && allowedImageHosts.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function detectImage(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: "jpg", mimeType: "image/jpeg" };
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { extension: "png", mimeType: "image/png" };
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return { extension: "webp", mimeType: "image/webp" };
  return null;
}

async function importImage(item) {
  const { source: product, productId } = item;
  if (imagesByProduct.has(productId)) return;
  if (!product.imageUrl) {
    report.productsWithoutImage += 1;
    return;
  }
  try {
    if (!allowedImageUrl(product.imageUrl)) throw new Error("image host is not allowed");
    const response = await fetch(product.imageUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "GascompCatalogImporter/1.0" },
    });
    if (!response.ok || !allowedImageUrl(response.url)) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) throw new Error("invalid image size");
    const imageType = detectImage(bytes);
    if (!imageType) throw new Error("image format is not JPG, PNG, or WebP");
    const storagePath = `warehouse/${safePart(product.sourceProductId)}.${imageType.extension}`;
    const upload = await supabase.storage.from("product-images").upload(storagePath, bytes, {
      contentType: imageType.mimeType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (upload.error) throw upload.error;
    const publicUrl = supabase.storage.from("product-images").getPublicUrl(storagePath).data.publicUrl;
    const imageWrite = await supabase.from("product_images").upsert({
      id: `warehouse-image-${safePart(product.sourceProductId)}`,
      product_id: productId,
      variation_id: null,
      name: `${product.sku}.${imageType.extension}`,
      storage_path: storagePath,
      public_url: publicUrl,
      alt: product.name,
      is_primary: true,
      position: 0,
    }, { onConflict: "id" });
    if (imageWrite.error) throw imageWrite.error;
    imagesByProduct.set(productId, [{ id: `warehouse-image-${safePart(product.sourceProductId)}` }]);
    report.uploadedImages += 1;
  } catch (error) {
    report.imageErrors.push({ sku: product.sku, reason: error instanceof Error ? error.message : "failed to import image" });
  }
}

const imagesToImport = resolvedProducts.filter((item) => !imagesByProduct.has(item.productId));
for (let index = 0; index < imagesToImport.length; index += 6) {
  await Promise.all(imagesToImport.slice(index, index + 6).map(importImage));
}

const reportPath = resolve(root, "data/reports/warehouse-import-report.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(
  `Import complete: ${report.createdProducts} created, ${report.updatedImportedProducts} updated, ` +
  `${report.matchedExistingProducts} existing SKUs preserved, ${report.uploadedImages} images saved, ` +
  `${report.productsWithoutImage} without source images, ${report.imageErrors.length + report.reviewItems.length} failed or require review.\n`,
);
