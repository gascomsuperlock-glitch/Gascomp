import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { evidenceResponse } = await import("./evidence-response.ts");
hooks.deregister();
const evidence = { bytes: new Uint8Array([0, 1, 2, 3, 4, 5]), name: "issue.mov", mimeType: "video/quicktime" };
const request = (range, options = {}) => new Request("https://example.test/evidence", { headers: range ? { range } : {}, ...options });

test("video metadata probes, open ranges, suffixes, and seeking receive exact bytes", async () => {
  for (const [range, body, contentRange] of [
    ["bytes=0-1", [0, 1], "bytes 0-1/6"],
    ["bytes=2-", [2, 3, 4, 5], "bytes 2-5/6"],
    ["bytes=-2", [4, 5], "bytes 4-5/6"],
    ["bytes=3-999", [3, 4, 5], "bytes 3-5/6"],
    ["bytes=-999", [0, 1, 2, 3, 4, 5], "bytes 0-5/6"],
  ]) {
    const response = evidenceResponse(request(range), evidence);
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get("content-range"), contentRange);
    assert.equal(response.headers.get("content-length"), String(body.length));
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], body);
  }
});

test("unsatisfiable ranges return 416; unsupported ranges and validators return complete files", async () => {
  for (const range of ["bytes=6-", "bytes=-0"]) {
    const response = evidenceResponse(request(range), evidence);
    assert.equal(response.status, 416);
    assert.equal(response.headers.get("content-range"), "bytes */6");
    assert.equal((await response.arrayBuffer()).byteLength, 0);
  }
  for (const range of [undefined, "items=0-1", "bytes=0-1,3-4", "bytes=4-1", "bytes=-", "bytes=99999999999999999999-"]) {
    const response = evidenceResponse(request(range), evidence);
    assert.equal(response.status, 200);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), evidence.bytes);
  }
  assert.equal(evidenceResponse(request(null, { headers: { range: "bytes=0-1", "if-range": '"old-version"' } }), evidence).status, 200);
});

test("HEAD and downloads preserve metadata and safely encode international filenames", async () => {
  const head = evidenceResponse(request("bytes=0-1", { method: "HEAD" }), evidence);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "6");
  assert.equal(await head.text(), "");
  const download = evidenceResponse(new Request("https://example.test/evidence?download=1"), { ...evidence, name: 'video-测试"\r\n.mov' });
  assert.equal(download.headers.get("content-type"), "video/quicktime");
  assert.match(download.headers.get("content-disposition"), /^attachment;/);
  assert.match(download.headers.get("content-disposition"), /filename\*=UTF-8''video-%E6%B5%8B%E8%AF%95___\.mov/);
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()), evidence.bytes);
});
