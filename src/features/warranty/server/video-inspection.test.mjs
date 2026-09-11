import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { test } from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { inspectVideo } = await import("./video-inspection.ts");
hooks.deregister();

test("portable video inspection rejects damaged bytes without a native executable", async () => {
  for (const [extension, type] of [["mp4", "video/mp4"], ["mov", "video/quicktime"], ["webm", "video/webm"]]) {
    const bytes = await readFile(new URL(`./fixtures/valid.${extension}`, import.meta.url));
    assert.equal(await inspectVideo(new File([bytes], `valid.${extension}`, { type })), "valid", extension);
    assert.equal(await inspectVideo(new File(["not a video"], `fake.${extension}`, { type })), "invalid", extension);
    assert.equal(await inspectVideo(new File([bytes.subarray(0, Math.floor(bytes.length / 2))], `truncated.${extension}`, { type })), "invalid", extension);
    if (extension === "mp4") {
      const corrupt = Buffer.from(bytes);
      const offset = corrupt.indexOf(Buffer.from("mdat")) + 12;
      corrupt.fill(255, offset, offset + 150);
      assert.equal(await inspectVideo(new File([corrupt], "corrupt.mp4", { type })), "invalid", "intact metadata must not hide damaged frames");
    }
  }
  const audio = await readFile(new URL("./fixtures/audio-only.mp4", import.meta.url));
  assert.equal(await inspectVideo(new File([audio], "audio.mp4", { type: "video/mp4" })), "invalid", "audio-only MP4 is not video evidence");
});
