import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseConfig, createScriptSupabaseClient } from "../shared/supabase.mjs";
import { root } from "../shared/paths.mjs";

const { url, secret } = getSupabaseConfig();
if (!url || !secret) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY before importing Duoke data.");
}

const catalog = JSON.parse(readFileSync(resolve(root, "data/catalog/duoke-products.json"), "utf8"));
const reportPath = resolve(root, "data/reports/duoke-sync-report.json");
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : {};
const supabase = createScriptSupabaseClient(url, secret);
let importedProducts = 0;
let importedVariations = 0;

function stableProductId(product) {
  return `duoke-${product.storeId ? `${product.storeId}-` : ""}${product.sourceProductId}`;
}

for (const product of catalog.products) {
  const storeId = product.storeId || "";
  const existing = await supabase
    .from("products")
    .select("id")
    .eq("source_provider", "duoke")
    .eq("source_store_id", storeId)
    .eq("source_product_id", product.sourceProductId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  const productId = existing.data?.id || stableProductId(product);
  const sourceFields = {
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    model: product.model || "",
    description: product.description || "",
    attributes: product.attributes || [],
    source_provider: "duoke",
    source_product_id: product.sourceProductId,
    source_store_id: storeId,
    source_synced_at: catalog.syncedAt,
  };
  const productWrite = existing.data
    ? await supabase.from("products").update(sourceFields).eq("id", productId)
    : await supabase.from("products").insert({ id: productId, ...sourceFields, tone: "orange", status: "draft", ever_published: false });
  if (productWrite.error) throw productWrite.error;

  const existingVariations = await supabase.from("product_variations").select("id, source_variation_id").eq("product_id", productId).not("source_variation_id", "is", null);
  if (existingVariations.error) throw existingVariations.error;
  const incomingSourceIds = new Set(product.variations.map((variation) => variation.sourceVariationId));
  for (const oldVariation of existingVariations.data || []) {
    if (!incomingSourceIds.has(oldVariation.source_variation_id)) {
      const removal = await supabase.from("product_variations").delete().eq("id", oldVariation.id);
      if (removal.error) throw removal.error;
    }
  }

  for (const [position, variation] of product.variations.entries()) {
    const matched = (existingVariations.data || []).find((item) => item.source_variation_id === variation.sourceVariationId);
    const variationId = matched?.id || `duoke-variation-${product.sourceProductId}-${variation.sourceVariationId}`;
    const variationWrite = await supabase.from("product_variations").upsert({
      id: variationId,
      product_id: productId,
      name: variation.name,
      sku: variation.sku,
      source_variation_id: variation.sourceVariationId,
      attributes: variation.attributes || [],
      position,
    });
    if (variationWrite.error) throw variationWrite.error;
    importedVariations += 1;
  }
  importedProducts += 1;
}

const importRun = await supabase.from("duoke_import_runs").insert({
  synced_at: catalog.syncedAt || new Date().toISOString(),
  imported_products: importedProducts,
  imported_variations: importedVariations,
  review_items: Array.isArray(report.reviewItems) ? report.reviewItems.length : 0,
  report,
});
if (importRun.error) throw importRun.error;

process.stdout.write(`Supabase updated: ${importedProducts} products, ${importedVariations} variations.\n`);
