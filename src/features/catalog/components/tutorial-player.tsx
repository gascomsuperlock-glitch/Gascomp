"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle, Play } from "lucide-react";
import { parseVideoSource } from "@/features/catalog/model/video-source";

export function TutorialPlayer({ url, title }: { url: string; title: string }) {
  return <Player key={url} url={url} title={title} />;
}

function Player({ url, title }: { url: string; title: string }) {
  const source = parseVideoSource(url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl bg-[#2c3038] text-white">
      <div className="relative aspect-video">
        {source && source.kind !== "link" && !failed ? <>
          {!loaded && <div role="status" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[#2c3038]/70 text-xs"><LoaderCircle className="size-5 animate-spin" /> Loading video...</div>}
          {source.kind === "video" ? (
            <video src={source.playbackUrl} aria-label={title} controls playsInline preload="metadata" className="size-full" onLoadedMetadata={() => setLoaded(true)} onError={() => setFailed(true)} />
          ) : (
            <iframe src={source.playbackUrl} title={title} className="size-full" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
          )}
        </> : <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center">
          <Play className="size-7 text-white/50" />
          <p className="text-xs">{failed ? "The video could not be loaded. Open the original video below." : source?.kind === "link" ? "Open this shared video on TikTok." : "Add a supported video link or upload a video to see the preview."}</p>
        </div>}
      </div>
      {source && <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-t border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white"><ExternalLink className="size-3" /> Open original video</a>}
    </div>
  );
}
