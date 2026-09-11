export const UNREADABLE_VIDEO_ERROR = "This video could not be read. It may be damaged or use an unsupported format. Export it again and upload a working MP4, WebM, or MOV video.";

export async function validateVideoSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length < 12) return false;
  if (file.type === "video/webm") {
    return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  // MP4 and QuickTime use ISO media boxes; older MOV files may omit ftyp.
  const box = String.fromCharCode(...bytes.slice(4, 8));
  return ["ftyp", "moov", "mdat", "wide", "free", "skip"].includes(box);
}
