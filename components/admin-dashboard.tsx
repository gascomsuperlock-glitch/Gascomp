"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileText,
  Gauge,
  HelpCircle,
  HeartHandshake,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MapPin,
  MonitorPlay,
  PackagePlus,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Search,
  Settings,
  TicketCheck,
  Trash2,
  X,
} from "lucide-react";
import { logoutAction, updateWarrantyTicketStatusAction } from "@/app/admin/actions";
import { Brand } from "@/components/brand";
import { useContent } from "@/components/content-provider";
import { ProductVisual } from "@/components/product-visual";
import { ProductImageEditor } from "@/components/product-image-editor";
import { QrCodeCard } from "@/components/qr-code-card";
import {
  createId,
  createSlug,
  getPrimaryProductImage,
  getYoutubeEmbedUrl,
  type Product,
  type ProductTone,
} from "@/lib/content";
import { WARRANTY_TICKET_STATUSES, type WarrantyTicket, type WarrantyTicketStatus } from "@/lib/warranty-ticket-types";

type MainView = "overview" | "content" | "tickets" | "settings";
type EditorTab = "details" | "images" | "videos" | "faqs" | "qr" | "warranty" | "care" | "service-center";
type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#2c3038]/10 bg-white px-3.5 text-sm font-semibold text-[#2c3038] outline-none transition placeholder:text-[#a1a8ac] focus:border-[#0035b9]/45 focus:ring-4 focus:ring-[#0035b9]/8";
const areaClass = "mt-2 min-h-24 w-full resize-y rounded-xl border border-[#2c3038]/10 bg-white px-3.5 py-3 text-sm font-medium leading-6 text-[#2c3038] outline-none transition placeholder:text-[#a1a8ac] focus:border-[#0035b9]/45 focus:ring-4 focus:ring-[#0035b9]/8";

export function AdminDashboard({ initialTickets = [], backendError, ticketError }: { initialTickets?: WarrantyTicket[]; backendError?: string; ticketError?: string }) {
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
    const name = "Produk Baru";
    const uniqueCode = Date.now().toString(36).slice(-6);
    const product: Product = {
      id: createId("product"),
      slug: `${createSlug(name)}-${uniqueCode}`,
      sku: `SKU-BARU-${uniqueCode.toUpperCase()}`,
      name,
      model: "Nama model",
      description: "Tambahkan ringkasan bantuan untuk produk ini.",
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
      window.alert("Produk yang pernah ditayangkan tidak dapat dihapus permanen. Arsipkan produk agar QR yang sudah beredar tetap aktif.");
      return;
    }
    if (!window.confirm(`Hapus produk “${product.name}” beserta gambar dan seluruh kontennya? Tindakan ini tidak dapat dibatalkan.`)) return;

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
            <button type="button" onClick={() => setSidebarOpen(true)} className="grid size-9 place-items-center rounded-xl border border-[#2c3038]/10 lg:hidden" aria-label="Buka menu"><Menu className="size-4" /></button>
            <div>
              <p className="text-[10px] font-bold text-[#8c9498]">DASHBOARD GASCOMP</p>
              <h1 className="text-sm font-extrabold">{view === "overview" ? "Ringkasan" : view === "content" ? "Kelola konten" : view === "tickets" ? "Tiket garansi" : "Pengaturan"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden items-center gap-1.5 text-[10px] font-bold transition sm:flex ${saveState === "error" ? "text-[#b33b31]" : saved || saveState === "saved" ? "text-[#3f8759]" : "text-[#90979b]"}`}>{saved || saveState === "saved" ? <Check className="size-3.5" /> : <Save className="size-3.5" />}{saveState === "saving" ? "Menyimpan ke Supabase..." : saveState === "error" ? "Gagal menyimpan" : saved || saveState === "saved" ? "Perubahan tersimpan" : storageMode === "supabase" ? "Supabase aktif" : "Tersimpan otomatis"}</span>
            <Link href="/" target="_blank" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#2c3038] px-4 text-xs font-extrabold text-white"><ExternalLink className="size-3.5" /> <span className="hidden sm:inline">Lihat website</span></Link>
            <form action={logoutAction}>
              <button type="submit" className="grid size-9 place-items-center rounded-full border border-[#2c3038]/10 bg-white text-[#69747b] transition hover:border-[#b63c35]/20 hover:bg-[#fff3f1] hover:text-[#b63c35]" aria-label="Keluar dari dashboard">
                <LogOut className="size-3.5" />
              </button>
            </form>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-7 sm:py-8">
          <div className="mx-auto max-w-[1220px]">
            <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-xs leading-5 ${backendError || saveError ? "border-[#d65d50]/30 bg-[#fff0ef] text-[#a23f36]" : storageMode === "supabase" ? "border-[#79ab8a]/35 bg-[#edf8f0] text-[#3e7652]" : "border-[#e5b895]/40 bg-[#fff5ec] text-[#8c4a2d]"}`}>
              <MonitorPlay className="mt-0.5 size-4 shrink-0" />
              <p>{backendError || saveError ? <><strong>Koneksi penyimpanan bermasalah.</strong> {backendError || saveError}</> : storageMode === "supabase" ? <><strong>Supabase terhubung.</strong> Produk tersimpan lintas perangkat dan gambar diunggah ke Storage.</> : <><strong>Mode lokal.</strong> Isi kredensial Supabase untuk menyimpan produk dan tiket lintas perangkat.</>}</p>
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
                  <div className="flex items-center justify-between px-2 pb-3 pt-1"><div><p className="text-[10px] font-extrabold tracking-[0.13em] text-[#8a9297]">PRODUK</p><p className="mt-1 text-xs font-bold text-[#69747a]">{content.products.length} model</p></div><button type="button" onClick={addProduct} className="grid size-9 place-items-center rounded-full bg-[#0035b9] text-white" aria-label="Tambah produk"><Plus className="size-4" /></button></div>
                  <label className="mb-2 flex h-9 items-center gap-2 rounded-xl bg-[#f4f3ef] px-3"><Search className="size-3.5 text-[#8d9599]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk" className="w-full bg-transparent text-xs font-medium outline-none" /></label>
                  <div className="max-h-[60vh] space-y-1 overflow-auto">
                    {filteredProducts.map((product) => (
                      <button key={product.id} type="button" onClick={() => setSelectedId(product.id)} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${selectedProduct?.id === product.id ? "bg-[#edf4ff]" : "hover:bg-[#f6f5f1]"}`}>
                        <ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-12 w-12 shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{product.name}</strong><small className={`mt-1 block truncate text-[9px] font-bold ${product.archived ? "text-[#69747b]" : product.published ? "text-[#45815a]" : "text-[#9a7a55]"}`}>{product.sku} · {product.archived ? "Diarsipkan" : product.published ? "Dipublikasikan" : "Draft"}</small></span>
                        <ChevronRight className="size-3.5 text-[#9aa1a5]" />
                      </button>
                    ))}
                  </div>
                </aside>

                {selectedProduct ? (
                  <section className="overflow-hidden rounded-[22px] border border-[#2c3038]/8 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-[#2c3038]/8 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0"><p className="truncate text-lg font-extrabold tracking-[-0.025em]">{selectedProduct.name}</p><p className="mt-1 truncate text-[10px] font-semibold text-[#8a9297]">/produk/{selectedProduct.slug}</p></div>
                      <label className="flex shrink-0 items-center gap-2 text-xs font-extrabold text-[#657178]"><span className={`size-2 rounded-full ${selectedProduct.archived ? "bg-[#71808a]" : selectedProduct.published ? "bg-[#42a265]" : "bg-[#c7aa7b]"}`} /><span>Status</span><select value={selectedProduct.archived ? "archived" : selectedProduct.published ? "published" : "draft"} onChange={(event) => updateProduct(selectedProduct.id, (product) => ({ ...product, published: event.target.value === "published", archived: event.target.value === "archived" && product.everPublished, everPublished: product.everPublished || event.target.value === "published" }))} className="h-9 rounded-full border border-[#2c3038]/10 bg-white px-3 text-[11px] font-extrabold outline-none"><option value="draft">Draft</option><option value="published">Tayang</option><option value="archived" disabled={!selectedProduct.everPublished}>Arsip · QR tetap aktif</option></select></label>
                    </div>

                    <div className="flex gap-1 overflow-x-auto border-b border-[#2c3038]/8 px-4 pt-2">
                      {([
                        ["details", FileText, "Informasi"],
                        ["images", ImageIcon, "Gambar"],
                        ["videos", Play, "Video"],
                        ["faqs", CircleHelp, "FAQ"],
                        ["qr", QrCode, "QR produk"],
                        ["warranty", BadgeCheck, "Klaim garansi"],
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
                      {editorTab === "qr" && <QrCodeCard slug={selectedProduct.slug} name={selectedProduct.name} />}
                      {editorTab === "warranty" && <TicketServiceCard product={selectedProduct} service="warranty" />}
                      {editorTab === "care" && <TicketServiceCard product={selectedProduct} service="care" />}
                      {editorTab === "service-center" && <TicketServiceCard product={selectedProduct} service="service-center" />}
                    </div>
                  </section>
                ) : <div className="rounded-[22px] bg-white p-12 text-center text-sm text-[#7a848a]">Tambahkan produk untuk mulai mengelola konten.</div>}
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

function AdminSidebar({ view, setView, open, close }: { view: MainView; setView: (view: MainView) => void; open: boolean; close: () => void }) {
  const items: Array<[MainView, IconType, string]> = [
    ["overview", LayoutDashboard, "Ringkasan"],
    ["content", BookOpen, "Konten bantuan"],
    ["tickets", Inbox, "Tiket garansi"],
    ["settings", Settings, "Pengaturan"],
  ];

  return (
    <>
      {open && <button type="button" className="fixed inset-0 z-40 bg-[#2c3038]/35 backdrop-blur-sm lg:hidden" onClick={close} aria-label="Tutup menu" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col bg-[#2c3038] p-4 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 items-center justify-between px-2"><Brand inverse /><button type="button" onClick={close} className="grid size-8 place-items-center rounded-lg bg-white/8 lg:hidden" aria-label="Tutup menu"><X className="size-4" /></button></div>
        <p className="mt-7 px-3 text-[9px] font-bold tracking-[0.15em] text-white/35">MENU UTAMA</p>
        <nav className="mt-2 space-y-1">
          {items.map(([value, Icon, label]) => (
            <button key={value} type="button" onClick={() => { setView(value); close(); }} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold transition ${view === value ? "bg-white text-[#2c3038]" : "text-white/60 hover:bg-white/7 hover:text-white"}`}><Icon className={`size-4 ${view === value ? "text-[#0035b9]" : ""}`} /> {label}</button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/[0.055] p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/50"><HelpCircle className="size-3.5 text-[#73d4f4]" /> BUTUH BANTUAN?</div>
          <p className="mt-2 text-[11px] leading-5 text-white/65">Kelola panduan yang akan dilihat pelanggan setelah scan QR.</p>
          <Link href="/" className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#73d4f4]">Lihat website <ChevronRight className="size-3" /></Link>
        </div>
      </aside>
    </>
  );
}

function Overview({ products, publishedCount, totalVideos, totalFaqs, ticketCount, onAdd, onOpen }: { products: Product[]; publishedCount: number; totalVideos: number; totalFaqs: number; ticketCount: number; onAdd: () => void; onOpen: (id: string, tab?: EditorTab) => void }) {
  const stats: Array<[string, number, IconType, string]> = [
    ["Produk aktif", publishedCount, Gauge, "bg-[#edf4ff] text-[#0035b9]"],
    ["Video tutorial", totalVideos, MonitorPlay, "bg-[#e9f0f4] text-[#365a70]"],
    ["Pertanyaan FAQ", totalFaqs, CircleHelp, "bg-[#e8f3eb] text-[#467a57]"],
    ["Tiket aktif", ticketCount, TicketCheck, "bg-[#fff3e8] text-[#a65b27]"],
  ];

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold text-[#0035b9]">Selamat datang kembali</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Pusat konten Gascomp</h2><p className="mt-2 text-sm text-[#707a80]">Atur apa yang pelanggan lihat setelah scan QR.</p></div>
        <button type="button" onClick={onAdd} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-5 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(13,79,215,0.22)]"><PackagePlus className="size-4" /> Tambah produk</button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon, style]) => <div key={label} className="rounded-[22px] border border-[#2c3038]/8 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className={`grid size-10 place-items-center rounded-xl ${style}`}><Icon className="size-4" /></span><BarChart3 className="size-4 text-[#b1b6b9]" /></div><p className="mt-6 text-3xl font-extrabold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs font-semibold text-[#7b858a]">{label}</p></div>)}
      </div>

      <section className="mt-6 overflow-hidden rounded-[22px] border border-[#2c3038]/8 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#2c3038]/8 p-5"><div><h3 className="text-sm font-extrabold">Semua produk</h3><p className="mt-1 text-[10px] text-[#8b9397]">Konten bantuan untuk setiap QR produk</p></div><button type="button" onClick={() => products[0] && onOpen(products[0].id)} className="text-[10px] font-extrabold text-[#0035b9]">Kelola semua</button></div>
        <div className="divide-y divide-[#2c3038]/7">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 p-4 sm:gap-5 sm:px-5">
              <ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1"><strong className="block truncate text-xs sm:text-sm">{product.name}</strong><p className="mt-1 truncate text-[10px] text-[#8c9498]">{product.sku} · {product.videos.length} video · {product.faqs.length} FAQ</p></div>
              <span className={`hidden rounded-full px-2.5 py-1 text-[9px] font-extrabold sm:block ${product.archived ? "bg-[#edf0f2] text-[#68757e]" : product.published ? "bg-[#e9f5ed] text-[#427a56]" : "bg-[#f2eee7] text-[#8d7456]"}`}>{product.archived ? "ARSIP" : product.published ? "TAYANG" : "DRAFT"}</span>
              <button type="button" onClick={() => onOpen(product.id)} className="grid size-9 place-items-center rounded-full border border-[#2c3038]/9 text-[#6d787e] transition hover:border-[#0035b9]/30 hover:text-[#0035b9]" aria-label={`Kelola ${product.name}`}><ChevronRight className="size-4" /></button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const ticketStatusLabels: Record<WarrantyTicketStatus, string> = {
  new: "Baru",
  reviewing: "Sedang diperiksa",
  approved: "Disetujui",
  rejected: "Ditolak",
  closed: "Selesai",
};

function TicketInbox({ tickets, setTickets }: { tickets: WarrantyTicket[]; setTickets: React.Dispatch<React.SetStateAction<WarrantyTicket[]>> }) {
  const [query, setQuery] = useState("");
  const [busyTicket, setBusyTicket] = useState("");
  const [error, setError] = useState("");
  const visibleTickets = tickets.filter((ticket) => `${ticket.ticketId} ${ticket.customer.name} ${ticket.customer.whatsapp} ${ticket.product.name} ${ticket.product.sku} ${ticket.purchase.orderNumber}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function changeStatus(ticket: WarrantyTicket, status: WarrantyTicketStatus) {
    setBusyTicket(ticket.ticketId);
    setError("");
    const result = await updateWarrantyTicketStatusAction(ticket.ticketId, status);
    if (result.success) {
      setTickets((current) => current.map((item) => item.ticketId === ticket.ticketId ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    } else {
      setError(result.error ?? "Status tiket belum dapat diperbarui.");
    }
    setBusyTicket("");
  }

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold text-[#0035b9]">KLAIM GARANSI</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em]">Kotak masuk tiket</h2><p className="mt-2 text-sm text-[#707a80]">Periksa data pembelian, kendala, dan lampiran yang dikirim pelanggan.</p></div>
        <label className="flex h-11 w-full items-center gap-2 rounded-full border border-[#2c3038]/10 bg-white px-4 shadow-sm sm:w-80"><Search className="size-4 text-[#899197]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tiket, SKU, atau pelanggan" className="w-full bg-transparent text-xs font-semibold outline-none" /></label>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-[#fff0ef] p-4 text-xs font-semibold text-[#ad4037]">{error}</p>}
      <div className="mt-7 space-y-4">
        {visibleTickets.map((ticket) => (
          <article key={ticket.ticketId} className="overflow-hidden rounded-[22px] border border-[#2c3038]/8 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#2c3038]/8 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[10px] font-extrabold tracking-[0.12em] text-[#0035b9]">{ticket.ticketId}</p><h3 className="mt-1 text-base font-extrabold">{ticket.product.name} · {ticket.product.sku}</h3><p className="mt-1 text-[10px] text-[#858e93]">Dikirim {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ticket.submittedAt))}</p></div>
              <label className="flex items-center gap-2 text-[10px] font-extrabold text-[#69747b]">STATUS<select value={ticket.status} disabled={busyTicket === ticket.ticketId} onChange={(event) => changeStatus(ticket, event.target.value as WarrantyTicketStatus)} className="h-10 rounded-full border border-[#2c3038]/10 bg-white px-3 text-xs font-extrabold outline-none disabled:opacity-50">{WARRANTY_TICKET_STATUSES.map((status) => <option key={status} value={status}>{ticketStatusLabels[status]}</option>)}</select></label>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-3">
              <div><p className="text-[9px] font-extrabold tracking-[0.12em] text-[#8b9397]">PELANGGAN</p><p className="mt-2 text-xs font-extrabold">{ticket.customer.name}</p><a href={`mailto:${ticket.customer.email}`} className="mt-1 block break-all text-[11px] text-[#58666e] hover:text-[#0035b9]">{ticket.customer.email}</a><a href={`https://wa.me/${ticket.customer.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] font-bold text-[#318257]">{ticket.customer.whatsapp}</a></div>
              <div><p className="text-[9px] font-extrabold tracking-[0.12em] text-[#8b9397]">PEMBELIAN</p><dl className="mt-2 space-y-1 text-[11px] text-[#58666e]"><div><dt className="inline font-bold">Pesanan: </dt><dd className="inline">{ticket.purchase.orderNumber}</dd></div><div><dt className="inline font-bold">Toko: </dt><dd className="inline">{ticket.purchase.store}</dd></div><div><dt className="inline font-bold">Tanggal: </dt><dd className="inline">{ticket.purchase.date}</dd></div><div><dt className="inline font-bold">Harga: </dt><dd className="inline">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(ticket.purchase.price)}</dd></div></dl></div>
              <div><p className="text-[9px] font-extrabold tracking-[0.12em] text-[#8b9397]">LAMPIRAN PRIVAT</p><div className="mt-2 flex flex-wrap gap-2">{ticket.evidence.map((file) => <a key={file.id} href={`/admin/tiket/${ticket.ticketId}/lampiran/${file.id}`} target="_blank" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#edf4ff] px-3 text-[10px] font-extrabold text-[#0035b9]"><ExternalLink className="size-3" /> {file.kind === "invoice" ? "Invoice" : file.kind === "photo" ? "Foto" : "Video"}</a>)}</div></div>
            </div>
            <div className="border-t border-[#2c3038]/8 bg-[#faf9f6] px-5 py-4"><p className="text-[9px] font-extrabold tracking-[0.12em] text-[#8b9397]">KENDALA</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#566269]">{ticket.problem}</p></div>
          </article>
        ))}
        {visibleTickets.length === 0 && <div className="rounded-[22px] border border-dashed border-[#2c3038]/15 bg-white p-12 text-center"><Inbox className="mx-auto size-8 text-[#a6adb1]" /><p className="mt-3 text-sm font-extrabold">{tickets.length ? "Tiket tidak ditemukan" : "Belum ada tiket garansi"}</p><p className="mt-1 text-xs text-[#858e93]">Pengajuan dari formulir klaim akan muncul di sini.</p></div>}
      </div>
    </section>
  );
}

function DetailsEditor({ product, update, onDelete }: { product: Product; update: (updater: (product: Product) => Product) => void; onDelete: () => void }) {
  return (
    <div>
      <EditorHeading title="Informasi produk" copy="Nama dan keterangan ini akan muncul di halaman pelanggan." />
      {product.source?.provider === "duoke" && (
        <div className="mt-5 rounded-2xl border border-[#0035b9]/12 bg-[#f3f7ff] p-4 text-[10px] leading-5 text-[#53657c]">
          <strong className="block text-xs text-[#0035b9]">Tersinkron dari Duoke</strong>
          Identitas produk: {product.source.productId}{product.source.storeId ? ` · Toko: ${product.source.storeId}` : ""}. Nama, SKU, detail, dan variasi akan disamakan lagi pada impor berikutnya.
        </div>
      )}
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Nama produk"><input value={product.name} onChange={(event) => update((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></Field>
        <Field label="SKU produk"><input value={product.sku} onChange={(event) => update((current) => ({ ...current, sku: event.target.value }))} className={fieldClass} /></Field>
        <Field label="Model atau kategori"><input value={product.model} onChange={(event) => update((current) => ({ ...current, model: event.target.value }))} className={fieldClass} /></Field>
        <Field label="Alamat halaman" hint="Ditetapkan saat produk dibuat agar QR tetap aktif."><div className="mt-2 flex h-11 items-center rounded-xl border border-[#2c3038]/8 bg-[#f4f3ef] px-3.5 text-xs font-semibold text-[#6f797f]">/produk/{product.slug}</div></Field>
        <Field label="Warna kartu produk"><div className="mt-3 flex gap-2">{(["orange", "navy", "green"] as ProductTone[]).map((tone) => <button key={tone} type="button" onClick={() => update((current) => ({ ...current, tone }))} className={`size-9 rounded-full border-4 ${tone === "orange" ? "bg-[#0035b9]" : tone === "navy" ? "bg-[#233847]" : "bg-[#4f745e]"} ${product.tone === tone ? "border-[#d4e2fb] ring-2 ring-[#0035b9]" : "border-white ring-1 ring-[#2c3038]/10"}`} aria-label={`Pilih warna ${tone}`} />)}</div></Field>
        <div className="sm:col-span-2"><Field label="Deskripsi singkat"><textarea value={product.description} onChange={(event) => update((current) => ({ ...current, description: event.target.value }))} className={areaClass} /></Field></div>
      </div>
      <VariationsEditor product={product} update={update} />
      {product.attributes && product.attributes.length > 0 && (
        <div className="mt-8 border-t border-[#2c3038]/8 pt-7">
          <p className="text-sm font-extrabold">Atribut dari Duoke</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">{product.attributes.map((attribute) => <div key={`${attribute.name}-${attribute.value}`} className="rounded-xl bg-[#f6f7f8] p-3"><dt className="text-[9px] font-extrabold uppercase tracking-wide text-[#818a8f]">{attribute.name}</dt><dd className="mt-1 text-xs font-semibold">{attribute.value}</dd></div>)}</dl>
        </div>
      )}
      <div className="mt-8 rounded-2xl bg-[#f6f4ef] p-4"><p className="text-xs font-extrabold">Pratinjau kartu</p><div className="mt-4 flex max-w-md items-center gap-4 rounded-2xl bg-white p-3 shadow-sm"><ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-20 w-20 shrink-0 rounded-xl" /><div className="min-w-0"><p className="truncate text-[9px] font-extrabold uppercase tracking-wider text-[#0035b9]">{product.sku} · {product.model}</p><strong className="mt-1 block truncate text-sm">{product.name}</strong><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#7c858a]">{product.description}</p></div></div></div>
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#c34a3f]/15 bg-[#fff7f5] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold text-[#9e3d34]">Hapus produk permanen</p><p className="mt-1 max-w-lg text-[10px] leading-4 text-[#8c6b67]">Hanya tersedia untuk draft yang belum pernah tayang. Produk yang pernah tayang harus diarsipkan agar QR tetap aktif.</p></div><button type="button" onClick={onDelete} disabled={product.everPublished || product.archived} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#b63c35] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="size-3.5" /> Hapus produk</button></div>
    </div>
  );
}

function VariationsEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  function addVariation() {
    update((current) => ({ ...current, variations: [...current.variations, { id: createId("variation"), name: "Variasi baru", sku: `${current.sku}-VAR` }] }));
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
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-extrabold">Variasi produk</p><p className="mt-1 text-[10px] leading-4 text-[#818a8f]">Tambahkan variasi jika satu produk memiliki beberapa SKU atau pilihan.</p></div><button type="button" onClick={addVariation} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#0035b9]/20 bg-[#f4f7ff] px-3 text-[10px] font-extrabold text-[#0035b9]"><Plus className="size-3" /> Tambah variasi</button></div>
      {product.variations.length > 0 ? <div className="mt-4 space-y-2">{product.variations.map((variation) => <div key={variation.id} className="grid gap-2 rounded-xl bg-[#f6f7f8] p-3 sm:grid-cols-[1fr_1fr_auto]"><input value={variation.name} onChange={(event) => update((current) => ({ ...current, variations: current.variations.map((item) => item.id === variation.id ? { ...item, name: event.target.value } : item) }))} aria-label="Nama variasi" className="h-10 rounded-lg border border-[#2c3038]/9 bg-white px-3 text-xs font-semibold outline-none focus:border-[#0035b9]/40" /><input value={variation.sku} onChange={(event) => update((current) => ({ ...current, variations: current.variations.map((item) => item.id === variation.id ? { ...item, sku: event.target.value } : item) }))} aria-label="SKU variasi" className="h-10 rounded-lg border border-[#2c3038]/9 bg-white px-3 text-xs font-semibold outline-none focus:border-[#0035b9]/40" /><button type="button" onClick={() => deleteVariation(variation.id)} className="grid size-10 place-items-center rounded-lg bg-[#fff0ef] text-[#b33b31]" aria-label={`Hapus variasi ${variation.name}`}><Trash2 className="size-3.5" /></button></div>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-[#2c3038]/12 p-4 text-center text-[10px] text-[#8b9397]">Produk ini belum memiliki variasi.</p>}
    </div>
  );
}

type TicketService = "warranty" | "care" | "service-center";

const ticketServices: Record<TicketService, {
  title: string;
  eyebrow: string;
  description: string;
  url: string;
  icon: IconType;
  accent: string;
}> = {
  warranty: {
    title: "Klaim Garansi",
    eyebrow: "PERLINDUNGAN PRODUK",
    description: "Ajukan pemeriksaan garansi dengan melengkapi data pembelian dan bukti kendala produk.",
    url: "/klaim-garansi",
    icon: BadgeCheck,
    accent: "bg-[#edf4ff] text-[#0035b9]",
  },
  care: {
    title: "Gascomp Care",
    eyebrow: "BANTUAN PELANGGAN",
    description: "Sampaikan pertanyaan atau kendala yang belum selesai melalui tutorial dan FAQ produk.",
    url: "https://gascompsuperlock.com/kontak/",
    icon: HeartHandshake,
    accent: "bg-[#e9f5ed] text-[#3f8056]",
  },
  "service-center": {
    title: "Service Center",
    eyebrow: "PERBAIKAN PRODUK",
    description: "Temukan layanan purna jual dan ajukan bantuan sebelum membawa produk ke service center.",
    url: "https://gascompsuperlock.com/kontak/?layanan=service-center",
    icon: MapPin,
    accent: "bg-[#fff3e8] text-[#a65b27]",
  },
};

function TicketServiceCard({ product, service }: { product: Product; service: TicketService }) {
  const item = ticketServices[service];
  const Icon = item.icon;
  const separator = item.url.includes("?") ? "&" : "?";
  const ticketUrl = `${item.url}${separator}sku=${encodeURIComponent(product.sku)}&product=${encodeURIComponent(product.name)}`;
  const isInternal = item.url.startsWith("/");

  return (
    <div>
      <EditorHeading title={item.title} copy={`Akses layanan untuk ${product.name} (${product.sku}).`} />
      <article className="mt-7 overflow-hidden rounded-[24px] border border-[#2c3038]/9 bg-[#fafbfc]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${item.accent}`}><Icon className="size-5" /></span>
            <div>
              <p className="text-[9px] font-extrabold tracking-[0.14em] text-[#879096]">{item.eyebrow}</p>
              <h3 className="mt-2 text-xl font-extrabold tracking-[-0.03em]">{item.title}</h3>
              <p className="mt-2 max-w-xl text-xs leading-5 text-[#707a80]">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-[#69747b]"><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">SKU: {product.sku}</span><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Produk: {product.name}</span></div>
            </div>
          </div>
          <a href={ticketUrl} target={isInternal ? undefined : "_blank"} rel={isInternal ? undefined : "noreferrer"} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-5 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(0,53,185,0.2)]"><TicketCheck className="size-4" /> Ajukan tiket</a>
        </div>
        <div className="border-t border-[#2c3038]/8 bg-white px-6 py-4 text-[10px] leading-4 text-[#858e93] sm:px-8">{isInternal ? "Tombol membuka formulir Klaim Garansi di website bantuan Gascomp." : "Tombol membuka kanal resmi Gascomp di tab baru. Data pelanggan tidak disimpan di panel admin prototipe ini."}</div>
      </article>
    </div>
  );
}

function VideosEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  function addVideo() {
    update((current) => ({ ...current, videos: [...current.videos, { id: createId("video"), title: "Tutorial baru", description: "", youtubeUrl: "", duration: "" }] }));
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-4"><EditorHeading title="Video tutorial" copy="Tempel tautan YouTube. Video diputar langsung di halaman Gascomp." /><button type="button" onClick={addVideo} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white"><Plus className="size-3.5" /> Tambah</button></div>
      <div className="mt-7 space-y-4">
        {product.videos.map((video, index) => {
          const embedUrl = getYoutubeEmbedUrl(video.youtubeUrl);
          return (
            <article key={video.id} className="rounded-[20px] border border-[#2c3038]/9 bg-[#fbfaf7] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between"><p className="text-xs font-extrabold">Video {String(index + 1).padStart(2, "0")}</p><button type="button" onClick={() => update((current) => ({ ...current, videos: current.videos.filter((item) => item.id !== video.id) }))} className="grid size-8 place-items-center rounded-full text-[#9b7770] hover:bg-[#feeae5] hover:text-[#c9482d]" aria-label="Hapus video"><Trash2 className="size-3.5" /></button></div>
              <div className="grid gap-5 lg:grid-cols-[1fr_190px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Judul video"><input value={video.title} onChange={(event) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, title: event.target.value } : item) }))} className={fieldClass} /></Field>
                  <Field label="Durasi"><input value={video.duration} onChange={(event) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, duration: event.target.value } : item) }))} placeholder="Contoh: 03:20" className={fieldClass} /></Field>
                  <div className="sm:col-span-2"><Field label="Tautan YouTube"><input value={video.youtubeUrl} onChange={(event) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, youtubeUrl: event.target.value } : item) }))} placeholder="https://youtube.com/watch?v=..." className={fieldClass} />{video.youtubeUrl && !embedUrl && <p className="mt-2 text-[10px] font-semibold text-[#bd5236]">Tautan YouTube belum dikenali.</p>}</Field></div>
                  <div className="sm:col-span-2"><Field label="Deskripsi"><textarea value={video.description} onChange={(event) => update((current) => ({ ...current, videos: current.videos.map((item) => item.id === video.id ? { ...item, description: event.target.value } : item) }))} className={areaClass} /></Field></div>
                </div>
                <div><p className="mb-2 text-[10px] font-extrabold text-[#8c9498]">PRATINJAU</p><div className="aspect-video overflow-hidden rounded-xl bg-[#2c3038]">{embedUrl ? <iframe src={embedUrl} title={`Pratinjau ${video.title}`} className="size-full" allowFullScreen /> : <div className="grid size-full place-items-center text-white/35"><Play className="size-7" /></div>}</div></div>
              </div>
            </article>
          );
        })}
        {product.videos.length === 0 && <AdminEmpty icon={MonitorPlay} text="Belum ada video tutorial." action="Tambahkan video pertama" onClick={addVideo} />}
      </div>
    </div>
  );
}

function FaqEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  function addFaq() {
    update((current) => ({ ...current, faqs: [...current.faqs, { id: createId("faq"), question: "Pertanyaan baru", answer: "Tuliskan jawaban untuk pelanggan." }] }));
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-4"><EditorHeading title="Pertanyaan umum" copy="Gunakan bahasa yang biasa dipakai pelanggan saat bertanya." /><button type="button" onClick={addFaq} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white"><Plus className="size-3.5" /> Tambah</button></div>
      <div className="mt-7 space-y-3">
        {product.faqs.map((faq, index) => (
          <article key={faq.id} className="rounded-[20px] border border-[#2c3038]/9 bg-[#fbfaf7] p-4 sm:p-5">
            <div className="flex gap-3">
              <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-[#edf4ff] text-[10px] font-extrabold text-[#0035b9]">{index + 1}</span>
              <div className="min-w-0 flex-1 space-y-4"><Field label="Pertanyaan"><input value={faq.question} onChange={(event) => update((current) => ({ ...current, faqs: current.faqs.map((item) => item.id === faq.id ? { ...item, question: event.target.value } : item) }))} className={fieldClass} /></Field><Field label="Jawaban"><textarea value={faq.answer} onChange={(event) => update((current) => ({ ...current, faqs: current.faqs.map((item) => item.id === faq.id ? { ...item, answer: event.target.value } : item) }))} className={areaClass} /></Field></div>
              <button type="button" onClick={() => update((current) => ({ ...current, faqs: current.faqs.filter((item) => item.id !== faq.id) }))} className="grid size-8 shrink-0 place-items-center rounded-full text-[#9b7770] hover:bg-[#feeae5] hover:text-[#c9482d]" aria-label="Hapus FAQ"><Trash2 className="size-3.5" /></button>
            </div>
          </article>
        ))}
        {product.faqs.length === 0 && <AdminEmpty icon={CircleHelp} text="Belum ada pertanyaan umum." action="Tambahkan FAQ pertama" onClick={addFaq} />}
      </div>
    </div>
  );
}

function SettingsEditor({ whatsapp, hours, update, reset }: { whatsapp: string; hours: string; update: (whatsapp: string, hours: string) => void; reset: () => void }) {
  return (
    <section className="max-w-3xl overflow-hidden rounded-[22px] border border-[#2c3038]/8 bg-white shadow-sm">
      <div className="border-b border-[#2c3038]/8 p-6"><h2 className="text-xl font-extrabold tracking-[-0.03em]">Pengaturan bantuan</h2><p className="mt-2 text-xs leading-5 text-[#788287]">Informasi ini digunakan di semua halaman produk.</p></div>
      <div className="space-y-7 p-6">
        <div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9f5ed] text-[#3f8759]"><MessageCircle className="size-4" /></span><div className="flex-1"><Field label="Nomor WhatsApp admin" hint="Gunakan kode negara. Contoh: 6281234567890"><input value={whatsapp} onChange={(event) => update(event.target.value, hours)} className={fieldClass} inputMode="tel" /></Field></div></div>
        <div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-[#0035b9]"><Clock3 className="size-4" /></span><div className="flex-1"><Field label="Jam layanan"><input value={hours} onChange={(event) => update(whatsapp, event.target.value)} className={fieldClass} /></Field></div></div>
        <div className="border-t border-[#2c3038]/8 pt-6"><button type="button" onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c95845]/20 bg-[#fff7f4] px-4 text-xs font-extrabold text-[#b74935]"><RotateCcw className="size-3.5" /> Pulihkan hasil sinkronisasi</button><p className="mt-2 text-[10px] text-[#949b9f]">Perubahan lokal akan dihapus dan katalog kembali ke hasil impor Duoke terakhir.</p></div>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] font-extrabold text-[#4f5b62]">{label}</span>{children}{hint && <span className="mt-1.5 block text-[9px] leading-4 text-[#92999d]">{hint}</span>}</label>;
}

function EditorHeading({ title, copy }: { title: string; copy: string }) {
  return <div><h2 className="text-lg font-extrabold tracking-[-0.025em]">{title}</h2><p className="mt-1.5 max-w-lg text-xs leading-5 text-[#7a8489]">{copy}</p></div>;
}

function AdminEmpty({ icon: Icon, text, action, onClick }: { icon: IconType; text: string; action: string; onClick: () => void }) {
  return <div className="rounded-[20px] border border-dashed border-[#2c3038]/14 p-10 text-center"><Icon className="mx-auto size-8 text-[#b0b6b9]" /><p className="mt-3 text-xs font-semibold text-[#7d878c]">{text}</p><button type="button" onClick={onClick} className="mt-4 text-xs font-extrabold text-[#0035b9]">{action}</button></div>;
}
