import "server-only";
import { randomUUID } from "node:crypto";
import { getAdminSession } from "@/features/auth/server/session";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import { videoFileError } from "@/features/catalog/model/video-source";

export async function createVideoUpload(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const origins = new Set([new URL(request.url).origin]);
  try { if (process.env.GASCOMP_PUBLIC_BASE_URL) origins.add(new URL(process.env.GASCOMP_PUBLIC_BASE_URL).origin); } catch { /* Invalid configuration adds no trusted origin. */ }
  if (!origins.has(request.headers.get("origin") ?? "")) return reply({ error: "The upload request origin is not allowed." }, 403);
  if (!(await getAdminSession())) return reply({ error: "Your session expired. Sign in again in another tab, then retry the upload." }, 401);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "The upload request must contain JSON." }, 415);
  let input;
  try { input = await request.json(); } catch { return reply({ error: "Invalid upload request." }, 400); }
  if (!input || typeof input.productId !== "string" || !/^[\w-]{1,160}$/.test(input.productId)) return reply({ error: "Invalid product identity." }, 400);
  const validation = videoFileError({ size: input.size, type: input.type });
  if (validation) return reply({ error: validation }, 400);
  const client = createAdminSupabaseClient();
  if (!client) return reply({ error: "Video uploads require Supabase storage." }, 503);
  const product = await client.from("products").select("id").eq("id", input.productId).maybeSingle();
  if (product.error) return reply({ error: "The product could not be checked. Retry the upload." }, 503);
  if (!product.data) return reply({ error: "Save this new product before uploading its video." }, 409);
  const path = `products/${input.productId}/${randomUUID()}.${input.type === "video/mp4" ? "mp4" : "webm"}`;
  const result = await client.storage.from("product-videos").createSignedUploadUrl(path);
  if (result.error) {
    console.error("Video upload authorization failed", { code: result.error.name });
    return reply({ error: "Video storage is unavailable. Check that the tutorial video migration has been applied." }, 503);
  }
  return reply({ signedUrl: result.data.signedUrl, storagePath: path, publicUrl: client.storage.from("product-videos").getPublicUrl(path).data.publicUrl });
}
