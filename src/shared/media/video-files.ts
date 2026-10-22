export const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
  "video/x-msvideo": ".avi",
  "video/avi": ".avi",
  "video/msvideo": ".avi",
  "video/3gpp": ".3gp",
  "video/3gpp2": ".3g2",
  "video/mpeg": ".mpeg",
  "video/mp2t": ".mts",
  "video/x-ms-wmv": ".wmv",
  "video/x-flv": ".flv",
  "video/ogg": ".ogv",
  "video/x-m4v": ".m4v",
};

export const VIDEO_ACCEPT = "video/*,.mp4,.mov,.webm,.mkv,.avi,.3gp,.3g2,.mpeg,.mpg,.mts,.m2ts,.ts,.wmv,.asf,.flv,.ogv,.m4v";
const VIDEO_EXTENSIONS = new Set(VIDEO_ACCEPT.split(",").slice(1));

export const MAX_VIDEO_MB = 50;
export const MAX_VIDEO_SIZE = MAX_VIDEO_MB * 1024 * 1024;

export function validateVideoFile(file: File): string | null {
  if (file.size === 0) return "The selected file is empty. Upload a non-empty file.";
  const candidate = file.type.startsWith("video/") ||
    ((!file.type || file.type === "application/octet-stream" || file.type === "application/ogg") &&
      VIDEO_EXTENSIONS.has(`.${file.name?.split(".").pop()?.toLowerCase()}`));
  if (!(file.type in ALLOWED_VIDEO_TYPES) && !candidate) return "Choose a video file such as MP4, MOV, WebM, MKV, AVI, or MPEG.";
  if (file.size > MAX_VIDEO_SIZE) return `The issue video must be no larger than ${MAX_VIDEO_MB} MB.`;
  return null;
}
