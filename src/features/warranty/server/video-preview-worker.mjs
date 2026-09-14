// Private, in-memory preview conversion; the stored evidence is never modified.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parentPort, workerData } from "node:worker_threads";

const require = createRequire(import.meta.url);

async function preview() {
  globalThis.self = { location: { href: import.meta.url } };
  const core = await require("@ffmpeg/core")({ wasmBinary: readFileSync(require.resolve("@ffmpeg/core/wasm")) });
  core.FS.writeFile("/input", new Uint8Array(workerData.bytes));
  let compatibleVideo = false;
  let sawVideo = false;
  core.setLogger(({ message }) => {
    if (!sawVideo && /Stream #.*Video:/.test(message)) {
      sawVideo = true;
      compatibleVideo = /Video: h264 .*yuv420p(?:\(|,)/.test(message);
    }
  });
  core.exec("-hide_banner", "-protocol_whitelist", "file,pipe", "-f", workerData.demuxer, "-i", "/input");
  core.reset();
  core.setLogger(() => {});
  const result = core.exec(
    "-hide_banner", "-loglevel", "error", "-xerror", "-threads", "1",
    "-protocol_whitelist", "file,pipe", "-err_detect", "explode",
    "-f", workerData.demuxer, "-i", "/input",
    "-map", "0:V:0", "-map", "0:a:0?", "-sn", "-dn", "-map_metadata", "-1",
    ...(compatibleVideo ? ["-c:v", "copy"] : [
      "-c:v", "libx264", "-threads", "1", "-preset", "ultrafast", "-crf", "25",
      "-vf", "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p",
    ]),
    "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    "-movflags", "+faststart", "-fs", "67108864", "/preview.mp4",
  );
  if (result !== 0) throw new Error("Preview conversion failed");
  const bytes = core.FS.readFile("/preview.mp4");
  // FFmpeg's size limit may finish successfully with a truncated preview.
  if (!bytes.byteLength || bytes.byteLength >= 67108864) throw new Error("Preview exceeds its size limit");
  parentPort.postMessage(bytes, [bytes.buffer]);
}

if (parentPort) preview().catch(() => parentPort.postMessage(null));
