export type VideoSource = {
  provider: "youtube" | "google-drive" | "tiktok" | "file";
  kind: "embed" | "video" | "link";
  url: string;
  playbackUrl: string;
};

export const MAX_VIDEO_MB = 150;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export function videoFileError(file: { size: number; type: string }) {
  if (!VIDEO_MIME_TYPES.some((type) => type === file.type)) return "Choose an MP4 or WebM video.";
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_VIDEO_BYTES) return `The video must be between 1 byte and ${MAX_VIDEO_MB} MB.`;
  return null;
}

export function getVideoUrl(video: { videoUrl?: string; youtubeUrl?: string }) {
  return video.videoUrl ?? video.youtubeUrl ?? "";
}

export function parseVideoSource(value: string): VideoSource | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname;
    const path = url.pathname;
    const original = url.href;
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be", "www.youtu.be"].includes(host)) {
      const id = host.endsWith("youtu.be") ? path.split("/")[1] : /^\/(?:embed|shorts|live)\/([^/]+)/.exec(path)?.[1] ?? url.searchParams.get("v");
      if (!id || !/^[\w-]{11}$/.test(id)) return null;
      return { provider: "youtube", kind: "embed", url: original, playbackUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
    }
    if (host === "drive.google.com") {
      const id = /^\/file\/d\/([\w-]+)(?:\/|$)/.exec(path)?.[1] ?? (["/open", "/uc"].includes(path) ? url.searchParams.get("id") : null);
      if (!id || !/^[\w-]+$/.test(id)) return null;
      const embed = new URL(`https://drive.google.com/file/d/${id}/preview`);
      const key = url.searchParams.get("resourcekey");
      if (key) embed.searchParams.set("resourcekey", key);
      return { provider: "google-drive", kind: "embed", url: original, playbackUrl: embed.href };
    }
    if (["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(host)) {
      const id = /^\/@[^/]+\/video\/(\d+)(?:\/|$)/.exec(path)?.[1] ?? /^\/player\/v1\/(\d+)(?:\/|$)/.exec(path)?.[1];
      if (id) return { provider: "tiktok", kind: "embed", url: original, playbackUrl: `https://www.tiktok.com/player/v1/${id}` };
      if ((["vm.tiktok.com", "vt.tiktok.com"].includes(host) && /^\/[\w-]+\/?$/.test(path)) || /^\/t\/[\w-]+\/?$/.test(path)) {
        return { provider: "tiktok", kind: "link", url: original, playbackUrl: original };
      }
      return null;
    }
    if (/\.(mp4|webm)$/i.test(path)) return { provider: "file", kind: "video", url: original, playbackUrl: original };
  } catch {
    return null;
  }
  return null;
}
