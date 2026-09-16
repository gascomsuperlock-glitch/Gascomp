import "server-only";
import { createWarrantyClaim } from "./claim-actions";

const MAX_BODY_BYTES = 72 * 1024 * 1024;
const response = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function postWarrantyClaim(request: Request) {
  // Route Handlers do not receive Server Actions' automatic origin/body checks.
  const origin = request.headers.get("origin");
  let validOrigin = false;
  try {
    const parsed = new URL(origin ?? "");
    validOrigin = ["http:", "https:"].includes(parsed.protocol) && parsed.origin === origin && parsed.host === (request.headers.get("host") ?? new URL(request.url).host);
  } catch { /* Invalid origins are rejected before reading evidence. */ }
  if (!validOrigin) return response("This request could not be verified. Reload the page and try again.", 403);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;")) return response("The submission could not be processed.", 415);
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return response("The submission is too large. Check the evidence file sizes.", 413);
  if (!request.body) return response("The submission could not be processed.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const uploadDeadline = Date.now() + 10 * 60_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    while (true) {
      if (Date.now() >= uploadDeadline) throw new Error("Upload timed out.");
      const part = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Upload timed out.")), Math.min(45_000, uploadDeadline - Date.now())); }),
      ]);
      clearTimeout(timer);
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        return response("The submission is too large. Check the evidence file sizes.", 413);
      }
      chunks.push(part.value);
    }
    const body = new Blob(chunks as BlobPart[]);
    // Blob.type lowercases values; multipart boundary tokens are case-sensitive.
    const formData = await new Response(body, { headers: { "Content-Type": contentType } }).formData();
    const result = await createWarrantyClaim({}, formData);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    void reader.cancel().catch(() => {});
    return response("The connection was interrupted before confirmation arrived. Your details and files are still here. Contact support to check whether your claim was received before trying again.", 503);
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
