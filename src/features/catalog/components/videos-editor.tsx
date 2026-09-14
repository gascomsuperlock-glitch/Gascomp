"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, ImageIcon, MonitorPlay, Plus, Trash2, Upload } from "lucide-react";
import { createId } from "@/shared/lib/create-id";
import type { Product, TutorialVideo } from "@/features/catalog/model/types";
import { getVideoUrl, MAX_VIDEO_MB, parseVideoSource, videoFileError } from "@/features/catalog/model/video-source";
import { uploadVideo, uploadVideoThumbnail } from "@/features/catalog/model/upload-video";
import {
  extractVideoThumbnails,
  revokeVideoThumbnailCandidates,
  type VideoThumbnailCandidate,
} from "@/features/catalog/model/video-thumbnail";
import { TutorialPlayer } from "@/features/catalog/components/tutorial-player";
import { useContent } from "@/features/catalog/hooks/use-content";
import { Field, EditorHeading, fieldClass, areaClass } from "@/shared/components/ui/editor-fields";
import { AdminEmpty } from "@/shared/components/ui/empty-state";
import { reorderVideos } from "@/features/catalog/model/reorder-videos";

export function VideosEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  const { storageMode, saveState } = useContent();
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const dragSource = useRef<string | null>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const saving = saveState === "saving";

  function endDrag() {
    dragSource.current = null;
    setDraggedVideoId(null);
    setDropTargetId(null);
  }

  function moveVideo(sourceId: string, targetId: string) {
    if (saving || sourceId === targetId) return;
    const targetIndex = product.videos.findIndex((video) => video.id === targetId);
    const video = product.videos.find((item) => item.id === sourceId);
    if (!video || targetIndex < 0) return;
    update((current) => ({ ...current, videos: reorderVideos(current.videos, sourceId, targetId) }));
    setAnnouncement(`${video.title || "Untitled video"} moved to position ${targetIndex + 1} of ${product.videos.length}. Select Save to keep this order.`);
    requestAnimationFrame(() => handles.current.get(sourceId)?.focus());
  }
  function addVideo() {
    update((current) => ({ ...current, videos: [...current.videos, { id: createId("video"), title: "New tutorial", description: "", youtubeUrl: "", videoUrl: "", duration: "" }] }));
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-4"><EditorHeading title="Tutorial videos" copy="Use a YouTube, Google Drive, or TikTok link, or upload a video. Select Save to apply your changes." /><button type="button" onClick={addVideo} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white"><Plus className="size-3.5" /> Add</button></div>
      {product.videos.length > 0 && <section aria-labelledby="video-order-title" className="mt-6 rounded-2xl border border-[#0035b9]/15 bg-[#f4f7ff] p-4 sm:p-5">
        <h3 id="video-order-title" className="text-sm font-extrabold">Video Order</h3>
        <p id="video-order-instructions" className="mt-1 text-xs leading-5 text-[#536077]">Drag a handle onto another video, use the arrow buttons, or focus a handle and press the Up or Down arrow key. Numbers update automatically. Select Save to apply this order.</p>
        <ol aria-label="Video order" className={`mt-4 space-y-2 ${draggedVideoId ? "select-none" : ""}`}>
          {product.videos.map((video, index) => <li key={video.id}
            onDragOver={(event) => {
              if (!dragSource.current || saving) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTargetId(video.id);
            }}
            onDrop={(event) => {
              if (!dragSource.current || saving) return;
              event.preventDefault();
              moveVideo(dragSource.current, video.id);
              endDrag();
            }}
            className={`flex min-w-0 items-center gap-2 rounded-xl border bg-white p-2 ${dropTargetId === video.id && draggedVideoId !== video.id ? "border-[#0035b9] ring-2 ring-[#0035b9]/25" : "border-[#021b40]/10"} ${draggedVideoId === video.id ? "opacity-50" : ""}`}>
            <button type="button" draggable={!saving && product.videos.length > 1} disabled={saving || product.videos.length < 2}
              ref={(node) => { if (node) handles.current.set(video.id, node); else handles.current.delete(video.id); }}
              aria-label={`Reorder video ${index + 1}: ${video.title || "Untitled video"}`}
              aria-describedby="video-order-instructions"
              onDragStart={(event) => {
                dragSource.current = video.id;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", video.id);
                const row = event.currentTarget.closest("li");
                if (row) event.dataTransfer.setDragImage(row, 24, 24);
                setDraggedVideoId(video.id);
              }}
              onDragEnd={endDrag}
              onKeyDown={(event) => {
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                event.preventDefault();
                const target = product.videos[index + (event.key === "ArrowUp" ? -1 : 1)];
                if (target) moveVideo(video.id, target.id);
              }}
              className="grid size-11 shrink-0 cursor-grab place-items-center rounded-lg text-[#536077] hover:bg-[#edf4ff] active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] disabled:cursor-default disabled:opacity-40"><GripVertical aria-hidden="true" className="size-5" /></button>
            {video.thumbnailUrl ? <span className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-lg bg-[#e7e9ec]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={video.thumbnailUrl} alt="" className="size-full object-cover" />
              <span className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-full bg-[#0035b9] text-[9px] font-extrabold text-white tabular-nums">{index + 1}</span>
            </span> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#edf4ff] text-xs font-extrabold text-[#0035b9] tabular-nums">{index + 1}</span>}
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#021b40]">{video.title || "Untitled video"}</p><p className="mt-0.5 text-[10px] text-[#536077]">{video.storagePath ? "Uploaded video" : getVideoUrl(video) ? "Video link" : "No video source yet"}</p></div>
            <div className="flex shrink-0 flex-col sm:flex-row">
              <button type="button" disabled={saving || index === 0} onClick={() => moveVideo(video.id, product.videos[index - 1].id)} aria-label={`Move video ${index + 1} up`} className="grid size-11 touch-manipulation place-items-center rounded-lg text-[#0035b9] hover:bg-[#edf4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] disabled:opacity-30"><ArrowUp aria-hidden="true" className="size-4" /></button>
              <button type="button" disabled={saving || index === product.videos.length - 1} onClick={() => moveVideo(video.id, product.videos[index + 1].id)} aria-label={`Move video ${index + 1} down`} className="grid size-11 touch-manipulation place-items-center rounded-lg text-[#0035b9] hover:bg-[#edf4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] disabled:opacity-30"><ArrowDown aria-hidden="true" className="size-4" /></button>
            </div>
          </li>)}
        </ol>
      </section>}
      <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-xs leading-5 text-[#0035b9]">{announcement}</p>
      <div className="mt-7 space-y-4" inert={draggedVideoId !== null}>
        {product.videos.map((video, index) => <VideoEditor key={`${product.id}:${video.id}`} video={video} index={index} productId={product.id} uploadsEnabled={storageMode === "supabase"}
          update={(patch) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, ...patch } : item) }))}
          remove={() => update((current) => ({ ...current, videos: current.videos.filter((item) => item.id !== video.id) }))} />)}
        {product.videos.length === 0 && <AdminEmpty icon={MonitorPlay} text="No tutorial videos yet." action="Add the first video" onClick={addVideo} />}
      </div>
    </div>
  );
}

type ThumbnailSelection = {
  candidates: VideoThumbnailCandidate[];
  selectedIndex: number;
  videoFile?: File;
};

function VideoEditor({ video, index, productId, uploadsEnabled, update, remove }: { video: TutorialVideo; index: number; productId: string; uploadsEnabled: boolean; update: (patch: Partial<TutorialVideo>) => void; remove: () => void }) {
  const [mode, setMode] = useState(video.storagePath ? "upload" : "link");
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<"preparing" | "thumbnail" | "video" | null>(null);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<ThumbnailSelection | null>(null);
  const upload = useRef<AbortController | null>(null);
  const selectionRef = useRef<ThumbnailSelection | null>(null);
  useEffect(() => () => {
    upload.current?.abort();
    if (selectionRef.current) revokeVideoThumbnailCandidates(selectionRef.current.candidates);
  }, []);
  const url = getVideoUrl(video);
  const source = parseVideoSource(url);
  const busy = phase !== null;

  function replaceSelection(next: ThumbnailSelection | null) {
    if (selectionRef.current) revokeVideoThumbnailCandidates(selectionRef.current.candidates);
    selectionRef.current = next;
    setSelection(next);
  }

  async function prepareThumbnailChoices(sourceFile: File | string, videoFile?: File) {
    upload.current?.abort();
    const controller = new AbortController();
    upload.current = controller;
    setError("");
    setProgress(null);
    setPhase("preparing");
    try {
      const result = await extractVideoThumbnails(sourceFile, controller.signal);
      if (!controller.signal.aborted) replaceSelection({ candidates: result.candidates, selectedIndex: 0, videoFile });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Thumbnail choices could not be created from this video.");
    } finally {
      if (upload.current === controller) { setPhase(null); upload.current = null; }
    }
  }

  async function selectFile(file?: File) {
    if (!file) return;
    const invalid = videoFileError(file);
    if (invalid) { setError(invalid); return; }
    await prepareThumbnailChoices(file, file);
  }

  async function confirmThumbnail() {
    if (!selection) return;
    const candidate = selection.candidates[selection.selectedIndex];
    if (!candidate) return;
    upload.current?.abort();
    const controller = new AbortController();
    upload.current = controller;
    setError("");
    setProgress(0);
    setPhase("thumbnail");
    try {
      const thumbnail = await uploadVideoThumbnail(candidate.blob, productId, controller.signal, setProgress);
      if (controller.signal.aborted) return;
      if (selection.videoFile) {
        setPhase("video");
        setProgress(0);
        const uploaded = await uploadVideo(selection.videoFile, productId, controller.signal, setProgress);
        if (!controller.signal.aborted) update({ ...uploaded, ...thumbnail, youtubeUrl: "" });
      } else {
        update(thumbnail);
      }
      if (!controller.signal.aborted) replaceSelection(null);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "The video and thumbnail could not be uploaded. Please retry.");
    } finally {
      if (upload.current === controller) { setProgress(null); setPhase(null); upload.current = null; }
    }
  }

  return <article className="min-w-0 rounded-[20px] border border-[#2c3038]/9 bg-[#fbfaf7] p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between"><p className="text-xs font-extrabold">Video {String(index + 1).padStart(2, "0")}</p><button type="button" onClick={remove} className="grid size-8 place-items-center rounded-full text-[#9b7770] hover:bg-[#feeae5] hover:text-[#c9482d]" aria-label={`Delete video ${index + 1}`}><Trash2 className="size-3.5" /></button></div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Video title"><input value={video.title} onChange={(event) => update({ title: event.target.value })} className={fieldClass} /></Field>
        <Field label="Duration"><input value={video.duration} onChange={(event) => update({ duration: event.target.value })} placeholder="Example: 03:20" className={fieldClass} /></Field>
        <div className="sm:col-span-2"><Field label="Video source"><select aria-label="Video source" value={mode} className={fieldClass} onChange={(event) => {
          upload.current?.abort(); replaceSelection(null); setMode(event.target.value); setError(""); setPhase(null); setProgress(null); update({ videoUrl: "", youtubeUrl: "", storagePath: undefined, thumbnailUrl: undefined, thumbnailStoragePath: undefined });
        }}><option value="link">Video link</option><option value="upload">Upload video</option></select></Field></div>
        <div className="sm:col-span-2">
          {mode === "link" ? <Field label="Video link">
            <input type="url" aria-label="Video link" value={url} onChange={(event) => { const value = event.target.value; update({ videoUrl: value, youtubeUrl: parseVideoSource(value)?.provider === "youtube" ? value : "", storagePath: undefined, thumbnailUrl: undefined, thumbnailStoragePath: undefined }); }} placeholder="YouTube, Google Drive, TikTok, or an MP4/WebM URL" className={fieldClass} />
            {url && !source && <p role="alert" className="mt-2 text-xs text-[#bd5236]">Enter a supported HTTPS video link.</p>}
            {source?.provider === "google-drive" && <p className="mt-2 text-xs leading-5 text-[#69747b]">In Google Drive, set General access to Anyone with the link so customers can watch without signing in.</p>}
            {source?.provider === "tiktok" && <p className="mt-2 text-xs leading-5 text-[#69747b]">Use a public TikTok video. Short share links open on TikTok; paste the full /@user/video/ link for an embedded preview.</p>}
          </Field> : <div>
            <label className="block text-xs font-bold text-[#69747b]">Video file (MP4 or WebM, up to {MAX_VIDEO_MB} MB)<input type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={!uploadsEnabled || busy} onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ""; }} className="mt-2 block w-full min-w-0 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[#edf4ff] file:px-4 file:py-2 file:font-bold file:text-[#0035b9] disabled:opacity-50" /></label>
            {!uploadsEnabled && <p className="mt-2 text-xs text-[#bd5236]">Connect Supabase to upload video files. Video links remain available.</p>}
            {phase === "preparing" && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-[#0035b9]"><ImageIcon className="size-3.5" /> Creating thumbnail choices from the video...</p>}
            {progress !== null && phase !== "preparing" && <div role="status" className="mt-3 space-y-2 text-xs"><p className="flex items-center gap-2"><Upload className="size-3" />{progress === 100 ? `Finishing ${phase} upload...` : `Uploading ${phase} ${progress}%`}</p><progress max="100" value={progress} className="h-2 w-full" /><button type="button" onClick={() => upload.current?.abort()} className="font-bold underline">Cancel upload</button></div>}
            {video.storagePath && !busy && <p className="mt-2 text-xs text-[#3e7652]">Uploaded video is ready. Select Save after changing its video or thumbnail.</p>}
            {video.storagePath && url && !selection && !busy && <button type="button" onClick={() => { void prepareThumbnailChoices(url); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#0035b9]/20 bg-white px-4 text-xs font-extrabold text-[#0035b9] hover:bg-[#edf4ff]"><ImageIcon className="size-3.5" /> {video.thumbnailUrl ? "Choose another thumbnail" : "Choose a thumbnail"}</button>}

            {selection && <fieldset className="mt-4 rounded-2xl border border-[#0035b9]/15 bg-white p-3">
              <legend className="px-1 text-xs font-extrabold text-[#021b40]">Choose the thumbnail customers will see</legend>
              <p className="mt-1 text-[11px] leading-4 text-[#69747b]">Select one frame taken directly from this video, then upload it.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {selection.candidates.map((candidate, candidateIndex) => <button key={candidate.previewUrl} type="button" disabled={busy} aria-pressed={selection.selectedIndex === candidateIndex} onClick={() => {
                  const next = { ...selection, selectedIndex: candidateIndex };
                  selectionRef.current = next;
                  setSelection(next);
                }} className={`relative overflow-hidden rounded-xl border-2 bg-[#2c3038] text-left transition ${selection.selectedIndex === candidateIndex ? "border-[#0035b9] ring-2 ring-[#0035b9]/20" : "border-transparent hover:border-[#0035b9]/40"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={candidate.previewUrl} alt={`Thumbnail choice ${candidateIndex + 1} at ${formatTimestamp(candidate.timeSeconds)}`} className="aspect-video w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/65 px-2 py-1 text-[9px] font-bold text-white"><span>{formatTimestamp(candidate.timeSeconds)}</span>{selection.selectedIndex === candidateIndex && <Check className="size-3" />}</span>
                </button>)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => { void confirmThumbnail(); }} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white disabled:opacity-50"><Upload className="size-3.5" /> {selection.videoFile ? "Upload video and thumbnail" : "Use selected thumbnail"}</button>
                <button type="button" disabled={busy} onClick={() => replaceSelection(null)} className="min-h-10 rounded-full border border-[#2c3038]/10 px-4 text-xs font-bold disabled:opacity-50">Cancel</button>
              </div>
            </fieldset>}

            {video.thumbnailUrl && !selection && <div className="mt-4 max-w-56">
              <p className="mb-2 text-[10px] font-extrabold tracking-wide text-[#8c9498]">CURRENT THUMBNAIL</p>
              <div className="overflow-hidden rounded-xl border border-[#2c3038]/10 bg-[#2c3038]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={video.thumbnailUrl} alt={`Current thumbnail for ${video.title || `video ${index + 1}`}`} className="aspect-video w-full object-cover" />
              </div>
            </div>}
          </div>}
          {error && <p role="alert" className="mt-2 text-xs text-[#bd5236]">{error}</p>}
        </div>
        <div className="sm:col-span-2"><Field label="Description"><textarea value={video.description} onChange={(event) => update({ description: event.target.value })} className={areaClass} /></Field></div>
      </div>
      <div className="min-w-0"><p className="mb-2 text-[10px] font-extrabold text-[#8c9498]">PREVIEW</p><TutorialPlayer url={url} title={`Preview ${video.title}`} poster={video.thumbnailUrl} /></div>
    </div>
  </article>;
}

function formatTimestamp(seconds: number) {
  const wholeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}
