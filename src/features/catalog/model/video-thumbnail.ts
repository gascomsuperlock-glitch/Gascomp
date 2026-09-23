export const VIDEO_THUMBNAIL_MIME_TYPE = "image/webp";
export const VIDEO_THUMBNAIL_MIME_TYPES = [VIDEO_THUMBNAIL_MIME_TYPE, "image/jpeg", "image/png"] as const;
export const MAX_VIDEO_THUMBNAIL_BYTES = 1024 * 1024;

export type VideoThumbnailCandidate = {
  blob: Blob;
  previewUrl: string;
  timeSeconds: number;
};

export function videoThumbnailFileError(file: { size: number; type: string }) {
  if (!VIDEO_THUMBNAIL_MIME_TYPES.some((type) => type === file.type)) {
    return "The tutorial thumbnail must be a WebP, JPEG, or PNG image.";
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return "The tutorial thumbnail image came out empty. Choose another frame or retry.";
  }
  if (file.size > MAX_VIDEO_THUMBNAIL_BYTES) {
    return "The tutorial thumbnail must be 1 MB or smaller.";
  }
  return null;
}

export function getVideoThumbnailTimes(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const lastFrame = Math.max(0.001, duration - Math.min(0.1, duration * 0.05));
  return [0.1, 0.35, 0.6, 0.85]
    .map((fraction) => Math.min(lastFrame, Math.max(0.001, duration * fraction)))
    .filter((time, index, times) => index === 0 || Math.abs(time - times[index - 1]) > 0.01);
}

export type ThumbnailEncodeAttempt = { mimeType: string; quality: number; scale: number };

const THUMBNAIL_ENCODE_STEPS = [
  { quality: 0.82, scale: 1 },
  { quality: 0.6, scale: 1 },
  { quality: 0.55, scale: 0.75 },
  { quality: 0.5, scale: 0.5 },
] as const;

/**
 * Encodes the smallest acceptable thumbnail the browser can produce. Browsers that cannot encode
 * WebP silently return PNG, which easily exceeds the size limit, so JPEG is tried before the frame
 * is redrawn smaller.
 */
export async function encodeThumbnailBlob(render: (attempt: ThumbnailEncodeAttempt) => Promise<Blob>) {
  let lastFailure = "The browser could not create a thumbnail image.";
  for (const step of THUMBNAIL_ENCODE_STEPS) {
    for (const mimeType of [VIDEO_THUMBNAIL_MIME_TYPE, "image/jpeg"]) {
      const blob = await render({ ...step, mimeType });
      const invalid = videoThumbnailFileError(blob);
      if (!invalid) return blob;
      lastFailure = invalid;
      if (blob.type === mimeType) break;
    }
  }
  throw new Error(lastFailure);
}

export async function extractVideoThumbnails(source: Blob | string, signal?: AbortSignal) {
  const video = document.createElement("video");
  const sourceUrl = typeof source === "string" ? source : URL.createObjectURL(source);
  const shouldRevokeSource = typeof source !== "string";
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = sourceUrl;

  try {
    await waitForVideoEvent(video, "loadedmetadata", signal);
    const times = getVideoThumbnailTimes(video.duration);
    if (!times.length || !video.videoWidth || !video.videoHeight) {
      throw new Error("The browser could not read frames from this video.");
    }

    const width = Math.min(640, video.videoWidth);
    const height = Math.max(1, Math.round(width * video.videoHeight / video.videoWidth));

    const candidates: VideoThumbnailCandidate[] = [];
    try {
      let lastFrameFailure: unknown = null;
      for (const timeSeconds of times) {
        video.currentTime = timeSeconds;
        await waitForVideoEvent(video, "seeked", signal);
        try {
          const blob = await encodeThumbnailBlob((attempt) => drawThumbnail(video, width, height, attempt));
          candidates.push({ blob, previewUrl: URL.createObjectURL(blob), timeSeconds });
        } catch (frameFailure) {
          // One unusable frame must not discard the frames that did encode.
          if (signal?.aborted) throw frameFailure;
          lastFrameFailure = frameFailure;
        }
      }
      if (!candidates.length) throw lastFrameFailure ?? new Error("The browser could not read frames from this video.");
      return { candidates, duration: video.duration };
    } catch (error) {
      revokeVideoThumbnailCandidates(candidates);
      throw error;
    }
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Thumbnail preparation cancelled", "AbortError");
    if (error instanceof Error && error.message) throw error;
    throw new Error("Thumbnail choices could not be created from this video.");
  } finally {
    video.removeAttribute("src");
    video.load();
    if (shouldRevokeSource) URL.revokeObjectURL(sourceUrl);
  }
}

export function revokeVideoThumbnailCandidates(candidates: VideoThumbnailCandidate[]) {
  for (const candidate of candidates) URL.revokeObjectURL(candidate.previewUrl);
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadedmetadata" | "seeked", signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, ready);
      video.removeEventListener("error", failed);
      signal?.removeEventListener("abort", cancelled);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("The browser could not decode this video.")); };
    const cancelled = () => { cleanup(); reject(new DOMException("Thumbnail preparation cancelled", "AbortError")); };
    video.addEventListener(eventName, ready, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal?.addEventListener("abort", cancelled, { once: true });
    if (signal?.aborted) cancelled();
  });
}

async function drawThumbnail(video: HTMLVideoElement, width: number, height: number, attempt: ThumbnailEncodeAttempt) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * attempt.scale));
  canvas.height = Math.max(1, Math.round(height * attempt.scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not prepare video thumbnails.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, attempt.mimeType, attempt.quality);
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not create a thumbnail image."));
    }, mimeType, quality);
  });
}
