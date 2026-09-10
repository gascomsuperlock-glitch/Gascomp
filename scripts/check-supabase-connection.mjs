import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !secret) throw new Error("Konfigurasi Supabase belum lengkap.");
const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
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
  const publicClient = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
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
