import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { WarrantyClaimForm } from "@/components/warranty-claim-form";

export const metadata: Metadata = {
  title: "Klaim Garansi",
  description: "Ajukan tiket klaim garansi produk Gascomp.",
};

export default async function WarrantyClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string | string[]; product?: string | string[] }>;
}) {
  const query = await searchParams;
  const defaultSku = typeof query.sku === "string" ? query.sku.slice(0, 80) : "";
  const defaultProduct = typeof query.product === "string" ? query.product.slice(0, 180) : "";

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#2c3038]">
      <header className="border-b border-[#2c3038]/8 bg-white">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-extrabold text-[#647077] hover:text-[#0035b9]"><ArrowLeft className="size-4" /> Pusat bantuan</Link>
        </div>
      </header>

      <main className="px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <aside className="lg:sticky lg:top-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e9f1ff] px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] text-[#0035b9]"><ShieldCheck className="size-3.5" /> LAYANAN RESMI GASCOMP</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">Klaim Garansi</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#68747b]">Ajukan pemeriksaan produk dengan data pembelian dan bukti yang lengkap. Tim Gascomp akan meninjau pengajuan berdasarkan ketentuan garansi.</p>
            <div className="mt-8 space-y-3">
              {[
                [FileText, "Siapkan bukti pembelian", "Invoice atau tangkapan layar transaksi."],
                [CheckCircle2, "Jelaskan kendala", "Tuliskan kondisi produk dengan jelas."],
                [Clock3, "Simpan nomor tiket", "Nomor tiket muncul setelah pengajuan tersimpan."],
              ].map(([Icon, title, copy]) => {
                const ItemIcon = Icon as typeof FileText;
                return <div key={title as string} className="flex gap-3 rounded-2xl border border-[#2c3038]/8 bg-white p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-[#0035b9]"><ItemIcon className="size-4" /></span><div><strong className="block text-xs">{title as string}</strong><p className="mt-1 text-[10px] leading-4 text-[#7a858b]">{copy as string}</p></div></div>;
              })}
            </div>
          </aside>

          <WarrantyClaimForm defaultProduct={defaultProduct} defaultSku={defaultSku} />
        </div>
      </main>
    </div>
  );
}
