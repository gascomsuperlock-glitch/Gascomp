import assert from "node:assert/strict";
import { test } from "node:test";
import { canChangeProductStatus, updateBulkProductStatus } from "./bulk-product-status.ts";

function product(id, overrides = {}) {
  return {
    id, slug: `product-${id}`, sku: `SKU-${id}`, name: `Product ${id}`,
    model: "Model", description: "Support guide", tone: "navy",
    published: false, archived: false, everPublished: false,
    variations: [], images: [], videos: [], issues: [], faqs: [], ...overrides,
  };
}

test("bulk publish updates only selected products and restores archived guides without changing content", () => {
  const products = [product("draft"), product("archive", { archived: true, everPublished: true, faqs: [{ id: "faq", question: "How?", answer: "Read the guide." }] }), product("other")];
  const before = structuredClone(products);
  const result = updateBulkProductStatus(products, new Set(["draft", "archive", "deleted"]), "published");
  assert.deepEqual(result, [
    { ...products[0], published: true, everPublished: true },
    { ...products[1], published: true, archived: false },
    products[2],
  ]);
  assert.equal(result[2], products[2]);
  assert.deepEqual(products, before);
});

test("archive all preserves QR identity and skips never-published drafts and already archived products", () => {
  const products = [product("live", { published: true, everPublished: true }), product("draft"), product("old-draft", { everPublished: true }), product("archive", { archived: true, everPublished: true })];
  const before = structuredClone(products);
  const result = updateBulkProductStatus(products, new Set(products.map(({ id }) => id)), "archived");
  assert.deepEqual(result, [
    { ...products[0], published: false, archived: true },
    products[1],
    { ...products[2], archived: true },
    products[3],
  ]);
  assert.equal(result[1], products[1]);
  assert.equal(result[3], products[3]);
  assert.deepEqual(products, before);
});

test("empty and stale selections do not expand to all products", () => {
  const products = [product("draft"), product("live", { published: true, everPublished: true })];
  for (const status of ["published", "archived"]) {
    assert.deepEqual(updateBulkProductStatus(products, new Set(), status), products);
    assert.deepEqual(updateBulkProductStatus(products, new Set(["deleted"]), status), products);
  }
});

test("action eligibility excludes unchanged status and unpublishable archive targets", () => {
  assert.equal(canChangeProductStatus(product("draft"), "archived"), false);
  assert.equal(canChangeProductStatus(product("draft"), "published"), true);
  assert.equal(canChangeProductStatus(product("live", { published: true, everPublished: true }), "published"), false);
  assert.equal(canChangeProductStatus(product("old-draft", { everPublished: true }), "archived"), true);
});
