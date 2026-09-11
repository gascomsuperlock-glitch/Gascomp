import { getSupabaseConfig, createScriptSupabaseClient } from "../shared/supabase.mjs";

const { url, secret, publishable } = getSupabaseConfig();
if (!url || !secret) throw new Error("The Supabase configuration is incomplete.");
const supabase = createScriptSupabaseClient(url, secret);
const tables = ["products", "product_variations", "product_images", "tutorial_videos", "product_issues", "faq_items", "duoke_import_runs", "warranty_tickets", "warranty_evidence"];
let failed = false;
for (const table of tables) {
  const result = await supabase.from(table).select("*", { count: "exact", head: true });
  if (result.error) {
    failed = true;
    process.stdout.write(`${table}: ERROR ${result.error.code || result.error.message}\n`);
  } else {
    process.stdout.write(`${table}: OK (${result.count || 0})\n`);
  }
}
const buckets = await supabase.storage.listBuckets();
if (buckets.error) {
  failed = true;
  process.stdout.write(`storage: ERROR ${buckets.error.message}\n`);
} else {
  const names = new Set(buckets.data.map((bucket) => bucket.name));
  for (const bucket of ["product-images", "warranty-evidence"]) {
    if (!names.has(bucket)) failed = true;
    process.stdout.write(`${bucket}: ${names.has(bucket) ? "OK" : "MISSING"}\n`);
  }
}
if (publishable) {
  const publicClient = createScriptSupabaseClient(url, publishable);
  const publicProducts = await publicClient.from("products").select("id, status");
  if (publicProducts.error || (publicProducts.data || []).some((product) => product.status === "draft")) {
    failed = true;
    process.stdout.write("public catalog RLS: ERROR\n");
  } else {
    process.stdout.write(`public catalog RLS: OK (${publicProducts.data?.length || 0} visible)\n`);
  }
  const privateTickets = await publicClient.from("warranty_tickets").select("ticket_id").limit(1);
  if (!privateTickets.error) {
    failed = true;
    process.stdout.write("private ticket RLS: ERROR (public query was allowed)\n");
  } else {
    process.stdout.write("private ticket RLS: OK (blocked)\n");
  }
}
if (failed) process.exitCode = 1;
