import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import ffmpeg from "ffmpeg-static";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { inspectVideo } = await import("./video-inspection.ts");
hooks.deregister();

test("video inspection decodes valid videos and rejects damaged bytes despite a valid MIME type", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "video-inspection-test-"));
  try {
    for (const [extension, type, codec] of [
      ["mp4", "video/mp4", "libx264"],
      ["mov", "video/quicktime", "libx264"],
      ["webm", "video/webm", "libvpx"],
    ]) {
      const output = path.join(directory, `valid.${extension}`);
      execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=64x64:rate=10", "-t", "1", "-c:v", codec, "-pix_fmt", "yuv420p", ...(extension === "webm" ? [] : ["-movflags", "+faststart"]), output]);
      const bytes = await readFile(output);
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
    const audio = path.join(directory, "audio.mp4");
    execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.2", "-c:a", "aac", audio]);
    assert.equal(await inspectVideo(new File([await readFile(audio)], "audio.mp4", { type: "video/mp4" })), "invalid", "audio-only MP4 is not video evidence");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
