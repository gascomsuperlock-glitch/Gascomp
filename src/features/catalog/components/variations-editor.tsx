"use client";

import { Plus, Trash2 } from "lucide-react";
import { createId } from "@/shared/lib/create-id";
import type { Product } from "@/features/catalog/model/types";

export function VariationsEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  function addVariation() {
    update((current) => ({ ...current, variations: [...current.variations, { id: createId("variation"), name: "New variation", sku: `${current.sku}-VAR` }] }));
  }

  function deleteVariation(variationId: string) {
    update((current) => ({
      ...current,
      variations: current.variations.filter((variation) => variation.id !== variationId),
      images: current.images.map((image) => image.variationId === variationId ? { ...image, variationId: undefined } : image),
    }));
  }

  return (
    <div className="mt-8 border-t border-[#2c3038]/8 pt-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-extrabold">Product variations</p><p className="mt-1 text-[10px] leading-4 text-[#818a8f]">Add variations when a product has multiple SKUs or options.</p></div><button type="button" onClick={addVariation} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#0035b9]/20 bg-[#f4f7ff] px-3 text-[10px] font-extrabold text-[#0035b9]"><Plus className="size-3" /> Add variation</button></div>
      {product.variations.length > 0 ? <div className="mt-4 space-y-2">{product.variations.map((variation) => <div key={variation.id} className="grid gap-2 rounded-xl bg-[#f6f7f8] p-3 sm:grid-cols-[1fr_1fr_auto]"><input value={variation.name} onChange={(event) => update((current) => ({ ...current, variations: current.variations.map((item) => item.id === variation.id ? { ...item, name: event.target.value } : item) }))} aria-label="Variation name" className="h-10 rounded-lg border border-[#2c3038]/9 bg-white px-3 text-xs font-semibold outline-none focus:border-[#0035b9]/40" /><input value={variation.sku} onChange={(event) => update((current) => ({ ...current, variations: current.variations.map((item) => item.id === variation.id ? { ...item, sku: event.target.value } : item) }))} aria-label="Variation SKU" className="h-10 rounded-lg border border-[#2c3038]/9 bg-white px-3 text-xs font-semibold outline-none focus:border-[#0035b9]/40" /><button type="button" onClick={() => deleteVariation(variation.id)} className="grid size-10 place-items-center rounded-lg bg-[#fff0ef] text-[#b33b31]" aria-label={`Delete variation ${variation.name}`}><Trash2 className="size-3.5" /></button></div>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-[#2c3038]/12 p-4 text-center text-[10px] text-[#8b9397]">This product has no variations.</p>}
    </div>
  );
}
