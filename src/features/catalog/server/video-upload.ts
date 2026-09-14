import "server-only";
import { randomUUID } from "node:crypto";
import { getAdminSession } from "@/features/auth/server/session";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import { videoFileError } from "@/features/catalog/model/video-source";
import { videoThumbnailFileError } from "@/features/catalog/model/video-thumbnail";

export async function createVideoUpload(request: Request) {
  return createTutorialUpload(request, "video");
}

export async function createVideoThumbnailUpload(request: Request) {
  return createTutorialUpload(request, "thumbnail");
}

async function createTutorialUpload(request: Request, kind: "video" | "thumbnail") {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const origins = new Set([new URL(request.url).origin]);
  try { if (process.env.GASCOMP_PUBLIC_BASE_URL) origins.add(new URL(process.env.GASCOMP_PUBLIC_BASE_URL).origin); } catch { /* Invalid configuration adds no trusted origin. */ }
  if (!origins.has(request.headers.get("origin") ?? "")) return reply({ error: "The upload request origin is not allowed." }, 403);
  if (!(await getAdminSession())) return reply({ error: "Your session expired. Sign in again in another tab, then retry the upload." }, 401);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "The upload request must contain JSON." }, 415);
  let input;
  try { input = await request.json(); } catch { return reply({ error: "Invalid upload request." }, 400); }
  if (!input || typeof input.productId !== "string" || !/^[\w-]{1,160}$/.test(input.productId)) return reply({ error: "Invalid product identity." }, 400);
  const validation = kind === "video"
    ? videoFileError({ size: input.size, type: input.type })
    : videoThumbnailFileError({ size: input.size, type: input.type });
  if (validation) return reply({ error: validation }, 400);
  const client = createAdminSupabaseClient();
  if (!client) return reply({ error: "Video uploads require Supabase storage." }, 503);
  const product = await client.from("products").select("id").eq("id", input.productId).maybeSingle();
  if (product.error) return reply({ error: "The product could not be checked. Retry the upload." }, 503);
  if (!product.data) return reply({ error: "Save this new product before uploading its video." }, 409);
  if (kind === "thumbnail") {
    const schema = await client.from("tutorial_videos").select("thumbnail_url, thumbnail_storage_path").limit(0);
    if (schema.error) {
      if (["42703", "PGRST204"].includes(schema.error.code)) {
        return reply({ error: "Tutorial thumbnail storage is not ready. Apply the tutorial thumbnail migration, then retry." }, 503);
      }
      return reply({ error: "Tutorial thumbnail storage could not be checked. Retry the upload." }, 503);
    }
  }
  const bucket = kind === "video" ? "product-videos" : "product-images";
  const path = kind === "video"
    ? `products/${input.productId}/${randomUUID()}.${input.type === "video/mp4" ? "mp4" : "webm"}`
    : `tutorial-thumbnails/${input.productId}/${randomUUID()}.webp`;
  const result = await client.storage.from(bucket).createSignedUploadUrl(path);
  if (result.error) {
    console.error("Tutorial upload authorization failed", { kind, code: result.error.name });
    return reply({ error: kind === "video"
      ? "Video storage is unavailable. Check that the tutorial video migration has been applied."
      : "Thumbnail storage is unavailable. Check the product image bucket configuration." }, 503);
  }
  return reply({ signedUrl: result.data.signedUrl, storagePath: path, publicUrl: client.storage.from(bucket).getPublicUrl(path).data.publicUrl });
}
