import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const state = { authorized: true, reads: 0, conversions: 0, missing: false, failPreview: false };
globalThis.evidenceRouteTest = state;
const mock = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return mock("export {};");
  if (specifier.endsWith("/auth/server/session")) return mock("export const getAdminSession = async () => globalThis.evidenceRouteTest.authorized;");
  if (specifier.endsWith("/warranty/server/ticket-service")) return mock("export const readWarrantyEvidence = async () => { const s = globalThis.evidenceRouteTest; s.reads++; return s.missing ? null : { bytes: new Uint8Array([1,2,3]), name: 'original.mov', mimeType: 'video/quicktime' }; };");
  if (specifier.endsWith("/warranty/server/video-preview")) return mock("export const createVideoPreview = async () => { const s = globalThis.evidenceRouteTest; s.conversions++; return s.failPreview ? null : new Uint8Array([4,5]); };");
  if (specifier.endsWith("/warranty/server/evidence-response")) return { url: new URL("./evidence-response.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { GET, HEAD } = await import("../../../app/admin/tiket/[ticketId]/lampiran/[evidenceId]/route.ts");
hooks.deregister();
const context = { params: Promise.resolve({ ticketId: "GWC-20260914-ABC123", evidenceId: "video" }) };

test("evidence authentication and identifier checks precede reads or conversion", async () => {
  state.authorized = false;
  for (const method of [GET, HEAD]) {
    const response = await method(new Request("https://example.test/evidence?preview=1"), context);
    assert.equal(response.status, 401);
  }
  assert.equal(state.reads, 0);
  assert.equal(state.conversions, 0);
  state.authorized = true;
  const response = await GET(new Request("https://example.test/evidence"), { params: Promise.resolve({ ticketId: "../secret", evidenceId: "video" }) });
  assert.equal(response.status, 404);
  assert.equal(state.reads, 0);
});

test("previews are private MP4 while downloads retain the original evidence", async () => {
  const preview = await GET(new Request("https://example.test/evidence?preview=1"), context);
  assert.equal(preview.headers.get("content-type"), "video/mp4");
  assert.equal(preview.headers.get("cache-control"), "private, no-store");
  assert.deepEqual([...new Uint8Array(await preview.arrayBuffer())], [4, 5]);
  const conversions = state.conversions;
  const original = await GET(new Request("https://example.test/evidence?preview=1&download=1"), context);
  assert.equal(original.headers.get("content-type"), "video/quicktime");
  assert.match(original.headers.get("content-disposition"), /attachment; filename="original.mov"/);
  assert.deepEqual([...new Uint8Array(await original.arrayBuffer())], [1, 2, 3]);
  assert.equal(state.conversions, conversions);
  const head = await HEAD(new Request("https://example.test/evidence", { method: "HEAD" }), context);
  assert.equal(head.headers.get("content-length"), "3");
  assert.equal(await head.text(), "");
});

test("missing evidence and unavailable previews return errors instead of invalid video bytes", async () => {
  state.missing = true;
  assert.equal((await GET(new Request("https://example.test/evidence?preview=1"), context)).status, 404);
  state.missing = false;
  state.failPreview = true;
  const response = await GET(new Request("https://example.test/evidence?preview=1"), context);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(await response.text(), /download the original/);
});
