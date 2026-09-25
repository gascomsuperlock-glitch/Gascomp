"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageCircle, X } from "lucide-react";
import { Brand } from "@/shared/components/brand";
import { LanguageSelector } from "@/shared/components/language-selector";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import { cn } from "@/shared/lib/utils";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  const { language } = useLanguage();
  const copy = dictionaries[language].header;
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navigationId = useId();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1100px)");
    const closeOnResize = () => setOpen(false);
    desktop.addEventListener("change", closeOnResize);
    return () => desktop.removeEventListener("change", closeOnResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const linkClass = "flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition hover:bg-[#0035b9]/5 hover:text-[#0035b9] min-[1100px]:px-2";

  return (
    <header ref={headerRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} className="relative z-40 border-b border-[#021b40]/15 bg-[#fffdf7] text-[#021b40] [&_a]:touch-manipulation [&_button]:touch-manipulation [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#0035b9] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#0035b9]">
      <div className={cn("relative mx-auto flex min-h-[72px] items-center justify-between gap-3 px-5 py-3 sm:px-8", compact ? "max-w-6xl" : "max-w-7xl")}>
        <Brand />
        <button ref={toggleRef} type="button" aria-expanded={open} aria-controls={navigationId} onClick={() => setOpen(!open)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#021b40]/20 bg-white px-4 text-sm font-bold min-[1100px]:hidden">
          {open ? copy.closeMenu : copy.menu}
          {open ? <X aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
        </button>
        <nav id={navigationId} aria-label={copy.navigation} onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
        }} className={cn("absolute inset-x-0 top-full max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-[#021b40]/15 bg-[#fffdf7] p-5 shadow-lg sm:px-8 min-[1100px]:static min-[1100px]:flex min-[1100px]:max-h-none min-[1100px]:items-center min-[1100px]:gap-1 min-[1100px]:overflow-visible min-[1100px]:border-0 min-[1100px]:bg-transparent min-[1100px]:p-0 min-[1100px]:shadow-none", open ? "grid gap-2" : "hidden")}>
          <Link href="/#produk" className={linkClass}>{copy.productGuides}</Link>
          <Link href="/#bantuan" className={linkClass}>{copy.howItWorks}</Link>
          <Link href="/service-center" className={cn(linkClass, "bg-[#daef69] font-bold min-[1100px]:rounded-full")}>Service Center</Link>
          <Link href="/gascomp-care" prefetch={false} className={cn(linkClass, "bg-[#0035b9]/10 font-bold text-[#0035b9] min-[1100px]:rounded-full")}>GascompCare</Link>
          <div className="flex min-h-11 items-center justify-between gap-3 py-1 min-[1100px]:px-2 min-[1100px]:py-0">
            <span className="pl-3 text-sm font-semibold min-[1100px]:hidden">{dictionaries[language].common.language}</span>
            <LanguageSelector />
          </div>
          <Link href="/admin/login" prefetch={false} className={cn(linkClass, "border border-[#0035b9]/20 font-bold text-[#0035b9] min-[1100px]:rounded-full")}>{copy.adminLogin}</Link>
          <Link href="/#hubungi" className={cn(linkClass, "gap-2 bg-[#daef69] min-[1100px]:size-11 min-[1100px]:justify-center min-[1100px]:rounded-full")} aria-label={copy.contactSupport}>
            <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-[1100px]:hidden">{copy.contactSupport}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
