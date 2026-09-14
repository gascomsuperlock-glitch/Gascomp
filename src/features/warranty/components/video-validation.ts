import { UNREADABLE_VIDEO_ERROR, UNSUPPORTED_VIDEO_ERROR, detectVideoContainer } from "../model/video-evidence";

export async function validateVideoPlayback(file: File): Promise<string | null> {
  try {
    const container = await detectVideoContainer(file);
    if (!container) return UNSUPPORTED_VIDEO_ERROR;
    return await new Promise<string | null>((resolve) => {
      const video = document.createElement("video");
      // Browser codec support varies (especially HEVC/MOV and MKV). The server
      // still decodes the entire file before accepting any evidence.
      if (!video.canPlayType(container.mimeType)) { resolve(null); return; }
      const url = URL.createObjectURL(file);
      let settled = false;
      const timer = window.setTimeout(() => finish(null), 15_000);
      function finish(error: string | null) {
        if (settled) return;
        settled = true;
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
      video.onerror = () => finish(video.error?.code === 3 ? UNREADABLE_VIDEO_ERROR : null);
      video.onloadeddata = () => finish(video.videoWidth > 0 && video.videoHeight > 0 && video.duration > 0 ? null : UNREADABLE_VIDEO_ERROR);
      video.src = url;
      video.load();
    });
  } catch {
    return UNREADABLE_VIDEO_ERROR;
  }
}
