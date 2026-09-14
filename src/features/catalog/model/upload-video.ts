import { videoFileError } from "./video-source";
import { videoThumbnailFileError } from "./video-thumbnail";

export async function uploadVideo(file: File, productId: string, signal: AbortSignal, onProgress: (percent: number) => void): Promise<{ videoUrl: string; storagePath: string }> {
  const invalid = videoFileError(file);
  if (invalid) throw new Error(invalid);
  const result = await requestUpload("/admin/videos/upload", productId, file, signal);
  await uploadToSignedUrl(file, result.signedUrl, signal, onProgress, "Video");
  return { videoUrl: result.publicUrl, storagePath: result.storagePath };
}

export async function uploadVideoThumbnail(file: Blob, productId: string, signal: AbortSignal, onProgress: (percent: number) => void): Promise<{ thumbnailUrl: string; thumbnailStoragePath: string }> {
  const invalid = videoThumbnailFileError(file);
  if (invalid) throw new Error(invalid);
  const result = await requestUpload("/admin/videos/thumbnail-upload", productId, file, signal);
  await uploadToSignedUrl(file, result.signedUrl, signal, onProgress, "Thumbnail");
  return { thumbnailUrl: result.publicUrl, thumbnailStoragePath: result.storagePath };
}

async function requestUpload(endpoint: string, productId: string, file: Blob, signal: AbortSignal): Promise<{ signedUrl: string; publicUrl: string; storagePath: string }> {
  const response = await fetch(endpoint, {
    method: "POST", credentials: "same-origin", redirect: "error", signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, size: file.size, type: file.type }),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(`The upload service returned HTTP ${response.status}. Check the application deployment.`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The upload could not be started.");
  if (!result.signedUrl || !result.publicUrl || !result.storagePath) throw new Error("The upload service returned an invalid response.");
  return result;
}

async function uploadToSignedUrl(file: Blob, signedUrl: string, signal: AbortSignal, onProgress: (percent: number) => void, label: string) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    request.open("PUT", signedUrl);
    request.timeout = 10 * 60 * 1000;
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => { cleanup(); if (request.status >= 200 && request.status < 300) resolve(); else reject(new Error(`${label} upload failed (HTTP ${request.status}). Retry the upload.`)); };
    request.onerror = () => { cleanup(); reject(new Error(`${label} upload lost its connection. Retry the upload.`)); };
    request.ontimeout = () => { cleanup(); reject(new Error(`${label} upload timed out. Retry the upload.`)); };
    request.onabort = () => { cleanup(); reject(new DOMException("Upload cancelled", "AbortError")); };
    if (signal.aborted) { reject(new DOMException("Upload cancelled", "AbortError")); return; }
    signal.addEventListener("abort", abort, { once: true });
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);
    request.send(body);
  });
}
