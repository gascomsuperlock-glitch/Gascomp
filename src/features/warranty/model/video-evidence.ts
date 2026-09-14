export const UNREADABLE_VIDEO_ERROR = "This video could not be read. Please choose a working copy or export the video again.";
export const UNSUPPORTED_VIDEO_ERROR = "Choose a video file such as MP4, MOV, WebM, MKV, AVI, 3GP, MPEG, MTS, WMV, FLV, or OGV.";

// Identify the container from bytes, not the extension or browser-supplied MIME.
// These are self-contained media containers; playlists and image files are excluded.
export async function detectVideoContainer(file: File): Promise<{ mimeType: string; demuxer: string } | null> {
  const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (bytes.length < 12) return null;
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const starts = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const box = text(4, 8);
  if (["ftyp", "moov", "mdat", "wide", "free", "skip"].includes(box)) {
    const brand = box === "ftyp" ? text(8, 12) : "qt  ";
    return { mimeType: brand === "qt  " ? "video/quicktime" : brand.startsWith("3g") ? "video/3gpp" : "video/mp4", demuxer: "mov" };
  }
  if (starts([0x1a, 0x45, 0xdf, 0xa3])) {
    return { mimeType: text(0, bytes.length).includes("webm") ? "video/webm" : "video/x-matroska", demuxer: "matroska" };
  }
  if (text(0, 4) === "RIFF" && text(8, 12) === "AVI ") return { mimeType: "video/x-msvideo", demuxer: "avi" };
  if (starts([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0, 0xaa, 0, 0x62, 0xce, 0x6c])) return { mimeType: "video/x-ms-wmv", demuxer: "asf" };
  if (text(0, 3) === "FLV" && bytes[3] === 1) return { mimeType: "video/x-flv", demuxer: "flv" };
  if (text(0, 4) === "OggS") return { mimeType: "video/ogg", demuxer: "ogg" };
  if (starts([0, 0, 1, 0xba]) || starts([0, 0, 1, 0xb3])) return { mimeType: "video/mpeg", demuxer: bytes[3] === 0xba ? "mpeg" : "mpegvideo" };
  for (const [offset, stride] of [[0, 188], [4, 192], [0, 204]]) {
    if ([0, 1, 2].every((packet) => bytes[offset + packet * stride] === 0x47)) return { mimeType: "video/mp2t", demuxer: "mpegts" };
  }
  return null;
}

export async function validateVideoSignature(file: File): Promise<boolean> {
  return (await detectVideoContainer(file)) !== null;
}
