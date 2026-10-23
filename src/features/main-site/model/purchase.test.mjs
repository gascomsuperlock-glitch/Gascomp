import test from "node:test";
import assert from "node:assert/strict";
import { purchaseUrl } from "./purchase.mjs";
import { normalizeRecord } from "./content.mjs";

test("purchase links preserve verified store URLs and decode WooCommerce entities", () => {
  assert.equal(
    purchaseUrl(
      "https://shopee.co.id/Gascomp-i.780929103.28525083410?a=1&#038;b=2",
    ),
    "https://shopee.co.id/Gascomp-i.780929103.28525083410?a=1&b=2",
  );
  assert.equal(
    purchaseUrl("https://s.shopee.co.id/4AqGQw9AiS"),
    "https://s.shopee.co.id/4AqGQw9AiS",
  );
});

test("purchase links reject other stores, redirect endpoints, HTML and unsafe protocols", () => {
  for (const value of [
    undefined,
    "javascript:alert(1)",
    "https://shopee.co.id.evil.test/x-i.780929103.1",
    "https://shopee.co.id/x-i.999.1",
    "https://shopee.co.id/redirect?url=https://evil.test",
    "https://user@shopee.co.id/x-i.780929103.1",
    "https://s.shopee.co.id:8443/abc",
    "https://s.shopee.co.id/abc&#10;",
    "<a>https://s.shopee.co.id/abc</a>",
    "https://s.shopee.co.id/abc\\def",
    "https://s.shopee.co.id/abc#fragment",
  ])
    assert.equal(purchaseUrl(value), null, String(value));
});

test("only external products receive a validated purchase destination", () => {
  const source = {
    id: 1,
    name: "Product",
    permalink: "https://gascompsuperlock.com/produk/product/",
    description: "",
    type: "external",
    add_to_cart: { url: "https://s.shopee.co.id/abc" },
  };
  assert.equal(
    normalizeRecord(source, "product").purchaseUrl,
    source.add_to_cart.url,
  );
  assert.equal(
    normalizeRecord({ ...source, type: "simple" }, "product").purchaseUrl,
    undefined,
  );
  assert.equal(
    normalizeRecord(
      { ...source, add_to_cart: { url: "https://evil.test" } },
      "product",
    ).purchaseUrl,
    null,
  );
});
