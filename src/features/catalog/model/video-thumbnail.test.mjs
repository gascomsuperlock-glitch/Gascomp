import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeThumbnailBlob,
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

test("thumbnail encoding retries until the frame fits the upload limit", async () => {
  const attempts = [];
  const blob = await encodeThumbnailBlob((attempt) => {
    attempts.push(attempt);
    const size = attempt.scale < 1 ? 500 : MAX_VIDEO_THUMBNAIL_BYTES + 1;
    return Promise.resolve({ size, type: attempt.mimeType });
  });
  assert.equal(blob.type, "image/webp");
  assert.ok(blob.size <= MAX_VIDEO_THUMBNAIL_BYTES);
  assert.deepEqual(attempts.map((attempt) => attempt.scale), [1, 1, 0.75]);
  assert.ok(attempts.every((attempt) => attempt.mimeType === "image/webp"));
});

test("thumbnail encoding falls back to JPEG when the browser cannot encode WebP", async () => {
  const attempts = [];
  const blob = await encodeThumbnailBlob((attempt) => {
    attempts.push(attempt);
    if (attempt.mimeType === "image/webp") {
      return Promise.resolve({ size: MAX_VIDEO_THUMBNAIL_BYTES + 1, type: "image/png" });
    }
    return Promise.resolve({ size: 900, type: "image/jpeg" });
  });
  assert.equal(blob.type, "image/jpeg");
  assert.deepEqual(attempts.map((attempt) => attempt.mimeType), ["image/webp", "image/jpeg"]);
});

test("thumbnail encoding reports the size limit when every attempt stays too large", async () => {
  await assert.rejects(
    () => encodeThumbnailBlob((attempt) => Promise.resolve({ size: MAX_VIDEO_THUMBNAIL_BYTES + 1, type: attempt.mimeType })),
    /1 MB or smaller/,
  );
});
