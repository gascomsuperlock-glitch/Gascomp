import { mkdir, writeFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "../shared/paths.mjs";
import {
  SOURCE_ORIGIN,
  normalizeRecord,
} from "../../src/features/main-site/model/content.mjs";

export const snapshotDirectory = join(root, ".data", "main-site");
const sources = [
  ["page", "/wp-json/wp/v2/pages?_fields=id,link,title,content"],
  ["post", "/wp-json/wp/v2/posts?_fields=id,link,title,content"],
  ["product", "/wp-json/wc/store/v1/products?catalog_visibility=visible"],
];

export async function readPublicCollection(path, fetcher = fetch) {
  const records = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const url = new URL(path, SOURCE_ORIGIN);
    if (url.origin !== SOURCE_ORIGIN || !url.pathname.startsWith("/wp-json/"))
      throw new Error("Invalid import source");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const response = await fetcher(url, {
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: "application/json" },
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      throw new Error(`Public source rejected: ${response.status}`);
    const pagesHeader = response.headers.get("x-wp-totalpages");
    if (!pagesHeader || !/^\d+$/.test(pagesHeader))
      throw new Error("Missing pagination evidence");
    const pages = Number(pagesHeader);
    if (pages > 20 || (page > 1 && pages !== totalPages))
      throw new Error("Pagination limit or source changed during export");
    totalPages = pages;
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty source response");
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.byteLength;
        if (size > 12_000_000)
          throw new Error("Source response exceeds import limit");
        chunks.push(Buffer.from(result.value));
      }
    } finally {
      await reader.cancel();
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!Array.isArray(data) || data.length > 100)
      throw new Error("Invalid public collection");
    records.push(...data);
  }
  return records;
}

export async function exportPublic({ write = false, fetcher = fetch } = {}) {
  const records = [];
  const counts = {};
  for (const [kind, path] of sources) {
    const source = await readPublicCollection(path, fetcher);
    counts[kind] = source.length;
    for (const item of source) records.push(normalizeRecord(item, kind));
  }
  const paths = new Set();
  for (const record of records) {
    if (paths.has(record.path)) throw new Error("Duplicate source permalink");
    paths.add(record.path);
  }
  const manifest = {
    version: 1,
    source: SOURCE_ORIGIN,
    exportedAt: new Date().toISOString(),
    approved: false,
    records,
  };
  const report = {
    counts,
    forms: records.reduce((sum, record) => sum + record.forms.length, 0),
    approved: false,
    written: write,
  };
  if (write) {
    await mkdir(snapshotDirectory, { recursive: true, mode: 0o700 });
    const temporary = join(snapshotDirectory, `snapshot-${process.pid}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(manifest), {
        mode: 0o600,
        flag: "wx",
      });
      await rename(temporary, join(snapshotDirectory, "snapshot.json"));
    } finally {
      await rm(temporary, { force: true });
    }
  }
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv.slice(2).some((arg) => arg !== "--write"))
    throw new Error(
      "Usage: node scripts/main-site/export-public.mjs [--write]",
    );
  try {
    console.log(
      JSON.stringify(
        await exportPublic({ write: process.argv.includes("--write") }),
      ),
    );
  } catch {
    console.error(
      "Public export failed; the existing snapshot was preserved. Check source availability and import limits.",
    );
    process.exitCode = 1;
  }
}
