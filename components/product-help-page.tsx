"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Home,
  LifeBuoy,
  MessageCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { useContent } from "@/components/content-provider";
import { ProductVisual } from "@/components/product-visual";
import { getPrimaryProductImage, getProductImageSource, getWhatsappUrl, getYoutubeEmbedUrl } from "@/lib/content";

export function ProductHelpPage({ slug }: { slug: string }) {
  const { content, hydrated } = useContent();
  const product = content.products.find(
    (item) => item.slug === slug && (item.published || item.archived),
  );
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  if (!hydrated) {
    return <ProductPageSkeleton />;
  }

  if (!product) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#ffffff] px-5 text-center text-[#2c3038]">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#edf4ff] text-[#0035b9]"><CircleHelp /></span>
          <h1 className="mt-5 text-2xl font-extrabold">Panduan produk tidak ditemukan</h1>
          <p className="mt-2 text-sm text-[#6f797f]">Periksa kembali QR atau pilih produk dari halaman utama.</p>
          <Link href="/" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#2c3038] px-5 text-sm font-bold text-white"><Home className="size-4" /> Kembali ke beranda</Link>
        </div>
      </div>
    );
  }

  const activeVideo = product.videos.find((video) => video.id === activeVideoId) ?? product.videos[0];
  const activeImage = product.images.find((image) => image.id === activeImageId) ?? getPrimaryProductImage(product);
  const embedUrl = activeVideo ? getYoutubeEmbedUrl(activeVideo.youtubeUrl) : null;

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#f8f6f0] pb-20 text-[#2c3038] sm:pb-0">
      <header className="border-b border-[#2c3038]/8 bg-white">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <Link href="/" className="inline-flex shrink-0 items-center gap-2 text-xs font-extrabold text-[#647077] transition hover:text-[#0035b9]"><ArrowLeft className="size-4" /> <span className="hidden sm:inline">Pilih produk lain</span><span className="sm:hidden">Produk lain</span></Link>
        </div>
      </header>

      <main>
        <section className="border-b border-[#2c3038]/8 bg-[#ffffff]">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16">
            <div className="mb-7 flex items-center gap-2 text-[11px] font-semibold text-[#899197]">
              <Link href="/" className="hover:text-[#0035b9]">Beranda</Link>
              <ChevronRight className="size-3" />
              <span className="text-[#536067]">{product.name}</span>
            </div>
            <div className="grid min-w-0 gap-8 rounded-[30px] border border-[#2c3038]/8 bg-white p-3 shadow-[0_16px_45px_rgba(44,48,56,0.07)] sm:p-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div className="min-w-0">
                <ProductVisual tone={product.tone} image={activeImage} alt={product.name} className="h-64 rounded-[24px] sm:h-72" />
                {product.images.length > 1 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {product.images.map((image) => (
                      <button key={image.id} type="button" onClick={() => setActiveImageId(image.id)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-[#f4f5f7] p-1 transition ${activeImage?.id === image.id ? "border-[#0035b9] ring-2 ring-[#0035b9]/15" : "border-[#2c3038]/10"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getProductImageSource(image)} alt={image.alt || product.name} className="size-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="min-w-0 px-3 pb-5 md:px-6 md:pb-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf4ed] px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-[#417a56]"><ShieldCheck className="size-3" /> PANDUAN RESMI</span>
                <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0035b9]">{product.sku} · {product.model}</p>
                <h1 className="mt-2 break-words text-[1.8rem] font-extrabold leading-tight tracking-[-0.045em] sm:text-4xl">{product.name}</h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#6a757b]">{product.description}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a href="#tutorial" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-5 text-sm font-extrabold text-white"><Play className="size-4 fill-current" /> Lihat tutorial</a>
                  <a href="#kendala" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#2c3038]/10 px-5 text-sm font-extrabold"><LifeBuoy className="size-4 text-[#0035b9]" /> Saya mengalami kendala</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tutorial" className="scroll-mt-5 px-5 py-14 sm:px-8 sm:py-18">
          <div className="mx-auto max-w-6xl">
            <SectionHeading index="01" eyebrow="TUTORIAL PENGGUNAAN" title="Ikuti dari awal, pelan-pelan." />
            {activeVideo ? (
              <div className="mt-8 grid gap-5 lg:grid-cols-[1.55fr_0.75fr]">
                <div className="overflow-hidden rounded-[26px] border border-[#2c3038]/8 bg-[#2c3038] shadow-lg">
                  <div className="aspect-video">
                    {embedUrl ? (
                      <iframe
                        className="size-full"
                        src={embedUrl}
                        title={activeVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <div className="grid size-full place-items-center px-6 text-center text-white">
                        <div>
                          <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/10 text-[#73d4f4]"><Play className="size-6 fill-current" /></span>
                          <p className="mt-5 text-lg font-extrabold">Video segera tersedia</p>
                          <p className="mt-2 max-w-sm text-xs leading-5 text-white/55">Admin dapat memasukkan tautan YouTube melalui dashboard. Video akan diputar langsung di halaman ini.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/10 p-5 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-base font-extrabold">{activeVideo.title}</p><p className="mt-1 text-xs leading-5 text-white/55">{activeVideo.description}</p></div>
                      {activeVideo.duration && <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70"><Clock3 className="size-3" /> {activeVideo.duration}</span>}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="mb-3 text-[10px] font-extrabold tracking-[0.15em] text-[#899197]">DAFTAR VIDEO</p>
                  {product.videos.map((video, index) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => setActiveVideoId(video.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${video.id === activeVideo.id ? "border-[#0035b9]/35 bg-[#f1f5ff]" : "border-[#2c3038]/8 bg-white hover:border-[#0035b9]/25"}`}
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${video.id === activeVideo.id ? "bg-[#0035b9] text-white" : "bg-[#f0efeb] text-[#687279]"}`}>{String(index + 1).padStart(2, "0")}</span>
                      <span><strong className="line-clamp-2 block text-xs leading-4">{video.title}</strong><small className="mt-1 block text-[10px] text-[#8b9398]">{video.duration || "Tutorial"}</small></span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyBlock text="Belum ada video untuk produk ini." />
            )}
          </div>
        </section>

        <section id="kendala" className="scroll-mt-5 bg-white px-5 py-14 sm:px-8 sm:py-18">
          <div className="mx-auto max-w-6xl">
            <SectionHeading index="02" eyebrow="BANTUAN BERDASARKAN KENDALA" title="Apa yang sedang terjadi?" />
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#6d777d]">Pilih kendala yang paling sesuai, kemudian ikuti pengecekan satu per satu.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {product.issues.map((issue) => {
                const isOpen = openIssueId === issue.id;
                return (
                  <article key={issue.id} className={`overflow-hidden rounded-[22px] border transition ${isOpen ? "border-[#0035b9]/30 bg-[#fffaf6]" : "border-[#2c3038]/9 bg-white"}`}>
                    <button type="button" onClick={() => setOpenIssueId(isOpen ? null : issue.id)} className="flex w-full items-center gap-4 p-5 text-left">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${isOpen ? "bg-[#0035b9] text-white" : "bg-[#edf4ff] text-[#0035b9]"}`}><CircleHelp className="size-4" /></span>
                      <span className="flex-1"><strong className="block text-sm sm:text-base">{issue.title}</strong><small className="mt-1 block text-xs leading-5 text-[#778187]">{issue.summary}</small></span>
                      <ChevronDown className={`size-4 shrink-0 text-[#8b9398] transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#0035b9]/12 px-5 pb-5 pt-5">
                        <ol className="space-y-4">
                          {issue.steps.map((step, index) => (
                            <li key={step} className="flex gap-3 text-xs leading-5 text-[#566269]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#2c3038] text-[10px] font-extrabold text-white">{index + 1}</span>{step}</li>
                          ))}
                        </ol>
                        {issue.warning && (
                          <div className="mt-5 flex gap-3 rounded-xl bg-[#edf4ff] p-4 text-xs leading-5 text-[#9d3d1c]"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {issue.warning}</div>
                        )}
                        <a href={getWhatsappUrl(content.whatsappNumber, product.name, issue.title)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#2e8250]"><MessageCircle className="size-4" /> Masih belum berhasil? Tanya admin</a>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-8 sm:py-18">
          <div className="mx-auto max-w-6xl">
            <SectionHeading index="03" eyebrow="PERTANYAAN UMUM" title="Mungkin jawabannya ada di sini." />
            <div className="mt-8 divide-y divide-[#2c3038]/8 border-y border-[#2c3038]/8">
              {product.faqs.map((faq) => (
                <details key={faq.id} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-sm font-extrabold marker:hidden sm:text-base">
                    {faq.question}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#0035b9] shadow-sm"><ChevronDown className="size-4 transition group-open:rotate-180" /></span>
                  </summary>
                  <p className="max-w-3xl pb-6 pr-10 text-sm leading-7 text-[#687279]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-6xl rounded-[28px] bg-[#2c3038] p-6 text-white sm:flex sm:items-center sm:justify-between sm:p-9">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-[#73d4f4]"><MessageCircle className="size-5" /></span>
              <div><h2 className="text-xl font-extrabold">Belum menemukan jawaban?</h2><p className="mt-1 text-xs leading-5 text-white/55">Ceritakan kendalamu kepada admin. Nama produk akan otomatis disertakan.</p></div>
            </div>
            <a href={getWhatsappUrl(content.whatsappNumber, product.name)} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2da45e] px-5 text-sm font-extrabold shadow-lg sm:mt-0 sm:w-auto"><MessageCircle className="size-4" /> Chat admin</a>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2c3038]/8 bg-white/95 p-3 backdrop-blur-lg sm:hidden">
        <a href={getWhatsappUrl(content.whatsappNumber, product.name)} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#2da45e] text-sm font-extrabold text-white"><MessageCircle className="size-4" /> Tanya admin di WhatsApp</a>
      </div>
    </div>
  );
}

function SectionHeading({ index, eyebrow, title }: { index: string; eyebrow: string; title: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-1 text-[11px] font-extrabold text-[#0035b9]">{index}</span>
      <div><p className="text-[10px] font-extrabold tracking-[0.15em] text-[#899197]">{eyebrow}</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] sm:text-3xl">{title}</h2></div>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="mt-8 rounded-[24px] border border-dashed border-[#2c3038]/15 bg-white p-12 text-center text-sm text-[#758087]">{text}</div>;
}

function ProductPageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-[#f8f6f0]">
      <div className="h-[68px] border-b border-[#2c3038]/8 bg-white" />
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8"><div className="h-[360px] rounded-[30px] bg-white" /><div className="mt-12 h-64 rounded-[28px] bg-white" /></div>
    </div>
  );
}
