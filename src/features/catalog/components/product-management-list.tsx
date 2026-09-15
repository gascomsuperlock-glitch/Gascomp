"use client";

import { useRef, useState } from "react";
import { Archive, Check, CheckSquare, ChevronRight, Package, Plus, Search, X } from "lucide-react";
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
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const query = search.trim().toLowerCase();
  const visibleProducts = products.filter((product) => `${product.name} ${product.model} ${product.sku}`.toLowerCase().includes(query));
  const selectedProducts = products.filter((product) => selectedIds.has(product.id));
  const visibleSelectedCount = visibleProducts.filter((product) => selectedIds.has(product.id)).length;
  const hasSelection = selectedProducts.length > 0;
  const targets = hasSelection ? selectedProducts : visibleProducts;
  const allSelected = visibleProducts.length > 0 && visibleSelectedCount === visibleProducts.length;
  const scope = hasSelection ? "selected" : query ? "results" : "all";
  const publishCount = targets.filter((product) => canChangeProductStatus(product, "published")).length;
  const archiveCount = targets.filter((product) => canChangeProductStatus(product, "archived")).length;
  const formatCount = (count: number) => new Intl.NumberFormat("en").format(count);

  function changeSearch(value: string) {
    setSearch(value);
    setSelectedIds(new Set());
    setNotice("");
  }

  function applyStatus(status: BulkProductStatus) {
    const count = status === "published" ? publishCount : archiveCount;
    if (saving || count === 0) return;
    onBulkStatus(new Set(targets.map((product) => product.id)), status);
    setNotice(`${formatCount(count)} ${count === 1 ? "product" : "products"} marked as ${status}. Select Save to apply changes.`);
  }

  return (
    <aside aria-labelledby="product-list-heading" className="min-w-0 overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white shadow-sm [&_button]:touch-manipulation [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#0035b9] [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-[#0035b9]">
      <div className="border-b border-[#e8ecf1] p-4">
        <div className="flex items-center justify-between gap-3">
          <div><h2 id="product-list-heading" className="text-base font-extrabold text-[#172b4d]">Products <span className="ml-1 rounded-md bg-[#edf2fa] px-2 py-1 text-xs font-bold text-[#53657c] tabular-nums">{formatCount(products.length)}</span></h2><p className="mt-1 text-xs leading-5 text-[#637086]">Choose a product to edit its guide.</p></div>
          <button type="button" onClick={onAdd} disabled={saving} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0035b9] px-3 text-xs font-bold text-white hover:bg-[#002b96] disabled:opacity-40" aria-label="Add product"><Plus aria-hidden="true" className="size-4" /> Add</button>
        </div>
        <div className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-[#dfe4eb] bg-[#f8fafc] px-3 focus-within:border-[#0035b9] focus-within:ring-2 focus-within:ring-[#0035b9]/10">
          <Search aria-hidden="true" className="size-4 shrink-0 text-[#637086]" />
          <label className="sr-only" htmlFor="admin-product-search">Search products</label>
          <input ref={searchInput} id="admin-product-search" name="product-search" type="search" autoComplete="off" spellCheck={false} value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Name, model, or SKU…" className="min-w-0 w-full bg-transparent text-base outline-none placeholder:text-[#637086] sm:text-sm [&::-webkit-search-cancel-button]:hidden" />
          {search && <button type="button" aria-label="Clear product search" onClick={() => { changeSearch(""); searchInput.current?.focus(); }} className="grid min-h-11 w-8 shrink-0 place-items-center rounded-lg text-[#53657c] hover:text-[#0035b9]"><X aria-hidden="true" className="size-4" /></button>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p role="status" className="text-xs text-[#637086] tabular-nums">{formatCount(visibleProducts.length)} {visibleProducts.length === 1 ? "product" : "products"}{query ? " found" : " available"}</p>
          <button type="button" aria-expanded={bulkMode} aria-controls="product-bulk-actions" disabled={saving} onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); setNotice(""); }} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold disabled:opacity-40 ${bulkMode ? "bg-[#edf4ff] text-[#0035b9]" : "text-[#53657c] hover:bg-[#edf4ff] hover:text-[#0035b9]"}`}><CheckSquare aria-hidden="true" className="size-4" />{bulkMode ? "Done Selecting" : "Bulk Actions"}</button>
        </div>
      </div>
      <div id="product-bulk-actions" hidden={!bulkMode} className="border-b border-[#dfe4eb] bg-[#f4f7ff] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold text-[#172b4d]">
            <input type="checkbox" aria-label={query ? "Select all search results" : "Select all products"} checked={allSelected} ref={(input) => { if (input) input.indeterminate = visibleSelectedCount > 0 && !allSelected; }} disabled={!visibleProducts.length || saving} onChange={() => { setSelectedIds(allSelected ? new Set() : new Set(visibleProducts.map((product) => product.id))); setNotice(""); }} className="size-4 accent-[#0035b9]" />
            {query ? "Select Results" : "Select All"}
          </label>
          {hasSelection && <button type="button" disabled={saving} onClick={() => { setSelectedIds(new Set()); setNotice(""); }} className="min-h-11 text-xs font-bold text-[#0035b9] hover:underline disabled:opacity-40">Clear Selection</button>}
        </div>
        <p className="mb-3 text-xs leading-5 text-[#53657c]">{hasSelection ? `${formatCount(selectedProducts.length)} selected` : `${formatCount(visibleProducts.length)} ${query ? "matching" : "total"} products`}. Actions affect {scope === "selected" ? "selected products only" : scope === "results" ? "all search results" : "all products"}.</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={saving || !publishCount} onClick={() => applyStatus("published")} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-[#0035b9] px-2 text-xs font-bold text-white hover:bg-[#002b96] disabled:cursor-not-allowed disabled:opacity-40"><Check aria-hidden="true" className="size-3.5 shrink-0" />Publish {scope} ({formatCount(publishCount)})</button>
          <button type="button" disabled={saving || !archiveCount} onClick={() => applyStatus("archived")} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2 text-xs font-bold text-[#34445e] hover:border-[#0035b9] hover:text-[#0035b9] disabled:cursor-not-allowed disabled:opacity-40"><Archive aria-hidden="true" className="size-3.5 shrink-0" />Archive {scope} ({formatCount(archiveCount)})</button>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-[#53657c]">Archive keeps existing QR links active and skips unpublished drafts. Select Save to apply changes.</p>
        <p role="status" className="mt-2 text-xs font-bold leading-5 text-[#0035b9] empty:hidden">{notice}</p>
      </div>
      <div className="max-h-[60vh] space-y-1 overflow-y-auto overscroll-contain p-2 xl:max-h-[calc(100dvh-24rem)]">
        {visibleProducts.map((product) => {
          const active = activeId === product.id;
          const status = product.archived ? "Archived" : product.published ? "Published" : "Draft";
          return <div key={product.id} className={`flex min-w-0 items-center rounded-xl border ${active ? "border-[#0035b9]/25 bg-[#edf4ff]" : "border-transparent hover:border-[#dfe4eb] hover:bg-[#f8fafc]"}`}>
            {bulkMode && <label className="flex min-h-14 min-w-11 cursor-pointer items-center justify-center">
              <input type="checkbox" aria-label={`Select ${product.name}, SKU ${product.sku}`} checked={selectedIds.has(product.id)} disabled={saving} onChange={(event) => {
                const checked = event.target.checked;
                setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(product.id); else next.delete(product.id); return next; });
                setNotice("");
              }} className="size-4 accent-[#0035b9]" />
            </label>}
            <button type="button" onClick={() => onOpen(product.id)} aria-label={`Edit ${product.name}, SKU ${product.sku}`} aria-pressed={active} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 text-left">
              <ProductVisual compact tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-12 w-12 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1"><strong translate="no" className={`line-clamp-2 break-words text-sm leading-5 ${active ? "text-[#0035b9]" : "text-[#172b4d]"}`}>{product.name}</strong><small translate="no" className="mt-1 block truncate text-xs text-[#53657c]">{product.sku}</small><span className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${product.archived ? "bg-[#e9edf2] text-[#53657c]" : product.published ? "bg-[#e7f4eb] text-[#286440]" : "bg-[#fff0d8] text-[#845413]"}`}><span aria-hidden="true" className="size-1 rounded-full bg-current" />{status}</span></span>
              <ChevronRight aria-hidden="true" className={`size-4 shrink-0 ${active ? "text-[#0035b9]" : "text-[#8994a5]"}`} />
            </button>
          </div>;
        })}
        {!visibleProducts.length && <div className="px-4 py-10 text-center"><Package aria-hidden="true" className="mx-auto size-8 text-[#8994a5]" /><h3 className="mt-3 text-sm font-bold text-[#172b4d]">{products.length ? "No Products Found" : "Your Catalog Starts Here"}</h3><p className="mt-2 text-xs leading-5 text-[#637086]">{products.length ? "Try another product name, model, or SKU." : "Add your first product to create a help guide."}</p>{search && <button type="button" onClick={() => { changeSearch(""); searchInput.current?.focus(); }} className="mt-3 min-h-11 rounded-lg px-3 text-xs font-bold text-[#0035b9] hover:bg-[#edf4ff]">Clear Search</button>}</div>}
      </div>
    </aside>
  );
}
