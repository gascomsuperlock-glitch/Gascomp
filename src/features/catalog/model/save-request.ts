import type { SiteContent } from "./types";
import { savedContentMatches } from "./save-readback";
import { applyContentChanges, createContentChanges } from "./content-changes";
import { uploadProductImages, type ImageUploadCache } from "./upload-product-images";

export type SaveResult = { success: true; content: SiteContent } | { success: false; error: string };

async function verifyInterruptedSave(content: SiteContent, send: typeof fetch, error: string): Promise<SaveResult> {
  try {
    const response = await send("/admin/content", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
      const result = await response.json();
      if (result?.success === true && savedContentMatches(content, result.content)) {
        return { success: true, content: result.content };
      }
    }
  } catch {
    // Keep edits and the uncertainty message when readback is also unavailable.
  }
  return { success: false, error };
}

export async function requestContentSave(content: SiteContent, send: typeof fetch = fetch, baseline?: SiteContent, imageUploads: ImageUploadCache = new Map()): Promise<SaveResult> {
  try {
    content = await uploadProductImages(content, imageUploads, send);
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : "The image upload was interrupted.";
    return { success: false, error: `Image upload failed: ${message} Your edits are still in this tab. Retry Save after the connection recovers.` };
  }
  let response: Response;
  try {
    response = await send("/admin/content", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(baseline ? createContentChanges(content, baseline) : content),
      redirect: "error",
    });
  } catch {
    return verifyInterruptedSave(content, send, "The save response was interrupted and the database check could not confirm all edits. Your edits are still in this tab; the previous request may have reached the server. Check the product in another tab before retrying Save.");
  }

  const errors: Record<number, string> = {
    401: "Your admin session has expired. Sign in again in another tab, then retry Save here to keep your edits.",
    403: "The server rejected the save request origin. Open the admin panel on the configured production domain.",
    404: "The save endpoint is unavailable. Deploy the latest application on the hosting server, then retry Save.",
    413: "The upload exceeds the server size limit. Reduce the selected images and retry Save.",
    502: "The hosting server is unavailable (HTTP 502). Your edits are still in this tab. Retry when the server recovers.",
    503: "The hosting server is unavailable (HTTP 503). Your edits are still in this tab. Retry when the server recovers.",
    504: "The hosting server timed out (HTTP 504). The save may still be processing. Keep this tab open and check the product in another tab before retrying.",
  };
  if (errors[response.status]) {
    if (response.status >= 500) return verifyInterruptedSave(content, send, errors[response.status]);
    return { success: false, error: errors[response.status] };
  }

  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      const result = await response.json();
      if (response.ok && result?.success === true && Array.isArray(result.content?.products)) {
        if (result.mode === "changes") {
          const submitted = baseline ? createContentChanges(content, baseline) : null;
          const ids = result.content.products.map((product: { id?: unknown }) => product?.id);
          if (!submitted || ids.length !== submitted.products.length || new Set(ids).size !== ids.length ||
              !submitted.products.every((product) => ids.includes(product.id)) ||
              typeof result.content.whatsappNumber !== "string" || typeof result.content.supportHours !== "string") {
            throw new Error("Invalid compact save response");
          }
          return { success: true, content: applyContentChanges(content, {
            mode: "changes", products: result.content.products, removedProductIds: [],
            settings: { whatsappNumber: result.content.whatsappNumber, supportHours: result.content.supportHours },
          }) };
        }
        return result;
      }
      if (result?.success === false && typeof result.error === "string") return result;
    } catch {
      // A proxy can truncate a response after the server has saved the content.
    }
  }
  return verifyInterruptedSave(content, send, `The server returned an invalid save response (HTTP ${response.status}) and the database check could not confirm all edits. Keep this tab open and check the product in another tab before retrying.`);
}
