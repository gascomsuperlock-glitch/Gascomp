import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminSession } from "@/features/auth/server/session";
import { assistanceDatabase } from "./database";
import { isLanguage, isRecord, UUID_PATTERN, validateSnapshot } from "../model/validation";
import { validateGeneratedResponse } from "../model/generated-response";

const SESSION_COOKIE = "gascomp_ai_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
class RequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
function enabled() { return process.env.GASCOMP_AI_ASSISTANCE_ENABLED === "true"; }
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function verifyOrigin(request: Request, required = true) {
  const origin = request.headers.get("origin");
  const origins = new Set([new URL(request.url).origin]);
  try { if (process.env.GASCOMP_PUBLIC_BASE_URL) origins.add(new URL(process.env.GASCOMP_PUBLIC_BASE_URL).origin); } catch { /* Ignore invalid configuration. */ }
  if ((required && !origin) || (origin && !origins.has(origin)) || request.headers.get("sec-fetch-site") === "cross-site") throw new RequestError("Request origin is not allowed.", 403);
}
async function body(request: Request, maximum = 8192) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new RequestError("JSON is required.", 415);
  if (Number(request.headers.get("content-length")) > maximum) throw new RequestError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("A request body is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new RequestError("Request is too large.", 413); }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!isRecord(parsed)) throw new Error("Not an object");
    return parsed;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("Invalid JSON request.", 400);
  }
}
function keys(data: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(data).some(key => !allowed.includes(key))) throw new RequestError("Unexpected request fields.", 400);
}
async function command(action: string, payload: Record<string, unknown>) {
  const db = assistanceDatabase();
  const { data, error } = await db.rpc("gascomp_ai_command", { action, payload });
  if (error || !isRecord(data)) throw new RequestError("Assistant service is unavailable.", 503);
  if (typeof data.error === "string") throw new RequestError(data.error, typeof data.status === "number" ? data.status : 503);
  return data;
}
async function guarded(action: () => Promise<Response>, requireEnabled = true) {
  try {
    if (requireEnabled && !enabled()) return reply({ error: "Assistant is disabled." }, 404);
    return await action();
  } catch (error) {
    return reply({ error: error instanceof RequestError ? error.message : "Assistant service is unavailable." }, error instanceof RequestError ? error.status : 503);
  }
}
async function sessionToken(create = false) {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing && SESSION_TOKEN_PATTERN.test(existing)) return existing;
  if (!create) throw new RequestError("Chat session expired.", 401);
  return randomBytes(32).toString("base64url");
}
export function handleSession(request: Request) {
  return guarded(async () => {
    verifyOrigin(request);
    const data = await body(request);
    keys(data, ["language", "newConversation"]);
    if (!isLanguage(data.language) || (data.newConversation !== undefined && typeof data.newConversation !== "boolean")) throw new RequestError("Invalid session request.", 400);
    const jar = await cookies();
    const existing = jar.get(SESSION_COOKIE)?.value;
    let token: string;
    let create = false;
    if (data.newConversation !== true && existing && SESSION_TOKEN_PATTERN.test(existing)) token = existing;
    else { token = randomBytes(32).toString("base64url"); create = true; }
    const state = await command("session", { tokenHash: hash(token), language: data.language });
    if (create) jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/ai-assistance", maxAge: SESSION_SECONDS });
    return reply(state);
  });
}
export function handleMessages(request: Request) {
  return guarded(async () => {
    verifyOrigin(request, request.method !== "GET");
    const token = await sessionToken();
    const data = request.method === "GET" ? { language: new URL(request.url).searchParams.get("language") ?? "en" } : await body(request);
    if (!isLanguage(data.language)) throw new RequestError("Invalid language.", 400);
    if (request.method === "POST") {
      keys(data, ["requestId", "text", "language", "sku"]);
      if (typeof data.requestId !== "string" || !UUID_PATTERN.test(data.requestId) || typeof data.text !== "string" || !data.text.trim() || data.text.length > 2000 || (data.sku !== undefined && (typeof data.sku !== "string" || !data.sku.trim() || data.sku.length > 100))) throw new RequestError("Invalid chat message.", 400);
    }
    return reply(await command(request.method === "GET" ? "messages" : "send", { ...data, tokenHash: hash(token) }));
  });
}
export function handleWorker(request: Request, operation: "heartbeat" | "knowledge" | "claim" | "complete") {
  return guarded(async () => {
    const expected = process.env.GASCOMP_AI_WORKER_TOKEN ?? "";
    const supplied = request.headers.get("authorization") ?? "";
    if (expected.length < 32 || !timingSafeEqual(Buffer.from(hash(supplied)), Buffer.from(hash(`Bearer ${expected}`)))) throw new RequestError("Worker authentication failed.", 401);
    let data: Record<string, unknown>;
    try { data = await body(request, operation === "knowledge" ? 4 * 1024 * 1024 : operation === "complete" ? 24 * 1024 : 8192); }
    catch (error) { if (operation === "knowledge") await command("knowledge", { ready: false }); throw error; }
    if (operation === "knowledge") {
      try {
        keys(data, ["ready", "snapshot"]);
        if (data.ready === true) data.snapshot = validateSnapshot(data.snapshot);
        else if (data.ready !== false || data.snapshot !== undefined) throw new Error("Invalid knowledge request");
      } catch {
        await command("knowledge", { ready: false });
        throw new RequestError("Knowledge validation failed; answers are disabled.", 422);
      }
    } else if (operation === "heartbeat") {
      keys(data, ["ready", "knowledgeVersion"]);
      if (typeof data.ready !== "boolean" || !(data.knowledgeVersion === null || (typeof data.knowledgeVersion === "string" && /^[a-f0-9]{64}$/.test(data.knowledgeVersion)))) throw new RequestError("Invalid worker heartbeat.", 400);
    } else if (operation === "complete") {
      keys(data, ["jobId", "leaseToken", "knowledgeVersion", "answerId", "response", "resolvedSku"]);
      const legacyMode = Object.hasOwn(data, "answerId");
      const generatedMode = Object.hasOwn(data, "response");
      if (legacyMode === generatedMode || typeof data.jobId !== "string" || !UUID_PATTERN.test(data.jobId) || typeof data.leaseToken !== "string" || !UUID_PATTERN.test(data.leaseToken) || typeof data.knowledgeVersion !== "string" || !/^[a-f0-9]{64}$/.test(data.knowledgeVersion) || (legacyMode && !(data.answerId === null || (typeof data.answerId === "string" && /^[a-z0-9][a-z0-9._-]{0,79}$/.test(data.answerId)))) || !(data.resolvedSku === undefined || (typeof data.resolvedSku === "string" && data.resolvedSku.trim().length > 0 && data.resolvedSku.length <= 100))) throw new RequestError("Invalid worker result.", 400);
      if (generatedMode) {
        try { data.response = validateGeneratedResponse(data.response); }
        catch { throw new RequestError("Invalid worker result.", 400); }
      }
    } else keys(data, []);
    return reply(await command(operation, data));
  });
}
export function handleStatus(request: Request) {
  return guarded(async () => {
    verifyOrigin(request, request.method !== "GET");
    if (!(await getAdminSession())) throw new RequestError("Admin sign-in is required.", 401);
    if (!enabled()) {
      if (request.method === "POST") throw new RequestError("Assistant is disabled.", 409);
      return reply({ enabled: false, paused: false, workerOnline: false, knowledgeReady: false, knowledgeVersion: null, queuedJobs: 0, lastHeartbeat: null });
    }
    if (request.method === "POST") {
      const data = await body(request);
      keys(data, ["paused"]);
      if (typeof data.paused !== "boolean") throw new RequestError("Invalid pause state.", 400);
      return reply(await command("pause", data));
    }
    return reply(await command("status", {}));
  }, false);
}
