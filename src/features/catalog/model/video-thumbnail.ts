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
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_VIDEO_THUMBNAIL_BYTES) {
    return "The tutorial thumbnail must be between 1 byte and 1 MB.";
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
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser could not prepare video thumbnails.");

    const candidates: VideoThumbnailCandidate[] = [];
    try {
      for (const timeSeconds of times) {
        video.currentTime = timeSeconds;
        await waitForVideoEvent(video, "seeked", signal);
        context.drawImage(video, 0, 0, width, height);
        const blob = await canvasToBlob(canvas);
        const invalid = videoThumbnailFileError(blob);
        if (invalid) throw new Error(invalid);
        candidates.push({ blob, previewUrl: URL.createObjectURL(blob), timeSeconds });
      }
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

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not create a thumbnail image."));
    }, VIDEO_THUMBNAIL_MIME_TYPE, 0.82);
  });
}
