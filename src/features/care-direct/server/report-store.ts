import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, link, unlink, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { byteRange, evidenceHeaders } from "./video-response";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import type { CareDirectReport, CareDirectStatus } from "../model/types";

type StoredReport = CareDirectReport & { submissionId: string; fingerprint: string; storagePath: string };
const directory = () => path.join(process.cwd(), ".data", "care-direct");
const bucket = "care-direct-evidence";
const validId = (id: string) => /^CD-[0-9a-f-]{36}$/.test(id);
export class SubmissionConflict extends Error {}
function client() {
  const started = Date.now();
  const boundedFetch: typeof fetch = (input, init) => {
    const remaining = 60_000 - (Date.now() - started);
    if (remaining <= 0) throw new Error("CareDirect storage timed out.");
    const timeout = AbortSignal.timeout(Math.min(remaining, 40_000));
    const prior = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    return fetch(input, { ...init, signal: prior ? AbortSignal.any([prior, timeout]) : timeout });
  };
  const result = createAdminSupabaseClient(boundedFetch);
  if (!result && process.env.NODE_ENV === "production") throw new Error("CareDirect storage is not configured.");
  return result;
}
function publicReport(record: StoredReport): CareDirectReport {
  const { id, name, problem, whatsapp, orderNumber, status, createdAt, updatedAt, video } = record;
  return { id, name, problem, whatsapp, orderNumber, status, createdAt, updatedAt, video };
}
async function readStored(id: string): Promise<StoredReport | null> {
  if (!validId(id)) return null;
  const db = client();
  if (db) {
    const { data, error } = await db.from("care_direct_reports").select("record").eq("id", id).maybeSingle();
    if (error) throw error;
    return data?.record as StoredReport ?? null;
  }
  try { return JSON.parse(await readFile(path.join(directory(), `${id}.json`), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
export async function saveCareDirectReport(input: { name: string; problem: string; whatsapp: string; orderNumber: string; submissionId: string }, video: File, mimeType: string) {
  const bytes = Buffer.from(await video.arrayBuffer());
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).update(bytes).digest("hex");
  const id = `CD-${input.submissionId}`;
  const accept = (existing: StoredReport) => {
    if (existing.fingerprint !== fingerprint) throw new SubmissionConflict("This submission has already been used for different details. Reload the form to send a new report.");
    return publicReport(existing);
  };
  const existing = await readStored(id);
  if (existing) return accept(existing);
  const storagePath = `${id}/${randomUUID()}`;
  const now = new Date().toISOString();
  const record: StoredReport = { ...input, id, status: "new", createdAt: now, updatedAt: now, video: { name: path.basename(video.name).slice(0, 200), mimeType, size: video.size }, fingerprint, storagePath };
  const db = client();
  if (db) {
    try {
      const { error } = await db.storage.from(bucket).upload(storagePath, bytes, { contentType: mimeType, upsert: false });
      if (error) throw error;
    } catch (error) {
      await client()!.storage.from(bucket).remove([storagePath]).catch(() => {});
      throw error;
    }
    try {
      const { error } = await db.from("care_direct_reports").insert({ id, submission_id: input.submissionId, record });
      if (error) throw error;
      return publicReport(record);
    } catch (error) {
      // Reconcile uncertain commits before deleting their evidence. If reconciliation
      // itself fails, retain evidence so a committed report cannot lose its video.
      const winner = await readStored(id);
      if (winner?.storagePath !== storagePath) await client()!.storage.from(bucket).remove([storagePath]);
      if (winner) return accept(winner);
      throw error;
    }
  }
  await mkdir(path.join(directory(), id), { recursive: true, mode: 0o700 });
  const videoPath = path.join(directory(), storagePath);
  const temporary = path.join(directory(), `${id}.${randomUUID()}.tmp`);
  try {
    await writeFile(videoPath, bytes, { flag: "wx", mode: 0o600 });
    await writeFile(temporary, JSON.stringify(record), { flag: "wx", mode: 0o600 });
    await link(temporary, path.join(directory(), `${id}.json`));
  } catch (error) {
    await unlink(videoPath).catch(() => {});
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      const winner = await readStored(id);
      if (winner) return accept(winner);
    }
    throw error;
  } finally { await unlink(temporary).catch(() => {}); }
  return publicReport(record);
}
export async function listCareDirectReports(): Promise<CareDirectReport[]> {
  const db = client();
  let records: StoredReport[];
  if (db) {
    records = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("care_direct_reports").select("record").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (error) throw error;
      records.push(...data.map(row => row.record as StoredReport));
      if (data.length < 500) break;
    }
  } else {
    await mkdir(directory(), { recursive: true, mode: 0o700 });
    const files = (await readdir(directory())).filter(name => /^CD-[0-9a-f-]{36}\.json$/.test(name));
    records = (await Promise.all(files.map(name => readStored(name.slice(0, -5))))).filter((row): row is StoredReport => row !== null);
  }
  return records.map(publicReport).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function updateCareDirectStatus(id: string, status: CareDirectStatus) {
  const record = await readStored(id);
  if (!record) return null;
  const next = { ...record, status, updatedAt: new Date().toISOString() };
  const db = client();
  if (db) {
    const { error } = await db.from("care_direct_reports").update({ record: next }).eq("id", id);
    if (error) throw error;
  } else {
    const temporary = path.join(directory(), `${id}.${randomUUID()}.tmp`);
    try { await writeFile(temporary, JSON.stringify(next), { mode: 0o600 }); await rename(temporary, path.join(directory(), `${id}.json`)); }
    finally { await unlink(temporary).catch(() => {}); }
  }
  return publicReport(next);
}
export async function streamCareDirectVideo(request: Request, id: string) {
  const record = await readStored(id);
  if (!record) return null;
  const headers = evidenceHeaders(request, record.video);
  if (request.method === "HEAD") return new Response(null, { headers });
  const range = byteRange(request.headers.has("if-range") ? null : request.headers.get("range"), record.video.size);
  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${record.video.size}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  }
  const status = range ? 206 : 200;
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${record.video.size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
  }
  const db = client();
  if (db) {
    const { data, error } = await db.storage.from(bucket).createSignedUrl(record.storagePath, 60);
    if (error || !data?.signedUrl) throw new Error("Video access failed.");
    const upstream = await fetch(data.signedUrl, {
      headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {},
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(40_000)]),
      cache: "no-store",
    });
    if (upstream.status !== status || (range && upstream.headers.get("content-range") !== headers.get("Content-Range"))) {
      await upstream.body?.cancel();
      throw new Error("Video retrieval failed.");
    }
    return new Response(upstream.body, { status, headers });
  }
  const stream = createReadStream(path.join(directory(), record.storagePath), {
    ...(range ? { start: range.start, end: range.end } : {}), signal: request.signal,
  });
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status, headers });
}
