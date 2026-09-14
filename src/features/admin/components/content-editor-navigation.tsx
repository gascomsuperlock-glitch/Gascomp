"use client";

import { BadgeCheck, CircleHelp, FileText, HeartHandshake, ImageIcon, MapPin, Play, QrCode } from "lucide-react";
import type { EditorTab } from "@/features/catalog/model/editor-types";
import type { Product } from "@/features/catalog/model/types";

const contentSections = [
  ["details", FileText, "Information"],
  ["images", ImageIcon, "Images"],
  ["videos", Play, "Video"],
  ["faqs", CircleHelp, "FAQ"],
  ["qr", QrCode, "Product QR"],
] as const;
const supportSections = [
  ["warranty", BadgeCheck, "Warranty Claim"],
  ["care", HeartHandshake, "Gascomp Care"],
  ["service-center", MapPin, "Service Center"],
] as const;

export function ContentEditorNavigation({ activeTab, onSelect, product }: { activeTab: EditorTab; onSelect: (tab: EditorTab) => void; product: Product }) {
  const counts: Partial<Record<EditorTab, number>> = { images: product.images.length, videos: product.videos.length, faqs: product.faqs.length };
  return <div className="border-b border-[#e3e8ef] bg-[#fafbfd] px-4 py-3 sm:px-5">
    <div className="sm:hidden">
      <label htmlFor="content-editor-section" className="block text-xs font-bold text-[#53657c]">Editor Section</label>
      <select id="content-editor-section" value={activeTab} onChange={(event) => onSelect(event.target.value as EditorTab)} className="mt-2 h-11 w-full min-w-0 rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-[#172b4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]">
        <optgroup label="Product content">{contentSections.map(([tab, , label]) => <option key={tab} value={tab}>{label}{counts[tab] !== undefined ? ` (${counts[tab]})` : ""}</option>)}</optgroup>
        <optgroup label="Customer support">{supportSections.map(([tab, , label]) => <option key={tab} value={tab}>{label}</option>)}</optgroup>
      </select>
    </div>
    <nav aria-label="Product editor sections" className="hidden space-y-2 sm:block">
      <div className="flex flex-wrap gap-1">{contentSections.map(([tab, Icon, label]) => <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => onSelect(tab)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] ${activeTab === tab ? "bg-[#0035b9] text-white shadow-sm" : "text-[#53657c] hover:bg-[#eaf0fa] hover:text-[#0035b9]"}`}><Icon aria-hidden="true" className="size-4" />{label}{counts[tab] !== undefined && <span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${activeTab === tab ? "bg-white/15" : "bg-[#e8edf5]"}`}>{new Intl.NumberFormat("en").format(counts[tab])}</span>}</button>)}</div>
      <div className="flex flex-wrap items-center gap-1 border-t border-[#e3e8ef] pt-2"><span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#637086]">Support</span>{supportSections.map(([tab, Icon, label]) => <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => onSelect(tab)} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] ${activeTab === tab ? "bg-[#0035b9] text-white" : "text-[#53657c] hover:bg-[#eaf0fa] hover:text-[#0035b9]"}`}><Icon aria-hidden="true" className="size-3.5" />{label}</button>)}</div>
    </nav>
  </div>;
}
