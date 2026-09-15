"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, RefreshCw, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/shared/i18n/language-context";
import type { CareCustomerCoverageResult } from "../model/customer-coverage";
import { careCoverageCopy } from "../model/coverage-copy";

export function CareCoverageSummary({ result }: { result: CareCustomerCoverageResult }) {
  const { language } = useLanguage();
  const copy = careCoverageCopy[language];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  useEffect(() => {
    const refreshVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = setInterval(refreshVisible, 60_000);
    window.addEventListener("focus", refreshVisible);
    return () => { clearInterval(timer); window.removeEventListener("focus", refreshVisible); };
  }, [router]);
  const date = (value: string) => new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));

  return <section aria-label={copy.title} className="mt-8 min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-2xl font-extrabold text-[#021b40]">{copy.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#566779]">{copy.intro}</p></div>
      <button type="button" onClick={refresh} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#021b40]/20 px-4 text-sm font-bold disabled:opacity-60"><RefreshCw aria-hidden="true" className={`size-4 ${pending ? "animate-spin" : ""}`} />{pending ? copy.refreshing : copy.refresh}</button>
    </div>
    {result.error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{copy.unavailable}</p> : result.coverages.length === 0 ? <div className="rounded-3xl border border-[#021b40]/10 bg-white p-6 sm:p-8"><ShieldCheck aria-hidden="true" className="size-8 text-[#0035b9]" /><h3 className="mt-4 text-lg font-bold">{copy.emptyTitle}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#566779]">{copy.empty}</p></div> : result.coverages.map(coverage => <article key={coverage.id} aria-label={`${copy.item}: ${coverage.itemLabel}`} className="min-w-0 overflow-hidden rounded-3xl border border-[#021b40]/10 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold text-[#566779]">{copy.item}</p><h3 className="mt-1 break-words text-xl font-extrabold text-[#021b40]">{coverage.itemLabel}</h3></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${coverage.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{copy[coverage.status]}</span></div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#f3f7fc] p-4"><dt className="flex items-center gap-2 text-xs font-bold text-[#566779]"><CalendarDays aria-hidden="true" className="size-4" />{copy.starts}</dt><dd className="mt-2 text-base font-bold">{date(coverage.purchaseDate)}</dd></div>
        <div className="rounded-2xl bg-[#edf4ff] p-4"><dt className="flex items-center gap-2 text-xs font-bold text-[#0035b9]"><CalendarDays aria-hidden="true" className="size-4" />{copy.ends}</dt><dd className="mt-2 text-lg font-extrabold text-[#0035b9]">{date(coverage.expiresOn)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-sm font-bold text-[#566779]">{copy.remaining}</dt><dd className="mt-2 text-4xl font-extrabold text-[#0035b9]">{coverage.status === "expired" ? 0 : coverage.claimsRemaining} <span className="text-sm font-medium text-[#566779]">{copy.claims}</span></dd></div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-[#566779]">{coverage.status === "expired" ? copy.expiredHelp : coverage.status === "exhausted" ? copy.exhaustedHelp : copy.approvedHelp}</p>
    </article>)}
  </section>;
}
