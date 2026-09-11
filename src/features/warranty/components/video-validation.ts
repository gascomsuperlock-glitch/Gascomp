import { UNREADABLE_VIDEO_ERROR, validateVideoSignature } from "../model/video-evidence";

export async function validateVideoPlayback(file: File): Promise<string | null> {
  try {
    if (!(await validateVideoSignature(file))) return UNREADABLE_VIDEO_ERROR;
    return await new Promise<string | null>((resolve) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      const timer = window.setTimeout(() => finish("Video checking timed out. Please select the video again or upload a shorter copy."), 15_000);
      function finish(error: string | null) {
        window.clearTimeout(timer);
        video.onloadeddata = null;
        video.onerror = null;
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(url);
        resolve(error);
      }
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.onerror = () => finish(UNREADABLE_VIDEO_ERROR);
      video.onloadeddata = () => finish(video.videoWidth > 0 && video.videoHeight > 0 && video.duration > 0 ? null : UNREADABLE_VIDEO_ERROR);
      video.src = url;
      video.load();
    });
  } catch {
    return UNREADABLE_VIDEO_ERROR;
  }
}
