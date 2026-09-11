import assert from "node:assert/strict";
import { test } from "node:test";
import { getVideoUrl, parseVideoSource, videoFileError, MAX_VIDEO_BYTES } from "./video-source.ts";

test("existing YouTube records work and an explicit empty new URL clears the old link", () => {
  assert.equal(getVideoUrl({ youtubeUrl: "legacy" }), "legacy");
  assert.equal(getVideoUrl({ youtubeUrl: "legacy", videoUrl: "new" }), "new");
  assert.equal(getVideoUrl({ youtubeUrl: "legacy", videoUrl: "" }), "");
});

test("YouTube watch, short, live and embedded links use the privacy-enhanced player", () => {
  for (const url of ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=20", "https://m.youtube.com/shorts/dQw4w9WgXcQ", "https://youtube.com/live/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]) {
    const result = parseVideoSource(url);
    assert.equal(result.provider, "youtube");
    assert.equal(result.playbackUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  }
});

test("Drive file and share links retain resource keys in the preview", () => {
  for (const url of ["https://drive.google.com/file/d/file_123-abc/view?resourcekey=key-1", "https://drive.google.com/open?id=file_123-abc&resourcekey=key-1", "https://drive.google.com/uc?id=file_123-abc&resourcekey=key-1"]) {
    const result = parseVideoSource(url);
    assert.equal(result.provider, "google-drive");
    assert.equal(result.playbackUrl, "https://drive.google.com/file/d/file_123-abc/preview?resourcekey=key-1");
  }
});

test("TikTok full video URLs embed while short links retain a provider fallback", () => {
  assert.equal(parseVideoSource("https://www.tiktok.com/@gascomp/video/7350000000000000000?lang=en").playbackUrl, "https://www.tiktok.com/player/v1/7350000000000000000");
  for (const url of ["https://vm.tiktok.com/ZExample/", "https://vt.tiktok.com/ZExample/", "https://www.tiktok.com/t/ZExample/"]) {
    assert.equal(parseVideoSource(url).kind, "link");
    assert.equal(parseVideoSource(url).provider, "tiktok");
  }
});

test("MP4 and WebM URLs preserve query strings for native playback", () => {
  for (const url of ["https://storage.example.com/tutorial.MP4?download=1", "https://storage.example.com/tutorial.webm"]) {
    assert.equal(parseVideoSource(url).kind, "video");
    assert.equal(parseVideoSource(url).playbackUrl, url);
  }
});

test("unsupported protocols, spoofed providers and malformed video URLs are rejected", () => {
  for (const url of ["", "javascript:alert(1)", "data:video/mp4;base64,AA==", "http://example.com/video.mp4", "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", "https://notyoutu.be/dQw4w9WgXcQ", "https://youtube.com/watch?v=bad", "https://drive.google.com/drive/folders/test", "https://tiktok.com/@example", "https://user:password@example.com/video.mp4", "https://example.com:8443/video.mp4", "https://example.com/page"]) assert.equal(parseVideoSource(url), null, url);
});

test("manual uploads enforce MIME types, nonempty files and the inclusive 150 MB limit", () => {
  assert.equal(MAX_VIDEO_BYTES, 157286400);
  for (const type of ["video/mp4", "video/webm"]) {
    for (const size of [1, 50 * 1024 * 1024 + 1, 100 * 1024 * 1024, 157286400]) {
      assert.equal(videoFileError({ type, size }), null);
    }
    assert.equal(videoFileError({ type, size: 157286401 }), "The video must be between 1 byte and 150 MB.");
  }
  for (const file of [{ type: "video/mp4", size: 0 }, { type: "video/mp4", size: MAX_VIDEO_BYTES + 1 }, { type: "video/quicktime", size: 100 }, { type: "text/html", size: 100 }, { type: "video/mp4", size: "100" }, { type: "video/mp4", size: NaN }]) assert.ok(videoFileError(file));
});
