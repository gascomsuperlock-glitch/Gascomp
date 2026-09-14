"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle, Play } from "lucide-react";
import { parseVideoSource } from "@/features/catalog/model/video-source";
import { dictionaries } from "@/shared/i18n/dictionaries";
import type { AppLanguage } from "@/shared/i18n/language";

export function TutorialPlayer({ url, title, language = "en", poster }: { url: string; title: string; language?: AppLanguage; poster?: string }) {
  return <Player key={`${url}:${poster ?? ""}`} url={url} title={title} language={language} poster={poster} />;
}

function Player({ url, title, language, poster }: { url: string; title: string; language: AppLanguage; poster?: string }) {
  const copy = dictionaries[language].player;
  const source = parseVideoSource(url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl bg-[#2c3038] text-white">
      <div className="relative aspect-video">
        {source && source.kind !== "link" && !failed ? <>
          {!loaded && <div role="status" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[#2c3038]/70 text-xs"><LoaderCircle className="size-5 animate-spin" /> {copy.loading}</div>}
          {source.kind === "video" ? (
            <video src={source.playbackUrl} poster={poster} aria-label={title} controls playsInline preload="metadata" className="size-full" onLoadedMetadata={() => setLoaded(true)} onError={() => setFailed(true)} />
          ) : (
            <iframe src={source.playbackUrl} title={title} className="size-full" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
          )}
        </> : <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center">
          <Play className="size-7 text-white/50" />
          <p className="text-xs">{failed ? copy.failed : source?.kind === "link" ? copy.tiktok : copy.unsupported}</p>
        </div>}
      </div>
      {source && <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-t border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white"><ExternalLink className="size-3" /> {copy.openOriginal}</a>}
    </div>
  );
}
