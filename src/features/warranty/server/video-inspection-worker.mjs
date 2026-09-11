// Node worker entrypoint, launched only by the server-only video inspector.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parentPort, workerData } from "node:worker_threads";

const require = createRequire(import.meta.url);

async function inspect() {
  let core;
  try {
    // The single-threaded core targets a web worker. Supply its location without
    // changing globals in the application thread; wasmBinary avoids network I/O.
    globalThis.self = { location: { href: import.meta.url } };
    const createCore = require("@ffmpeg/core");
    core = await createCore({ wasmBinary: readFileSync(require.resolve("@ffmpeg/core/wasm")) });
  } catch {
    return "unavailable";
  }

  let hasFrames = false;
  let hasDecodeError = false;
  core.setLogger(({ type, message }) => {
    if (type === "stdout" && /^frame=\d+$/.test(message)) {
      hasFrames ||= Number(message.slice(6)) > 0;
    }
    // Emscripten uses this exact abort message to exit even after success.
    // Other stderr and the FFmpeg exit code still cause rejection.
    if (type === "stderr" && message.trim() && message !== "Aborted()") hasDecodeError = true;
  });
  try {
    core.FS.writeFile("/evidence", new Uint8Array(workerData.bytes));
    const result = core.exec(
      "-hide_banner", "-loglevel", "error", "-xerror",
      "-max_alloc", "67108864", "-threads", "1", "-err_detect", "explode",
      "-protocol_whitelist", "file,pipe",
      "-f", workerData.mimeType === "video/webm" ? "matroska" : "mov", "-i", "/evidence",
      "-map", "0:V:0", "-map", "0:a?", "-sn", "-dn",
      "-threads", "1", "-progress", "pipe:1", "-f", "null", "-",
    );
    return result === 0 && hasFrames && !hasDecodeError ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

if (parentPort) parentPort.postMessage(await inspect());
