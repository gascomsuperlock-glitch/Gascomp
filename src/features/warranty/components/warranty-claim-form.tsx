"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { validateEvidenceSelection } from "@/features/warranty/model/evidence";
import type { WarrantyEvidenceKind } from "@/features/warranty/model/types";
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
import {
  createWarrantyClaim,
  type WarrantyClaimState,
} from "@/features/warranty/server/claim-actions";

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
  const [checkingVideo, setCheckingVideo] = useState(false);
  const [state, action, pending] = useActionState(async (previousState: WarrantyClaimState, formData: FormData) => {
    try {
      return await createWarrantyClaim(previousState, formData);
    } catch {
      return { error: "The claim could not be submitted. Your details are still here. Please try again." };
    }
  }, initialState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Dispatch manually so a failed action does not reset text or file inputs.
    event.preventDefault();
    if (pending || checkingVideo) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  if (state.success && state.ticketId) {
    return (
      <div className="rounded-[28px] border border-[#2c3038]/8 bg-white p-7 text-center shadow-[0_22px_60px_rgba(44,48,56,0.09)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e8f5ec] text-[#3d8958]"><CheckCircle2 className="size-8" /></span>
        <p className="mt-6 text-[10px] font-extrabold tracking-[0.15em] text-[#3d8958]">TICKET CREATED</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">Your claim is awaiting review</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#707a80]">Save this ticket number for follow-up with the Gascomp team.</p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[#0035b9]/12 bg-[#f3f7ff] px-5 py-4">
          <span className="block text-[9px] font-extrabold tracking-[0.13em] text-[#7b8899]">TICKET NUMBER</span>
          <strong className="mt-1 block text-xl tracking-[0.04em] text-[#0035b9]">{state.ticketId}</strong>
        </div>
        <Link href="/" className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#2c3038] px-5 text-xs font-extrabold text-white"><ArrowLeft className="size-4" /> Back to help center</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-[#2c3038]/8 bg-white p-5 shadow-[0_22px_60px_rgba(44,48,56,0.09)] sm:p-8">
      <div className="flex items-start gap-3 border-b border-[#2c3038]/8 pb-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf4ff] text-[#0035b9]"><ShieldCheck className="size-5" /></span>
        <div><h2 className="text-xl font-extrabold tracking-[-0.03em]">Claim form</h2><p className="mt-1 text-xs leading-5 text-[#7a8489]">Enter details that match your proof of purchase so the claim can be reviewed.</p></div>
      </div>

      {state.error && <div role="alert" className="mt-5 rounded-xl bg-[#fff0ef] p-4 text-xs font-semibold text-[#ad4037]">{state.error}</div>}

      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ClaimField label="Full name" error={state.fieldErrors?.name}><input name="name" required maxLength={120} autoComplete="name" placeholder="Name shown on your identification" className={inputClass} /></ClaimField>
        <ClaimField label="WhatsApp number" error={state.fieldErrors?.whatsapp}><input name="whatsapp" required maxLength={30} inputMode="tel" autoComplete="tel" placeholder="Example: 081234567890" className={inputClass} /></ClaimField>
        <ClaimField label="Email" error={state.fieldErrors?.email}><input name="email" required maxLength={180} type="email" autoComplete="email" placeholder="name@example.com" className={inputClass} /></ClaimField>
        <ClaimField label="Purchase date" error={state.fieldErrors?.purchaseDate}><input name="purchaseDate" required type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass} /></ClaimField>
        <ClaimField label="Product name" error={state.fieldErrors?.product}><input name="product" required maxLength={180} defaultValue={defaultProduct} placeholder="Gascomp product name" className={inputClass} /></ClaimField>
        <ClaimField label="Product SKU" error={state.fieldErrors?.sku}><input name="sku" required maxLength={80} defaultValue={defaultSku} placeholder="SKU shown on the product or packaging" className={inputClass} /></ClaimField>
        <ClaimField label="Store of purchase" error={state.fieldErrors?.store}><input name="store" required maxLength={160} placeholder="Store or marketplace name" className={inputClass} /></ClaimField>
        <ClaimField label="Order number" error={state.fieldErrors?.orderNumber}><input name="orderNumber" required maxLength={120} placeholder="Example: INV/2026/001234" className={inputClass} /></ClaimField>
        <div className="sm:col-span-2"><ClaimField label="Purchase price" hint="Enter the amount in Indonesian Rupiah without dots or commas" error={state.fieldErrors?.purchasePrice}><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#69747b]">Rp</span><input name="purchasePrice" required maxLength={16} inputMode="numeric" pattern="[0-9]+" placeholder="250000" className={`${inputClass} pl-12`} /></div></ClaimField></div>
        <div className="sm:col-span-2"><ClaimField label="Product issue" error={state.fieldErrors?.problem}><textarea name="problem" required minLength={15} maxLength={3000} placeholder="Describe the product condition and issue..." className={`${inputClass} min-h-32 resize-y py-3 leading-6`} /></ClaimField></div>
      </div>

      <div className="mt-7 border-t border-[#2c3038]/8 pt-6">
        <div className="flex items-center gap-2"><FileCheck2 className="size-4 text-[#0035b9]" /><h3 className="text-sm font-extrabold">Supporting evidence</h3></div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <EvidenceField name="invoice" kind="invoice" label="Invoice or proof of purchase" hint="Required · JPG, PNG, WebP, or PDF · up to 4 MB" accept="image/jpeg,image/png,image/webp,application/pdf" serverErrors={state.fieldErrors} disabled={pending} />
          <EvidenceField name="damagePhotos" kind="photo" label="Product condition photos" hint="Required · 1–4 JPG, PNG, or WebP photos · up to 4 MB each" accept="image/jpeg,image/png,image/webp" serverErrors={state.fieldErrors} disabled={pending} />
          <div className="sm:col-span-2"><EvidenceField name="damageVideo" kind="video" label="Product issue video" hint="Required · MP4, WebM, or MOV · up to 12 MB · must be playable" accept="video/mp4,video/webm,video/quicktime" serverErrors={state.fieldErrors} disabled={pending} onCheckingChange={setCheckingVideo} /></div>
        </div>
      </div>

      <label className="mt-7 flex items-start gap-3 rounded-2xl bg-[#f5f7fa] p-4 text-xs leading-5 text-[#606c73]">
        <input name="agreement" value="yes" type="checkbox" required className="mt-0.5 size-4 rounded border-[#2c3038]/20 accent-[#0035b9]" />
        <span>I confirm that the submitted details and evidence are accurate, and I authorize the Gascomp team to contact me about this claim.</span>
      </label>
      {state.fieldErrors?.agreement && <p className="mt-2 text-[10px] font-semibold text-[#b33b31]">{state.fieldErrors.agreement}</p>}

      <button type="submit" disabled={pending || checkingVideo} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0035b9] text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,53,185,0.22)] transition hover:bg-[#002b96] disabled:cursor-not-allowed disabled:opacity-60">
        {pending || checkingVideo ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? "Submitting claim..." : checkingVideo ? "Checking video..." : "Submit claim ticket"}
      </button>
      <p className="mt-3 text-center text-[10px] leading-4 text-[#92999d]"><Upload className="mr-1 inline size-3" /> Evidence is stored privately and can only be opened from the admin dashboard.</p>
    </form>
  );
}

function EvidenceField({ name, kind, label, hint, accept, serverErrors, disabled, onCheckingChange }: {
  name: "invoice" | "damagePhotos" | "damageVideo";
  kind: WarrantyEvidenceKind;
  label: string;
  hint: string;
  accept: string;
  serverErrors: WarrantyClaimState["fieldErrors"];
  disabled: boolean;
  onCheckingChange?: (checking: boolean) => void;
}) {
  const validationId = useRef(0);
  const [validation, setValidation] = useState<{ error: string | null; serverErrors: WarrantyClaimState["fieldErrors"] }>();
  const [checking, setChecking] = useState(false);
  const error = validation && validation.serverErrors === serverErrors ? validation.error ?? undefined : serverErrors?.[name];
  const errorId = `${name}-error`;

  async function validate(input: HTMLInputElement) {
    const id = ++validationId.current;
    const files = Array.from(input.files ?? []);
    let nextError = validateEvidenceSelection(files, kind);
    const needsPlaybackCheck = !nextError && kind === "video";
    setChecking(needsPlaybackCheck);
    onCheckingChange?.(needsPlaybackCheck);
    setValidation({ error: nextError, serverErrors });
    input.setCustomValidity(nextError ?? (needsPlaybackCheck ? "Please wait while the video is checked." : ""));
    if (needsPlaybackCheck) {
      nextError = await validateVideoPlayback(files[0]);
      if (id !== validationId.current) return;
    }
    input.setCustomValidity(nextError ?? "");
    setValidation({ error: nextError, serverErrors });
    setChecking(false);
    onCheckingChange?.(false);
  }

  return (
    <ClaimField label={label} hint={hint} error={error} errorId={errorId}>
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
      {checking && <span role="status" className="mt-1.5 block text-[10px] text-[#69747b]">Checking video playback...</span>}
    </ClaimField>
  );
}

function ClaimField({ label, hint, error, errorId, children }: { label: string; hint?: string; error?: string; errorId?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] font-extrabold text-[#4f5b62]">{label}</span>{children}{hint && <span className="mt-1.5 block text-[9px] leading-4 text-[#92999d]">{hint}</span>}{error && <span id={errorId} role="alert" className="mt-1.5 block text-[10px] font-semibold text-[#b33b31]">{error}</span>}</label>;
}
