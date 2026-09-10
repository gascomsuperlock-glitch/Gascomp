"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  MessageCircle,
  Play,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useContent } from "@/components/content-provider";
import { ProductVisual } from "@/components/product-visual";
import { SiteHeader } from "@/components/site-header";
import { getPrimaryProductImage, getWhatsappUrl } from "@/lib/content";

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
        <section className="relative border-b border-[#2c3038]/8 bg-[#f8fafc]">
          <div className="pointer-events-none absolute -left-48 top-0 size-[430px] rounded-full bg-[#dbe8ff]/70 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
            <div className="animate-rise">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0035b9]/15 bg-[#eef4ff] px-3 py-1.5 text-xs font-bold tracking-wide text-[#0035b9]">
                <Sparkles className="size-3.5" />
                PANDUAN RESMI PRODUK GASCOMP
              </div>
              <h1 className="max-w-3xl text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[1.12] tracking-[-0.04em] text-[#2c3038]">
                Pakai produknya
                <span className="block text-[#0035b9]">tanpa ragu.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-[#5f696f] sm:text-lg sm:leading-8">
                Temukan video tutorial, solusi kendala, dan jawaban cepat untuk produk Gascomp yang kamu gunakan.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#produk"
                  className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-6 text-sm font-extrabold text-white shadow-[0_14px_35px_rgba(13,79,215,0.24)] transition hover:-translate-y-0.5 hover:bg-[#002b96]"
                >
                  Pilih produk saya
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </a>
                <a
                  href={getWhatsappUrl(content.whatsappNumber)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-[#2c3038]/12 bg-white px-6 text-sm font-extrabold text-[#2c3038] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <MessageCircle className="size-4 text-[#2d9f5b]" />
                  Tanya admin
                </a>
              </div>

              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[#657077]">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#4f8967]" /> Tanpa perlu login</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#4f8967]" /> Panduan langkah demi langkah</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[540px] animate-rise-delayed lg:justify-self-end">
              <div className="absolute -right-8 -top-9 hidden rounded-2xl border border-[#2c3038]/8 bg-white px-4 py-3 shadow-xl sm:flex sm:items-center sm:gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-[#e9f5ed] text-[#43815b]"><ShieldCheck className="size-4" /></span>
                <span><strong className="block text-xs">Panduan aman</strong><small className="text-[10px] text-[#7b858a]">Dari tim Gascomp</small></span>
              </div>
              <div className="rounded-[32px] border border-[#2c3038]/10 bg-white p-3 shadow-[0_35px_80px_rgba(35,56,71,0.16)] sm:p-4">
                <div className="overflow-hidden rounded-[24px] bg-[#eef3fb]">
                  <div className="flex items-center justify-between border-b border-[#2c3038]/8 px-5 py-4">
                    <div>
                      <span className="text-[10px] font-extrabold tracking-[0.16em] text-[#0035b9]">LANGKAH 01</span>
                      <p className="mt-1 text-sm font-extrabold">Kenali produkmu</p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-full bg-white text-[#0035b9] shadow-sm"><Play className="size-4 fill-current" /></span>
                  </div>
                  <ProductVisual tone="orange" className="h-[270px] sm:h-[315px]" />
                  <div className="grid grid-cols-3 gap-px bg-[#2c3038]/8">
                    {[
                      [BookOpenCheck, "Tutorial"],
                      [CircleHelp, "Solusi"],
                      [MessageCircle, "Admin"],
                    ].map(([Icon, label]) => {
                      const ItemIcon = Icon as typeof BookOpenCheck;
                      return (
                        <div key={label as string} className="flex items-center justify-center gap-2 bg-white px-2 py-4 text-[11px] font-bold text-[#59656b]">
                          <ItemIcon className="size-4 text-[#0035b9]" /> {label as string}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-5 hidden items-center gap-3 rounded-2xl border border-[#2c3038]/8 bg-[#2c3038] px-4 py-3 text-white shadow-xl sm:flex">
                <span className="grid size-9 place-items-center rounded-full bg-white/10"><Smartphone className="size-4" /></span>
                <span><strong className="block text-xs">Scan. Lihat. Beres.</strong><small className="text-[10px] text-white/60">Langsung dari kemasan</small></span>
              </div>
            </div>
          </div>
        </section>

        <section id="produk" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">MULAI DI SINI</p>
                <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">Pilih produk yang kamu gunakan</h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#687279] sm:text-base">Cocokkan nama dan bentuk produk dengan yang ada di rumah.</p>
              </div>
              <label className="flex h-12 w-full items-center gap-3 rounded-full border border-[#2c3038]/10 bg-white px-5 shadow-sm focus-within:border-[#0035b9]/40 focus-within:ring-4 focus-within:ring-[#0035b9]/8 lg:w-[340px]">
                <Search className="size-4 text-[#899197]" />
                <span className="sr-only">Cari nama produk</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama produk..."
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
                      Buka panduan
                      <span className="grid size-9 place-items-center rounded-full bg-[#edf3ff] text-[#0035b9] transition group-hover:bg-[#0035b9] group-hover:text-white"><ChevronRight className="size-4" /></span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="mt-10 rounded-[28px] border border-dashed border-[#2c3038]/15 bg-white px-6 py-14 text-center">
                <CircleHelp className="mx-auto size-9 text-[#0035b9]" />
                <h3 className="mt-4 text-lg font-extrabold">{publishedProducts.length === 0 ? "Katalog bantuan sedang disiapkan" : "Produk belum ditemukan"}</h3>
                <p className="mt-2 text-sm text-[#737d83]">{publishedProducts.length === 0 ? "Produk hasil sinkronisasi akan muncul setelah panduannya diterbitkan oleh admin." : "Periksa kembali SKU atau tanyakan langsung kepada admin."}</p>
              </div>
            )}
          </div>
        </section>

        <section id="bantuan" className="bg-[#1d426c] px-5 py-20 text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="eyebrow text-[#73d4f4]">BANTUAN YANG JELAS</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">Dari bingung menjadi bisa.</h2>
                <p className="mt-5 max-w-lg text-sm leading-7 text-white/62 sm:text-base">Setiap panduan dibuat singkat dan langsung menuju kendala yang paling sering dialami pelanggan.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  [Play, "Tonton", "Video tetap diputar di halaman Gascomp."],
                  [BookOpenCheck, "Ikuti", "Langkah singkat yang mudah diperiksa."],
                  [MessageCircle, "Tanya", "Terhubung ke admin jika belum selesai."],
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
              <p className="text-xs font-extrabold tracking-[0.14em] text-white/65">MASIH BUTUH BANTUAN?</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] sm:text-4xl">Admin kami siap membantu.</h2>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/75"><Clock3 className="size-4" /> {content.supportHours}</p>
            </div>
            <a
              href={getWhatsappUrl(content.whatsappNumber)}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-extrabold text-[#002b96] shadow-lg transition hover:-translate-y-0.5 lg:mt-0 lg:w-auto"
            >
              <MessageCircle className="size-4" /> Chat lewat WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2c3038]/8 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-[#7d868b] sm:flex-row sm:items-center sm:justify-between">
          <strong className="text-[#2c3038]">GASCOMP · Pusat Bantuan Produk</strong>
          <span>© {new Date().getFullYear()} Gascomp. Semua hak dilindungi.</span>
        </div>
      </footer>
    </div>
  );
}
