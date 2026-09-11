"use client";

import { MonitorPlay, Play, Plus, Trash2 } from "lucide-react";
import { createId } from "@/shared/lib/create-id";
import { getYoutubeEmbedUrl } from "@/shared/lib/youtube";
import type { Product } from "@/features/catalog/model/types";
import { Field, EditorHeading, fieldClass, areaClass } from "@/shared/components/ui/editor-fields";

import { AdminEmpty } from "@/shared/components/ui/empty-state";

export function VideosEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  function addVideo() {
    update((current) => ({ ...current, videos: [...current.videos, { id: createId("video"), title: "New tutorial", description: "", youtubeUrl: "", duration: "" }] }));
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-4"><EditorHeading title="Tutorial videos" copy="Paste a YouTube link. The video plays directly on the Gascomp page." /><button type="button" onClick={addVideo} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white"><Plus className="size-3.5" /> Add</button></div>
      <div className="mt-7 space-y-4">
        {product.videos.map((video, index) => {
          const embedUrl = getYoutubeEmbedUrl(video.youtubeUrl);
          return (
            <article key={video.id} className="rounded-[20px] border border-[#2c3038]/9 bg-[#fbfaf7] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between"><p className="text-xs font-extrabold">Video {String(index + 1).padStart(2, "0")}</p><button type="button" onClick={() => update((current) => ({ ...current, videos: current.videos.filter((item) => item.id !== video.id) }))} className="grid size-8 place-items-center rounded-full text-[#9b7770] hover:bg-[#feeae5] hover:text-[#c9482d]" aria-label="Delete video"><Trash2 className="size-3.5" /></button></div>
              <div className="grid gap-5 lg:grid-cols-[1fr_190px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Video title"><input value={video.title} onChange={(event) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, title: event.target.value } : item) }))} className={fieldClass} /></Field>
                  <Field label="Duration"><input value={video.duration} onChange={(event) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, duration: event.target.value } : item) }))} placeholder="Example: 03:20" className={fieldClass} /></Field>
                  <div className="sm:col-span-2"><Field label="YouTube link"><input value={video.youtubeUrl} onChange={(event) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, youtubeUrl: event.target.value } : item) }))} placeholder="https://youtube.com/watch?v=..." className={fieldClass} />{video.youtubeUrl && !embedUrl && <p className="mt-2 text-[10px] font-semibold text-[#bd5236]">This YouTube link is not recognized.</p>}</Field></div>
                  <div className="sm:col-span-2"><Field label="Description"><textarea value={video.description} onChange={(event) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, description: event.target.value } : item) }))} className={areaClass} /></Field></div>
                </div>
                <div><p className="mb-2 text-[10px] font-extrabold text-[#8c9498]">PREVIEW</p><div className="aspect-video overflow-hidden rounded-xl bg-[#2c3038]">{embedUrl ? <iframe src={embedUrl} title={`Preview ${video.title}`} className="size-full" allowFullScreen /> : <div className="grid size-full place-items-center text-white/35"><Play className="size-7" /></div>}</div></div>
              </div>
            </article>
          );
        })}
        {product.videos.length === 0 && <AdminEmpty icon={MonitorPlay} text="No tutorial videos yet." action="Add the first video" onClick={addVideo} />}
      </div>
    </div>
  );
}
