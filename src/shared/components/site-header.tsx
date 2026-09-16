"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Brand } from "@/shared/components/brand";
import { LanguageSelector } from "@/shared/components/language-selector";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import { cn } from "@/shared/lib/utils";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  const { language } = useLanguage();
  const copy = dictionaries[language].header;

  return (
    <header className="relative z-40 border-b border-[#021b40]/15 bg-[#fffdf7] text-[#021b40] [&_a]:touch-manipulation [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#0035b9]">
      <div className={cn("mx-auto flex min-h-[72px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8", compact ? "max-w-6xl" : "max-w-7xl")}>
        <Brand />
        <nav className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-7" aria-label={copy.navigation}>
          <Link href="/#produk" className="hidden text-sm font-semibold text-[#566169] transition hover:text-[#2c3038] sm:block">
            {copy.productGuides}
          </Link>
          <Link href="/#bantuan" className="hidden text-sm font-semibold text-[#566169] transition hover:text-[#2c3038] sm:block">
            {copy.howItWorks}
          </Link>
          <Link href="/service-center" className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-[#daef69] px-3 text-xs font-bold text-[#021b40] sm:text-sm">Service Center</Link>
          <Link href="/gascomp-care" prefetch={false} className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-[#0035b9]/10 px-3 text-xs font-bold text-[#0035b9] sm:text-sm">GascompCare</Link>
          <LanguageSelector />
          <Link
            href="/admin/login"
            prefetch={false}
            className="hidden min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#0035b9]/20 px-3 text-xs font-bold text-[#0035b9] transition hover:bg-[#0035b9]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0035b9] sm:inline-flex sm:px-4 sm:text-sm"
          >
            {copy.adminLogin}
          </Link>
          <Link
            href="/#hubungi"
            className="grid size-11 place-items-center rounded-full border border-[#021b40]/20 max-sm:absolute max-sm:right-5 max-sm:top-3 bg-[#daef69] text-[#021b40] hover:bg-[#0035b9] hover:text-white"
            aria-label={copy.contactSupport}
          >
            <MessageCircle aria-hidden="true" className="size-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
