import "server-only";
import { randomUUID } from "node:crypto";
import { getAdminSession } from "@/features/auth/server/session";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";

export async function createImageUpload(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const origins = new Set([new URL(request.url).origin]);
  try { if (process.env.GASCOMP_PUBLIC_BASE_URL) origins.add(new URL(process.env.GASCOMP_PUBLIC_BASE_URL).origin); } catch { /* Invalid configuration adds no trusted origin. */ }
  if (!origins.has(request.headers.get("origin") ?? "")) return reply({ error: "The upload request origin is not allowed." }, 403);
  if (!(await getAdminSession())) return reply({ error: "Your session expired. Sign in again in another tab, then retry Save." }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "The upload request must contain JSON." }, 415);
  if (Number(request.headers.get("content-length")) > 4096) return reply({ error: "The upload authorization request is too large." }, 413);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "The upload request is empty." }, 400);
  let input;
  try {
    const chunks = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel(); return reply({ error: "The upload authorization request is too large." }, 413); }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply({ error: "Invalid image upload request." }, 400); }
  finally { reader.releaseLock(); }
  if (!input || ![input.productId, input.imageId].every((value) => typeof value === "string" && /^[\w-]{1,160}$/.test(value))) {
    return reply({ error: "Invalid product or image identity." }, 400);
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(input.type) || !Number.isInteger(input.size) || input.size <= 0 || input.size > 8 * 1024 * 1024) {
    return reply({ error: "Select a JPG, PNG, or WebP image no larger than 8 MB." }, 400);
  }
  const client = createAdminSupabaseClient();
  if (!client) return reply({ error: "Image uploads require Supabase storage." }, 503);
  // New products need a photo before their first Save; authorization does not
  // create a product or publish image metadata. The signed URL scopes one path.
  const extension = input.type === "image/jpeg" ? "jpg" : input.type.split("/")[1];
  const path = `products/${input.productId}/${input.imageId}-${randomUUID()}.${extension}`;
  try {
    const bucket = client.storage.from("product-images");
    const result = await bucket.createSignedUploadUrl(path);
    if (result.error) return reply({ error: "Image storage is unavailable. Retry Save when the connection recovers." }, 503);
    return reply({ signedUrl: result.data.signedUrl, storagePath: path, publicUrl: bucket.getPublicUrl(path).data.publicUrl });
  } catch { return reply({ error: "Image storage is unavailable. Retry Save when the connection recovers." }, 503); }
}
