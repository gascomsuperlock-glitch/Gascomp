import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getVideoThumbnailTimes,
  MAX_VIDEO_THUMBNAIL_BYTES,
  videoThumbnailFileError,
} from "./video-thumbnail.ts";

test("thumbnail choices cover four useful positions without reaching the final frame", () => {
  assert.deepEqual(getVideoThumbnailTimes(100), [10, 35, 60, 85]);
  const shortVideoTimes = getVideoThumbnailTimes(0.04);
  assert.ok(shortVideoTimes.length >= 1);
  assert.ok(shortVideoTimes.every((time) => time > 0 && time < 0.04));
  assert.deepEqual(getVideoThumbnailTimes(0), []);
  assert.deepEqual(getVideoThumbnailTimes(Number.NaN), []);
});

test("tutorial thumbnails accept browser canvas image formats up to 1 MB", () => {
  for (const type of ["image/webp", "image/jpeg", "image/png"]) {
    assert.equal(videoThumbnailFileError({ type, size: 1 }), null);
    assert.equal(videoThumbnailFileError({ type, size: MAX_VIDEO_THUMBNAIL_BYTES }), null);
    assert.ok(videoThumbnailFileError({ type, size: 0 }));
    assert.ok(videoThumbnailFileError({ type, size: MAX_VIDEO_THUMBNAIL_BYTES + 1 }));
  }
  assert.ok(videoThumbnailFileError({ type: "image/gif", size: 100 }));
});
