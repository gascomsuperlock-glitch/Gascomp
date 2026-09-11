import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseConfig, createScriptSupabaseClient } from "../shared/supabase.mjs";
import { root } from "../shared/paths.mjs";

const sourcePath = resolve(root, "data/catalog/brochure-short-descriptions.json");
if (!existsSync(sourcePath)) throw new Error("The brochure description source file is missing.");

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
if (source.schemaVersion !== 1 || source.source !== "gascomp-2026-brochure" || !Array.isArray(source.descriptions)) {
  throw new Error("The brochure description data format is invalid.");
}

const seenSkus = new Set();
for (const item of source.descriptions) {
  if (!item.adminSku || !item.brochureSku || !Number.isInteger(item.sourcePage) || !item.matchType || !item.description) {
    throw new Error("A brochure description record is incomplete.");
  }
  if (seenSkus.has(item.adminSku)) throw new Error(`Duplicate admin SKU in brochure data: ${item.adminSku}`);
  if (item.description.length > 300) throw new Error(`Short description exceeds 300 characters: ${item.adminSku}`);
  seenSkus.add(item.adminSku);
}

const { url, secret } = getSupabaseConfig();
if (!url || !secret) throw new Error("The Supabase configuration is incomplete.");
const supabase = createScriptSupabaseClient(url, secret);
const dryRun = !process.argv.includes("--apply");

const productsResult = await supabase
  .from("products")
  .select("id,sku,description,status,name")
  .in("sku", [...seenSkus])
  .order("sku");
if (productsResult.error) throw productsResult.error;

const productsBySku = new Map();
for (const product of productsResult.data ?? []) {
  if (productsBySku.has(product.sku)) throw new Error(`Multiple database products use SKU ${product.sku}.`);
  productsBySku.set(product.sku, product);
}

const updates = [];
const unchanged = [];
const missing = [];
for (const item of source.descriptions) {
  const product = productsBySku.get(item.adminSku);
  if (!product) {
    missing.push({ adminSku: item.adminSku, brochureSku: item.brochureSku, sourcePage: item.sourcePage });
    continue;
  }
  const record = {
    productId: product.id,
    adminSku: item.adminSku,
    brochureSku: item.brochureSku,
    sourcePage: item.sourcePage,
    matchType: item.matchType,
    replacedExistingDescription: Boolean(product.description),
    description: item.description,
  };
  if (product.description === item.description) unchanged.push(record);
  else updates.push(record);
}

const report = {
  source: source.source,
  sourceFile: source.sourceFile,
  sourceSha256: source.sourceSha256,
  generatedAt: new Date().toISOString(),
  mode: dryRun ? "dry-run" : "applied",
  brochurePages: source.brochurePages,
  brochureSkuCount: source.brochureSkuCount,
  descriptionRecords: source.descriptions.length,
  matchedProducts: updates.length + unchanged.length,
  updatedProducts: dryRun ? 0 : updates.length,
  pendingUpdates: dryRun ? updates.length : 0,
  unchangedProducts: unchanged.length,
  missingProducts: missing,
  updates,
};

if (!dryRun) {
  for (const update of updates) {
    const result = await supabase
      .from("products")
      .update({ description: update.description })
      .eq("id", update.productId)
      .eq("sku", update.adminSku)
      .select("id,sku,description")
      .single();
    if (result.error) throw result.error;
    if (result.data.description !== update.description) throw new Error(`Description verification failed for ${update.adminSku}.`);
  }
}

const reportPath = resolve(root, `data/reports/brochure-description-import-${dryRun ? "preview" : "result"}.json`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(
  dryRun
    ? `Preview: ${updates.length} descriptions will be updated, ${unchanged.length} are unchanged, and ${missing.length} mapped SKUs are missing.\n`
    : `Imported ${updates.length} brochure descriptions; ${unchanged.length} were already current and ${missing.length} mapped SKUs were missing.\n`,
);
