import type { SiteContent } from "./types";
import { uploadToSignedUrl } from "./upload-video";

type UploadedImage = { dataUrl: string; url: string; storagePath: string };
export type ImageUploadCache = Map<string, UploadedImage>;

export async function uploadProductImages(
  content: SiteContent,
  cache: ImageUploadCache,
  send: typeof fetch = fetch,
  upload: typeof uploadToSignedUrl = uploadToSignedUrl,
): Promise<SiteContent> {
  const pending = new Set(content.products.flatMap((product) => product.images
    .filter((image) => image.dataUrl?.startsWith("data:"))
    .map((image) => JSON.stringify([product.id, image.id]))));
  for (const key of cache.keys()) if (!pending.has(key)) cache.delete(key);
  const products = [];
  for (const product of content.products) {
    const images = [];
    for (const image of product.images) {
      if (!image.dataUrl?.startsWith("data:")) { images.push(image); continue; }
      const key = JSON.stringify([product.id, image.id]);
      let uploaded = cache.get(key);
      if (!uploaded || uploaded.dataUrl !== image.dataUrl) {
        const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image.dataUrl);
        if (!match) throw new Error("The product image format is not supported.");
        const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
        if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error("Images must be nonempty and no larger than 8 MB.");
        const response = await send("/admin/images/upload", {
          method: "POST", credentials: "same-origin", redirect: "error",
          signal: AbortSignal.timeout(15_000),
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ productId: product.id, imageId: image.id, type: match[1], size: bytes.length }),
        });
        if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(`Image upload authorization failed (HTTP ${response.status}).`);
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "The image upload could not be authorized.");
        if (![result.signedUrl, result.publicUrl, result.storagePath].every((value) => typeof value === "string" && value.length > 0)) {
          throw new Error("The image upload service returned an invalid response.");
        }
        await upload(new Blob([bytes], { type: match[1] }), result.signedUrl, AbortSignal.timeout(120_000), () => {}, "Image");
        uploaded = { dataUrl: image.dataUrl, url: result.publicUrl, storagePath: result.storagePath };
        cache.set(key, uploaded);
      }
      images.push({ ...image, dataUrl: undefined, url: uploaded.url, storagePath: uploaded.storagePath });
    }
    products.push({ ...product, images });
  }
  return { ...content, products };
}
