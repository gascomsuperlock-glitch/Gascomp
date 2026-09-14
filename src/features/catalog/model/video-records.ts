import type { Product } from "./types";

export function videoRecords(products: Product[], extendedSchema: boolean, thumbnailSchema = false) {
  return products.flatMap((product) => product.videos.map((video, position) => {
    const url = video.videoUrl ?? video.youtubeUrl ?? "";
    return {
      id: video.id, product_id: product.id, title: video.title,
      description: video.description, duration: video.duration, position,
      // Keep the original URL column populated for rolling deployments.
      youtube_url: url,
      ...(extendedSchema ? { video_url: url, storage_path: video.storagePath ?? null } : {}),
      ...(thumbnailSchema ? {
        thumbnail_url: video.thumbnailUrl ?? null,
        thumbnail_storage_path: video.thumbnailStoragePath ?? null,
      } : {}),
    };
  }));
}
