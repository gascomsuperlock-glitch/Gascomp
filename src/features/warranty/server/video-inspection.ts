import "server-only";
import { detectVideoContainer } from "../model/video-evidence";
import type { Worker as NodeWorker } from "node:worker_threads";
import path from "node:path";

export type VideoInspectionResult = "valid" | "invalid" | "unavailable" | "timeout";

// Single-threaded WebAssembly decoding of a long or high-resolution phone
// recording can exceed any fixed budget on shared hosting.
export const VIDEO_INSPECTION_BUDGET_MS = 30_000;

export async function inspectVideo(file: File, budgetMs = VIDEO_INSPECTION_BUDGET_MS): Promise<VideoInspectionResult> {
  const container = await detectVideoContainer(file).catch(() => null);
  if (!container) return "invalid";
  const started = Date.now();
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return "invalid";
  }

  // Resolve the native constructor at runtime so Turbopack does not bundle the worker.
  const { Worker } = await import(/* webpackIgnore: true */ "node:worker_threads");
  return new Promise((resolve) => {
    let worker: NodeWorker;
    try {
      // Keep the traced Node entrypoint outside both Turbopack and Webpack bundling.
      const workerPath = path.join(process.cwd(), "src/features/warranty/server/video-inspection-worker.mjs");
      worker = new Worker(workerPath, {
        workerData: { bytes, demuxer: container.demuxer },
        transferList: [bytes],
      });
    } catch {
      resolve("unavailable");
      return;
    }
    let frames = 0;
    let detail: string | undefined;
    // Decode errors end the worker at once, so frames decoded up to the deadline
    // were clean. Accept that verified part instead of rejecting a slow decode.
    const timer = setTimeout(() => finish(frames > 0 && !detail ? "valid" : "timeout", true), budgetMs);
    let settled = false;
    function finish(result: VideoInspectionResult, partial = false) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      // A rejected claim leaves no ticket, so this is its only trace. No customer values.
      if (result !== "valid" || partial) {
        console.warn("Warranty video inspection", { result, partial, demuxer: container!.demuxer, megabytes: Math.round(file.size / 1024 / 1024), frames, seconds: Math.round((Date.now() - started) / 1000), detail });
      }
      resolve(result);
    }
    worker.on("message", (message: unknown) => {
      if (message && typeof message === "object") {
        const progress = message as { frames?: unknown; detail?: unknown };
        if (typeof progress.frames === "number") frames = progress.frames;
        if (typeof progress.detail === "string") detail = progress.detail;
        return;
      }
      finish(message === "valid" || message === "invalid" ? message : "unavailable");
    });
    worker.once("error", () => finish("unavailable"));
    worker.once("exit", () => finish("unavailable"));
  });
}
