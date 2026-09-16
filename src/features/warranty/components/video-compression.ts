export const VIDEO_COMPRESSION_TIMEOUT_MS = 60_000;
export const VIDEO_COMPRESSION_MIN_BYTES = 2 * 1024 * 1024;

export type PreparedVideo = { file: File; outcome: "compressed" | "original" | "small" };
export type CompressionMessage = { percent: number } | { file: File | null };

// Keep the original File in the picker. Only the multipart payload uses the copy.
export function prepareVideo(file: File, signal: AbortSignal, onProgress: (percent: number) => void): Promise<PreparedVideo> {
  if (file.size <= VIDEO_COMPRESSION_MIN_BYTES) return Promise.resolve({ file, outcome: "small" });
  if (signal.aborted || typeof Worker === "undefined" || typeof VideoEncoder === "undefined") {
    return Promise.resolve({ file, outcome: "original" });
  }
  return new Promise((resolve) => {
    let worker: Worker | undefined;
    let settled = false;
    const finish = (compressed: File | null = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      worker?.terminate();
      // A larger, empty or unexpected worker result must never replace evidence.
      const useful = compressed instanceof File && compressed.size > 0 && compressed.size < file.size * 0.9;
      resolve({ file: useful ? compressed : file, outcome: useful ? "compressed" : "original" });
    };
    const cancel = () => finish();
    signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, VIDEO_COMPRESSION_TIMEOUT_MS);
    try {
      worker = new Worker(new URL("./video-compression-worker.ts", import.meta.url), { type: "module" });
      worker.onerror = (event) => { event.preventDefault(); finish(); };
      worker.onmessageerror = cancel;
      worker.onmessage = ({ data }: MessageEvent<CompressionMessage>) => {
        if (settled) return;
        if ("file" in data) finish(data.file);
        else if (Number.isFinite(data.percent)) onProgress(Math.max(0, Math.min(99, Math.round(data.percent))));
      };
      worker.postMessage(file);
    } catch { finish(); }
  });
}
