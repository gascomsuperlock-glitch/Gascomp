"use client";

import { Clock3, MessageCircle, RotateCcw } from "lucide-react";
import { Field, fieldClass } from "@/shared/components/ui/editor-fields";

export function SettingsEditor({ whatsapp, hours, update, reset }: { whatsapp: string; hours: string; update: (whatsapp: string, hours: string) => void; reset: () => void }) {
  return (
    <section className="max-w-3xl overflow-hidden rounded-[22px] border border-[#2c3038]/8 bg-white shadow-sm">
      <div className="border-b border-[#2c3038]/8 p-6"><h2 className="text-xl font-extrabold tracking-[-0.03em]">Support settings</h2><p className="mt-2 text-xs leading-5 text-[#788287]">This information is used on every product page.</p></div>
      <div className="space-y-7 p-6">
        <div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9f5ed] text-[#3f8759]"><MessageCircle className="size-4" /></span><div className="flex-1"><Field label="Admin WhatsApp number" hint="Include the country code. Example: 6281234567890"><input value={whatsapp} onChange={(event) => update(event.target.value, hours)} className={fieldClass} inputMode="tel" /></Field></div></div>
        <div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-[#0035b9]"><Clock3 className="size-4" /></span><div className="flex-1"><Field label="Support hours"><input value={hours} onChange={(event) => update(whatsapp, event.target.value)} className={fieldClass} /></Field></div></div>
        <div className="border-t border-[#2c3038]/8 pt-6"><button type="button" onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c95845]/20 bg-[#fff7f4] px-4 text-xs font-extrabold text-[#b74935]"><RotateCcw className="size-3.5" /> Restore synchronized data</button><p className="mt-2 text-[10px] text-[#949b9f]">The form will return to the synchronized catalog. Select Save to commit the restored values.</p></div>
      </div>
    </section>
  );
}
