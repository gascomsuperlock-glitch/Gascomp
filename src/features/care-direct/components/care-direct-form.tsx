"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SiteHeader } from "@/shared/components/site-header";
import { useLanguage } from "@/shared/i18n/language-context";
import { localizeMessage } from "@/shared/i18n/dictionaries";
import { normalizeWhatsapp } from "@/shared/lib/whatsapp";
import { useContent } from "@/features/catalog/hooks/use-content";
import { VIDEO_ACCEPT, validateVideoFile } from "@/shared/media/video-files";
import { validateVideoPlayback } from "@/shared/media/video-validation";
import { prepareVideo } from "@/shared/media/video-compression";
import { buildCareDirectTicket } from "../model/ticket";
import { careDirectCopy, careDirectValidationMessages } from "../model/copy";
import { REPORT_CONNECTION_ERROR, submitReport, type ReportProgress, type ReportResult } from "./report-transport";

const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[#021b40]/20 bg-white px-4 py-3 text-base outline-none focus:border-[#0035b9] focus:ring-2 focus:ring-[#0035b9]/20 disabled:bg-slate-50";

export function CareDirectForm() {
  const { language } = useLanguage();
  const { content, hydrated } = useContent();
  const copy = careDirectCopy[language];
  const message = (value: string | null | undefined) => language === "id" && value ? careDirectValidationMessages[value] ?? localizeMessage(value, language) : value;
  const [step, setStep] = useState(1);
  const [ticketData, setTicketData] = useState<FormData | null>(null);
  const [ticketOrigin, setTicketOrigin] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const [result, setResult] = useState<ReportResult>({});
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ReportProgress>({ phase: "uploading", percent: 0 });
  const [compressionPercent, setCompressionPercent] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const preparation = useRef<AbortController | null>(null);
  const videoTask = useRef<Promise<File | null>>(Promise.resolve(null));
  const selection = useRef(0);
  const submissionId = useRef("");
  const snapshot = useRef<FormData | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const notice = useRef<HTMLDivElement>(null);
  const redirected = useRef(false);
  const destination = normalizeWhatsapp(content.whatsappNumber);
  const ticket = result.success && result.reportId && ticketData && ticketOrigin ? buildCareDirectTicket(ticketData, result.reportId, ticketOrigin, language) : "";
  const whatsappUrl = ticket && destination ? `https://wa.me/${destination}?text=${encodeURIComponent(ticket)}` : null;
  function changeStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => { stepHeading.current?.focus(); window.scrollTo({ top: 0 }); });
  }
  async function copyTicket() {
    try { await navigator.clipboard.writeText(ticket); setCopyStatus(copy.copied); }
    catch { setCopyStatus(copy.copyFailed); }
  }

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; preparation.current?.abort(); controller.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!result.success || !whatsappUrl || redirected.current) return;
    redirected.current = true;
    const timer = setTimeout(() => { window.location.assign(whatsappUrl); }, 1200);
    return () => { clearTimeout(timer); redirected.current = false; };
  }, [result.success, whatsappUrl]);

  function selectVideo(file: File | undefined) {
    const epoch = ++selection.current;
    preparation.current?.abort();
    const abort = new AbortController();
    preparation.current = abort;
    setVideoError(null);
    setCompressionPercent(null);
    setPreparing(Boolean(file));
    videoTask.current = (async () => {
      if (!file) return null;
      let error = validateVideoFile(file);
      if (!error) error = await validateVideoPlayback(file);
      if (!mounted.current || epoch !== selection.current) return null;
      if (error) { setVideoError(error); setPreparing(false); return null; }
      const prepared = await prepareVideo(file, abort.signal, (percent) => {
        if (mounted.current && epoch === selection.current) setCompressionPercent(percent);
      });
      if (!mounted.current || epoch !== selection.current) return null;
      setPreparing(false);
      setCompressionPercent(null);
      return prepared.file;
    })().catch(() => {
      if (mounted.current && epoch === selection.current) { setPreparing(false); setCompressionPercent(null); setVideoError("The video could not be read. Please select another video."); }
      return null;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = snapshot.current ?? new FormData(event.currentTarget);
    submitting.current = true;
    setBusy(true);
    setResult({});
    try {
      const video = await videoTask.current;
      if (!mounted.current) return;
      if (!video) { setResult({ error: "validation", fieldErrors: { video: "Please select a valid video." } }); return; }
      if (!snapshot.current) {
        submissionId.current ||= crypto.randomUUID();
        data.set("submissionId", submissionId.current);
        data.set("video", video);
        snapshot.current = data;
      }
      setLocked(true);
      const abort = new AbortController();
      controller.current = abort;
      const response = await submitReport(snapshot.current, setProgress, abort.signal);
      if (!mounted.current) return;
      if (response.success) { setTicketData(snapshot.current); setTicketOrigin(window.location.origin); }
      setResult(response);
      if (!response.success && response.fieldErrors) {
        snapshot.current = null;
        setLocked(false);
      }
    } catch {
      if (mounted.current) setResult({ error: REPORT_CONNECTION_ERROR });
    } finally {
      submitting.current = false;
      if (mounted.current) { setBusy(false); requestAnimationFrame(() => notice.current?.focus()); }
    }
  }

  return <div translate="no" className="min-h-screen bg-[#fffdf7] text-[#021b40]">
    <SiteHeader />
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-sm font-extrabold tracking-wide text-[#0035b9]">Gascomp CareDirect</p>
      <h1 ref={stepHeading} tabIndex={-1} className="mt-3 text-4xl font-extrabold tracking-tight">{copy.title}</h1>
      <p className="mt-4 leading-7 text-slate-600">{copy.intro}</p>
      {!result.success && step === 1 && <section className="mt-8 space-y-5 rounded-3xl bg-[#edf4ff] p-5 sm:p-8">
        <h2 className="text-xl font-bold">{copy.hoursTitle}</h2><p className="leading-7">{copy.hours}</p><p className="leading-7">{copy.waiting}</p>
        <button type="button" onClick={() => changeStep(2)} className="min-h-12 rounded-2xl bg-[#0035b9] px-5 py-3 font-bold text-white">{copy.continue}</button>
      </section>}
      {result.success && result.reportId ? <section ref={notice} tabIndex={-1} className="mt-8 rounded-3xl border border-[#0035b9]/20 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-bold">{copy.success}</h2>
        <p className="mt-5 text-sm">{copy.report}</p><p className="mt-2 break-all font-mono font-bold">{result.reportId}</p>
        <p role="status" className="mt-5 text-sm leading-6">{whatsappUrl ? copy.redirect : copy.noWhatsapp}</p>
        {whatsappUrl && <a href={whatsappUrl} className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[#2e8250] px-6 font-bold text-white">{copy.openWhatsapp}</a>}
        <p className="mt-4 text-sm leading-6">{copy.sendReminder}</p>
        <pre className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 font-sans text-sm leading-6">{ticket}</pre>
        <button type="button" onClick={() => void copyTicket()} className="mt-4 min-h-12 rounded-full border border-[#0035b9] px-5 font-bold">{copy.copyTicket}</button>
        <p role="status" className="mt-2 text-sm">{copyStatus}</p>
      </section> : <form hidden={step !== 2} onSubmit={submit} className="mt-8 rounded-3xl border border-[#021b40]/10 bg-white p-5 shadow-sm sm:p-8" aria-busy={busy}>
        <button type="button" disabled={busy} onClick={() => changeStep(1)} className="mb-3 min-h-11 font-bold text-[#0035b9]">← {copy.back}</button>
        <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xl font-bold">{copy.formTitle}</h2><button type="submit" disabled={busy || !hydrated} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#0035b9] px-4 text-sm font-bold text-white disabled:opacity-60">{copy.submit}</button></div>
        <p className="mb-6 text-sm text-slate-600">{copy.required}</p>
        {result.error && <div ref={notice} tabIndex={-1} role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800">{result.fieldErrors ? copy.fieldError : copy.error}</div>}
        <fieldset disabled={busy || locked} className="grid min-w-0 gap-6">
          {(["name", "whatsapp", "orderNumber"] as const).map((field) => <label key={field} className="block text-sm font-bold">{copy[field]}
            <input name={field} required maxLength={field === "whatsapp" ? 30 : 120} inputMode={field === "whatsapp" ? "tel" : "text"} autoComplete={field === "name" ? "name" : field === "whatsapp" ? "tel" : "off"} className={inputClass} aria-invalid={Boolean(result.fieldErrors?.[field])} />
            {result.fieldErrors?.[field] && <span className="mt-2 block font-normal text-red-700">{message(result.fieldErrors[field])}</span>}
          </label>)}
          <label className="block text-sm font-bold">{copy.problem}<textarea name="problem" required maxLength={5000} rows={5} className={inputClass} aria-invalid={Boolean(result.fieldErrors?.problem)} />{result.fieldErrors?.problem && <span className="mt-2 block font-normal text-red-700">{message(result.fieldErrors.problem)}</span>}</label>
          <label className="block min-w-0 text-sm font-bold">{copy.video}<input type="file" name="video" required accept={VIDEO_ACCEPT} onChange={(event) => selectVideo(event.target.files?.[0])} className="mt-2 block w-full min-w-0 rounded-xl border border-dashed border-[#0035b9]/40 p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#edf4ff] file:px-3 file:py-3 file:text-[#0035b9]" aria-describedby="video-hint video-error" aria-invalid={Boolean(videoError || result.fieldErrors?.video)} /><span id="video-hint" className="mt-2 block text-sm font-normal leading-6 text-slate-600">{copy.videoHint}</span><span id="video-error" className="mt-2 block font-normal text-red-700">{message(videoError || result.fieldErrors?.video)}</span></label>
          {(["agreeNoReturn", "agreeNoReview"] as const).map((field) => <label key={field} className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" name={field} value="true" required className="mt-1 size-5 shrink-0 accent-[#0035b9]" aria-invalid={Boolean(result.fieldErrors?.[field])} /><span>{copy[field]}{result.fieldErrors?.[field] && <span className="mt-2 block text-red-700">{message(result.fieldErrors[field])}</span>}</span></label>)}
          <div className="hidden" aria-hidden="true"><input name="company" tabIndex={-1} autoComplete="off" /></div>
        </fieldset>
        {preparing && <div className="mt-5 text-sm text-[#0035b9]"><p role="status">{copy.preparing}{compressionPercent !== null && ` ${compressionPercent}%`}</p><button type="button" onClick={() => preparation.current?.abort()} className="min-h-11 font-bold underline">{copy.original}</button></div>}
        {busy && !preparing && <div className="mt-5 text-sm text-[#0035b9]"><p role="status">{progress.phase === "processing" ? copy.processing : `${copy.uploading}: ${progress.percent}%`}</p><progress aria-label={copy.uploading} value={progress.percent} max={100} className="mt-3 w-full accent-[#0035b9]" /></div>}

      </form>}
    </main>
  </div>;
}
