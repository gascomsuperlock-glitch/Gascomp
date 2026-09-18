import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { uploadProductImages } = await import("./upload-product-images.ts");
const { requestContentSave } = await import("./save-request.ts");
hooks.deregister();
const image = { id: "photo", name: "photo.png", alt: "Product", isPrimary: true, dataUrl: "data:image/png;base64,AQID" };
const product = { id: "new", slug: "new", sku: "NEW", name: "New", model: "", description: "", tone: "orange", published: false, archived: false, everPublished: false, images: [image], variations: [], videos: [], issues: [], faqs: [] };
const content = { products: [product], whatsappNumber: "123", supportHours: "Monday" };
const authorization = { signedUrl: "https://storage.test/signed", publicUrl: "https://storage.test/photo.png", storagePath: "products/new/photo.png" };

test("photos upload as binary before Save and completed uploads survive an interrupted Save", async () => {
  let permits = 0; let uploads = 0;
  const cache = new Map();
  const send = async (url, init) => {
    permits++;
    assert.equal(url, "/admin/images/upload");
    assert.equal(init.credentials, "same-origin");
    assert.deepEqual(JSON.parse(init.body), { productId: "new", imageId: "photo", type: "image/png", size: 3 });
    return Response.json(authorization);
  };
  const upload = async (file, url) => { uploads++; assert.equal(url, authorization.signedUrl); assert.deepEqual([...new Uint8Array(await file.arrayBuffer())], [1,2,3]); };
  const prepared = await uploadProductImages(content, cache, send, upload);
  assert.equal(prepared.products[0].images[0].dataUrl, undefined);
  assert.equal(prepared.products[0].images[0].url, authorization.publicUrl);
  assert.equal(content.products[0].images[0].dataUrl, image.dataUrl);
  const edited = { ...content, products: [{ ...product, images: [{ ...image, alt: "Updated description" }] }] };
  const retried = await uploadProductImages(edited, cache, send, upload);
  assert.equal(retried.products[0].images[0].alt, "Updated description");
  assert.equal(permits, 1); assert.equal(uploads, 1);
  await uploadProductImages({ ...content, products: [] }, cache, send, upload);
  assert.equal(cache.size, 0);
});

test("failed photo transfers are not cached and changing image bytes triggers a new upload", async () => {
  const cache = new Map(); let calls = 0;
  const send = async () => { calls++; return Response.json(authorization); };
  await assert.rejects(() => uploadProductImages(content, cache, send, async () => { throw new Error("Disconnected"); }), /Disconnected/);
  assert.equal(cache.size, 0);
  await uploadProductImages(content, cache, send, async () => {});
  await uploadProductImages({ ...content, products: [{ ...product, images: [{ ...image, dataUrl: "data:image/png;base64,BAUG" }] }] }, cache, send, async () => {});
  assert.equal(calls, 3);
});

test("photo authorization failures stop before catalog persistence and preserve original image data", async () => {
  const calls = [];
  const result = await requestContentSave(content, async (url) => { calls.push(url); return Response.json({ error: "Your session expired." }, { status: 401 }); });
  assert.deepEqual(calls, ["/admin/images/upload"]);
  assert.equal(result.success, false);
  assert.match(result.error, /Image upload failed.*session expired/);
  assert.equal(content.products[0].images[0].dataUrl, image.dataUrl);
});

test("Save posts image metadata only and reuses the uploaded file after a failed catalog request", async () => {
  const Original = globalThis.XMLHttpRequest;
  let uploads = 0; let permits = 0; let saves = 0;
  globalThis.XMLHttpRequest = class {
    upload = {};
    open() {} setRequestHeader() {}
    send(body) { assert.ok(body instanceof FormData); uploads++; this.status = 200; queueMicrotask(() => this.onload()); }
    abort() { this.onabort?.(); }
  };
  const baseline = { ...content, products: [] }; const cache = new Map();
  try {
    const send = async (url, init) => {
      if (url === "/admin/images/upload") { permits++; return Response.json(authorization); }
      if (init.method === "GET") return Response.json({ success: true, content: baseline });
      saves++;
      const body = JSON.parse(init.body);
      assert.equal(body.mode, "changes");
      assert.ok(!init.body.includes("data:image"));
      assert.equal(body.products[0].images[0].storagePath, authorization.storagePath);
      if (saves === 1) throw new TypeError("Failed to fetch");
      return Response.json({ success: true, mode: "changes", content: { ...content, products: body.products } });
    };
    assert.equal((await requestContentSave(content, send, baseline, cache)).success, false);
    assert.equal((await requestContentSave(content, send, baseline, cache)).success, true);
    assert.equal(permits, 1); assert.equal(uploads, 1); assert.equal(saves, 2);
  } finally { globalThis.XMLHttpRequest = Original; }
});
