"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  FileQuestion,
  Gauge,
  ImageIcon,
  MonitorPlay,
  PackagePlus,
  QrCode,
  Search,
  TicketCheck,
  X,
} from "lucide-react";
import { ProductVisual } from "@/features/catalog/components/product-visual";
import { getPrimaryProductImage } from "@/features/catalog/model/product-utils";
import type { Product } from "@/features/catalog/model/types";
import type { EditorTab } from "@/features/catalog/model/editor-types";
import type { IconType } from "@/shared/lib/icon-types";

type ProductFilter = "all" | "published" | "draft" | "archived";

const PAGE_SIZE = 8;

function productStatus(product: Product): Exclude<ProductFilter, "all"> {
  if (product.archived) return "archived";
  return product.published ? "published" : "draft";
}

export function Overview({
  products,
  publishedCount,
  totalVideos,
  totalFaqs,
  ticketCount,
  onAdd,
  onOpen,
  onManageProducts,
}: {
  products: Product[];
  publishedCount: number;
  totalVideos: number;
  totalFaqs: number;
  ticketCount: number;
  onAdd: () => void;
  onOpen: (id: string, tab?: EditorTab) => void;
  onManageProducts: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchInput = useRef<HTMLInputElement>(null);
  const formatCount = (count: number) => new Intl.NumberFormat("en").format(count);
  const archivedCount = products.filter((product) => product.archived).length;
  const draftCount = products.length - publishedCount - archivedCount;

  const stats: Array<{ label: string; value: number; icon: IconType; style: string; note: string }> = [
    { label: "Published Products", value: publishedCount, icon: Gauge, style: "bg-[#e8f0ff] text-[#0035b9]", note: `of ${formatCount(products.length)} total` },
    { label: "Tutorial Videos", value: totalVideos, icon: MonitorPlay, style: "bg-[#e7f4f8] text-[#25647a]", note: "across all guides" },
    { label: "FAQ Answers", value: totalFaqs, icon: CircleHelp, style: "bg-[#e8f4eb] text-[#34704a]", note: "ready for customers" },
    { label: "Open Tickets", value: ticketCount, icon: TicketCheck, style: "bg-[#fff0df] text-[#96531f]", note: "need attention" },
  ];

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (filter !== "all" && productStatus(product) !== filter) return false;
      return !query || `${product.name} ${product.model} ${product.sku}`.toLowerCase().includes(query);
    });
  }, [filter, products, search]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hiddenCount = filteredProducts.length - visibleProducts.length;
  const filters: Array<{ value: ProductFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: products.length },
    { value: "published", label: "Published", count: publishedCount },
    { value: "draft", label: "Draft", count: draftCount },
    { value: "archived", label: "Archived", count: archivedCount },
  ];

  function changeFilter(value: ProductFilter) {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  function changeSearch(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  function clearSearch() {
    changeSearch("");
    searchInput.current?.focus();
  }

  return (
    <div className="min-w-0 [&_button]:touch-manipulation [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#0035b9] [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-[#0035b9]">
      <section aria-labelledby="overview-title" className="rounded-2xl border border-[#dfe4eb] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#0035b9]">CONTENT OVERVIEW</p>
            <h2 id="overview-title" className="mt-2 text-pretty text-3xl font-extrabold tracking-[-0.045em] text-[#172b4d] sm:text-4xl">Keep Every Product Guide Ready</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#637086]">Review your catalog, open a product guide, and keep customer help content up to date.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onManageProducts} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-bold text-[#34445e] transition-colors hover:border-[#0035b9] hover:bg-[#edf4ff] hover:text-[#0035b9]"><BookOpen aria-hidden="true" className="size-4" /> Manage Products</button>
            <button type="button" onClick={onAdd} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0035b9] px-4 text-xs font-bold text-white shadow-[0_8px_20px_rgba(0,53,185,0.18)] transition-colors hover:bg-[#002b96]"><PackagePlus aria-hidden="true" className="size-4" /> Add Product</button>
          </div>
        </div>
      </section>

      <section aria-labelledby="catalog-summary-title" className="mt-5">
        <h2 id="catalog-summary-title" className="sr-only">Catalog Summary</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, style, note }) => (
            <article key={label} className="min-w-0 rounded-2xl border border-[#dfe4eb] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${style}`}><Icon aria-hidden="true" className="size-5" /></span>
                <span className="text-3xl font-extrabold tracking-[-0.04em] text-[#172b4d] tabular-nums">{formatCount(value)}</span>
              </div>
              <p className="mt-4 text-sm font-bold text-[#34445e]">{label}</p>
              <p className="mt-1 text-xs text-[#637086]">{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="product-library-title" className="mt-5 overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white shadow-sm">
        <div className="border-b border-[#e3e8ef] p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="product-library-title" className="text-xl font-extrabold tracking-[-0.025em] text-[#172b4d]">Product Library</h2>
              <p className="mt-1 text-xs leading-5 text-[#637086]">Choose a product, then open its content editor or QR tools.</p>
            </div>
            <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-[#dfe4eb] bg-[#f8fafc] px-3 focus-within:border-[#0035b9] focus-within:ring-2 focus-within:ring-[#0035b9]/10 lg:max-w-sm">
              <Search aria-hidden="true" className="size-4 shrink-0 text-[#637086]" />
              <span className="sr-only">Search products</span>
              <input ref={searchInput} name="overview-product-search" type="search" autoComplete="off" spellCheck={false} value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Name, model, or SKU…" className="min-w-0 w-full bg-transparent text-base outline-none placeholder:text-[#637086] sm:text-sm [&::-webkit-search-cancel-button]:hidden" />
              {search && <button type="button" onClick={clearSearch} aria-label="Clear overview product search" className="grid min-h-11 w-8 shrink-0 place-items-center rounded-lg text-[#637086] transition-colors hover:text-[#0035b9]"><X aria-hidden="true" className="size-4" /></button>}
            </label>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label="Filter products by status" className="grid grid-cols-2 gap-1 rounded-xl bg-[#f1f4f8] p-1 sm:flex">
              {filters.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => changeFilter(item.value)} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${filter === item.value ? "bg-white text-[#0035b9] shadow-sm" : "text-[#53657c] hover:bg-white/70 hover:text-[#0035b9]"}`}>{item.label}<span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${filter === item.value ? "bg-[#edf4ff]" : "bg-[#e3e8ef]"}`}>{formatCount(item.count)}</span></button>)}
            </div>
            <p role="status" aria-live="polite" className="shrink-0 text-xs text-[#637086] tabular-nums">Showing {formatCount(visibleProducts.length)} of {formatCount(filteredProducts.length)}</p>
          </div>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
            {visibleProducts.map((product) => {
              const status = productStatus(product);
              const statusLabel = status === "published" ? "Published" : status === "archived" ? "Archived" : "Draft";
              return (
                <article key={product.id} className="min-w-0 rounded-xl border border-[#e3e8ef] bg-white p-3 transition-colors hover:border-[#9eb7ed] hover:bg-[#fbfcff] sm:p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <ProductVisual compact tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="size-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0"><h3 translate="no" className="line-clamp-2 break-words text-sm font-bold leading-5 text-[#172b4d]">{product.name}</h3><p translate="no" className="mt-1 truncate text-xs text-[#637086]">{product.sku}{product.model ? ` · ${product.model}` : ""}</p></div>
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${status === "published" ? "bg-[#e7f4eb] text-[#286440]" : status === "archived" ? "bg-[#e9edf2] text-[#53657c]" : "bg-[#fff0d8] text-[#845413]"}`}><span aria-hidden="true" className="size-1 rounded-full bg-current" />{statusLabel}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#53657c]">
                        <span className="inline-flex items-center gap-1"><ImageIcon aria-hidden="true" className="size-3.5" /> {formatCount(product.images.length)} images</span>
                        <span className="inline-flex items-center gap-1"><MonitorPlay aria-hidden="true" className="size-3.5" /> {formatCount(product.videos.length)} videos</span>
                        <span className="inline-flex items-center gap-1"><FileQuestion aria-hidden="true" className="size-3.5" /> {formatCount(product.faqs.length)} FAQs</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-[#e8ecf1] pt-3">
                    <button type="button" onClick={() => onOpen(product.id)} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-[#edf4ff] px-3 text-xs font-bold text-[#0035b9] transition-colors hover:bg-[#0035b9] hover:text-white" aria-label={`Edit guide for ${product.name}, SKU ${product.sku}`}>Edit Guide <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></button>
                    <button type="button" onClick={() => onOpen(product.id, "qr")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d8e0ea] px-3 text-xs font-bold text-[#34445e] transition-colors hover:border-[#0035b9] hover:bg-[#edf4ff] hover:text-[#0035b9]" aria-label={`Open QR tools for ${product.name}, SKU ${product.sku}`}><QrCode aria-hidden="true" className="size-4" /><span className="sm:hidden">QR</span><span className="hidden sm:inline">QR Tools</span></button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <FileQuestion aria-hidden="true" className="mx-auto size-9 text-[#8994a5]" />
            <h3 className="mt-4 text-base font-bold text-[#172b4d]">{products.length === 0 ? "Your Catalog Starts Here" : "No Products Found"}</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#637086]">{products.length === 0 ? "Add your first product to create tutorials, FAQs, and QR-based help content." : "Try another search or choose a different publication status."}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {products.length === 0 ? <button type="button" onClick={onAdd} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0035b9] px-4 text-xs font-bold text-white transition-colors hover:bg-[#002b96]"><PackagePlus aria-hidden="true" className="size-4" /> Add Product</button> : <button type="button" onClick={() => { clearSearch(); changeFilter("all"); }} className="min-h-11 rounded-lg bg-[#edf4ff] px-4 text-xs font-bold text-[#0035b9] transition-colors hover:bg-[#dce8ff]">Show All Products</button>}
            </div>
          </div>
        )}

        {hiddenCount > 0 && <div className="border-t border-[#e3e8ef] p-4 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="min-h-11 rounded-lg border border-[#cbd5e1] px-4 text-xs font-bold text-[#34445e] transition-colors hover:border-[#0035b9] hover:bg-[#edf4ff] hover:text-[#0035b9]">Show {formatCount(Math.min(PAGE_SIZE, hiddenCount))} More Products</button></div>}
      </section>
    </div>
  );
}
