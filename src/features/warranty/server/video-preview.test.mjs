import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { test } from "node:test";

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "../model/video-evidence") return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { createVideoPreview } = await import("./video-preview.ts");
const { inspectVideo } = await import("./video-inspection.ts");
hooks.deregister();

test("MOV, HEVC with audio, and legacy video containers produce decodable MP4 previews", async () => {
  for (const name of ["valid.mp4", "valid.mov", "variable-frame-rate.mov", "hevc-with-audio.mov", "valid.webm", "valid.avi", "valid.wmv"]) {
    const original = new Uint8Array(await readFile(new URL(`./fixtures/${name}`, import.meta.url)));
    const snapshot = original.slice();
    const preview = await createVideoPreview(original);
    assert.ok(preview?.byteLength, name);
    assert.deepEqual(original, snapshot, "original evidence remains unchanged");
    const output = Buffer.from(preview);
    assert.ok(output.indexOf("moov") < output.indexOf("mdat"), "metadata precedes video frames");
    assert.equal(await inspectVideo(new File([preview], "preview.mp4", { type: "video/mp4" })), "valid", name);
  }
});

test("invalid, audio-only, and cancelled inputs cannot produce successful previews", async () => {
  assert.equal(await createVideoPreview(new TextEncoder().encode("not a video")), null);
  const audio = await readFile(new URL("./fixtures/audio-only.mp4", import.meta.url));
  assert.equal(await createVideoPreview(audio), null);
  const valid = await readFile(new URL("./fixtures/valid.mov", import.meta.url));
  assert.equal(await createVideoPreview(valid, AbortSignal.abort()), null);
  const controller = new AbortController();
  const pending = createVideoPreview(valid, controller.signal);
  assert.equal(await createVideoPreview(valid), null, "concurrent conversion is bounded");
  controller.abort();
  assert.equal(await pending, null);
  assert.ok(await createVideoPreview(valid), "cancellation releases the conversion slot");
});
