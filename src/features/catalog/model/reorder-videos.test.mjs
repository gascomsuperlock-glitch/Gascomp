import { test } from "node:test";
import assert from "node:assert/strict";
import { reorderVideos } from "./reorder-videos.ts";
import { videoRecords } from "./video-records.ts";

const videos = [
  { id: "uploaded", title: "Setup", videoUrl: "https://storage.example.com/setup.mp4", storagePath: "products/test/setup.mp4", description: "Setup instructions", duration: "01:20" },
  { id: "linked", title: "Usage", youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" },
  { id: "pending", title: "New tutorial", videoUrl: "", description: "Unsaved description" },
];

test("moving the first video to position two preserves video data and the original array", () => {
  const reordered = reorderVideos(videos, "uploaded", "linked");
  assert.deepEqual(reordered.map((video) => video.id), ["linked", "uploaded", "pending"]);
  assert.equal(reordered[1], videos[0]);
  assert.deepEqual(videos.map((video) => video.id), ["uploaded", "linked", "pending"]);
});

test("videos can move from last to first and first to last without losing intermediate items", () => {
  assert.deepEqual(reorderVideos(videos, "pending", "uploaded").map((video) => video.id), ["pending", "uploaded", "linked"]);
  assert.deepEqual(reorderVideos(videos, "uploaded", "pending").map((video) => video.id), ["linked", "pending", "uploaded"]);
});

test("missing, removed, identical, and empty targets are no-ops", () => {
  assert.equal(reorderVideos(videos, "missing", "linked"), videos);
  assert.equal(reorderVideos(videos, "uploaded", "removed"), videos);
  assert.equal(reorderVideos(videos, "uploaded", "uploaded"), videos);
  const empty = [];
  assert.equal(reorderVideos(empty, "uploaded", "linked"), empty);
});

test("saving reordered videos writes consecutive positions and preserves uploaded file identity", () => {
  const reordered = reorderVideos(videos, "uploaded", "pending");
  for (const extendedSchema of [true, false]) {
    const rows = videoRecords([{ id: "test", videos: reordered }], extendedSchema);
    assert.deepEqual(rows.map(({ id, position }) => ({ id, position })), [
      { id: "linked", position: 0 }, { id: "pending", position: 1 }, { id: "uploaded", position: 2 },
    ]);
    assert.equal(rows[2].youtube_url, videos[0].videoUrl);
    if (extendedSchema) assert.equal(rows[2].storage_path, videos[0].storagePath);
  }
});
