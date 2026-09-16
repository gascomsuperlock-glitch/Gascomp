import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { beforeEach, after, test } from "node:test";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "@/shared/integrations/supabase/server") return { url: new URL("../../../shared/integrations/supabase/server.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./evidence-response") return { url: new URL("./evidence-response.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { supabaseEvidenceResponse } = await import("./supabase-evidence.ts");
hooks.deregister();
const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SECRET_KEY;
process.env.SUPABASE_URL = "https://evidence.example.test";
process.env.SUPABASE_SECRET_KEY = "test-service-key";
const bytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
let state;
const request = (options = {}) => new Request("https://app.example.test/evidence", options);
const serve = (req = request()) => supabaseEvidenceResponse(req, "GWC-20260916-ABC123", "video");
beforeEach(() => {
  state = { objects: [], deleted: false, missing: false, metadataError: false, delayed: false, cancelled: false, ignoreRange: false, wrongRange: false };
  globalThis.fetch = async (input, init) => {
    init.signal.throwIfAborted();
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.pathname.endsWith("/warranty_tickets")) return Response.json({ deleted_at: state.deleted ? "2026-09-16" : null });
    if (url.pathname.endsWith("/warranty_evidence")) {
      assert.equal(url.searchParams.get("ticket_id"), "eq.GWC-20260916-ABC123");
      assert.equal(url.searchParams.get("id"), "eq.video");
      return state.metadataError ? Response.json({ message: "private database detail" }, {status: 400}) : Response.json(state.missing ? null : { original_name: "original.mp4", storage_path: "tickets/test/video.mp4", mime_type: "video/mp4", size_bytes: bytes.length });
    }
    assert.equal(url.pathname, "/storage/v1/object/warranty-evidence/tickets/test/video.mp4");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer test-service-key");
    state.objects.push(init);
    if (state.blockHeaders) return new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => { state.signalAborted = true; reject(init.signal.reason); }, { once: true });
      state.headersStarted();
    });
    if (init.method === "HEAD") return new Response(null, { headers: { "content-length": "6" } });
    const range = new Headers(init.headers).get("range");
    if (range && !state.ignoreRange) {
      const [, first, last] = /bytes=(\d+)-(\d+)/.exec(range);
      return new Response(bytes.slice(Number(first), Number(last) + 1), { status: 206, headers: { "content-range": state.wrongRange ? "bytes 2-3/6" : `bytes ${first}-${last}/6`, "content-length": String(Number(last) - Number(first) + 1) } });
    }
    if (state.delayed) {
      let onAbort;
      return new Response(new ReadableStream({
        start(controller) {
          onAbort = () => { state.signalAborted = true; controller.error(init.signal.reason); };
          init.signal.addEventListener("abort", onAbort, { once: true });
          state.release = () => {
            init.signal.removeEventListener("abort", onAbort);
            controller.enqueue(bytes);
            controller.close();
          };
        },
        cancel() {
          init.signal.removeEventListener("abort", onAbort);
          state.cancelled = true;
        },
      }), { headers: { "content-length": "6" } });
    }
    return new Response(state.body ?? bytes, { headers: { "content-length": "6", "x-private-provider": "secret", location: "https://private.example.test" } });
  };
});
after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of [["SUPABASE_URL", originalUrl], ["SUPABASE_SECRET_KEY", originalKey]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test("original video starts streaming without waiting for all stored bytes", async () => {
  state.delayed = true;
  const response = await serve();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-private-provider"), null);
  state.release();
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
});

test("range probes and seeking fetch only exact requested Storage bytes", async () => {
  for (const [range, expected, normalized] of [["bytes=0-1", [0, 1], "bytes=0-1"], ["bytes=-2", [4, 5], "bytes=4-5"], ["bytes=3-", [3, 4, 5], "bytes=3-5"]]) {
    const response = await serve(request({ headers: { range } }));
    assert.equal(response.status, 206);
    assert.equal(new Headers(state.objects.at(-1).headers).get("range"), normalized);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], expected);
  }
});

test("HEAD checks Storage existence without reading or transferring the video body", async () => {
  const response = await serve(request({ method: "HEAD", headers: { range: "bytes=0-1" } }));
  assert.equal(response.status, 200);
  assert.equal(state.objects[0].method, "HEAD");
  assert.equal(new Headers(state.objects[0].headers).get("range"), null);
  assert.equal(response.headers.get("content-length"), "6");
  assert.equal(await response.text(), "");
});

test("deleted or missing evidence never requests private Storage; errors stay private", async () => {
  state.deleted = true;
  assert.equal(await serve(), null);
  state.deleted = false;
  state.missing = true;
  assert.equal(await serve(), null);
  state.missing = false;
  state.metadataError = true;
  const response = await serve();
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /database detail/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(state.objects.length, 0);
});

test("unsatisfiable ranges skip download; ignored ranges and If-Range correctly send a full response", async () => {
  const invalid = await serve(request({ headers: { range: "bytes=6-" } }));
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get("content-range"), "bytes */6");
  assert.equal(state.objects.length, 0);
  state.ignoreRange = true;
  const ignored = await serve(request({ headers: { range: "bytes=0-1" } }));
  assert.equal(ignored.status, 200);
  assert.deepEqual(new Uint8Array(await ignored.arrayBuffer()), bytes);
  const stale = await serve(request({ headers: { range: "bytes=0-1", "if-range": '"old"' } }));
  assert.equal(stale.status, 200);
  assert.equal(new Headers(state.objects.at(-1).headers).get("range"), null);
  await stale.arrayBuffer();
});

test("invalid upstream range responses are rejected, and closing playback cancels Storage stream", async () => {
  state.wrongRange = true;
  assert.equal((await serve(request({ headers: { range: "bytes=0-1" } }))).status, 503);
  state.delayed = true;
  const response = await serve();
  await response.body.cancel();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.cancelled, true);
});


test("truncated or oversized Storage bodies fail instead of becoming valid preview bytes", async () => {
  for (const body of [new Uint8Array([1]), new Uint8Array(7)]) {
    state.body = body;
    const response = await serve();
    await assert.rejects(response.arrayBuffer(), /Evidence (transfer incomplete|length exceeded)/);
  }
});


test("aborting the admin request before Storage headers cancels fetch and returns a private error", { timeout: 1_000 }, async () => {
  const controller = new AbortController();
  state.blockHeaders = true;
  const started = new Promise(resolve => { state.headersStarted = resolve; });
  const pending = serve(request({ signal: controller.signal }));
  await started;
  controller.abort();
  const response = await pending;
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(state.signalAborted, true);
  assert.equal(state.objects[0].signal.aborted, true);
});

test("aborting the admin request after headers terminates an in-progress Storage body", { timeout: 1_000 }, async () => {
  const controller = new AbortController();
  state.delayed = true;
  const response = await serve(request({ signal: controller.signal }));
  assert.equal(response.status, 200);
  const reading = response.arrayBuffer();
  controller.abort();
  await assert.rejects(reading, { name: "AbortError" });
  assert.equal(state.signalAborted, true);
  assert.equal(state.objects[0].signal.aborted, true);
});
