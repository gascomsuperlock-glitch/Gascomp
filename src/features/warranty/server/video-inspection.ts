import "server-only";
import { Worker } from "node:worker_threads";
import path from "node:path";

export type VideoInspectionResult = "valid" | "invalid" | "unavailable" | "timeout";

export async function inspectVideo(file: File): Promise<VideoInspectionResult> {
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return "invalid";
  }

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      // Keep the worker as a traced Node entrypoint, outside Webpack's worker URL handling.
      const workerPath = path.join(process.cwd(), "src/features/warranty/server/video-inspection-worker.mjs");
      worker = new Worker(workerPath, {
        workerData: { bytes, mimeType: file.type },
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
