import assert from "node:assert/strict";
import { test } from "node:test";
import { validateVideoSignature } from "./video-evidence.ts";

test("video signatures reject renamed non-video files before playback checks", async () => {
  for (const type of ["video/mp4", "video/quicktime", "video/webm"]) {
    assert.equal(await validateVideoSignature(new File(["not a video"], "renamed.mp4", { type })), false);
    assert.equal(await validateVideoSignature(new File([], "empty.mp4", { type })), false);
  }
  assert.equal(await validateVideoSignature(new File([new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109])], "video.mp4", { type: "video/mp4" })), true);
  assert.equal(await validateVideoSignature(new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0])], "video.webm", { type: "video/webm" })), true);
});
