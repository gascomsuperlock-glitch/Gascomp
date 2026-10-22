"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, ExternalLink, LoaderCircle, MessageCircle, RefreshCw, Search } from "lucide-react";
import type { CareDirectReport } from "../model/types";
import { normalizeWhatsapp } from "@/shared/lib/whatsapp";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const input = "min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const labels: Record<CareDirectReport["status"], string> = { new: "New", in_progress: "In progress", resolved: "Resolved" };
const tones: Record<CareDirectReport["status"], string> = { new: "bg-blue-50 text-blue-800", in_progress: "bg-amber-50 text-amber-800", resolved: "bg-emerald-50 text-emerald-800" };
const date = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));

function isReport(value: unknown): value is CareDirectReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<CareDirectReport>;
  return [report.id, report.name, report.problem, report.whatsapp, report.orderNumber].every((field) => typeof field === "string")
    && typeof report.status === "string" && Object.hasOwn(labels, report.status)
    && typeof report.createdAt === "string" && Number.isFinite(Date.parse(report.createdAt))
    && typeof report.updatedAt === "string" && Number.isFinite(Date.parse(report.updatedAt))
    && !!report.video && typeof report.video.name === "string" && typeof report.video.mimeType === "string"
    && typeof report.video.size === "number" && Number.isFinite(report.video.size) && report.video.size >= 0;
}

export function CareDirectInbox({ active }: { active: boolean }) {
  const [reports, setReports] = useState<CareDirectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CareDirectReport["status"]>("all");
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [feedback, setFeedback] = useState("");
  const [videoError, setVideoError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const selected = reports.find((report) => report.id === selectedId);
  const visible = reports.filter((report) => (status === "all" || report.status === status) && [report.id, report.name, report.whatsapp, report.orderNumber].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    async function load() {
      try {
        const response = await fetch("/admin/care-direct/reports", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { setExpired(true); setReports([]); setSelectedId(""); throw new Error("Your admin session has expired. Sign in again to view reports."); }
        if (!response.ok) throw new Error("CareDirect reports could not be loaded. Check the service configuration and retry.");
        const result = await response.json() as { reports?: unknown };
        if (!Array.isArray(result.reports) || !result.reports.every(isReport)) throw new Error("The service returned an invalid report list. Please refresh.");
        if (!mounted) return;
        setReports([...result.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setExpired(false);
        setError("");
      } catch (cause) {
        if (mounted) setError(controller.signal.aborted ? "Loading reports timed out. Please retry." : cause instanceof Error ? cause.message : "Reports could not be loaded. Please retry.");
      } finally {
        window.clearTimeout(timeout);
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; window.clearTimeout(timeout); controller.abort(); };
  }, [revision]);

  useEffect(() => { if (!active) video.current?.pause(); }, [active]);

  function refresh() { setLoading(true); setError(""); setFeedback(""); setRevision((current) => current + 1); }
  function selectReport(id: string) {
    video.current?.pause();
    setSelectedId(id); setFeedback(""); setVideoError(false);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function updateStatus(nextStatus: CareDirectReport["status"]) {
    if (!selected || savingRef.current || selected.status === nextStatus) return;
    savingRef.current = true; setSaving(true); setFeedback(""); setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`/admin/care-direct/reports/${encodeURIComponent(selected.id)}`, { method: "PATCH", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      if (response.status === 401) { setExpired(true); setReports([]); setSelectedId(""); throw new Error("Your admin session has expired. Sign in again before updating reports."); }
      if (!response.ok) throw new Error("Status could not be confirmed. Refresh the reports before trying again.");
      const result = await response.json() as { report: CareDirectReport };
      if (!isReport(result.report) || result.report.id !== selected.id || result.report.status !== nextStatus) throw new Error("Status could not be confirmed. Refresh the reports before trying again.");
      setReports((current) => current.map((report) => report.id === result.report.id ? result.report : report));
      setFeedback("Status saved.");
    } catch (cause) {
      setError(controller.signal.aborted ? "Saving timed out. Refresh the reports to check whether the status was saved before retrying." : cause instanceof Error ? cause.message : "Status could not be confirmed. Refresh the reports before trying again.");
    } finally { window.clearTimeout(timeout); savingRef.current = false; setSaving(false); }
  }

  return (
    <section className="space-y-5" aria-label="CareDirect reports">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[#0035b9]">Gascomp CareDirect</p><h2 className="mt-1 text-2xl font-extrabold">Customer reports</h2><p className="mt-2 text-sm text-slate-600">Review product concerns and contact customers directly. Status changes save immediately.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={loading || saving} onClick={refresh}><RefreshCw className="size-4" />Refresh</button>
          <Link href="/lapor-kendala" target="_blank" className={button}><ExternalLink className="size-4" />Open form</Link>
          <a href="/care-direct-qr.png" download className={button}><Download className="size-4" />Download QR</a>
        </div>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{expired && <Link href="/admin/login" className="ml-2 font-bold underline">Sign in</Link>}</div>}
      {feedback && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{feedback}</p>}
      {loading && <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin" />Loading reports…</p>}
      {!expired && <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
        <div className={`${selected ? "hidden xl:block" : ""} min-w-0 rounded-2xl border border-slate-200 bg-white p-4`}>
          <label className="block text-sm font-bold" htmlFor="care-direct-search">Search reports</label>
          <div className="relative mt-2"><Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-slate-400" /><input ref={search} id="care-direct-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Report, name, WhatsApp or order" className={`${input} pl-9`} /></div>
          <label className="mt-4 block text-sm font-bold" htmlFor="care-direct-filter">Status</label>
          <select id="care-direct-filter" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={`${input} mt-2`}><option value="all">All statuses</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <p className="my-4 text-xs text-slate-500">{visible.length} reports · newest first</p>
          <div className="max-h-[65vh] space-y-2 overflow-y-auto">
            {visible.map((report) => <button type="button" key={report.id} disabled={saving} aria-pressed={selectedId === report.id} onClick={() => selectReport(report.id)} className={`w-full rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-[#0035b9] disabled:opacity-50 ${selectedId === report.id ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"}`}><span className="flex flex-wrap items-center justify-between gap-2"><span className="break-all text-xs font-bold">{report.id}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${tones[report.status]}`}>{labels[report.status]}</span></span><span className="mt-2 block break-words text-sm font-bold">{report.name}</span><span className="mt-1 block break-all text-xs text-slate-600">Order: {report.orderNumber}</span><span className="mt-2 block text-xs text-slate-500">{date(report.createdAt)} WIB</span></button>)}
            {!loading && (!error || reports.length > 0) && !visible.length && <p className="py-8 text-center text-sm text-slate-500">{reports.length ? "No reports match your search or status filter." : "No CareDirect reports yet."}</p>}
          </div>
        </div>
        {selected ? <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <button type="button" disabled={saving} className={`${button} mb-4 xl:hidden`} onClick={() => { setSelectedId(""); requestAnimationFrame(() => search.current?.focus()); }}><ArrowLeft className="size-4" />Back to reports</button>
          <p className="break-all text-xs font-bold text-[#0035b9]">{selected.id}</p><h3 ref={heading} tabIndex={-1} className="mt-2 break-words text-xl font-extrabold focus:outline-none">{selected.name}</h3>
          <p className="mt-1 text-xs text-slate-500">Submitted {date(selected.createdAt)} WIB</p>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="font-bold text-slate-500">WhatsApp</dt><dd className="mt-1 break-all">{selected.whatsapp}</dd></div><div><dt className="font-bold text-slate-500">Order number</dt><dd className="mt-1 break-all">{selected.orderNumber}</dd></div><div className="sm:col-span-2"><dt className="font-bold text-slate-500">Customer concern</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-6">{selected.problem}</dd></div></dl>
          <a href={`https://wa.me/${normalizeWhatsapp(selected.whatsapp)}`} target="_blank" rel="noopener noreferrer" className={`${button} mt-5 text-emerald-800`}><MessageCircle className="size-4" />Contact customer</a>
          <div className="mt-6 border-t border-slate-100 pt-5"><label htmlFor="care-direct-status" className="block text-sm font-bold">Report status</label><select id="care-direct-status" value={selected.status} disabled={saving || loading || expired} onChange={(event) => void updateStatus(event.target.value as CareDirectReport["status"])} className={`${input} mt-2`}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><p className="mt-2 text-xs text-slate-500" role="status">{saving ? "Saving status…" : `Last updated ${date(selected.updatedAt)} WIB`}</p></div>
          <div className="mt-6 border-t border-slate-100 pt-5"><h4 className="text-sm font-bold">Issue video</h4><video ref={video} key={selected.id} controls playsInline preload="none" onError={() => setVideoError(true)} className="mt-3 aspect-video w-full rounded-xl bg-slate-950" src={`/admin/care-direct/reports/${encodeURIComponent(selected.id)}/video`} aria-label="Customer issue video" /><p className="mt-2 break-all text-xs text-slate-500">{selected.video.name} · {(selected.video.size / 1024 / 1024).toFixed(1)} MB</p>{videoError && <p role="alert" className="mt-2 text-sm text-red-700">Video could not be played. Refresh the reports and check your admin session, or <a href={`/admin/care-direct/reports/${encodeURIComponent(selected.id)}/video`} target="_blank" rel="noopener noreferrer" className="underline">open the video</a> in a new tab.</p>}</div>
        </article> : <div className="hidden rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 xl:block">Select a report to review its concern and video.</div>}
      </div>}
    </section>
  );
}
