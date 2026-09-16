"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Play, X } from "lucide-react";

const buttonClass = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#edf4ff] px-3 text-xs font-extrabold text-[#0035b9] hover:bg-[#dce9ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const sessionError = "Your admin session has expired. Sign in again to preview this video.";
const previewError = "The video preview is unavailable. Retry or download the original video to open it in a compatible player.";

export function TicketVideoPreview({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <div className="w-full min-w-0">
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={buttonClass}>{open ? <X aria-hidden="true" className="size-3" /> : <Play aria-hidden="true" className="size-3" />}{open ? "Close preview" : "Preview video"}</button>
      <a href={`${url}?download=1`} className={buttonClass}><Download aria-hidden="true" className="size-3" /> Download video</a>
    </div>
    {open && <VideoPlayer key={`${url}:${attempt}`} url={url} onRetry={() => setAttempt(value => value + 1)} />}
  </div>;
}

function VideoPlayer({ url, onRetry }: { url: string; onRetry: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const needsConversion = useRef(false);
  const [mode, setMode] = useState<"original" | "checking" | "converted">("original");
  const [source, setSource] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Browsers request only the bytes they need from the authenticated endpoint.
  // Conversion is a compatibility fallback, never the first step for an MP4.
  useEffect(() => {
    if (mode === "original" || error) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), mode === "checking" ? 10_000 : 75_000);
    let disposed = false;
    let objectUrl: string | undefined;
    async function load() {
      try {
        if (mode === "checking") {
          const response = await fetch(url, { method: "HEAD", signal: controller.signal, cache: "no-store" });
          if (!response.ok) throw new Error(response.status === 401 ? sessionError : previewError);
          if (!needsConversion.current) throw new Error(previewError);
          if (!disposed) setMode("converted");
          return;
        }
        const response = await fetch(`${url}?preview=1`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 401 ? sessionError : previewError);
        const blob = await response.blob();
        if (!blob.size || blob.type.split(";")[0] !== "video/mp4") throw new Error(previewError);
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      } catch (failure) {
        if (!disposed) setError(controller.signal.aborted ? "The preview took too long to load. Retry or download the original video." : failure instanceof Error ? failure.message : previewError);
      } finally { clearTimeout(timeout); }
    }
    void load();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mode, url, error]);

  useEffect(() => {
    if (!loading || error || mode === "checking" || (mode === "converted" && !source)) return;
    const timer = setTimeout(() => setError("The preview took too long to load. Retry or download the original video."), 30_000);
    return () => clearTimeout(timer);
  }, [loading, error, mode, source]);

  useEffect(() => {
    const element = video.current;
    const currentSource = mode === "original" ? url : source;
    // Development StrictMode replays cleanup without removing the DOM node.
    if (element && currentSource && element.getAttribute("src") !== currentSource) element.src = currentSource;
    return () => {
      element?.pause();
      element?.removeAttribute("src");
      element?.load();
    };
  }, [mode, source, error, url]);

  return <section className="mt-3 rounded-xl border border-[#2c3038]/10 p-3" aria-label="Video preview">
    {loading && !error && <p role="status" className="mb-2 text-xs text-[#58666e]">{mode === "original" ? "Loading video…" : mode === "checking" ? "Checking video access…" : "Preparing a compatible preview…"}</p>}
    {!error && (mode === "original" || source) && <video key={mode} ref={video} controls playsInline preload="metadata" src={mode === "original" ? url : source} aria-label="Warranty evidence video" className="max-h-96 w-full rounded-lg bg-black"
      onLoadedMetadata={() => setLoading(false)}
      onLoadedData={() => setLoading(false)}
      onError={event => {
        const code = event.currentTarget.error?.code;
        if (mode === "original") {
          needsConversion.current = code === 3 || code === 4;
          setLoading(true);
          setMode("checking");
        } else setError(previewError);
      }} />}
    {error && <><p role="alert" className="text-xs text-[#ad4037]">{error}</p><button type="button" className={`${buttonClass} mt-2`} onClick={onRetry}>Retry preview</button></>}
  </section>;
}
