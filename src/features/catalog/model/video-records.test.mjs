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
