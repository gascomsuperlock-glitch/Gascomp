import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
const state = { authorized: false, paths: [], fail: false };
globalThis.imageUploadTest = state;
const mock = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return mock("");
  if (specifier.endsWith("/auth/server/session")) return mock("export const getAdminSession = async () => globalThis.imageUploadTest.authorized;");
  if (specifier.endsWith("/integrations/supabase/server")) return mock(`export const createAdminSupabaseClient = () => ({ storage: { from(bucket) {
    if(bucket !== 'product-images') throw new Error('Wrong bucket');
    return { createSignedUploadUrl: async path => { const s=globalThis.imageUploadTest; s.paths.push(path); return s.fail ? {error:true} : {data:{signedUrl:'https://storage.test/signed'}}; }, getPublicUrl: path => ({data:{publicUrl:'https://storage.test/'+path}}) };
  } } });`);
  return next(specifier, context);
} });
const { createImageUpload } = await import("./image-upload.ts");
hooks.deregister();
const input = { productId: "new-product", imageId: "photo", type: "image/webp", size: 75060 };
const request = (data, headers = {}) => new Request("https://example.test/admin/images/upload", { method: "POST", headers: { origin: "https://example.test", "content-type": "application/json", ...headers }, body: JSON.stringify(data) });

test("image authorization requires a session, trusted origin, safe identifiers and bounded JSON", async () => {
  assert.equal((await createImageUpload(request(input))).status, 401);
  state.authorized = true;
  assert.equal((await createImageUpload(request(input, { origin: "https://untrusted.test" }))).status, 403);
  assert.equal((await createImageUpload(request(input, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await createImageUpload(request(input, { "content-length": "4097" }))).status, 413);
  assert.equal((await createImageUpload(request({ ...input, padding: "x".repeat(4096) }))).status, 413);
  for (const invalid of [{ ...input, productId: "../other" }, { ...input, imageId: "photo/file" }, { ...input, type: "image/svg+xml" }, { ...input, size: 0 }, { ...input, size: 1.5 }, { ...input, size: 8*1024*1024+1 }, { ...input, size: "10" }]) {
    assert.equal((await createImageUpload(request(invalid))).status, 400);
  }
  assert.deepEqual(state.paths, []);
  const response = await createImageUpload(request(input));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.storagePath, /^products\/new-product\/photo-[\w-]+\.webp$/);
  assert.equal(result.signedUrl, "https://storage.test/signed");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  state.fail = true;
  assert.equal((await createImageUpload(request(input))).status, 503);
});
