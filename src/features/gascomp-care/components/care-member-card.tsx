import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { careCopy } from "../model/copy";

export function CareMemberCard({ name, memberNumber, sample = false, language = "en" }: { name: string; memberNumber: string; sample?: boolean; language?: "en" | "id" }) {
  const copy = careCopy[language];
  return (
    <section aria-label={copy.card} className="relative isolate min-w-0 overflow-hidden rounded-[28px] bg-[#021b40] p-6 text-white shadow-xl sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 size-72 rounded-full border-[40px] border-[#31b4dd]/20" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Image src="/gascomp-logo.png" alt="Gascomp" width={1080} height={179} className="h-auto w-32 brightness-0 invert" />
        {sample ? <span className="rounded-full bg-[#31b4dd] px-3 py-1 text-xs font-bold text-[#021b40]">{copy.sample}</span> : <ShieldCheck aria-hidden="true" className="size-7 text-[#31b4dd]" />}
      </div>
      <p className="mt-8 text-2xl font-extrabold tracking-tight">GascompCare</p>
      <p className="mt-1 text-xs font-medium text-[#b9d1ef]">{copy.card}</p>
      <p className="mt-8 break-words text-xl font-bold">{name}</p>
      <p className="mt-2 break-all font-mono text-sm tracking-wider text-[#b9d1ef]">{memberNumber}</p>
      <div className="mt-6 border-t border-white/20 pt-5">
        {sample ? <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm font-semibold">{copy.sampleYear}<span className="mt-1 block text-xs text-[#b9d1ef]">{copy.sampleClaims}</span></p><div className="flex size-16 items-center justify-center rounded-xl border-2 border-dashed border-[#b9d1ef]/60 p-2 text-center text-[10px] font-bold text-[#b9d1ef]">{copy.qrPreview}</div></div> : <p className="max-w-xs text-sm leading-6 text-[#b9d1ef]">{copy.purchaseUnavailable}</p>}
      </div>
    </section>
  );
}
