"use client";

import { useEffect, useState } from "react";
import { Download, Play, X } from "lucide-react";

export function TicketVideoPreview({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<string>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let disposed = false;
    let objectUrl: string | undefined;
    async function load() {
      try {
        const response = await fetch(`${url}?preview=1`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 401 ? "Your admin session has expired. Sign in again to preview this video." : "The video preview is unavailable. Retry or download the original video to open it in a compatible player.");
        const blob = await response.blob();
        if (!blob.size || blob.type !== "video/mp4") throw new Error("The preview could not be loaded. Retry or download the original video.");
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      } catch (failure) {
        if (!disposed) setError(controller.signal.aborted ? "The preview took too long to load. Retry or download the original video." : failure instanceof Error ? failure.message : "The preview could not be loaded.");
      } finally {
        clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, attempt, url]);

  const buttonClass = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#edf4ff] px-3 text-xs font-extrabold text-[#0035b9] hover:bg-[#dce9ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
  function toggle() {
    setSource(undefined);
    setError("");
    setOpen(!open);
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={toggle} aria-expanded={open} className={buttonClass}>{open ? <X aria-hidden="true" className="size-3" /> : <Play aria-hidden="true" className="size-3" />}{open ? "Close preview" : "Preview video"}</button>
        <a href={`${url}?download=1`} className={buttonClass}><Download aria-hidden="true" className="size-3" /> Download video</a>
      </div>
      {open && <div className="mt-3 rounded-xl border border-[#2c3038]/10 p-3" aria-label="Video preview">
        {!source && !error && <p role="status" className="text-xs text-[#58666e]">Preparing video preview…</p>}
        {source && !error && <video controls playsInline preload="metadata" src={source} aria-label="Warranty evidence video" className="max-h-96 w-full rounded-lg bg-black" onError={() => setError("This browser could not play the preview. Download the original video to open it in a compatible player.")} />}
        {error && <><p role="alert" className="text-xs text-[#ad4037]">{error}</p><button type="button" className={`${buttonClass} mt-2`} onClick={() => { setSource(undefined); setError(""); setAttempt((value) => value + 1); }}>Retry preview</button></>}
      </div>}
    </div>
  );
}
