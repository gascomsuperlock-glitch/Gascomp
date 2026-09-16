import assert from "node:assert/strict";
import { test } from "node:test";
import { availableClaimProducts, exactClaimProduct, matchesClaimProduct, prefilledClaimProduct } from "./claim-products.ts";

const products = [
  { id: "one", name: "Gas regulator", sku: "GR-01", model: "Click", published: true, archived: false },
  { id: "two", name: "Gas stove", sku: "GS-02", model: "Double burner", published: true, archived: false },
  { id: "draft", name: "Draft cooker", sku: "DRAFT", model: "", published: false, archived: false },
  { id: "archived", name: "Archived cooker", sku: "OLD", model: "", published: false, archived: true },
];

test("claim choices exclude drafts and archives, then include newly published products", () => {
  assert.deepEqual(availableClaimProducts(products).map(({ id }) => id), ["one", "two"]);
  const published = products.map((product) => product.id === "draft" ? { ...product, published: true } : product);
  assert.equal(availableClaimProducts(published).length, 3);
  assert.equal(availableClaimProducts([{ ...products[3], published: true }]).length, 0);
});

test("either search field finds names, SKU, model and multiple terms without case sensitivity", () => {
  assert.equal(matchesClaimProduct(products[0], " REGULATOR gr-01 "), true);
  assert.equal(matchesClaimProduct(products[1], "double GS-02"), true);
  assert.equal(matchesClaimProduct(products[0], ""), true);
  assert.equal(matchesClaimProduct(products[0], "missing"), false);
});

test("exact names and SKUs resolve canonical pairs while partial or cleared input cannot select", () => {
  assert.equal(exactClaimProduct(products, "name", " gas REGULATOR "), products[0]);
  assert.equal(exactClaimProduct(products, "sku", "gr-01"), products[0]);
  assert.equal(exactClaimProduct(products, "name", "Gas"), null);
  assert.equal(exactClaimProduct(products, "sku", ""), null);
  assert.equal(exactClaimProduct(products, "sku", "DRAFT"), null);
  assert.equal(exactClaimProduct(products, "sku", "OLD"), null);
});

test("duplicate names require explicit choice and a unique SKU still resolves", () => {
  const duplicates = [...products, { ...products[0], id: "other", sku: "GR-03" }];
  assert.equal(exactClaimProduct(duplicates, "name", "Gas regulator"), null);
  assert.equal(exactClaimProduct(duplicates, "sku", "GR-03"), duplicates[4]);
});

test("prefill trusts a published SKU over stale names and rejects unavailable URL identities", () => {
  assert.equal(prefilledClaimProduct(products, "GR-01", "Old name"), products[0]);
  assert.equal(prefilledClaimProduct(products, "", "Gas stove"), products[1]);
  assert.equal(prefilledClaimProduct(products, "UNKNOWN", "Gas stove"), null);
  assert.equal(prefilledClaimProduct(products, "DRAFT", "Draft cooker"), null);
  assert.equal(prefilledClaimProduct(products, "OLD", "Archived cooker"), null);
  assert.equal(prefilledClaimProduct([], "GR-01", "Gas regulator"), null);
});
