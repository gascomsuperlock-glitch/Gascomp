import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import { savedContentMatches } from "./save-readback.ts";
import { createContentChanges, applyContentChanges } from "./content-changes.ts";
import { createSaveResponse } from "./save-response.ts";

const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "./save-readback") return { url: new URL("./save-readback.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "./content-changes") return { url: new URL("./content-changes.ts", import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { requestContentSave } = await import("./save-request.ts");
const { readSaveRequest } = await import("./save-request-body.ts");
hooks.deregister();

const content = { products: [], whatsappNumber: "123", supportHours: "Monday" };

test("save uses the stable authenticated endpoint and returns saved content", async () => {
  const result = await requestContentSave(content, async (url, init) => {
    assert.equal(url, "/admin/content");
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.redirect, "error");
    assert.deepEqual(JSON.parse(init.body), content);
    return Response.json({ success: true, content });
  });
  assert.deepEqual(result, { success: true, content });
});

test("hosting HTML errors produce actionable messages without exposing response bodies", async () => {
  for (const [status, expected] of [[401, /session has expired/], [403, /origin/], [404, /Deploy/], [413, /size limit/], [502, /502/], [503, /503/], [504, /may still be processing/]]) {
    const result = await requestContentSave(content, async () => new Response("private proxy details", { status }));
    assert.equal(result.success, false);
    assert.match(result.error, expected);
    assert.ok(!result.error.includes("private proxy details"));
  }
});

test("failed transport does not assert that the save never reached the server", async () => {
  let calls = 0;
  const result = await requestContentSave(content, async () => { calls++; throw new TypeError("Failed to fetch"); });
  assert.equal(calls, 2);
  assert.match(result.error, /may have reached the server/);
});

const product = {
  id: "new-product", slug: "new-product", name: "New product", sku: "TEST-NEW",
  model: "", description: "A new guide", tone: "orange", published: true,
  archived: false, everPublished: false, variations: [], images: [], videos: [],
  issues: [], faqs: [{ id: "faq-1", question: "How?", answer: "Follow the guide." }],
};

test("adding one product sends only that product and reconstructs a compact response", async () => {
  const existing = { ...product, id: "existing", name: "Existing guide", description: "x".repeat(100_000) };
  const baseline = { ...content, products: [existing] };
  const submitted = { ...baseline, products: [existing, product] };
  const result = await requestContentSave(submitted, async (_url, init) => {
    const changes = JSON.parse(init.body);
    assert.deepEqual(changes, { mode: "changes", products: [product], removedProductIds: [], settings: {} });
    assert.ok(init.body.length < 1000);
    return Response.json({ success: true, mode: "changes", content: { ...content, products: [{ ...product, everPublished: true }] } });
  }, baseline);
  assert.equal(result.success, true);
  assert.deepEqual(result.content.products[0], existing);
  assert.equal(result.content.products[1].everPublished, true);
});

test("changes include explicit removals and only edited settings, preserving concurrent untouched products", () => {
  const baseline = { ...content, products: [product] };
  const submitted = { ...content, supportHours: "Tuesday", products: [] };
  const changes = createContentChanges(submitted, baseline);
  assert.deepEqual(changes, { mode: "changes", products: [], removedProductIds: [product.id], settings: { supportHours: "Tuesday" } });
  const other = { ...product, id: "added-elsewhere" };
  const current = { ...baseline, whatsappNumber: "456", products: [product, other] };
  assert.deepEqual(applyContentChanges(current, changes), { products: [other], whatsappNumber: "456", supportHours: "Tuesday" });
});

test("compact responses missing a changed product cannot discard unsaved edits", async () => {
  const submitted = { ...content, products: [product] };
  const result = await requestContentSave(submitted, async (_url, init) =>
    Response.json({ success: true, ...(init.method === "POST" ? { mode: "changes" } : {}), content }), content);
  assert.equal(result.success, false);
});

test("an interrupted save is confirmed by matching database readback without another write", async () => {
  const submitted = { ...content, products: [product] };
  const stored = { ...content, products: [{ ...product, everPublished: true, attributes: [] }] };
  const methods = [];
  const result = await requestContentSave(submitted, async (url, init) => {
    assert.equal(url, "/admin/content");
    methods.push(init.method);
    if (init.method === "POST") throw new TypeError("Failed to fetch");
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "same-origin");
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json({ success: true, content: stored });
  });
  assert.deepEqual(methods, ["POST", "GET"]);
  assert.deepEqual(result, { success: true, content: stored });
});

test("readback cannot mistake a missing product, partial write, or different settings for success", async () => {
  const submitted = { ...content, products: [product] };
  for (const stored of [content, { ...submitted, supportHours: "Different" }, { ...content, products: [{ ...product, faqs: [] }] }]) {
    const result = await requestContentSave(submitted, async (_url, init) => {
      if (init.method === "POST") throw new TypeError("Failed to fetch");
      return Response.json({ success: true, content: stored });
    });
    assert.equal(result.success, false);
    assert.match(result.error, /could not confirm all edits/);
  }
});

test("truncated and gateway responses recover only from a successful matching readback", async () => {
  for (const failed of [new Response("{", { headers: { "content-type": "application/json" } }), new Response("Bad gateway", { status: 502 }), new Response("Timeout", { status: 504 })]) {
    const result = await requestContentSave(content, async (_url, init) => init.method === "POST" ? failed : Response.json({ success: true, content }));
    assert.equal(result.success, true);
  }
  for (const failedRead of [new Response("Expired", { status: 401 }), Response.json({ success: true, content }, { status: 503 }), Response.json({ success: true, content: null })]) {
    const result = await requestContentSave(content, async (_url, init) => {
      if (init.method === "POST") throw new TypeError("Failed to fetch");
      return failedRead;
    });
    assert.equal(result.success, false);
  }
});

test("readback ignores object key and catalog order but preserves child order and pending image bytes", () => {
  const second = { ...product, id: "second", sku: "SECOND" };
  assert.equal(savedContentMatches({ ...content, products: [product, second] }, { products: [second, product], supportHours: content.supportHours, whatsappNumber: content.whatsappNumber }), true);
  const original = { ...content, products: [{ ...product, faqs: [product.faqs[0], { id: "faq-2", question: "When?", answer: "Now." }] }] };
  const reversed = structuredClone(original); reversed.products[0].faqs.reverse();
  assert.equal(savedContentMatches(original, reversed), false);
  const pending = { ...content, products: [{ ...product, images: [{ id: "image", dataUrl: "data:image/png;base64,AAAA" }] }] };
  const uploaded = { ...content, products: [{ ...product, images: [{ id: "image", url: "https://example.com/photo.png" }] }] };
  assert.equal(savedContentMatches(pending, uploaded), false);
});

test("invalid or truncated responses never report a successful save", async () => {
  for (const response of [new Response("<html>Login</html>"), new Response("{", { headers: { "content-type": "application/json" } }), Response.json({ success: true }), Response.json({ success: true, content }, { status: 500 })]) {
    const result = await requestContentSave(content, async () => response);
    assert.equal(result.success, false);
    assert.match(result.error, /invalid save response/);
  }
});

test("server validation failures remain visible", async () => {
  const failure = { success: false, error: "Changes were not saved to Supabase." };
  assert.deepEqual(await requestContentSave(content, async () => Response.json(failure, { status: 422 })), failure);
});

function request(body, headers = {}) {
  return new Request("https://example.com/admin/content", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
}

test("save body accepts valid content and rejects malformed content", async () => {
  assert.deepEqual(await readSaveRequest(request(JSON.stringify(content))), { success: true, content });
  for (const body of ["{", "null", "{}", '{"products":[]}']) {
    assert.equal((await readSaveRequest(request(body))).status, 400);
  }
  assert.equal((await readSaveRequest(request("{}", { "Content-Type": "text/plain" }))).status, 415);
});

test("save body validates compact changes before persistence", async () => {
  const changes = { mode: "changes", products: [product], removedProductIds: [], settings: {} };
  assert.deepEqual(await readSaveRequest(request(JSON.stringify(changes))), { success: true, content: changes });
  for (const invalid of [
    { ...changes, mode: "unknown" }, { ...changes, products: [product, product] },
    { ...changes, products: [null] }, { ...changes, removedProductIds: [product.id] },
    { ...changes, removedProductIds: [false] }, { ...changes, removedProductIds: ["old", "old"] },
    { ...changes, settings: [] }, { ...changes, settings: { supportHours: false } },
    { ...changes, settings: { unexpected: "value" } },
  ]) assert.equal((await readSaveRequest(request(JSON.stringify(invalid)))).status, 400);
});

test("save body enforces byte limits with and without a content-length header", async () => {
  assert.equal((await readSaveRequest(request("{}", { "content-length": "101" }), 100)).status, 413);
  assert.equal((await readSaveRequest(request(JSON.stringify(content)), 10)).status, 413);
  const body = JSON.stringify({ ...content, supportHours: "日" });
  const bytes = new TextEncoder().encode(body).length;
  assert.equal((await readSaveRequest(request(body), bytes)).success, true);
  assert.equal((await readSaveRequest(request(body), bytes - 1)).status, 413);
});

test("save responses have an exact identity-encoded length for hosting proxies", async () => {
  const body = { success: false, error: "Sambungan terputus." };
  const response = createSaveResponse(body, 422);
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("cache-control"), "no-store, no-transform");
  assert.equal(response.headers.get("content-encoding"), "identity");
  const text = await response.text();
  assert.equal(response.headers.get("content-length"), String(new TextEncoder().encode(text).byteLength));
  assert.deepEqual(JSON.parse(text), body);
});
