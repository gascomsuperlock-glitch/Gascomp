import "server-only";
import { randomBytes } from "node:crypto";
import type { Product, ProductImage, SiteContent } from "@/features/catalog/model/types";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";

export function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("The product image format is not supported.");
  return { mimeType: match[1], bytes: Uint8Array.from(Buffer.from(match[2], "base64")) };
}

export function safePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100);
}

export async function uploadNewImages(content: SiteContent) {
  const client = createAdminSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");

  const products: Product[] = [];
  for (const product of content.products) {
    const images: ProductImage[] = [];
    for (const image of product.images) {
      if (!image.dataUrl?.startsWith("data:")) {
        images.push(image);
        continue;
      }

      const { mimeType, bytes } = parseDataUrl(image.dataUrl);
      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
      const storagePath = `products/${safePathPart(product.id)}/${safePathPart(image.id)}-${randomBytes(5).toString("hex")}.${extension}`;
      const upload = await client.storage.from("product-images").upload(storagePath, bytes, {
        contentType: mimeType,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const { data } = client.storage.from("product-images").getPublicUrl(storagePath);
      images.push({ ...image, dataUrl: undefined, url: data.publicUrl, storagePath });
    }
    products.push({ ...product, images });
  }
  return { ...content, products };
}
