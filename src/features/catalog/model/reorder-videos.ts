import type { TutorialVideo } from "./types";

export function reorderVideos(videos: TutorialVideo[], sourceId: string, targetId: string): TutorialVideo[] {
  const sourceIndex = videos.findIndex((video) => video.id === sourceId);
  const targetIndex = videos.findIndex((video) => video.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return videos;

  const reordered = [...videos];
  const [video] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, video);
  return reordered;
}
