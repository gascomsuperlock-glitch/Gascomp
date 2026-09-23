"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, RefreshCw } from "lucide-react";

type AssistantStatus = {
  enabled: boolean;
  paused: boolean;
  workerOnline: boolean;
  knowledgeReady: boolean;
  knowledgeVersion: string | null;
  queuedJobs: number;
  lastHeartbeat: string | null;
};

async function loadStatus(paused?: boolean): Promise<AssistantStatus> {
  const response = await fetch("/admin/ai-assistance/status", {
    method: paused === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
    headers: paused === undefined ? undefined : { "Content-Type": "application/json" },
    body: paused === undefined ? undefined : JSON.stringify({ paused }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(response.status === 401 ? "Your admin session expired. Sign in again to manage the assistant." : "Assistant status could not be confirmed. Refresh before retrying a change.");
  return response.json();
}

export function AssistantAdmin() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const mutation = useRef(false);

  useEffect(() => {
    if (busy) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const current = ++generation.current;
    async function refresh() {
      try {
        const result = await loadStatus();
        if (cancelled || current !== generation.current) return;
        setStatus(result);
        setError("");
      } catch (cause) {
        if (cancelled || current !== generation.current) return;
        setError(cause instanceof Error ? cause.message : "Assistant status is unavailable.");
      }
      if (!cancelled) timer = setTimeout(() => void refresh(), 10000);
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [revision, busy]);

  async function togglePaused() {
    if (!status || mutation.current) return;
    mutation.current = true;
    generation.current++;
    setBusy(true);
    setError("");
    try {
      setStatus(await loadStatus(!status.paused));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Assistant status is unavailable.");
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
  return <section aria-labelledby="assistant-operations-title" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="assistant-operations-title" className="text-xl font-extrabold text-slate-900">Ayu</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Monitor the customer chat worker and published knowledge. Pause or resume applies immediately, independently of catalog Save.</p></div>
      <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={busy} className={button}><RefreshCw aria-hidden="true" className="size-4" />Refresh</button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!status && !error && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Loading assistant status…</p>}
    {status && <>
      {!status.enabled && <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">Public AI chat is disabled. The website uses its WhatsApp button. Enabling the deployment feature flag is a separate release step.</p>}
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Public chat", status.enabled ? "Enabled" : "Disabled"],
          ["Processing", status.paused ? "Paused" : "Resumed"],
          ["Worker", status.workerOnline ? "Online" : "Offline"],
          ["Knowledge", status.knowledgeReady ? "Ready" : "Not ready"],
          ["Queued jobs", String(status.queuedJobs)],
          ["Last heartbeat", status.lastHeartbeat ? new Date(status.lastHeartbeat).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) + " WIB" : "No heartbeat"],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 p-3"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-words text-base font-bold text-slate-900">{value}</dd></div>)}
      </dl>
      <p className="mt-4 break-all text-xs text-slate-600">Knowledge version: <span className="font-mono">{status.knowledgeVersion || "None published"}</span></p>
      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void togglePaused()} disabled={busy || Boolean(error)} className={button}>{busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : status.paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}{busy ? "Updating…" : status.paused ? "Resume assistant" : "Pause assistant"}</button><p className="text-xs leading-5 text-slate-600">Customers can use WhatsApp when processing is paused or unavailable.</p></div>
    </>}
  </section>;
}
