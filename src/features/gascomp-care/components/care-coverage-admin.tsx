"use client";

import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { careToday, type CareCoverage } from "../model/coverage";
import { addCarePurchaseAction, listCareCoverage, recordCareClaimAction } from "../server/coverage-actions";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const input = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]";
const errors: Record<string, string> = {
  unauthorized: "Your admin session has expired. Sign in again.",
  unavailable: "Coverage details are unavailable. Check the database connection and coverage migration, then retry.",
  invalidInput: "Check the reference, item, dates, and quantity before trying again.",
  duplicatePurchase: "This Care purchase reference has already been recorded. Check the existing purchase.",
  duplicateClaim: "This claim has already been confirmed. Refresh the claim history.",
  coverageExpired: "This coverage has expired. Refresh the coverage details.",
  coverageExhausted: "All claims for this coverage have been used. Refresh the coverage details.",
  coverageNotFound: "This coverage could not be found. Refresh the member details.",
  requestFailed: "The response could not be confirmed. Retry the same claim here; the same request will not use another claim credit.",
};
const errorMessage = (key?: string) => errors[key ?? "requestFailed"] ?? errors.requestFailed;
const displayDate = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

export function CareCoverageAdmin({ memberId }: { memberId: string }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; coverages: CareCoverage[]; error?: string }>();
  const [busy, setBusy] = useState<string>();
  const inFlight = useRef(false);
  const claimRequests = useRef<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>();
  const [units, setUnits] = useState("1");
  const key = `${memberId}:${revision}`;
  const loading = result?.key !== key;
  const today = careToday();

  useEffect(() => {
    let active = true;
    startTransition(async () => {
      try {
        const response = await listCareCoverage(memberId);
        if (active) setResult({ key, ...response });
      } catch {
        if (active) setResult({ key, coverages: [], error: "unavailable" });
      }
    });
    return () => { active = false; };
  }, [key, memberId]);

  function submit(event: FormEvent<HTMLFormElement>, coverage?: CareCoverage) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (coverage && !window.confirm(`Confirm a claim for ${coverage.itemLabel}? This uses one claim credit. ${coverage.claimsRemaining} claim(s) remain.`)) return;
    if (coverage) {
      claimRequests.current[coverage.id] ??= crypto.randomUUID();
      data.set("requestId", claimRequests.current[coverage.id]);
    }
    inFlight.current = true;
    setBusy(coverage?.id ?? "purchase");
    setFeedback(undefined);
    startTransition(async () => {
      try {
        const response = coverage ? await recordCareClaimAction({}, data) : await addCarePurchaseAction({}, data);
        if (!response.success) {
          setFeedback({ error: errorMessage(response.error) });
          return;
        }
        if (coverage) delete claimRequests.current[coverage.id];
        form.reset();
        if (!coverage) setUnits("1");
        setFeedback({ success: coverage ? "Claim confirmed. The member's remaining claims have been updated." : "Care purchase saved. Coverage starts on its purchase date." });
        setRevision((value) => value + 1);
      } catch {
        setFeedback({ error: coverage ? errorMessage() : "The purchase response could not be confirmed. Check the purchase history before retrying with the same order reference." });
      } finally {
        inFlight.current = false;
        setBusy(undefined);
      }
    });
  }

  return (
    <section aria-label="Care coverage" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-extrabold text-[#172b4d]">Coverage and claims</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">Record verified Care purchases and confirm claims. Each purchase covers one identified item, with one year and up to three claims per unit, starting on the purchase date.</p>
      {feedback?.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{feedback.error}</p>}
      {feedback?.success && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{feedback.success}</p>}
      <div aria-live="polite" aria-busy={loading} className="mt-5 space-y-4">
        {loading ? <p className="flex items-center gap-2 py-5 text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Loading coverage...</p> : result?.error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{errorMessage(result.error)}</p><button type="button" disabled={Boolean(busy)} onClick={() => setRevision((value) => value + 1)} className={`${button} mt-3`}>Retry coverage</button></div> : !result?.coverages.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No Care purchases recorded for this member.</p> : result.coverages.map((coverage) => (
          <article key={coverage.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="min-w-0 break-words font-bold text-[#172b4d]">{coverage.itemLabel}</h4><span className={`rounded-full px-2 py-1 text-xs font-bold ${coverage.status === "active" ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-700"}`}>{coverage.status === "active" ? "Active" : coverage.status === "expired" ? "Expired" : "Claims exhausted"}</span></div>
            <p className="mt-2 break-all text-xs text-slate-500">Care order: {coverage.purchaseReference}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-slate-500">Purchase date</dt><dd className="mt-1 font-bold">{displayDate(coverage.purchaseDate)}</dd></div>
              <div><dt className="text-xs text-slate-500">Covered through</dt><dd className="mt-1 font-bold">{displayDate(coverage.expiresOn)}</dd></div>
              <div><dt className="text-xs text-slate-500">Claims used</dt><dd className="mt-1 font-bold">{coverage.claimsUsed} / {coverage.claimLimit}</dd></div>
              <div><dt className="text-xs text-slate-500">Claims remaining</dt><dd className="mt-1 font-bold">{coverage.claimsRemaining}</dd></div>
            </dl>
            <div className="mt-5 border-t border-slate-100 pt-4"><h5 className="text-sm font-bold">Claim history</h5>{coverage.claims.length ? <ul className="mt-2 space-y-2">{coverage.claims.map((claim, index) => <li key={claim.id} className="flex flex-wrap justify-between gap-2 text-xs text-slate-600"><span className="min-w-0 break-all">Claim {coverage.claims.length - index}</span><time dateTime={claim.usedOn}>{displayDate(claim.usedOn)}</time></li>)}</ul> : <p className="mt-2 text-xs text-slate-500">No claims recorded.</p>}</div>
            <form onSubmit={(event) => submit(event, coverage)} className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs leading-5 text-slate-600">Confirming a claim uses one claim credit.</p>
              <input type="hidden" name="memberId" value={memberId} />
              <input type="hidden" name="coverageId" value={coverage.id} />
              <fieldset disabled={Boolean(busy) || coverage.status !== "active" || coverage.claimsRemaining <= 0} className="space-y-3">
                <legend className="sr-only">Confirm claim</legend>
                <button type="submit" className={button}>{busy === coverage.id ? "Confirming..." : "Confirm Claim"}</button>
              </fieldset>
              {coverage.status !== "active" && <p className="mt-3 text-xs text-slate-500">{coverage.status === "expired" ? "Claims cannot be recorded on expired coverage." : "No claim credits remain on this coverage."}</p>}
            </form>
          </article>
        ))}
      </div>
      {!loading && !result?.error && <form onSubmit={(event) => submit(event)} className="mt-6 border-t border-slate-200 pt-5">
        <input type="hidden" name="memberId" value={memberId} />
        <fieldset disabled={Boolean(busy)} className="space-y-4">
          <legend className="mb-4 text-base font-extrabold text-[#172b4d]">Add Care Purchase</legend>
          <label className="block text-sm font-bold text-slate-700">Shopee Care order reference<input name="purchaseReference" required maxLength={100} className={input} /></label>
          <label className="block text-sm font-bold text-slate-700">Covered item<input name="itemLabel" required maxLength={200} placeholder="Product and identifying order or serial number" className={input} /></label>
          <label className="block text-sm font-bold text-slate-700">Care purchase date<input type="date" name="purchaseDate" required defaultValue={today} min="1900-01-01" max={today} className={input} /></label>
          <label className="block text-sm font-bold text-slate-700">Care units<input type="number" name="units" required min={1} max={10} step={1} value={units} onChange={(event) => setUnits(event.target.value)} className={input} /></label>
          <p className="text-xs leading-5 text-slate-500">Each purchase is recorded separately. {Number.isInteger(Number(units)) && Number(units) >= 1 && Number(units) <= 10 ? `${units} unit(s) provide ${units} year(s) and up to ${Number(units) * 3} claims.` : "Choose 1–10 units."} The purchase reference must be unique.</p>
          <button type="submit" className={`${button} bg-[#0035b9] text-white hover:bg-[#002c98]`}>{busy === "purchase" ? "Saving purchase..." : "Save Care purchase"}</button>
        </fieldset>
      </form>}
    </section>
  );
}
