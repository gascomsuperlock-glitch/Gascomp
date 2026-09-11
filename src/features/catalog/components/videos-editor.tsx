"use client";

import { useEffect, useRef, useState } from "react";
import { MonitorPlay, Plus, Trash2, Upload } from "lucide-react";
import { createId } from "@/shared/lib/create-id";
import type { Product, TutorialVideo } from "@/features/catalog/model/types";
import { getVideoUrl, MAX_VIDEO_MB, parseVideoSource, videoFileError } from "@/features/catalog/model/video-source";
import { uploadVideo } from "@/features/catalog/model/upload-video";
import { TutorialPlayer } from "@/features/catalog/components/tutorial-player";
import { useContent } from "@/features/catalog/hooks/use-content";
import { Field, EditorHeading, fieldClass, areaClass } from "@/shared/components/ui/editor-fields";
import { AdminEmpty } from "@/shared/components/ui/empty-state";

export function VideosEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  const { storageMode } = useContent();
  function addVideo() {
    update((current) => ({ ...current, videos: [...current.videos, { id: createId("video"), title: "New tutorial", description: "", youtubeUrl: "", videoUrl: "", duration: "" }] }));
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-4"><EditorHeading title="Tutorial videos" copy="Use a YouTube, Google Drive, or TikTok link, or upload a video. Select Save to apply your changes." /><button type="button" onClick={addVideo} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white"><Plus className="size-3.5" /> Add</button></div>
      <div className="mt-7 space-y-4">
        {product.videos.map((video, index) => <VideoEditor key={`${product.id}:${video.id}`} video={video} index={index} productId={product.id} uploadsEnabled={storageMode === "supabase"}
          update={(patch) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, ...patch } : item) }))}
          remove={() => update((current) => ({ ...current, videos: current.videos.filter((item) => item.id !== video.id) }))} />)}
        {product.videos.length === 0 && <AdminEmpty icon={MonitorPlay} text="No tutorial videos yet." action="Add the first video" onClick={addVideo} />}
      </div>
    </div>
  );
}

function VideoEditor({ video, index, productId, uploadsEnabled, update, remove }: { video: TutorialVideo; index: number; productId: string; uploadsEnabled: boolean; update: (patch: Partial<TutorialVideo>) => void; remove: () => void }) {
  const [mode, setMode] = useState(video.storagePath ? "upload" : "link");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const upload = useRef<AbortController | null>(null);
  useEffect(() => () => upload.current?.abort(), []);
  const url = getVideoUrl(video);
  const source = parseVideoSource(url);

  async function selectFile(file?: File) {
    if (!file) return;
    const invalid = videoFileError(file);
    if (invalid) { setError(invalid); return; }
    upload.current?.abort();
    const controller = new AbortController();
    upload.current = controller;
    setError("");
    setProgress(0);
    try {
      const uploaded = await uploadVideo(file, productId, controller.signal, setProgress);
      if (!controller.signal.aborted) update({ ...uploaded, youtubeUrl: "" });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Video upload failed. Please retry.");
    } finally {
      if (upload.current === controller) { setProgress(null); upload.current = null; }
    }
  }

  return <article className="min-w-0 rounded-[20px] border border-[#2c3038]/9 bg-[#fbfaf7] p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between"><p className="text-xs font-extrabold">Video {String(index + 1).padStart(2, "0")}</p><button type="button" onClick={remove} className="grid size-8 place-items-center rounded-full text-[#9b7770] hover:bg-[#feeae5] hover:text-[#c9482d]" aria-label={`Delete video ${index + 1}`}><Trash2 className="size-3.5" /></button></div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Video title"><input value={video.title} onChange={(event) => update({ title: event.target.value })} className={fieldClass} /></Field>
        <Field label="Duration"><input value={video.duration} onChange={(event) => update({ duration: event.target.value })} placeholder="Example: 03:20" className={fieldClass} /></Field>
        <div className="sm:col-span-2"><Field label="Video source"><select aria-label="Video source" value={mode} className={fieldClass} onChange={(event) => {
          upload.current?.abort(); setMode(event.target.value); setError(""); update({ videoUrl: "", youtubeUrl: "", storagePath: undefined });
        }}><option value="link">Video link</option><option value="upload">Upload video</option></select></Field></div>
        <div className="sm:col-span-2">
          {mode === "link" ? <Field label="Video link">
            <input type="url" aria-label="Video link" value={url} onChange={(event) => { const value = event.target.value; update({ videoUrl: value, youtubeUrl: parseVideoSource(value)?.provider === "youtube" ? value : "", storagePath: undefined }); }} placeholder="YouTube, Google Drive, TikTok, or an MP4/WebM URL" className={fieldClass} />
            {url && !source && <p role="alert" className="mt-2 text-xs text-[#bd5236]">Enter a supported HTTPS video link.</p>}
            {source?.provider === "google-drive" && <p className="mt-2 text-xs leading-5 text-[#69747b]">In Google Drive, set General access to Anyone with the link so customers can watch without signing in.</p>}
            {source?.provider === "tiktok" && <p className="mt-2 text-xs leading-5 text-[#69747b]">Use a public TikTok video. Short share links open on TikTok; paste the full /@user/video/ link for an embedded preview.</p>}
          </Field> : <div>
            <label className="block text-xs font-bold text-[#69747b]">Video file (MP4 or WebM, up to {MAX_VIDEO_MB} MB)<input type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={!uploadsEnabled || progress !== null} onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ""; }} className="mt-2 block w-full min-w-0 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[#edf4ff] file:px-4 file:py-2 file:font-bold file:text-[#0035b9] disabled:opacity-50" /></label>
            {!uploadsEnabled && <p className="mt-2 text-xs text-[#bd5236]">Connect Supabase to upload video files. Video links remain available.</p>}
            {progress !== null && <div role="status" className="mt-3 space-y-2 text-xs"><p className="flex items-center gap-2"><Upload className="size-3" />{progress === 100 ? "Finishing upload..." : `Uploading ${progress}%`}</p><progress max="100" value={progress} className="h-2 w-full" /><button type="button" onClick={() => upload.current?.abort()} className="font-bold underline">Cancel upload</button></div>}
            {video.storagePath && progress === null && <p className="mt-2 text-xs text-[#3e7652]">Video uploaded. Select Save to attach it to this product.</p>}
          </div>}
          {error && <p role="alert" className="mt-2 text-xs text-[#bd5236]">{error}</p>}
        </div>
        <div className="sm:col-span-2"><Field label="Description"><textarea value={video.description} onChange={(event) => update({ description: event.target.value })} className={areaClass} /></Field></div>
      </div>
      <div className="min-w-0"><p className="mb-2 text-[10px] font-extrabold text-[#8c9498]">PREVIEW</p><TutorialPlayer url={url} title={`Preview ${video.title}`} /></div>
    </div>
  </article>;
}
