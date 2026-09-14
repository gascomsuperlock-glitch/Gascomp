"use client";

import { Languages } from "lucide-react";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import { cn } from "@/shared/lib/utils";

export function LanguageSelector({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const copy = dictionaries[language].common;

  return (
    <div role="group" aria-label={copy.language} className={cn("inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-[#021b40]/15 bg-white p-1 text-[#021b40]", className)}>
      <Languages aria-hidden="true" className="size-4 text-[#0035b9]" />
      <button type="button" onClick={() => setLanguage("id")} aria-pressed={language === "id"} aria-label={copy.indonesian} title={copy.indonesian} className={cn("grid h-7 min-w-8 place-items-center rounded-full px-2 text-[10px] font-extrabold transition", language === "id" ? "bg-[#0035b9] text-white" : "hover:bg-[#edf4ff]")}>ID</button>
      <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} aria-label={copy.english} title={copy.english} className={cn("grid h-7 min-w-8 place-items-center rounded-full px-2 text-[10px] font-extrabold transition", language === "en" ? "bg-[#0035b9] text-white" : "hover:bg-[#edf4ff]")}>EN</button>
    </div>
  );
}
