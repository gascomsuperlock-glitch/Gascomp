import type { SiteContent } from "./types";

// Normalize only representations the persistence layer treats as equivalent.
// Uploaded data URLs deliberately remain different from stored URLs: metadata
// alone cannot prove that the intended image bytes were saved.
function comparableContent(content: SiteContent) {
  return {
    ...content,
    products: content.products.map((product) => ({
      ...product,
      attributes: product.attributes ?? [],
      everPublished: product.everPublished || product.published,
      variations: product.variations.map((variation) => ({ ...variation, attributes: variation.attributes ?? [] })),
      videos: product.videos.map((video) => ({
        ...video,
        youtubeUrl: video.videoUrl ?? video.youtubeUrl ?? "",
        videoUrl: video.videoUrl ?? video.youtubeUrl ?? "",
      })),
      issues: product.issues.map((issue) => ({ ...issue, warning: issue.warning || undefined })),
    })).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]));
    }
    return item;
  });
}

export function savedContentMatches(submitted: SiteContent, stored: SiteContent): boolean {
  try {
    return canonicalJson(comparableContent(submitted)) === canonicalJson(comparableContent(stored));
  } catch {
    // Malformed or older endpoint responses never confirm a save.
    return false;
  }
}
