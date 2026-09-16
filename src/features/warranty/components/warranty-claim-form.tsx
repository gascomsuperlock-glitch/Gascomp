"use client";

import { ticketLoginUrl } from "@/shared/lib/ticket-links";
import { useContent } from "@/features/catalog/hooks/use-content";
import { getWarrantyWhatsappUrl } from "@/shared/lib/whatsapp";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { formatJakartaDate } from "@/features/warranty/model/claim-eligibility";
import { MAX_VIDEO_MB, VIDEO_ACCEPT, validateEvidenceSelection } from "@/features/warranty/model/evidence";
import type { WarrantyEvidenceKind } from "@/features/warranty/model/types";
import { prepareVideo, type PreparedVideo } from "./video-compression";
import { validateVideoPlayback } from "./video-validation";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { WarrantyClaimState } from "@/features/warranty/server/claim-actions";
import { submitClaim, type ClaimProgress } from "./claim-transport";
import { dictionaries, localizeMessage } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import type { AppLanguage } from "@/shared/i18n/language";
import { ClaimProductFields } from "./claim-product-fields";
import { ClaimHomeLink } from "./claim-home-link";

const initialState: WarrantyClaimState = {};
const inputClass = "mt-2 h-12 w-full rounded-xl border border-[#2c3038]/10 bg-white px-4 text-sm font-semibold text-[#2c3038] outline-none transition placeholder:text-[#a1a8ac] focus:border-[#0035b9]/45 focus:ring-4 focus:ring-[#0035b9]/8";
const fileClass = "mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-[#2c3038]/15 bg-[#fafbfc] px-4 py-4 text-xs font-semibold text-[#69747b] file:mr-4 file:rounded-full file:border-0 file:bg-[#eaf1ff] file:px-4 file:py-2 file:text-xs file:font-extrabold file:text-[#0035b9] hover:border-[#0035b9]/30";

export function WarrantyClaimForm({
  defaultProduct,
  defaultSku,
}: {
  defaultProduct: string;
  defaultSku: string;
}) {
  const { language } = useLanguage();
  const copy = dictionaries[language].warranty;
  const { content, hydrated } = useContent();

  const errorSummary = useRef<HTMLDivElement>(null);
  const redirectedTicket = useRef<string | null>(null);
  const [preparingSubmission, setPreparingSubmission] = useState(false);
  const videoValidationTask = useRef<Promise<string | null>>(Promise.resolve(null));
  const submissionEpoch = useRef(0);
  useEffect(() => () => { submissionEpoch.current++; }, []);
  const onVideoValidationTask = useCallback((task: Promise<string | null>) => {
    videoValidationTask.current = task;
  }, []);
  const videoBusy = useRef(false);
  const preparedVideo = useRef<{ source: File; result: PreparedVideo } | null>(null);
  const onVideoBusy = useCallback((busy: boolean) => {
    videoBusy.current = busy;
  }, []);
  const onPreparedVideo = useCallback((value: { source: File; result: PreparedVideo } | null) => {
    preparedVideo.current = value;
  }, []);
  const [state, setState] = useState<WarrantyClaimState & { whatsappUrl?: string | null }>(initialState);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [progress, setProgress] = useState<ClaimProgress>({ phase: "uploading", percent: 0 });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    if (state.error) errorSummary.current?.focus();
  }, [state.error]);

  const whatsappUrl = state.whatsappUrl;

  useEffect(() => {
    if (!state.success || !state.ticketId || !whatsappUrl || redirectedTicket.current === state.ticketId) return;
    redirectedTicket.current = state.ticketId;
    window.location.assign(whatsappUrl);
  }, [state.success, state.ticketId, whatsappUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Keep the form mounted so failed transport never discards selected files.
    event.preventDefault();
    if (submitting.current) return;
    const formData = new FormData(event.currentTarget);
    const selectedVideo = (event.currentTarget.elements.namedItem("damageVideo") as HTMLInputElement).files?.[0];
    const epoch = submissionEpoch.current;
    const validationTask = videoValidationTask.current;
    submitting.current = true;
    setPending(true);
    setPreparingSubmission(videoBusy.current);
    setState({});
    setElapsed(0);
    try {
      // A single click owns preparation and upload. Never ask for another click
      // when the selected video's background work finishes.
      const videoError = await validationTask;
      if (epoch !== submissionEpoch.current) return;
      setPreparingSubmission(false);
      if (videoError) {
        setState({ error: copy.evidenceError, fieldErrors: { damageVideo: videoError } });
        return;
      }
      if (preparedVideo.current && preparedVideo.current.source === selectedVideo) {
        formData.set("damageVideo", preparedVideo.current.result.file);
      }
      const result = await submitClaim(formData, setProgress);
      if (epoch !== submissionEpoch.current) return;
      setState(result.success && result.ticketId
        ? { ...result, whatsappUrl: getWarrantyWhatsappUrl(content.whatsappNumber, result.ticketId, ticketLoginUrl(window.location.origin, result.ticketId)) }
        : result);
    } catch {
      if (epoch === submissionEpoch.current) setState({ error: copy.submitError });
    } finally {
      if (epoch === submissionEpoch.current) {
        submitting.current = false;
        setPreparingSubmission(false);
        setPending(false);
      }
    }
  }

  if (state.success && state.ticketId) {
    return (
      <div className="rounded-[28px] border border-[#2c3038]/8 bg-white p-7 text-center shadow-[0_22px_60px_rgba(44,48,56,0.09)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e8f5ec] text-[#3d8958]"><CheckCircle2 className="size-8" /></span>
        <p className="mt-6 text-[10px] font-extrabold tracking-[0.15em] text-[#3d8958]">{copy.ticketCreated}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">{copy.awaitingReview}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#707a80]">{copy.saveForFollowUp}</p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[#0035b9]/12 bg-[#f3f7ff] px-5 py-4">
          <span className="block text-[9px] font-extrabold tracking-[0.13em] text-[#7b8899]">{copy.ticketNumber}</span>
          <strong className="mt-1 block text-xl tracking-[0.04em] text-[#0035b9]">{state.ticketId}</strong>
        </div>
        {whatsappUrl && <div className="mt-6"><p className="text-sm text-[#707a80]">{copy.whatsappRedirect}</p><a href={whatsappUrl} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-[#2e8250] px-5 text-sm font-bold text-white">{copy.openWhatsapp}</a></div>}
        <ClaimHomeLink className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#2c3038] px-5 text-xs font-extrabold text-white"><ArrowLeft className="size-4" /> {copy.backToHelp}</ClaimHomeLink>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-[#2c3038]/8 bg-white p-5 shadow-[0_22px_60px_rgba(44,48,56,0.09)] sm:p-8">
      <div className="flex items-start gap-3 border-b border-[#2c3038]/8 pb-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf4ff] text-[#0035b9]"><ShieldCheck className="size-5" /></span>
        <div><h2 className="text-xl font-extrabold tracking-[-0.03em]">{copy.formTitle}</h2><p className="mt-1 text-xs leading-5 text-[#7a8489]">{copy.formCopy}</p></div>
      </div>

      <p className="mt-4 text-xs leading-5 text-[#53657c]">{copy.eligibility}</p>
      {state.error && <div ref={errorSummary} tabIndex={-1} role="alert" className="mt-5 rounded-xl bg-[#fff0ef] p-4 text-xs font-semibold text-[#ad4037]">{localizeMessage(state.error, language)}</div>}

      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ClaimField label={copy.fullName} error={localizeMessage(state.fieldErrors?.name, language)}><input name="name" required maxLength={120} autoComplete="name" placeholder={copy.fullNamePlaceholder} className={inputClass} /></ClaimField>
        <ClaimField label={copy.whatsapp} error={localizeMessage(state.fieldErrors?.whatsapp, language)}><input name="whatsapp" required maxLength={30} inputMode="tel" autoComplete="tel" placeholder={copy.examplePhone} className={inputClass} /></ClaimField>
        <ClaimField label={copy.email} error={localizeMessage(state.fieldErrors?.email, language)}><input name="email" required maxLength={180} type="email" autoComplete="email" placeholder="name@example.com" className={inputClass} /></ClaimField>
        <ClaimField label={copy.purchaseDate} error={localizeMessage(state.fieldErrors?.purchaseDate, language)}><input name="purchaseDate" required type="date" max={formatJakartaDate()} className={inputClass} /></ClaimField>
        <ClaimProductFields defaultProduct={defaultProduct} defaultSku={defaultSku} pending={pending} fieldErrors={state.fieldErrors} inputClass={inputClass} />
        <ClaimField label={copy.store} error={localizeMessage(state.fieldErrors?.store, language)}><input name="store" required maxLength={160} placeholder={copy.storePlaceholder} className={inputClass} /></ClaimField>
        <ClaimField label={copy.orderNumber} error={localizeMessage(state.fieldErrors?.orderNumber, language)}><input name="orderNumber" required maxLength={120} placeholder={copy.orderExample} className={inputClass} /></ClaimField>
        <div className="sm:col-span-2"><ClaimField label={copy.purchasePrice} hint={copy.purchasePriceHint} error={localizeMessage(state.fieldErrors?.purchasePrice, language)}><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#69747b]">Rp</span><input name="purchasePrice" required maxLength={16} inputMode="numeric" pattern="[0-9]+" placeholder="250000" className={`${inputClass} pl-12`} /></div></ClaimField></div>
        <div className="sm:col-span-2"><ClaimField label={copy.productIssue} error={localizeMessage(state.fieldErrors?.problem, language)}><textarea name="problem" required minLength={15} maxLength={3000} placeholder={copy.problemPlaceholder} className={`${inputClass} min-h-32 resize-y py-3 leading-6`} /></ClaimField></div>
      </div>

      <div className="mt-7 border-t border-[#2c3038]/8 pt-6">
        <div className="flex items-center gap-2"><FileCheck2 className="size-4 text-[#0035b9]" /><h3 className="text-sm font-extrabold">{copy.evidence}</h3></div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <EvidenceField language={language} checkingLabel={copy.checkingPlayback} name="invoice" kind="invoice" label={copy.invoice} hint={copy.invoiceHint} accept="image/jpeg,image/png,image/webp,application/pdf" serverErrors={state.fieldErrors} disabled={pending} />
          <EvidenceField language={language} checkingLabel={copy.checkingPlayback} name="damagePhotos" kind="photo" label={copy.photos} hint={copy.photosHint} accept="image/jpeg,image/png,image/webp" serverErrors={state.fieldErrors} disabled={pending} />
          <div className="sm:col-span-2"><EvidenceField language={language} checkingLabel={copy.checkingPlayback} name="damageVideo" kind="video" label={copy.video} hint={copy.videoHint.replace("{size}", String(MAX_VIDEO_MB))} accept={VIDEO_ACCEPT} serverErrors={state.fieldErrors} disabled={pending} onCheckingChange={onVideoBusy} onPreparedVideo={onPreparedVideo} onValidationTask={onVideoValidationTask} /></div>
        </div>
      </div>

      <label className="mt-7 flex items-start gap-3 rounded-2xl bg-[#f5f7fa] p-4 text-xs leading-5 text-[#606c73]">
        <input name="agreement" value="yes" type="checkbox" required className="mt-0.5 size-4 rounded border-[#2c3038]/20 accent-[#0035b9]" />
        <span>{copy.agreement}</span>
      </label>
      {state.fieldErrors?.agreement && <p className="mt-2 text-[10px] font-semibold text-[#b33b31]">{localizeMessage(state.fieldErrors.agreement, language)}</p>}

      {pending && <div className="mt-6 rounded-xl bg-[#edf4ff] p-4 text-xs text-[#0035b9]">
        <p role="status" className="font-bold">{preparingSubmission ? copy.preparingSubmission : progress.phase === "uploading" ? copy.uploading.replace("{percent}", String(progress.percent)) : copy.processing}</p>
        {!preparingSubmission && progress.phase === "uploading" && <progress aria-label={copy.uploadProgress} value={progress.percent} max={100} className="mt-3 h-2 w-full accent-[#0035b9]" />}
        <p className="mt-2 leading-5">{copy.uploadHint}</p>
        {elapsed >= 20 && <p className="mt-2 leading-5">{copy.slowConnection}</p>}
      </div>}
      <button type="submit" disabled={pending || !hydrated} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0035b9] text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,53,185,0.22)] transition hover:bg-[#002b96] disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? copy.submitting : copy.submit}
      </button>
      <p className="mt-3 text-center text-[10px] leading-4 text-[#92999d]"><Upload className="mr-1 inline size-3" /> {copy.privateEvidence}</p>
    </form>
  );
}

function EvidenceField({ name, kind, label, hint, accept, serverErrors, disabled, onCheckingChange, onPreparedVideo, onValidationTask, language, checkingLabel }: {
  name: "invoice" | "damagePhotos" | "damageVideo";
  kind: WarrantyEvidenceKind;
  label: string;
  hint: string;
  accept: string;
  serverErrors: WarrantyClaimState["fieldErrors"];
  disabled: boolean;
  onCheckingChange?: (checking: boolean) => void;
  onPreparedVideo?: (value: { source: File; result: PreparedVideo } | null) => void;
  onValidationTask?: (task: Promise<string | null>) => void;
  language: AppLanguage;
  checkingLabel: string;
}) {
  const validationId = useRef(0);
  const compression = useRef<AbortController | null>(null);
  const [compressionPercent, setCompressionPercent] = useState<number | null>(null);
  const [prepared, setPrepared] = useState<{ source: File; result: PreparedVideo } | null>(null);
  const copy = dictionaries[language].warranty;
  useEffect(() => () => {
    validationId.current++;
    compression.current?.abort();
  }, []);
  const [validation, setValidation] = useState<{ error: string | null; serverErrors: WarrantyClaimState["fieldErrors"] }>();
  const [checking, setChecking] = useState(false);
  const error = validation && validation.serverErrors === serverErrors
    ? validation.error ?? undefined
    : localizeMessage(serverErrors?.[name], language);
  const errorId = `${name}-error`;

  function validate(input: HTMLInputElement) {
    const task = validateAndPrepare(input);
    onValidationTask?.(task);
  }

  async function validateAndPrepare(input: HTMLInputElement): Promise<string | null> {
    const id = ++validationId.current;
    compression.current?.abort();
    compression.current = null;
    setCompressionPercent(null);
    setPrepared(null);
    onPreparedVideo?.(null);
    const files = Array.from(input.files ?? []);
    let nextError = localizeMessage(validateEvidenceSelection(files, kind) ?? undefined, language) ?? null;
    const needsPlaybackCheck = !nextError && kind === "video";
    setChecking(needsPlaybackCheck);
    onCheckingChange?.(needsPlaybackCheck);
    setValidation({ error: nextError, serverErrors });
    input.setCustomValidity(nextError ?? "");
    if (needsPlaybackCheck) {
      nextError = localizeMessage((await validateVideoPlayback(files[0])) ?? undefined, language) ?? null;
      if (id !== validationId.current) return null;
    }
    if (needsPlaybackCheck && !nextError) {
      const controller = new AbortController();
      compression.current = controller;
      setCompressionPercent(0);
      let result: PreparedVideo = { file: files[0], outcome: "original" };
      try {
        if (id !== validationId.current) return null;
        result = await prepareVideo(files[0], controller.signal, (percent) => {
          if (id === validationId.current) setCompressionPercent(percent);
        });
      } catch { /* Keep the original if video preparation fails. */ }
      if (id !== validationId.current) return null;
      const value = { source: files[0], result };
      setPrepared(value);
      onPreparedVideo?.(value);
      setCompressionPercent(null);
      compression.current = null;
    }
    input.setCustomValidity(nextError ?? "");
    setValidation({ error: nextError, serverErrors });
    setChecking(false);
    onCheckingChange?.(false);
    return nextError;
  }

  return (
    <div><ClaimField label={label} hint={hint} error={error} errorId={errorId}>
      <input name={name} required multiple={kind === "photo"} type="file" accept={accept} className={fileClass} disabled={disabled}
        aria-invalid={Boolean(error)} aria-busy={checking} aria-describedby={error ? errorId : undefined}
        onChange={(event) => void validate(event.currentTarget)}
        onInvalid={(event) => { if (!event.currentTarget.files?.length) void validate(event.currentTarget); }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (disabled) return;
          event.currentTarget.files = event.dataTransfer.files;
          void validate(event.currentTarget);
        }} />
      {checking && compressionPercent === null && <span role="status" className="mt-1.5 block text-[10px] text-[#69747b]">{checkingLabel}</span>}
    </ClaimField>
    {compressionPercent !== null && <div className="mt-3 rounded-xl bg-[#edf4ff] p-3 text-xs text-[#0035b9]">
      <p role="status">{copy.compressing.replace("{percent}", String(compressionPercent))}</p>
      <progress aria-label={copy.compressionProgress} value={compressionPercent} max={100} className="mt-2 h-2 w-full accent-[#0035b9]" />
      {!disabled && <p className="mt-2 leading-5">{copy.compressionHint}</p>}
      <button type="button" onClick={() => compression.current?.abort()} className="mt-2 min-h-11 font-bold underline">{copy.useOriginalVideo}</button>
    </div>}
    {prepared && <p role="status" className="mt-2 text-xs leading-5 text-[#53657c]">
      {prepared.result.outcome === "compressed"
        ? copy.compressedVideo.replace("{before}", (prepared.source.size / 1024 / 1024).toFixed(1)).replace("{after}", (prepared.result.file.size / 1024 / 1024).toFixed(1))
        : prepared.result.outcome === "small" ? copy.smallVideo : copy.originalVideo}
    </p>}
    </div>
  );
}

function ClaimField({ label, hint, error, errorId, children }: { label: string; hint?: string; error?: string; errorId?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] font-extrabold text-[#4f5b62]">{label}</span>{children}{hint && <span className="mt-1.5 block text-[9px] leading-4 text-[#92999d]">{hint}</span>}{error && <span id={errorId} role="alert" className="mt-1.5 block text-[10px] font-semibold text-[#b33b31]">{error}</span>}</label>;
}
