import type { SiteContent } from "./types";

const MAX_SAVE_BYTES = 40 * 1024 * 1024;

export async function readSaveRequest(request: Request, maxBytes = MAX_SAVE_BYTES): Promise<
  { success: true; content: SiteContent } | { success: false; error: string; status: number }
> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return { success: false, status: 415, error: "The save request must contain JSON." };
  }
  const tooLarge = { success: false as const, status: 413, error: "The save request exceeds the upload limit." };
  if (Number(request.headers.get("content-length")) > maxBytes) return tooLarge;
  const reader = request.body?.getReader();
  if (!reader) return { success: false, status: 400, error: "The save request is empty." };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return tooLarge;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const content = JSON.parse(new TextDecoder().decode(bytes));
    if (!content || !Array.isArray(content.products) || typeof content.whatsappNumber !== "string" || typeof content.supportHours !== "string") {
      return { success: false, status: 400, error: "Content data is invalid." };
    }
    return { success: true, content };
  } catch {
    return { success: false, status: 400, error: "The save request could not be read. Keep this tab open and retry Save." };
  } finally {
    reader.releaseLock();
  }
}
