import "server-only";
import path from "node:path";
import { detectVideoContainer } from "../model/video-evidence";

let activePreview = false;

export async function createVideoPreview(bytes: Uint8Array, signal?: AbortSignal): Promise<Uint8Array | null> {
  if (activePreview || signal?.aborted || bytes.byteLength > 50 * 1024 * 1024) return null;
  activePreview = true;
  try {
    const copy = new Uint8Array(bytes);
    const container = await detectVideoContainer(new File([copy], "evidence"));
    if (!container || signal?.aborted) return null;
    // Resolve the native constructor at runtime so Turbopack does not bundle the worker.
    const { Worker } = await import(/* webpackIgnore: true */ "node:worker_threads");
    return await new Promise((resolve) => {
      const worker = new Worker(path.join(process.cwd(), "src/features/warranty/server/video-preview-worker.mjs"), {
        workerData: { bytes: copy.buffer, demuxer: container.demuxer }, transferList: [copy.buffer],
      });
      let settled = false;
      const finish = (result: Uint8Array | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
        void worker.terminate().then(() => resolve(result));
      };
      const cancel = () => finish(null);
      const timer = setTimeout(cancel, 30_000);
      signal?.addEventListener("abort", cancel, { once: true });
      worker.once("message", (result: unknown) => finish(result instanceof Uint8Array ? result : null));
      worker.once("error", cancel);
      worker.once("exit", cancel);
      if (signal?.aborted) cancel();
    });
  } catch {
    return null;
  } finally {
    activePreview = false;
  }
}
