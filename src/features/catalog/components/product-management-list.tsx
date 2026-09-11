"use client";

import { useState } from "react";
import { Archive, Check, ChevronRight, Plus, Search } from "lucide-react";
import { ProductVisual } from "./product-visual";
import { getPrimaryProductImage } from "../model/product-utils";
import { canChangeProductStatus, type BulkProductStatus } from "../model/bulk-product-status";
import type { Product } from "../model/types";

export function ProductManagementList({ products, activeId, saving, onAdd, onOpen, onBulkStatus }: {
  products: Product[];
  activeId?: string;
  saving: boolean;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onBulkStatus: (ids: ReadonlySet<string>, status: BulkProductStatus) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const query = search.trim().toLowerCase();
  const visibleProducts = products.filter((product) => `${product.name} ${product.model} ${product.sku}`.toLowerCase().includes(query));
  const selectedProducts = products.filter((product) => selectedIds.has(product.id));
  const visibleSelectedCount = visibleProducts.filter((product) => selectedIds.has(product.id)).length;
  const hasSelection = selectedIds.size > 0;
  const targets = hasSelection ? selectedProducts : visibleProducts;
  const allSelected = visibleProducts.length > 0 && visibleSelectedCount === visibleProducts.length;
  const scope = hasSelection ? "selected" : query ? "results" : "all";
  const publishCount = targets.filter((product) => canChangeProductStatus(product, "published")).length;
  const archiveCount = targets.filter((product) => canChangeProductStatus(product, "archived")).length;

  function applyStatus(status: BulkProductStatus) {
    const count = status === "published" ? publishCount : archiveCount;
    if (saving || count === 0) return;
    onBulkStatus(new Set(targets.map((product) => product.id)), status);
    setNotice(`${count} ${count === 1 ? "product" : "products"} marked as ${status}. Select Save to apply changes.`);
  }

  return (
    <aside className="min-w-0 self-start rounded-[22px] border border-[#2c3038]/8 bg-white p-3 shadow-sm xl:sticky xl:top-[88px]">
      <div className="flex items-center justify-between px-2 pb-3 pt-1">
        <div><p className="text-[10px] font-extrabold tracking-[0.13em] text-[#8a9297]">PRODUCTS</p><p className="mt-1 text-xs font-bold text-[#69747a]">{products.length} models</p></div>
        <button type="button" onClick={onAdd} className="grid size-9 place-items-center rounded-full bg-[#0035b9] text-white" aria-label="Add product"><Plus className="size-4" /></button>
      </div>
      <label className="mb-2 flex h-9 items-center gap-2 rounded-xl bg-[#f4f3ef] px-3">
        <Search className="size-3.5 text-[#8d9599]" />
        <input aria-label="Search products" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedIds(new Set()); setNotice(""); }} placeholder="Search name, model or SKU" className="min-w-0 w-full bg-transparent text-xs font-medium outline-none" />
      </label>
      <div className="mb-3 space-y-3 rounded-xl border border-[#2c3038]/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex min-h-7 cursor-pointer items-center gap-2 text-xs font-bold">
            <input type="checkbox" aria-label={query ? "Select all search results" : "Select all products"} checked={allSelected} ref={(input) => { if (input) input.indeterminate = visibleSelectedCount > 0 && !allSelected; }} disabled={!visibleProducts.length || saving} onChange={() => { setSelectedIds(allSelected ? new Set() : new Set(visibleProducts.map((product) => product.id))); setNotice(""); }} className="size-4 accent-[#0035b9]" />
            {query ? "Select results" : "Select all"}
          </label>
          {hasSelection && <button type="button" disabled={saving} onClick={() => { setSelectedIds(new Set()); setNotice(""); }} className="text-[11px] font-bold text-[#0035b9] disabled:opacity-50">Clear selection</button>}
        </div>
        <p className="text-[11px] leading-4 text-[#69747a]">{hasSelection ? `${selectedProducts.length} selected` : `${visibleProducts.length} ${query ? "matching" : "total"} products`}. Actions affect {scope === "selected" ? "selected products only" : scope === "results" ? "all search results" : "all products"}.</p>
        {selectedProducts.length > visibleSelectedCount && <p className="text-[11px] leading-4 text-[#69747a]">{selectedProducts.length - visibleSelectedCount} selected products are outside the current search results.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving || !publishCount} onClick={() => applyStatus("published")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0035b9] px-3 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"><Check className="size-3.5" />Publish {scope} ({publishCount})</button>
          <button type="button" disabled={saving || !archiveCount} onClick={() => applyStatus("archived")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#2c3038]/15 px-3 text-[11px] font-extrabold disabled:cursor-not-allowed disabled:opacity-40"><Archive className="size-3.5" />Archive {scope} ({archiveCount})</button>
        </div>
        <p className="text-[10px] leading-4 text-[#69747a]">Archive skips products that have never been published. Existing QR links stay active. Changes take effect after Save.</p>
        <p role="status" className="text-[11px] font-bold leading-4 text-[#0035b9] empty:hidden">{notice}</p>
      </div>
      <div className="max-h-[60vh] space-y-1 overflow-auto">
        {visibleProducts.map((product) => (
          <div key={product.id} className={`flex items-center gap-1 rounded-xl ${activeId === product.id ? "bg-[#edf4ff]" : "hover:bg-[#f6f5f1]"}`}>
            <label className="flex min-h-11 cursor-pointer items-center p-2">
              <input type="checkbox" aria-label={`Select ${product.name}, SKU ${product.sku}`} checked={selectedIds.has(product.id)} disabled={saving} onChange={(event) => {
                const checked = event.target.checked;
                setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(product.id); else next.delete(product.id); return next; });
                setNotice("");
              }} className="size-4 accent-[#0035b9]" />
            </label>
            <button type="button" onClick={() => onOpen(product.id)} aria-label={`Edit ${product.name}, SKU ${product.sku}`} aria-pressed={activeId === product.id} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-2 pr-2 text-left">
              <ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-10 w-10 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{product.name}</strong><small className={`mt-1 block truncate text-[9px] font-bold ${product.archived ? "text-[#69747b]" : product.published ? "text-[#45815a]" : "text-[#9a7a55]"}`}>{product.sku} · {product.archived ? "Archived" : product.published ? "Published" : "Draft"}</small></span>
              <ChevronRight className="size-3.5 shrink-0 text-[#9aa1a5]" />
            </button>
          </div>
        ))}
        {!visibleProducts.length && <p className="px-2 py-6 text-center text-xs leading-5 text-[#69747a]">{products.length ? "No products match your search. Try another name, model or SKU." : "No products yet. Add a product to get started."}</p>}
      </div>
    </aside>
  );
}
