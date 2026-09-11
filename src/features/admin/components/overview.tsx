"use client";

import { BarChart3, ChevronRight, CircleHelp, Gauge, MonitorPlay, PackagePlus, QrCode, TicketCheck } from "lucide-react";
import { ProductVisual } from "@/features/catalog/components/product-visual";
import { getPrimaryProductImage } from "@/features/catalog/model/product-utils";
import type { Product } from "@/features/catalog/model/types";
import type { EditorTab } from "@/features/catalog/model/editor-types";
import type { IconType } from "@/shared/lib/icon-types";

export function Overview({ products, publishedCount, totalVideos, totalFaqs, ticketCount, onAdd, onOpen }: { products: Product[]; publishedCount: number; totalVideos: number; totalFaqs: number; ticketCount: number; onAdd: () => void; onOpen: (id: string, tab?: EditorTab) => void }) {
  const stats: Array<[string, number, IconType, string]> = [
    ["Active products", publishedCount, Gauge, "bg-[#edf4ff] text-[#0035b9]"],
    ["Tutorial videos", totalVideos, MonitorPlay, "bg-[#e9f0f4] text-[#365a70]"],
    ["FAQ entries", totalFaqs, CircleHelp, "bg-[#e8f3eb] text-[#467a57]"],
    ["Active tickets", ticketCount, TicketCheck, "bg-[#fff3e8] text-[#a65b27]"],
  ];

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold text-[#0035b9]">Welcome back</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Gascomp content center</h2><p className="mt-2 text-sm text-[#707a80]">Manage what customers see after scanning a QR code.</p></div>
        <button type="button" onClick={onAdd} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-5 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(13,79,215,0.22)]"><PackagePlus className="size-4" /> Add product</button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon, style]) => <div key={label} className="rounded-[22px] border border-[#2c3038]/8 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className={`grid size-10 place-items-center rounded-xl ${style}`}><Icon className="size-4" /></span><BarChart3 className="size-4 text-[#b1b6b9]" /></div><p className="mt-6 text-3xl font-extrabold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs font-semibold text-[#7b858a]">{label}</p></div>)}
      </div>

      <section className="mt-6 overflow-hidden rounded-[22px] border border-[#2c3038]/8 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#2c3038]/8 p-5"><div><h3 className="text-sm font-extrabold">All products</h3><p className="mt-1 text-[10px] text-[#8b9397]">Help content for every product QR code</p></div><button type="button" onClick={() => products[0] && onOpen(products[0].id)} className="text-[10px] font-extrabold text-[#0035b9]">Manage all</button></div>
        <div className="divide-y divide-[#2c3038]/7">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 p-4 sm:gap-5 sm:px-5">
              <ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1"><strong className="block truncate text-xs sm:text-sm">{product.name}</strong><p className="mt-1 truncate text-[10px] text-[#8c9498]">{product.sku} · {product.videos.length} video · {product.faqs.length} FAQ</p></div>
              <span className={`hidden rounded-full px-2.5 py-1 text-[9px] font-extrabold sm:block ${product.archived ? "bg-[#edf0f2] text-[#68757e]" : product.published ? "bg-[#e9f5ed] text-[#427a56]" : "bg-[#f2eee7] text-[#8d7456]"}`}>{product.archived ? "ARCHIVED" : product.published ? "PUBLISHED" : "DRAFT"}</span>
              <button type="button" onClick={() => onOpen(product.id, "qr")} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#0035b9]/20 px-3 text-xs font-extrabold text-[#0035b9] transition hover:bg-[#edf4ff]" aria-label={`Product QR for ${product.name}, SKU ${product.sku}`}><QrCode className="size-4" /><span className="hidden sm:inline">Product QR</span></button>
              <button type="button" onClick={() => onOpen(product.id)} className="grid size-9 place-items-center rounded-full border border-[#2c3038]/9 text-[#6d787e] transition hover:border-[#0035b9]/30 hover:text-[#0035b9]" aria-label={`Manage ${product.name}`}><ChevronRight className="size-4" /></button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
