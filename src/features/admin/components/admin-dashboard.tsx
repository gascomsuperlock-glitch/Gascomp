"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, Check, ExternalLink, LoaderCircle, LogOut, Menu, MonitorPlay, Package, Save } from "lucide-react";
import { logoutAction } from "@/features/auth/server/actions";
import { useContent } from "@/features/catalog/hooks/use-content";
import { ProductManagementList } from "@/features/catalog/components/product-management-list";
import { updateBulkProductStatus } from "@/features/catalog/model/bulk-product-status";
import { ProductImageEditor } from "@/features/catalog/components/product-image-editor";
import { QrCodeCard } from "@/features/catalog/components/qr-code-card";
import { createId } from "@/shared/lib/create-id";
import { createSlug } from "@/features/catalog/model/product-utils";
import type { Product } from "@/features/catalog/model/types";
import type { WarrantyTicket } from "@/features/warranty/model/types";
import type { MainView } from "@/features/admin/model/types";
import type { EditorTab } from "@/features/catalog/model/editor-types";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { Overview } from "@/features/admin/components/overview";
import { TicketInbox } from "@/features/warranty/components/ticket-inbox";
import { CareAdmin } from "@/features/gascomp-care/components/care-admin";
import { WarrantyNotifications } from "@/features/warranty/components/warranty-notifications";
import { DetailsEditor } from "@/features/catalog/components/details-editor";
import { TicketServiceCard } from "@/features/catalog/components/ticket-service-card";
import { VideosEditor } from "@/features/catalog/components/videos-editor";
import { FaqEditor } from "@/features/catalog/components/faq-editor";
import { IssuesEditor } from "@/features/catalog/components/issues-editor";
import { SettingsEditor } from "@/features/catalog/components/settings-editor";
import { ContentEditorNavigation } from "@/features/admin/components/content-editor-navigation";

export function AdminDashboard({ initialTicketId, initialTickets = [], backendError, ticketError, publicBaseUrl }: { initialTicketId?: string; initialTickets?: WarrantyTicket[]; backendError?: string; ticketError?: string; publicBaseUrl?: string }) {
  const { content, updateContent, saveContent, cancelContent, resetContent, storageMode, saveState, hasUnsavedChanges, saveError } = useContent();
  const [tickets, setTickets] = useState(initialTickets);
  const [view, setView] = useState<MainView>(initialTicketId ? "tickets" : "overview");
  const compactTicketHeader = view === "tickets" && !hasUnsavedChanges && saveState !== "saving" && saveState !== "error";
  const hideCatalogControls = view === "care" && !hasUnsavedChanges && saveState !== "saving" && saveState !== "error" && !saveError;
  const [editorTab, setEditorTab] = useState<EditorTab>("details");
  const [selectedId, setSelectedId] = useState(content.products[0]?.id ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const productList = useRef<HTMLDivElement>(null);

  function focusEditor() {
    setShowEditor(true);
    requestAnimationFrame(() => {
      editorHeading.current?.focus({ preventScroll: true });
      editorHeading.current?.closest("section")?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }

  function browseProducts() {
    setShowEditor(false);
    requestAnimationFrame(() => {
      const target = productList.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
        ?? productList.current?.querySelector<HTMLInputElement>('input[type="search"]');
      target?.focus();
    });
  }

  function manageProducts() {
    setView("content");
    setShowEditor(false);
    setSidebarOpen(false);
  }
  const [acknowledgedTickets, setAcknowledgedTickets] = useState<Record<string, WarrantyTicket>>({});

  const selectedProduct = content.products.find((product) => product.id === selectedId) ?? content.products[0];
  const totalVideos = content.products.reduce((total, product) => total + product.videos.length, 0);
  const totalFaqs = content.products.reduce((total, product) => total + product.faqs.length, 0);
  const publishedCount = content.products.filter((product) => product.published && !product.archived).length;

  function updateProduct(productId: string, updater: (product: Product) => Product) {
    updateContent((current) => ({
      ...current,
      products: current.products.map((product) => product.id === productId ? updater(product) : product),
    }));
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
    focusEditor();
  }

  function openProduct(productId: string, tab: EditorTab = "details") {
    setSelectedId(productId);
    setEditorTab(tab);
    setView("content");
    focusEditor();
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
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef] text-[#2c3038]">
      <AdminSidebar view={view} setView={setView} open={sidebarOpen} close={() => setSidebarOpen(false)} />

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-[#2c3038]/8 bg-white/95 px-4 py-3 backdrop-blur-xl sm:h-[68px] sm:flex-nowrap sm:px-7 sm:py-0">
          <div className={`flex items-center ${view === "tickets" ? "gap-2 sm:gap-3" : "gap-3"}`}>
            <button type="button" onClick={() => setSidebarOpen(true)} className="grid size-9 place-items-center rounded-xl border border-[#2c3038]/10 lg:hidden" aria-label="Open menu"><Menu className="size-4" /></button>
            <div>
              <p className="text-[10px] font-bold text-[#8c9498]">DASHBOARD GASCOMP</p>
              <h1 className={`${compactTicketHeader ? "text-xs min-[360px]:text-sm" : "text-sm"} font-extrabold`}>{view === "overview" ? "Overview" : view === "content" ? "Help Content" : view === "tickets" ? "Warranty tickets" : view === "care" ? "GascompCare" : "Settings"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span aria-live="polite" className={`${hideCatalogControls ? "hidden" : "hidden sm:flex"} items-center gap-1.5 text-[10px] font-bold transition ${saveState === "error" ? "text-[#b33b31]" : hasUnsavedChanges ? "text-[#9a6a2f]" : saveState === "saved" ? "text-[#3f8759]" : "text-[#90979b]"}`}>{!hasUnsavedChanges && saveState === "saved" ? <Check className="size-3.5" /> : <Save className="size-3.5" />}{saveState === "saving" ? "Saving changes..." : saveState === "error" ? "Save failed" : hasUnsavedChanges ? "Unsaved changes" : saveState === "saved" ? "Changes saved" : storageMode === "supabase" ? "Supabase active" : "Local storage ready"}</span>
            <WarrantyNotifications
              tickets={tickets}
              setTickets={setTickets}
              acknowledgedTickets={acknowledgedTickets}
              openInbox={() => {
                setView("tickets");
                setSidebarOpen(false);
              }}
            />
            <button type="button" onClick={() => { cancelContent(); setEditorVersion((version) => version + 1); }} disabled={saveState === "saving" || !hasUnsavedChanges} className={`${hideCatalogControls ? "hidden" : compactTicketHeader ? "hidden sm:inline-flex" : "inline-flex"} h-9 items-center rounded-full border border-[#2c3038]/15 px-4 text-xs font-extrabold disabled:opacity-40`}>Cancel</button>
            <button type="button" onClick={() => void saveContent()} disabled={saveState === "saving" || !hasUnsavedChanges} className={`${hideCatalogControls ? "hidden" : compactTicketHeader ? "hidden sm:inline-flex" : "inline-flex"} h-9 items-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white transition hover:bg-[#002c98] disabled:cursor-not-allowed disabled:opacity-50`}>
              {saveState === "saving" ? <LoaderCircle className="size-3.5 animate-spin" /> : !hasUnsavedChanges && saveState === "saved" ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
              <span>{saveState === "saving" ? "Saving..." : saveState === "error" ? "Retry save" : !hasUnsavedChanges && saveState === "saved" ? "Saved" : "Save"}</span>
            </button>
            <Link href="/" target="_blank" aria-label="View website" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#2c3038] px-3 text-xs font-extrabold text-white sm:px-4"><ExternalLink aria-hidden="true" className="size-3.5" /> <span className="hidden sm:inline">View website</span></Link>
            <form action={logoutAction}>
              <button type="submit" className="grid size-9 place-items-center rounded-full border border-[#2c3038]/10 bg-white text-[#69747b] transition hover:border-[#b63c35]/20 hover:bg-[#fff3f1] hover:text-[#b63c35]" aria-label="Sign out of dashboard">
                <LogOut className="size-3.5" />
              </button>
            </form>
          </div>
        </header>

        <main className={`px-4 ${view === "tickets" || view === "content" ? "py-4" : "py-6"} sm:px-7 sm:py-8`}>
          <div className="mx-auto max-w-[1220px]">
            <div className={`${view === "content" ? "mb-4 sm:mb-6" : "mb-6"} ${hideCatalogControls && !backendError ? "hidden" : compactTicketHeader && !backendError && !saveError ? "hidden sm:flex" : "flex"} items-start gap-3 rounded-2xl border ${view === "content" ? "p-3 sm:p-4" : "p-4"} text-xs leading-5 ${backendError || saveError ? "border-[#d65d50]/30 bg-[#fff0ef] text-[#a23f36]" : storageMode === "supabase" ? "border-[#79ab8a]/35 bg-[#edf8f0] text-[#3e7652]" : "border-[#e5b895]/40 bg-[#fff5ec] text-[#8c4a2d]"}`}>
              <MonitorPlay className="mt-0.5 size-4 shrink-0" />
              <p>{backendError || saveError ? <><strong>{saveError ? "Save failed." : "Storage connection issue."}</strong> {saveError || backendError}</> : storageMode === "supabase" ? <><strong>Supabase connected.</strong> Changes remain in the editor until you select Save.</> : <><strong>Local mode.</strong> Changes remain in this browser and are committed only when you select Save.</>}</p>
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
                onManageProducts={manageProducts}
              />
            )}

            {view === "content" && (
              <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div ref={productList} className={`${showEditor && selectedProduct ? "hidden xl:block" : "block"} min-w-0 xl:sticky xl:top-[88px]`}>
                <ProductManagementList
                  products={content.products}
                  activeId={selectedProduct?.id}
                  saving={saveState === "saving"}
                  onAdd={addProduct}
                  onOpen={(id) => { setSelectedId(id); focusEditor(); }}
                  onBulkStatus={(ids, status) => updateContent((current) => ({
                    ...current,
                    products: updateBulkProductStatus(current.products, ids, status),
                  }))}
                />
                </div>

                {selectedProduct ? (
                  <section aria-label="Product content editor" className={`${showEditor ? "block" : "hidden xl:block"} min-w-0 scroll-mt-40 overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white shadow-sm sm:scroll-mt-24`}>
                    <div className="border-b border-[#e3e8ef] p-3 sm:p-6">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-1 sm:mb-4 sm:gap-2">
                        <button type="button" onClick={browseProducts} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#dfe4eb] px-2 text-xs sm:gap-2 sm:px-3 font-bold text-[#0035b9] hover:bg-[#edf4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9] xl:hidden"><ArrowLeft aria-hidden="true" className="size-4" /> Back to Products</button>
                        <p className="hidden text-[10px] font-bold uppercase tracking-[0.13em] text-[#637086] sm:block">Editing Product</p>
                        {(selectedProduct.published || selectedProduct.archived) && <Link href={`/produk/${selectedProduct.slug}`} target="_blank" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#0035b9] hover:bg-[#edf4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]">Open Guide <ExternalLink aria-hidden="true" className="size-3.5" /></Link>}
                      </div>
                      <div className="flex min-w-0 items-start gap-3">
                        <span aria-hidden="true" className="hidden size-12 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-[#0035b9] sm:grid"><Package className="size-6" /></span>
                        <div className="min-w-0 flex-1"><h2 ref={editorHeading} tabIndex={-1} translate="no" className="scroll-mt-40 break-words text-lg font-extrabold leading-6 sm:text-xl sm:leading-7 tracking-[-0.025em] text-[#172b4d] outline-none sm:scroll-mt-28">{selectedProduct.name}</h2><p translate="no" className="mt-1 break-words text-xs leading-5 text-[#53657c]">SKU: {selectedProduct.sku}{selectedProduct.model ? ` · ${selectedProduct.model}` : ""}</p></div>
                      </div>
                      <div className="mt-3 grid gap-2 rounded-xl border border-[#e3e8ef] bg-[#f8fafc] p-2.5 sm:mt-5 sm:gap-3 sm:p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)] sm:items-center">
                        <div><p className="text-xs font-bold text-[#34445e]">Publication Status</p><p className="mt-1 text-[11px] leading-5 text-[#637086]">{selectedProduct.archived ? "Hidden from the catalog. Existing QR links remain active." : selectedProduct.published ? "Visible in the public product catalog." : "Only your team can see this draft."} Select Save to apply changes.</p></div>
                        <label className="min-w-0"><span className="sr-only">Product status</span><select value={selectedProduct.archived ? "archived" : selectedProduct.published ? "published" : "draft"} onChange={(event) => updateProduct(selectedProduct.id, (product) => ({ ...product, published: event.target.value === "published", archived: event.target.value === "archived" && product.everPublished, everPublished: product.everPublished || event.target.value === "published" }))} className="h-11 w-full min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#34445e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]"><option value="draft">Draft</option><option value="published">Published</option><option value="archived" disabled={!selectedProduct.everPublished}>Archived · QR remains active</option></select></label>
                      </div>
                    </div>

                    <ContentEditorNavigation activeTab={editorTab} onSelect={setEditorTab} product={selectedProduct} />

                    <div key={editorVersion} className="p-3 sm:p-7 max-sm:[&_input:not([type=checkbox]):not([type=radio])]:text-base max-sm:[&_textarea]:text-base max-sm:[&_select]:text-base">
                      {editorTab === "details" && <DetailsEditor product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} onDelete={() => deleteProduct(selectedProduct)} />}
                      {editorTab === "images" && <ProductImageEditor product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} />}
                      {editorTab === "videos" && <VideosEditor key={selectedProduct.id} product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} />}
                      {editorTab === "issues" && <IssuesEditor product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} />}
                      {editorTab === "faqs" && <FaqEditor product={selectedProduct} update={(updater) => updateProduct(selectedProduct.id, updater)} />}
                      {editorTab === "qr" && <QrCodeCard key={`${selectedProduct.id}:${selectedProduct.slug}:${publicBaseUrl}`} slug={selectedProduct.slug} name={selectedProduct.name} sku={selectedProduct.sku} published={selectedProduct.published} archived={selectedProduct.archived} publicBaseUrl={publicBaseUrl} />}
                      {editorTab === "warranty" && <TicketServiceCard product={selectedProduct} service="warranty" />}
                      {editorTab === "care" && <TicketServiceCard product={selectedProduct} service="care" />}
                      {editorTab === "service-center" && <TicketServiceCard product={selectedProduct} service="service-center" />}
                    </div>
                  </section>
                ) : <div className="hidden rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-20 text-center xl:block"><Package aria-hidden="true" className="mx-auto size-10 text-[#8994a5]" /><h2 className="mt-4 text-lg font-bold text-[#172b4d]">Create Your First Guide</h2><p className="mt-2 text-sm text-[#637086]">Add a product, then build its tutorials, FAQs, and support content.</p><button type="button" onClick={addProduct} className="mt-5 min-h-11 rounded-lg bg-[#0035b9] px-4 text-sm font-bold text-white hover:bg-[#002b96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0035b9]">Add Product</button></div>}
              </div>
            )}

            {ticketError && <p role="alert" className="mb-6 rounded-2xl border border-[#d65d50]/30 bg-[#fff0ef] p-4 text-xs leading-5 text-[#a23f36]">{ticketError}</p>}
            {view === "tickets" && !ticketError && <TicketInbox initialQuery={initialTicketId} tickets={tickets} setTickets={setTickets} onTicketUpdated={(ticket) => setAcknowledgedTickets((current) => ({ ...current, [ticket.ticketId]: ticket }))} />}

            {view === "care" && <CareAdmin />}

            {view === "settings" && (
              <SettingsEditor
                whatsapp={content.whatsappNumber}
                hours={content.supportHours}
                update={(whatsappNumber, supportHours) => {
                  updateContent((current) => ({ ...current, whatsappNumber, supportHours }));
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
