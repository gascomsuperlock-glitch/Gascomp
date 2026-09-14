import "server-only";
import { detectVideoContainer } from "../model/video-evidence";
import type { Worker as NodeWorker } from "node:worker_threads";
import path from "node:path";

export type VideoInspectionResult = "valid" | "invalid" | "unavailable" | "timeout";

export async function inspectVideo(file: File): Promise<VideoInspectionResult> {
  const container = await detectVideoContainer(file).catch(() => null);
  if (!container) return "invalid";
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
    const timer = setTimeout(() => finish("timeout"), 30_000);
    let settled = false;
    function finish(result: VideoInspectionResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(result);
    }
    worker.once("message", (result: unknown) => {
      finish(result === "valid" || result === "invalid" || result === "timeout" ? result : "unavailable");
    });
    worker.once("error", () => finish("unavailable"));
    worker.once("exit", () => finish("unavailable"));
  });
}
