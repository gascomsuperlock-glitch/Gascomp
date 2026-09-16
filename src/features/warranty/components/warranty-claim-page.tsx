"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, CheckCircle2, Clock3, FileText, ShieldCheck } from "lucide-react";
import { WarrantyClaimForm } from "@/features/warranty/components/warranty-claim-form";
import { Brand } from "@/shared/components/brand";
import { LanguageSelector } from "@/shared/components/language-selector";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import { ClaimHomeLink } from "./claim-home-link";
import { installClaimHomeNavigation } from "@/features/warranty/model/claim-home-navigation";

export function WarrantyClaimPage({ defaultProduct, defaultSku }: { defaultProduct: string; defaultSku: string }) {
  useEffect(() => installClaimHomeNavigation(window), []);
  const { language } = useLanguage();
  const copy = dictionaries[language].warranty;
  const steps = [
    [FileText, copy.prepareTitle, copy.prepareCopy],
    [CheckCircle2, copy.describeTitle, copy.describeCopy],
    [Clock3, copy.saveTicketTitle, copy.saveTicketCopy],
  ] as const;

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#2c3038]">
      <header className="border-b border-[#2c3038]/8 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-8">
          <Brand />
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/gascomp-care" prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-[#0035b9]/10 px-3 text-xs font-bold text-[#0035b9] focus-visible:outline-2 focus-visible:outline-offset-4">GascompCare</Link>
            <LanguageSelector />
            <ClaimHomeLink className="inline-flex min-h-11 items-center gap-2 text-xs font-extrabold text-[#647077] hover:text-[#0035b9]"><ArrowLeft className="size-4" /> {copy.backToHelp}</ClaimHomeLink>
          </div>
        </div>
      </header>

      <main className="px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <aside className="lg:sticky lg:top-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e9f1ff] px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] text-[#0035b9]"><ShieldCheck className="size-3.5" /> {copy.serviceLabel}</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#68747b]">{copy.introduction}</p>
            <div className="mt-8 space-y-3">
              {steps.map(([Icon, title, description]) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-[#2c3038]/8 bg-white p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-[#0035b9]"><Icon className="size-4" /></span>
                  <div><strong className="block text-xs">{title}</strong><p className="mt-1 text-[10px] leading-4 text-[#7a858b]">{description}</p></div>
                </div>
              ))}
            </div>
          </aside>

          <WarrantyClaimForm defaultProduct={defaultProduct} defaultSku={defaultSku} />
        </div>
      </main>
    </div>
  );
}
