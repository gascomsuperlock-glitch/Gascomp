import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { mirrorImage } from "./prepare-release.mjs";
const source = "https://gascompsuperlock.com/wp-content/uploads/2026/test.png";
test("media migration rejects arbitrary hosts, SVG and disguised HTML", async () => {
  await assert.rejects(mirrorImage("https://evil.test/test.png"));
  for (const content of [
    "<html><script>alert(1)</script></html>",
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>alert(1)</script></svg>',
  ]) {
    await assert.rejects(
      mirrorImage(source, async () => new Response(content)),
    );
  }
});
test("media migration re-encodes raster images with content-addressed filenames", async () => {
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  const image = await mirrorImage(source, async (url, options) => {
    assert.equal(options.redirect, "error");
    return new Response(png);
  });
  assert.match(image.hash, /^[a-f0-9]{64}$/);
  assert.equal((await sharp(image.bytes).metadata()).format, "webp");
});
