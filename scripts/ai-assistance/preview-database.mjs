import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { chmod, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { loadEnvFile } from "../shared/env.mjs";
import { root } from "../shared/paths.mjs";
import { getAssistancePreviewDatabase } from "../../src/features/ai-assistance/server/preview-database.ts";

const operations = new Set(["session", "messages", "send", "knowledge", "heartbeat", "claim", "complete", "status", "pause"]);
const digest = (value) => createHash("sha256").update(value).digest();
const equal = (left, right) => timingSafeEqual(digest(left), digest(right));

export async function openPreviewDatabase(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const db = new PGlite(directory);
  try {
    await db.exec(`
      do $$ begin
        if not exists(select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
        if not exists(select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
        if not exists(select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
      end $$;
      create table if not exists public.ai_assistance_preview_migrations (
        version text primary key, digest text not null
      );
    `);
    const migrations = [
      ["202609170001", "202609170001_ai_assistance.sql"],
      ["202609170002", "202609170002_ai_assistance_resolved_sku.sql"],
      ["202609170003", "202609170003_ai_assistance_grounded_responses.sql"],
    ];
    for (const [version, filename] of migrations) {
      const sql = await readFile(resolve(root, "supabase/migrations", filename), "utf8");
      const checksum = digest(sql).toString("hex");
      const { rows } = await db.query("select digest from public.ai_assistance_preview_migrations where version = $1", [version]);
      if (rows.length && rows[0].digest !== checksum) throw new Error("Local schema version changed; preserve or move the preview directory before reinitializing.");
      if (!rows.length) {
        await db.exec("begin");
        try {
          await db.exec(sql);
          await db.query("insert into public.ai_assistance_preview_migrations values ($1, $2)", [version, checksum]);
          await db.exec("commit");
        } catch (error) { await db.exec("rollback"); throw error; }
      }
    }
    await db.exec("set role service_role");
    await db.query("select public.gascomp_ai_cleanup()");
    return db;
  } catch (error) { await db.close(); throw error; }
}

export function previewServer(db, key) {
  if (typeof key !== "string" || key.length < 32) throw new Error("Use a random local preview key of at least 32 characters.");
  return createServer(async (request, response) => {
    const send = (status, value) => {
      response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify(value));
    };
    if (request.method !== "POST" || request.url !== "/rest/v1/rpc/gascomp_ai_command") return send(404, { message: "Not found." });
    if (!equal(String(request.headers.apikey ?? ""), key) || !equal(String(request.headers.authorization ?? ""), `Bearer ${key}`)) return send(401, { message: "Local preview authentication required." });
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 4 * 1024 * 1024 + 8192) { send(413, { message: "Request exceeds the preview limit." }); return; }
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!input || !operations.has(input.action) || !input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)
        || Object.keys(input).some(name => !["action", "payload"].includes(name))) return send(400, { message: "Invalid preview operation." });
      const { rows } = await db.query("select public.gascomp_ai_command($1, $2::jsonb) as result", [input.action, JSON.stringify(input.payload)]);
      send(200, rows[0].result);
    } catch { send(503, { message: "Local preview request failed." }); }
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("This command is for local development only.");
  loadEnvFile();
  const configuration = getAssistancePreviewDatabase({ ...process.env, NODE_ENV: "development" });
  if (!configuration || configuration.key.length < 32) throw new Error("Configure the local preview URL and key.");
  const url = new URL(configuration.url);
  const db = await openPreviewDatabase(resolve(root, ".data/ai-assistance/preview/postgres"));
  const server = previewServer(db, configuration.key);
  const cleanup = setInterval(() => { db.query("select public.gascomp_ai_cleanup()").catch(() => console.error("Local preview cleanup failed.")); }, 15 * 60 * 1000);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(cleanup);
    await new Promise(done => server.close(done));
    await db.close();
  };
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => void stop());
  server.on("error", async () => { console.error("Local preview could not bind its port."); await stop(); process.exitCode = 1; });
  const hostname = url.hostname === "localhost" ? "127.0.0.1" : url.hostname.replace(/^\[|\]$/g, "");
  server.listen(Number(url.port || 80), hostname, () => console.log(`AI preview database listening at ${configuration.url}. Local data only; no knowledge or answers have been seeded.`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error("AI preview database could not start. Check its local URL/key, port, and schema version."); process.exitCode = 1; });
}
