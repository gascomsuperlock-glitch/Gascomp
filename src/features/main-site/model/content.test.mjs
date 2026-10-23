import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeHtml,
  normalizeRecord,
  safeUrl,
  sourcePath,
} from "./content.mjs";

test("active HTML, handlers, CSS, SVG and private form values never enter the render tree", () => {
  const result = normalizeHtml(
    '<script>alert(1)</script><svg onload="alert(1)"><a>bad</a></svg><p style="background:url(x)" onclick="x()">Hello <b>world</b></p><form action="https://evil.test"><input type="hidden" value="secret"><input name="email" type="email" value="private" required></form>',
  );
  assert.deepEqual(result.nodes, [
    {
      tag: "p",
      children: [
        { text: "Hello " },
        { tag: "b", children: [{ text: "world" }] },
      ],
    },
  ]);
  assert.deepEqual(result.forms, [
    { fields: [{ name: "email", type: "email", required: true }] },
  ]);
  assert.doesNotMatch(
    JSON.stringify(result),
    /secret|private|evil|onclick|onload/,
  );
});

test("encoded script URLs, external trackers and source archive links are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.test/x",
    "https://gascompsuperlock.com.evil.test/",
    "https://gascompsuperlock.com@evil.test/",
    "https://gascompsuperlock.com:8443/",
    "/backup.sql",
    "/wp-admin/",
    "https://gascompsuperlock.com\\@evil.test/",
  ])
    assert.equal(safeUrl(url), null, url);
  assert.equal(safeUrl("/wp-content/uploads/2026/01/logo.svg", true), null);
  assert.equal(safeUrl("https://evil.test/track.png", true), null);
  assert.equal(
    normalizeHtml('<a href="jav&#x61;script:alert(1)">Label</a>').nodes[0].text,
    "Label",
  );
});

test("valid links and raster images survive while arbitrary attributes do not", () => {
  const result = normalizeHtml(
    '<a href="/product/" target="x">Products</a><img src="/wp-content/uploads/2023/08/logo.png" onerror="x" alt="Gascomp">',
  );
  assert.equal(result.nodes[0].href, "https://gascompsuperlock.com/product/");
  assert.equal(
    result.nodes[1].src,
    "https://gascompsuperlock.com/wp-content/uploads/2023/08/logo.png",
  );
  assert.doesNotMatch(JSON.stringify(result), /onerror|target/);
});

test("permalinks cannot refer to other hosts, query parameters or encoded separators", () => {
  for (const value of ["https://wa.me/123", "/page/?preview=true", "/a%2fb/"])
    assert.throws(() => sourcePath(value));
  assert.equal(
    sourcePath("https://gascompsuperlock.com/product/item/"),
    "/product/item/",
  );
});

test("normalization refuses protected and excessively large content", () => {
  assert.throws(() => normalizeHtml("x".repeat(2_000_001)));
  assert.throws(() =>
    normalizeRecord({ id: 1, content: { protected: true } }, "page"),
  );
  const record = normalizeRecord(
    {
      id: 1,
      link: "https://gascompsuperlock.com/about-us/",
      title: { rendered: "A &amp; B" },
      content: { rendered: "<p>Body</p>" },
    },
    "page",
  );
  assert.equal(record.title, "A & B");
  assert.equal(record.path, "/about-us/");
});
