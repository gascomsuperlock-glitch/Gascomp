import assert from "node:assert/strict";
import { test } from "node:test";
import { migrateContent } from "./migrate-content.ts";
import { mapProduct, statusFromProduct } from "./product-mappers.ts";

function product(overrides = {}) {
  return {
    id: "local", slug: "regulator", sku: "GC-100", name: "Regulator",
    model: "", description: "", tone: "navy", published: false,
    archived: false, everPublished: false, variations: [], images: [],
    videos: [], issues: [], faqs: [], ...overrides,
  };
}

test("local migration removes samples and retains published content during source refresh", () => {
  const source = { provider: "duoke", productId: "123", storeId: "shop" };
  const faq = { id: "faq", question: "How?", answer: "Use the guide." };
  const saved = { whatsappNumber: "628123", supportHours: "Monday", products: [
    product({ id: "product-adjuster" }),
    product({ id: "edited", source, published: true, everPublished: undefined, faqs: [faq] }),
    product({ id: "legacy", slug: "old-sku", sku: undefined, images: undefined, variations: undefined }),
  ] };
  const before = structuredClone(saved);
  const imported = product({ id: "imported", name: "Latest name", source });
  const added = product({ id: "new", source: { ...source, productId: "456" } });
  const result = migrateContent(saved, { ...saved, products: [imported, added] });
  assert.deepEqual(result.products.map((item) => item.id), ["edited", "legacy", "new"]);
  assert.equal(result.products[0].name, "Latest name");
  assert.equal(result.products[0].published, true);
  assert.equal(result.products[0].everPublished, true);
  assert.deepEqual(result.products[0].faqs, [faq]);
  assert.equal(result.products[1].sku, "OLD-SKU");
  assert.deepEqual(result.products[1].images, []);
  assert.equal(result.whatsappNumber, saved.whatsappNumber);
  assert.deepEqual(saved, before);
});

test("local migration translates legacy system defaults without changing source content", () => {
  const manual = product({
    name: "Produk Baru",
    model: "Nama model",
    description: "Tambahkan ringkasan bantuan untuk produk ini.",
    variations: [{ id: "variation", name: "Variasi baru", sku: "SKU-BARU-1" }],
    images: [{ id: "image", name: "photo.jpg", dataUrl: "data:image/webp;base64,AA==", alt: "Foto Produk Baru", isPrimary: true }],
    videos: [{ id: "video", title: "Tutorial baru", description: "", youtubeUrl: "", duration: "" }],
    faqs: [{ id: "faq", question: "Pertanyaan baru", answer: "Tuliskan jawaban untuk pelanggan." }],
  });
  const source = product({
    id: "source",
    name: "Produk Baru",
    source: { provider: "duoke", productId: "source-product" },
  });
  const saved = { whatsappNumber: "628123", supportHours: "Senin–Sabtu, 08.00–17.00 WIB", products: [manual, source] };
  const result = migrateContent(saved, { ...saved, products: [] });

  assert.equal(result.supportHours, "Monday–Saturday, 08:00–17:00 WIB");
  assert.equal(result.products[0].name, "New Product");
  assert.equal(result.products[0].model, "Model name");
  assert.equal(result.products[0].description, "Add a short support summary for this product.");
  assert.equal(result.products[0].variations[0].name, "New variation");
  assert.equal(result.products[0].images[0].alt, "Photo of New Product");
  assert.equal(result.products[0].videos[0].title, "New tutorial");
  assert.equal(result.products[0].faqs[0].question, "New question");
  assert.equal(result.products[0].faqs[0].answer, "Write an answer for the customer.");
  assert.equal(result.products[1].name, "Produk Baru");
});

test("database mapping scopes and orders related records and retains archived identity", () => {
  const row = { id: "p1", slug: "regulator", sku: "GC-100", status: "archived", ever_published: true,
    source_provider: "warehouse-xlsx", source_product_id: "warehouse-1" };
  const variations = [
    { id: "second", product_id: "p1", position: 2 },
    { id: "foreign", product_id: "p2", position: 0 },
    { id: "first", product_id: "p1", position: 1 },
  ];
  const mapped = mapProduct(row, variations, [{ id: "image", product_id: "p1", public_url: "https://example.com/p.png", is_primary: true }], [], [], []);
  assert.deepEqual(mapped.variations.map((item) => item.id), ["first", "second"]);
  assert.equal(mapped.archived, true);
  assert.equal(mapped.published, false);
  assert.equal(mapped.source.provider, "warehouse-xlsx");
  assert.equal(mapped.source.storeId, undefined);
  assert.equal(mapped.images[0].url, "https://example.com/p.png");
  assert.equal(mapped.images[0].isPrimary, true);
  assert.deepEqual(mapped.faqs, []);
  assert.equal(statusFromProduct(mapped), "archived");
  assert.equal(statusFromProduct(product({ published: true })), "published");
  assert.equal(statusFromProduct(product({ archived: true })), "draft");
});


test("tutorial mapping preserves legacy YouTube and generic video storage metadata", () => {
  const mapped = mapProduct(
    { id: "product", status: "published" }, [], [],
    [
      { id: "legacy", product_id: "product", youtube_url: "https://youtu.be/dQw4w9WgXcQ", position: 0 },
      { id: "uploaded", product_id: "product", youtube_url: "", video_url: "https://storage.example.com/tutorial.mp4", storage_path: "products/product/tutorial.mp4", position: 1 },
    ], [], [],
  );
  assert.equal(mapped.videos[0].videoUrl, "https://youtu.be/dQw4w9WgXcQ");
  assert.equal(mapped.videos[1].videoUrl, "https://storage.example.com/tutorial.mp4");
  assert.equal(mapped.videos[1].storagePath, "products/product/tutorial.mp4");
});
