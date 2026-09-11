"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  MessageCircle,
  Play,
  Search,
} from "lucide-react";
import { HomeHero } from "@/features/catalog/components/home-hero";
import { useContent } from "@/features/catalog/hooks/use-content";
import { ProductVisual } from "@/features/catalog/components/product-visual";
import { SiteHeader } from "@/shared/components/site-header";
import { getPrimaryProductImage } from "@/features/catalog/model/product-utils";
import { getWhatsappUrl } from "@/shared/lib/whatsapp";

export function HomePage() {
  const { content } = useContent();
  const [query, setQuery] = useState("");
  const publishedProducts = content.products.filter((product) => product.published && !product.archived);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return publishedProducts;
    return publishedProducts.filter((product) =>
      `${product.name} ${product.model} ${product.sku}`.toLowerCase().includes(normalized),
    );
  }, [publishedProducts, query]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#ffffff] text-[#2c3038]">
      <SiteHeader />

      <main>
        <HomeHero whatsappNumber={content.whatsappNumber} />

        <section id="produk" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">START HERE</p>
                <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">Choose the product you use</h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#687279] sm:text-base">Match the product name and appearance with the one you have.</p>
              </div>
              <label className="flex h-12 w-full items-center gap-3 rounded-full border border-[#2c3038]/10 bg-white px-5 shadow-sm focus-within:border-[#0035b9]/40 focus-within:ring-4 focus-within:ring-[#0035b9]/8 lg:w-[340px]">
                <Search className="size-4 text-[#899197]" />
                <span className="sr-only">Search product names</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search product names..."
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#a0a7ab]"
                />
              </label>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/produk/${product.slug}`}
                  className="product-card group overflow-hidden rounded-[28px] border border-[#2c3038]/9 bg-white p-2 shadow-[0_12px_35px_rgba(44,48,56,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_50px_rgba(44,48,56,0.12)]"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-56 rounded-[22px]" />
                  <div className="p-5">
                    <p className="text-[10px] font-extrabold tracking-[0.15em] text-[#0035b9]">{product.sku.toUpperCase()} · {product.model.toUpperCase()}</p>
                    <h3 className="mt-2 text-xl font-extrabold tracking-[-0.025em]">{product.name}</h3>
                    <p className="mt-2 min-h-10 text-sm leading-5 text-[#758087]">{product.description}</p>
                    <span className="mt-5 flex items-center justify-between border-t border-[#2c3038]/8 pt-4 text-sm font-extrabold">
                      Open guide
                      <span className="grid size-9 place-items-center rounded-full bg-[#edf3ff] text-[#0035b9] transition group-hover:bg-[#0035b9] group-hover:text-white"><ChevronRight className="size-4" /></span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="mt-10 rounded-[28px] border border-dashed border-[#2c3038]/15 bg-white px-6 py-14 text-center">
                <CircleHelp className="mx-auto size-9 text-[#0035b9]" />
                <h3 className="mt-4 text-lg font-extrabold">{publishedProducts.length === 0 ? "The help catalog is being prepared" : "No products found"}</h3>
                <p className="mt-2 text-sm text-[#737d83]">{publishedProducts.length === 0 ? "Synchronized products will appear after an administrator publishes their guides." : "Check the SKU or ask support for help."}</p>
              </div>
            )}
          </div>
        </section>

        <section id="bantuan" className="bg-[#1d426c] px-5 py-20 text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="eyebrow text-[#73d4f4]">CLEAR GUIDANCE</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">From uncertainty to confidence.</h2>
                <p className="mt-5 max-w-lg text-sm leading-7 text-white/62 sm:text-base">Each guide is concise and focuses on the issues customers encounter most often.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  [Play, "Watch", "Videos play directly on the Gascomp page."],
                  [BookOpenCheck, "Follow", "Short steps that are easy to verify."],
                  [MessageCircle, "Ask", "Contact support if the issue remains."],
                ].map(([Icon, title, copy], index) => {
                  const ItemIcon = Icon as typeof Play;
                  return (
                    <div key={title as string} className="rounded-[24px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm">
                      <span className="mb-8 grid size-10 place-items-center rounded-full bg-white/10 text-[#73d4f4]"><ItemIcon className="size-4" /></span>
                      <span className="text-[10px] font-bold text-white/35">0{index + 1}</span>
                      <h3 className="mt-1 text-lg font-extrabold">{title as string}</h3>
                      <p className="mt-2 text-xs leading-5 text-white/55">{copy as string}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="hubungi" className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#0035b9] px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14 lg:py-12">
            <div>
              <p className="text-xs font-extrabold tracking-[0.14em] text-white/65">STILL NEED HELP?</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] sm:text-4xl">Our support team is ready to help.</h2>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/75"><Clock3 className="size-4" /> {content.supportHours}</p>
            </div>
            <a
              href={getWhatsappUrl(content.whatsappNumber)}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-extrabold text-[#002b96] shadow-lg transition hover:-translate-y-0.5 lg:mt-0 lg:w-auto"
            >
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2c3038]/8 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-[#7d868b] sm:flex-row sm:items-center sm:justify-between">
          <strong className="text-[#2c3038]">GASCOMP · Product Help Center</strong>
          <span>© {new Date().getFullYear()} Gascomp. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
