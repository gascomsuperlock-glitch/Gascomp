import { test } from "node:test";
import assert from "node:assert/strict";
import { videoRecords } from "./video-records.ts";

test("legacy schema saves every source without writing unavailable columns", () => {
  for (const url of ["https://youtu.be/dQw4w9WgXcQ", "https://drive.google.com/file/d/test/view", "https://www.tiktok.com/@test/video/123", "https://storage.example.com/video.mp4"]) {
    const [row] = videoRecords([{ id: "product", videos: [{ id: "video", videoUrl: url, youtubeUrl: "", title: "Test", description: "", duration: "" }] }], false);
    assert.equal(row.youtube_url, url);
    assert.equal("video_url" in row, false);
    assert.equal("storage_path" in row, false);
  }
});

test("extended schema populates both URLs and preserves upload metadata", () => {
  const [row] = videoRecords([{ id: "product", videos: [{ id: "video", videoUrl: "https://storage.example.com/video.webm", storagePath: "products/product/video.webm" }] }], true);
  assert.equal(row.youtube_url, row.video_url);
  assert.equal(row.storage_path, "products/product/video.webm");
});

test("thumbnail columns are written only when their schema is available", () => {
  const product = { id: "product", videos: [{
    id: "video",
    videoUrl: "https://storage.example.com/video.webm",
    thumbnailUrl: "https://storage.example.com/thumbnail.webp",
    thumbnailStoragePath: "tutorial-thumbnails/product/thumbnail.webp",
  }] };
  const [legacyRow] = videoRecords([product], true, false);
  assert.equal("thumbnail_url" in legacyRow, false);
  assert.equal("thumbnail_storage_path" in legacyRow, false);

  const [thumbnailRow] = videoRecords([product], true, true);
  assert.equal(thumbnailRow.thumbnail_url, product.videos[0].thumbnailUrl);
  assert.equal(thumbnailRow.thumbnail_storage_path, product.videos[0].thumbnailStoragePath);
});
