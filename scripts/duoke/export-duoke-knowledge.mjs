import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseConfig, createScriptSupabaseClient } from "../shared/supabase.mjs";
import { root } from "../shared/paths.mjs";

const { url: supabaseUrl, secret: supabaseSecret } = getSupabaseConfig();
if (!supabaseUrl || !supabaseSecret) {
  throw new Error("The Supabase configuration is incomplete for exporting the knowledge base.");
}

const baseUrl = (process.env.GASCOMP_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const supabase = createScriptSupabaseClient(supabaseUrl, supabaseSecret);

function throwResult(result) {
  if (result.error) throw result.error;
  return result.data || [];
}

const [productsResult, variationsResult, videosResult, issuesResult, faqsResult] = await Promise.all([
  supabase.from("products").select("id,slug,sku,name,model,status").eq("status", "published").order("created_at"),
  supabase.from("product_variations").select("product_id,sku,name").order("position"),
  supabase.from("tutorial_videos").select("id,product_id,title,description,youtube_url").order("position"),
  supabase.from("product_issues").select("id,product_id,title,summary,steps,warning").order("position"),
  supabase.from("faq_items").select("id,product_id,question,answer").order("position"),
]);

const products = throwResult(productsResult);
const variations = throwResult(variationsResult);
const videos = throwResult(videosResult);
const issues = throwResult(issuesResult);
const faqs = throwResult(faqsResult);
const publishedIds = new Set(products.map((product) => product.id));
const skippedSources = [];

function safeFile(value) {
  return String(value).normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "entry";
}

function productContext(product) {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    model: product.model || "",
    variationSkus: variations.filter((item) => item.product_id === product.id).map((item) => item.sku).filter(Boolean),
  };
}

function makeEntry(kind, source, product, values) {
  return {
    id: `admin-${kind}-${safeFile(source.id)}`,
    kind,
    approval: "approved",
    title: values.title,
    question: values.question,
    answer: values.answer,
    triggers: [...new Set([values.title, values.question, product.name, product.sku, ...(values.triggers || [])].filter(Boolean))],
    product: productContext(product),
    sourceRef: `${kind}:${source.id}`,
    sourceUrl: values.sourceUrl,
    reviewedBy: "gascomp-admin-published-content",
  };
}

function meaningfulText(value, minimumLength, minimumWords) {
  const text = String(value || "").trim();
  return text.length >= minimumLength && text.split(/\s+/).filter(Boolean).length >= minimumWords;
}

function validYoutubeUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && (
      parsed.hostname === "youtu.be" ||
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "m.youtube.com"
    );
  } catch {
    return false;
  }
}

function skip(kind, id, reason) {
  skippedSources.push({ sourceRef: `${kind}:${id}`, reason });
}

const entries = [];
for (const product of products) {
  const productUrl = `${baseUrl}/produk/${encodeURIComponent(product.slug)}`;
  for (const faq of faqs.filter((item) => item.product_id === product.id)) {
    if (!meaningfulText(faq.question, 8, 2) || !meaningfulText(faq.answer, 20, 4)) {
      skip("faq", faq.id, "The question or answer is too short or incomplete.");
      continue;
    }
    entries.push(makeEntry("faq", faq, product, {
      title: faq.question,
      question: faq.question,
      answer: `${faq.answer}\n\nProduct guide: ${productUrl}`,
      sourceUrl: productUrl,
    }));
  }
  for (const issue of issues.filter((item) => item.product_id === product.id)) {
    const steps = Array.isArray(issue.steps) ? issue.steps : [];
    if (!meaningfulText(issue.title, 8, 2) || steps.length === 0 || steps.some((step) => !meaningfulText(step, 10, 2))) {
      skip("issue", issue.id, "The title or troubleshooting steps are incomplete.");
      continue;
    }
    const answerParts = [
      issue.summary,
      steps.length ? steps.map((step, index) => `${index + 1}. ${step}`).join("\n") : "",
      issue.warning ? `Warning: ${issue.warning}` : "",
      `Full guide: ${productUrl}#kendala`,
    ].filter(Boolean);
    entries.push(makeEntry("issue", issue, product, {
      title: issue.title,
      question: issue.title,
      answer: answerParts.join("\n\n"),
      triggers: [issue.summary, ...steps],
      sourceUrl: `${productUrl}#kendala`,
    }));
  }
  for (const video of videos.filter((item) => item.product_id === product.id)) {
    if (!meaningfulText(video.title, 5, 1) || !validYoutubeUrl(video.youtube_url)) {
      skip("tutorial", video.id, "The title or YouTube link is invalid.");
      continue;
    }
    entries.push(makeEntry("tutorial", video, product, {
      title: video.title,
      question: `How do I use ${product.name}?`,
      answer: `${video.description ? `${video.description}\n\n` : ""}Watch the tutorial directly on the Gascomp page: ${productUrl}#tutorial`,
      triggers: ["tutorial", "video", "how to use", "usage instructions", video.description],
      sourceUrl: `${productUrl}#tutorial`,
    }));
  }
}

const reviewedPath = resolve(root, "data/knowledge/duoke-reviewed-knowledge.json");
const reviewed = existsSync(reviewedPath) ? JSON.parse(readFileSync(reviewedPath, "utf8")) : { entries: [] };
for (const entry of Array.isArray(reviewed.entries) ? reviewed.entries : []) {
  if (entry.approval === "approved" && publishedIds.has(entry.product?.id)) entries.push(entry);
}

entries.sort((left, right) => left.id.localeCompare(right.id));
const generatedAt = new Date().toISOString();
const knowledge = {
  schemaVersion: 1,
  source: "gascomp-approved-content",
  generatedAt,
  baseUrl,
  entries,
  skippedSources,
};
writeFileSync(resolve(root, "data/knowledge/duoke-knowledge.json"), `${JSON.stringify(knowledge, null, 2)}\n`);

const vault = resolve(root, "obsidian");
const productDir = resolve(vault, "products");
const approvedDir = resolve(vault, "knowledge/approved");
mkdirSync(productDir, { recursive: true });
mkdirSync(approvedDir, { recursive: true });
mkdirSync(resolve(vault, ".obsidian"), { recursive: true });
for (const name of readdirSync(approvedDir)) {
  if (name.startsWith("admin-") && name.endsWith(".md")) unlinkSync(resolve(approvedDir, name));
}

function yaml(value) {
  return JSON.stringify(value ?? "");
}

function markdownText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

for (const product of products) {
  const related = entries.filter((entry) => entry.product?.id === product.id);
  const productNote = [
    "---",
    `product_id: ${yaml(product.id)}`,
    `sku: ${yaml(product.sku)}`,
    `status: ${yaml(product.status)}`,
    `synced_at: ${yaml(generatedAt)}`,
    "generated: true",
    "---",
    "",
    `# ${markdownText(product.name)}`,
    "",
    `- **SKU:** ${markdownText(product.sku)}`,
    `- **Model:** ${markdownText(product.model) || "Belum tersedia"}`,
    `- **Halaman bantuan:** ${baseUrl}/produk/${encodeURIComponent(product.slug)}`,
    "",
    "## Pengetahuan disetujui",
    "",
    ...(related.length ? related.map((entry) => `- [[../knowledge/approved/${entry.id}|${entry.title}]]`) : ["- Belum ada FAQ, panduan masalah, atau tutorial yang disetujui."]),
    "",
  ];
  writeFileSync(resolve(productDir, `${safeFile(product.slug)}.md`), productNote.join("\n"));
}

for (const entry of entries) {
  const note = [
    "---",
    `knowledge_id: ${yaml(entry.id)}`,
    `kind: ${yaml(entry.kind)}`,
    "approval: approved",
    `source_ref: ${yaml(entry.sourceRef)}`,
    `sku: ${yaml(entry.product?.sku)}`,
    `synced_at: ${yaml(generatedAt)}`,
    "generated: true",
    "---",
    "",
    `# ${markdownText(entry.title)}`,
    "",
    `Produk: [[../../products/${safeFile(entry.product.slug)}|${entry.product.name}]]`,
    "",
    "## Pertanyaan",
    "",
    markdownText(entry.question),
    "",
    "## Jawaban disetujui",
    "",
    markdownText(entry.answer).replace(/\n\nProduct guide: (?=https?:\/\/)/g, "\n\nPanduan produk: "),
    "",
    "## Pemicu pencarian",
    "",
    ...entry.triggers.map((trigger) => `- ${markdownText(trigger)}`),
    "",
  ];
  writeFileSync(resolve(approvedDir, `${safeFile(entry.id)}.md`), note.join("\n"));
}

const index = [
  "---",
  `generated_at: ${yaml(generatedAt)}`,
  `approved_entries: ${entries.length}`,
  "generated: true",
  "---",
  "",
  "# Basis Pengetahuan Gascomp",
  "",
  "Indeks ini hanya memuat FAQ, panduan masalah, tutorial, dan entri tinjauan yang sudah disetujui.",
  "",
  "## Produk",
  "",
  ...products.map((product) => `- [[products/${safeFile(product.slug)}|${product.name} · ${product.sku}]]`),
  "",
  "## Jawaban aktif",
  "",
  ...entries.map((entry) => `- [[knowledge/approved/${safeFile(entry.id)}|${entry.title}]] · ${entry.product.sku}`),
  "",
];
writeFileSync(resolve(vault, "Gascomp Knowledge Base.md"), index.join("\n"));

process.stdout.write(`Knowledge base updated: ${products.length} published products, ${entries.length} approved answers, ${skippedSources.length} incomplete sources skipped.\n`);
