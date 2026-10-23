import assert from "node:assert/strict";
import { test } from "node:test";
import { readPublicCollection, exportPublic } from "./export-public.mjs";
const response = (data, pages = "1") =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "x-wp-totalpages": pages },
  });

test("import requests use the fixed HTTPS origin and refuse redirects", async () => {
  let calls = 0;
  const records = await readPublicCollection(
    "/wp-json/wp/v2/pages",
    async (url, options) => {
      assert.equal(url.origin, "https://gascompsuperlock.com");
      assert.equal(options.redirect, "error");
      calls++;
      return response([{ id: calls }], "2");
    },
  );
  assert.equal(records.length, 2);
  assert.equal(calls, 2);
  await assert.rejects(readPublicCollection("https://evil.test/wp-json/pages"));
});

test("incomplete pagination, excessive pages, invalid responses and oversized bodies fail closed", async () => {
  for (const res of [
    new Response("[]", { headers: { "content-type": "application/json" } }),
    response([], "21"),
    response({}, "1"),
    new Response("error", { status: 500 }),
    new Response("x".repeat(12_000_001), {
      headers: { "content-type": "application/json", "x-wp-totalpages": "1" },
    }),
  ]) {
    await assert.rejects(
      readPublicCollection("/wp-json/wp/v2/pages", async () => res),
    );
  }
});

test("dry run produces counts without approving or writing a snapshot", async () => {
  const result = await exportPublic({ fetcher: async () => response([], "0") });
  assert.deepEqual(result, {
    counts: { page: 0, post: 0, product: 0 },
    forms: 0,
    approved: false,
    written: false,
  });
});
