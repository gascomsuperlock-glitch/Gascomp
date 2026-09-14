import type { WarrantyEvidenceKind } from "./types";
import type { WarrantyTicketInput } from "./input";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const ALLOWED_INVOICE_TYPES: Record<string, string> = { ...ALLOWED_IMAGE_TYPES, "application/pdf": ".pdf" };
const ALLOWED_VIDEO_TYPES: Record<string, string> = {
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

export const MAX_INVOICE_SIZE = 4 * 1024 * 1024;
export const MAX_PHOTO_SIZE = 4 * 1024 * 1024;
export const MAX_PHOTO_COUNT = 4;
export const MAX_VIDEO_MB = 50;
export const MAX_VIDEO_SIZE = MAX_VIDEO_MB * 1024 * 1024;

export function validateEvidenceFile(file: File, kind: WarrantyEvidenceKind): string | null {
  const allowedTypes = kind === "invoice" ? ALLOWED_INVOICE_TYPES : kind === "photo" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  const maxSize = kind === "invoice" ? MAX_INVOICE_SIZE : kind === "photo" ? MAX_PHOTO_SIZE : MAX_VIDEO_SIZE;
  if (file.size === 0) return "The selected file is empty. Upload a non-empty file.";
  const videoCandidate = kind === "video" && (file.type.startsWith("video/") ||
    ((!file.type || file.type === "application/octet-stream" || file.type === "application/ogg") &&
      VIDEO_EXTENSIONS.has(`.${file.name?.split(".").pop()?.toLowerCase()}`)));
  if (!(file.type in allowedTypes) && !videoCandidate) {
    if (kind === "invoice") return "Proof of purchase must be a JPG, PNG, WebP, or PDF file.";
    if (kind === "photo") return "Issue photos must be JPG, PNG, or WebP files.";
    return "Choose a video file such as MP4, MOV, WebM, MKV, AVI, or MPEG.";
  }
  if (file.size > maxSize) {
    if (kind === "invoice") return "Proof of purchase must be no larger than 4 MB.";
    if (kind === "photo") return "Each photo must be no larger than 4 MB.";
    return `The issue video must be no larger than ${MAX_VIDEO_MB} MB.`;
  }
  return null;
}

export function validateEvidenceSelection(files: File[], kind: WarrantyEvidenceKind): string | null {
  if (files.length === 0) {
    if (kind === "invoice") return "Upload an invoice or proof of purchase.";
    if (kind === "photo") return "Upload at least one photo of the product condition.";
    return "Upload a video showing the product issue.";
  }
  if (kind === "photo" && files.length > MAX_PHOTO_COUNT) return `Upload no more than ${MAX_PHOTO_COUNT} photos.`;
  if (kind !== "photo" && files.length > 1) return "Upload exactly one file.";
  for (const file of files) {
    const error = validateEvidenceFile(file, kind);
    if (error) return error;
  }
  return null;
}

export function allowedExtension(file: File, kind: WarrantyEvidenceKind) {
  const types = kind === "invoice" ? ALLOWED_INVOICE_TYPES : kind === "photo" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  return types[file.type];
}

export function evidenceInputs(input: WarrantyTicketInput) {
  return [
    { id: "invoice", kind: "invoice" as const, file: input.invoice },
    ...input.damagePhotos.map((file, index) => ({ id: `photo-${index + 1}`, kind: "photo" as const, file })),
    ...(input.damageVideo ? [{ id: "video", kind: "video" as const, file: input.damageVideo }] : []),
  ];
}
