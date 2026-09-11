import { videoFileError } from "./video-source";

export async function uploadVideo(file: File, productId: string, signal: AbortSignal, onProgress: (percent: number) => void): Promise<{ videoUrl: string; storagePath: string }> {
  const invalid = videoFileError(file);
  if (invalid) throw new Error(invalid);
  const response = await fetch("/admin/videos/upload", {
    method: "POST", credentials: "same-origin", redirect: "error", signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, size: file.size, type: file.type }),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(`The upload service returned HTTP ${response.status}. Check the application deployment.`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The upload could not be started.");
  if (!result.signedUrl || !result.publicUrl || !result.storagePath) throw new Error("The upload service returned an invalid response.");
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    request.open("PUT", result.signedUrl);
    request.timeout = 10 * 60 * 1000;
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => { cleanup(); if (request.status >= 200 && request.status < 300) resolve(); else reject(new Error(`Video upload failed (HTTP ${request.status}). Retry the upload.`)); };
    request.onerror = () => { cleanup(); reject(new Error("The video upload lost its connection. Retry the upload.")); };
    request.ontimeout = () => { cleanup(); reject(new Error("The video upload timed out. Try a smaller file or retry.")); };
    request.onabort = () => { cleanup(); reject(new DOMException("Upload cancelled", "AbortError")); };
    if (signal.aborted) { reject(new DOMException("Upload cancelled", "AbortError")); return; }
    signal.addEventListener("abort", abort, { once: true });
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);
    request.send(body);
  });
  return { videoUrl: result.publicUrl, storagePath: result.storagePath };
}
