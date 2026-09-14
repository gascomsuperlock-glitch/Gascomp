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

test("tutorial thumbnails accept only nonempty WebP images up to 1 MB", () => {
  assert.equal(videoThumbnailFileError({ type: "image/webp", size: 1 }), null);
  assert.equal(videoThumbnailFileError({ type: "image/webp", size: MAX_VIDEO_THUMBNAIL_BYTES }), null);
  assert.ok(videoThumbnailFileError({ type: "image/webp", size: 0 }));
  assert.ok(videoThumbnailFileError({ type: "image/webp", size: MAX_VIDEO_THUMBNAIL_BYTES + 1 }));
  assert.ok(videoThumbnailFileError({ type: "image/jpeg", size: 100 }));
});
