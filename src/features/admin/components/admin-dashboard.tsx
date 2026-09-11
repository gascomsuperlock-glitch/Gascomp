"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, Check, ChevronRight, CircleHelp, ExternalLink, FileText, HeartHandshake, ImageIcon, LogOut, Menu, MapPin, MonitorPlay, Play, Plus, QrCode, Save, Search } from "lucide-react";
import { logoutAction } from "@/features/auth/server/actions";
import { useContent } from "@/features/catalog/hooks/use-content";
import { ProductVisual } from "@/features/catalog/components/product-visual";
import { ProductImageEditor } from "@/features/catalog/components/product-image-editor";
import { QrCodeCard } from "@/features/catalog/components/qr-code-card";
import { createId } from "@/shared/lib/create-id";
import { createSlug, getPrimaryProductImage } from "@/features/catalog/model/product-utils";
import type { Product } from "@/features/catalog/model/types";
import type { WarrantyTicket } from "@/features/warranty/model/types";
import type { MainView } from "@/features/admin/model/types";
import type { EditorTab } from "@/features/catalog/model/editor-types";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { Overview } from "@/features/admin/components/overview";
import { TicketInbox } from "@/features/warranty/components/ticket-inbox";
import { DetailsEditor } from "@/features/catalog/components/details-editor";
import { TicketServiceCard } from "@/features/catalog/components/ticket-service-card";
import { VideosEditor } from "@/features/catalog/components/videos-editor";
import { FaqEditor } from "@/features/catalog/components/faq-editor";
import { SettingsEditor } from "@/features/catalog/components/settings-editor";

export function AdminDashboard({ initialTickets = [], backendError, ticketError, publicBaseUrl }: { initialTickets?: WarrantyTicket[]; backendError?: string; ticketError?: string; publicBaseUrl?: string }) {
  const { content, updateContent, resetContent, storageMode, saveState, saveError } = useContent();
  const [tickets, setTickets] = useState(initialTickets);
  const [view, setView] = useState<MainView>("overview");
  const [editorTab, setEditorTab] = useState<EditorTab>("details");
  const [selectedId, setSelectedId] = useState(content.products[0]?.id ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");

  const selectedProduct = content.products.find((product) => product.id === selectedId) ?? content.products[0];
  const totalVideos = content.products.reduce((total, product) => total + product.videos.length, 0);
  const totalFaqs = content.products.reduce((total, product) => total + product.faqs.length, 0);
  const publishedCount = content.products.filter((product) => product.published && !product.archived).length;

  const filteredProducts = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return content.products;
    return content.products.filter((product) => `${product.name} ${product.model} ${product.sku}`.toLowerCase().includes(value));
  }, [content.products, search]);

  function flashSaved() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  function updateProduct(productId: string, updater: (product: Product) => Product) {
    updateContent((current) => ({
      ...current,
      products: current.products.map((product) => product.id === productId ? updater(product) : product),
    }));
    flashSaved();
  }

  function addProduct() {
    const name = "New Product";
    const uniqueCode = Date.now().toString(36).slice(-6);
    const product: Product = {
      id: createId("product"),
      slug: `${createSlug(name)}-${uniqueCode}`,
      sku: `NEW-SKU-${uniqueCode.toUpperCase()}`,
      name,
      model: "Model name",
      description: "Add a short support summary for this product.",
      tone: "orange",
      published: false,
      archived: false,
      everPublished: false,
      variations: [],
      images: [],
      videos: [],
      issues: [],
      faqs: [],
    };
    updateContent((current) => ({ ...current, products: [...current.products, product] }));
    setSelectedId(product.id);
    setEditorTab("details");
    setView("content");
    setSidebarOpen(false);
  }

  function openProduct(productId: string, tab: EditorTab = "details") {
    setSelectedId(productId);
    setEditorTab(tab);
    setView("content");
  }

  function deleteProduct(product: Product) {
    if (product.everPublished || product.archived) {
      window.alert("A previously published product cannot be deleted permanently. Archive it so existing QR codes remain active.");
      return;
    }
    if (!window.confirm(`Delete “${product.name}”, including its images and all content? This action cannot be undone.`)) return;

    const remaining = content.products.filter((item) => item.id !== product.id);
    updateContent((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }));
    setSelectedId(remaining[0]?.id ?? "");
    setEditorTab("details");
    flashSaved();
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef] text-[#2c3038]">
      <AdminSidebar view={view} setView={setView} open={sidebarOpen} close={() => setSidebarOpen(false)} />

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#2c3038]/8 bg-white/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} className="grid size-9 place-items-center rounded-xl border border-[#2c3038]/10 lg:hidden" aria-label="Open menu"><Menu className="size-4" /></button>
            <div>
              <p className="text-[10px] font-bold text-[#8c9498]">DASHBOARD GASCOMP</p>
              <h1 className="text-sm font-extrabold">{view === "overview" ? "Overview" : view === "content" ? "Manage content" : view === "tickets" ? "Warranty tickets" : "Settings"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden items-center gap-1.5 text-[10px] font-bold transition sm:flex ${saveState === "error" ? "text-[#b33b31]" : saved || saveState === "saved" ? "text-[#3f8759]" : "text-[#90979b]"}`}>{saved || saveState === "saved" ? <Check className="size-3.5" /> : <Save className="size-3.5" />}{saveState === "saving" ? "Saving to Supabase..." : saveState === "error" ? "Save failed" : saved || saveState === "saved" ? "Changes saved" : storageMode === "supabase" ? "Supabase active" : "Saved automatically"}</span>
            <Link href="/" target="_blank" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#2c3038] px-4 text-xs font-extrabold text-white"><ExternalLink className="size-3.5" /> <span className="hidden sm:inline">View website</span></Link>
            <form action={logoutAction}>
              <button type="submit" className="grid size-9 place-items-center rounded-full border border-[#2c3038]/10 bg-white text-[#69747b] transition hover:border-[#b63c35]/20 hover:bg-[#fff3f1] hover:text-[#b63c35]" aria-label="Sign out of dashboard">
                <LogOut className="size-3.5" />
              </button>
            </form>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-7 sm:py-8">
          <div className="mx-auto max-w-[1220px]">
            <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-xs leading-5 ${backendError || saveError ? "border-[#d65d50]/30 bg-[#fff0ef] text-[#a23f36]" : storageMode === "supabase" ? "border-[#79ab8a]/35 bg-[#edf8f0] text-[#3e7652]" : "border-[#e5b895]/40 bg-[#fff5ec] text-[#8c4a2d]"}`}>
              <MonitorPlay className="mt-0.5 size-4 shrink-0" />
              <p>{backendError || saveError ? <><strong>Storage connection issue.</strong> {backendError || saveError}</> : storageMode === "supabase" ? <><strong>Supabase connected.</strong> Products are shared across devices and images are uploaded to Storage.</> : <><strong>Local mode.</strong> Configure Supabase credentials to share products and tickets across devices.</>}</p>
            </div>

            {view === "overview" && (
              <Overview
                products={content.products}
                publishedCount={publishedCount}
                totalVideos={totalVideos}
                totalFaqs={totalFaqs}
                ticketCount={tickets.filter((ticket) => ticket.status !== "closed").length}
                onAdd={addProduct}
                onOpen={openProduct}
              />
            )}

            {view === "content" && (
              <div className="grid gap-5 xl:grid-cols-[285px_1fr]">
                <aside className="self-start rounded-[22px] border border-[#2c3038]/8 bg-white p-3 shadow-sm xl:sticky xl:top-[88px]">
                  <div className="flex items-center justify-between px-2 pb-3 pt-1"><div><p className="text-[10px] font-extrabold tracking-[0.13em] text-[#8a9297]">PRODUCTS</p><p className="mt-1 text-xs font-bold text-[#69747a]">{content.products.length} models</p></div><button type="button" onClick={addProduct} className="grid size-9 place-items-center rounded-full bg-[#0035b9] text-white" aria-label="Add product"><Plus className="size-4" /></button></div>
                  <label className="mb-2 flex h-9 items-center gap-2 rounded-xl bg-[#f4f3ef] px-3"><Search className="size-3.5 text-[#8d9599]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="w-full bg-transparent text-xs font-medium outline-none" /></label>
                  <div className="max-h-[60vh] space-y-1 overflow-auto">
                    {filteredProducts.map((product) => (
                      <button key={product.id} type="button" onClick={() => setSelectedId(product.id)} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${selectedProduct?.id === product.id ? "bg-[#edf4ff]" : "hover:bg-[#f6f5f1]"}`}>
                        <ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-12 w-12 shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{product.name}</strong><small className={`mt-1 block truncate text-[9px] font-bold ${product.archived ? "text-[#69747b]" : product.published ? "text-[#45815a]" : "text-[#9a7a55]"}`}>{product.sku} · {product.archived ? "Archived" : product.published ? "Published" : "Draft"}</small></span>
                        <ChevronRight className="size-3.5 text-[#9aa1a5]" />
                      </button>
                    ))}
                  </div>
                </aside>

                {selectedProduct ? (
                  <section className="overflow-hidden rounded-[22px] border border-[#2c3038]/8 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-[#2c3038]/8 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0"><p className="truncate text-lg font-extrabold tracking-[-0.025em]">{selectedProduct.name}</p><p className="mt-1 truncate text-[10px] font-semibold text-[#8a9297]">/produk/{selectedProduct.slug}</p></div>
                      <label className="flex shrink-0 items-center gap-2 text-xs font-extrabold text-[#657178]"><span className={`size-2 rounded-full ${selectedProduct.archived ? "bg-[#71808a]" : selectedProduct.published ? "bg-[#42a265]" : "bg-[#c7aa7b]"}`} /><span>Status</span><select value={selectedProduct.archived ? "archived" : selectedProduct.published ? "published" : "draft"} onChange={(event) => updateProduct(selectedProduct.id, (product) => ({ ...product, published: event.target.value === "published", archived: event.target.value === "archived" && product.everPublished, everPublished: product.everPublished || event.target.value === "published" }))} className="h-9 rounded-full border border-[#2c3038]/10 bg-white px-3 text-[11px] font-extrabold outline-none"><option value="draft">Draft</option><option value="published">Published</option><option value="archived" disabled={!selectedProduct.everPublished}>Archived · QR remains active</option></select></label>
                    </div>

                    <div className="flex gap-1 overflow-x-auto border-b border-[#2c3038]/8 px-4 pt-2">
                      {([
                        ["details", FileText, "Information"],
                        ["images", ImageIcon, "Images"],
                        ["videos", Play, "Video"],
                        ["faqs", CircleHelp, "FAQ"],
                        ["qr", QrCode, "Product QR"],
                        ["warranty", BadgeCheck, "Warranty claim"],
                        ["care", HeartHandshake, "Gascomp Care"],
                        ["service-center", MapPin, "Service center"],
                      ] as const).map(([tab, Icon, label]) => (
                        <button key={tab} type="button" onClick={() => setEditorTab(tab)} className={`flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-extrabold transition ${editorTab === tab ? "border-[#0035b9] text-[#0035b9]" : "border-transparent text-[#7b858a] hover:text-[#2c3038]"}`}><Icon className="size-3.5" /> {label}</button>
                      ))}
                    </div>

                    <div className="p-5 sm:p-7">
                      {editorTab === "details" && <DetailsEditor product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} onDelete={() => deleteProduct(selectedProduct)} />}
                      {editorTab === "images" && <ProductImageEditor product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} />}
                      {editorTab === "videos" && <VideosEditor product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} />}
                      {editorTab === "faqs" && <FaqEditor product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} />}
                      {editorTab === "qr" && <QrCodeCard slug={selectedProduct.slug} name={selectedProduct.name} publicBaseUrl={publicBaseUrl} />}
                      {editorTab === "warranty" && <TicketServiceCard product={selectedProduct} service="warranty" />}
                      {editorTab === "care" && <TicketServiceCard product={selectedProduct} service="care" />}
                      {editorTab === "service-center" && <TicketServiceCard product={selectedProduct} service="service-center" />}
                    </div>
                  </section>
                ) : <div className="rounded-[22px] bg-white p-12 text-center text-sm text-[#7a848a]">Add a product to start managing content.</div>}
              </div>
            )}

            {ticketError && <p role="alert" className="mb-6 rounded-2xl border border-[#d65d50]/30 bg-[#fff0ef] p-4 text-xs leading-5 text-[#a23f36]">{ticketError}</p>}
            {view === "tickets" && !ticketError && <TicketInbox tickets={tickets} setTickets={setTickets} />}

            {view === "settings" && (
              <SettingsEditor
                whatsapp={content.whatsappNumber}
                hours={content.supportHours}
                update={(whatsappNumber, supportHours) => {
                  updateContent((current) => ({ ...current, whatsappNumber, supportHours }));
                  flashSaved();
                }}
                reset={resetContent}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
