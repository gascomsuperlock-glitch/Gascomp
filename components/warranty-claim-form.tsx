"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  createWarrantyClaim,
  type WarrantyClaimState,
} from "@/app/klaim-garansi/actions";

const initialState: WarrantyClaimState = {};
const inputClass = "mt-2 h-12 w-full rounded-xl border border-[#2c3038]/10 bg-white px-4 text-sm font-semibold text-[#2c3038] outline-none transition placeholder:text-[#a1a8ac] focus:border-[#0035b9]/45 focus:ring-4 focus:ring-[#0035b9]/8";
const fileClass = "mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-[#2c3038]/15 bg-[#fafbfc] px-4 py-4 text-xs font-semibold text-[#69747b] file:mr-4 file:rounded-full file:border-0 file:bg-[#eaf1ff] file:px-4 file:py-2 file:text-xs file:font-extrabold file:text-[#0035b9] hover:border-[#0035b9]/30";

export function WarrantyClaimForm({
  defaultProduct,
  defaultSku,
}: {
  defaultProduct: string;
  defaultSku: string;
}) {
  const [state, action, pending] = useActionState(createWarrantyClaim, initialState);

  if (state.success && state.ticketId) {
    return (
      <div className="rounded-[28px] border border-[#2c3038]/8 bg-white p-7 text-center shadow-[0_22px_60px_rgba(44,48,56,0.09)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e8f5ec] text-[#3d8958]"><CheckCircle2 className="size-8" /></span>
        <p className="mt-6 text-[10px] font-extrabold tracking-[0.15em] text-[#3d8958]">TIKET BERHASIL DIBUAT</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">Klaim sedang menunggu pemeriksaan</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#707a80]">Simpan nomor tiket berikut untuk proses tindak lanjut dari tim Gascomp.</p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[#0035b9]/12 bg-[#f3f7ff] px-5 py-4">
          <span className="block text-[9px] font-extrabold tracking-[0.13em] text-[#7b8899]">NOMOR TIKET</span>
          <strong className="mt-1 block text-xl tracking-[0.04em] text-[#0035b9]">{state.ticketId}</strong>
        </div>
        <Link href="/" className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#2c3038] px-5 text-xs font-extrabold text-white"><ArrowLeft className="size-4" /> Kembali ke pusat bantuan</Link>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-[28px] border border-[#2c3038]/8 bg-white p-5 shadow-[0_22px_60px_rgba(44,48,56,0.09)] sm:p-8">
      <div className="flex items-start gap-3 border-b border-[#2c3038]/8 pb-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf4ff] text-[#0035b9]"><ShieldCheck className="size-5" /></span>
        <div><h2 className="text-xl font-extrabold tracking-[-0.03em]">Formulir klaim</h2><p className="mt-1 text-xs leading-5 text-[#7a8489]">Isi data sesuai bukti pembelian agar klaim dapat diperiksa.</p></div>
      </div>

      {state.error && <div role="alert" className="mt-5 rounded-xl bg-[#fff0ef] p-4 text-xs font-semibold text-[#ad4037]">{state.error}</div>}

      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ClaimField label="Nama lengkap" error={state.fieldErrors?.name}><input name="name" required maxLength={120} autoComplete="name" placeholder="Nama sesuai identitas" className={inputClass} /></ClaimField>
        <ClaimField label="Nomor WhatsApp" error={state.fieldErrors?.whatsapp}><input name="whatsapp" required maxLength={30} inputMode="tel" autoComplete="tel" placeholder="Contoh: 081234567890" className={inputClass} /></ClaimField>
        <ClaimField label="Email" error={state.fieldErrors?.email}><input name="email" required maxLength={180} type="email" autoComplete="email" placeholder="nama@email.com" className={inputClass} /></ClaimField>
        <ClaimField label="Tanggal pembelian" error={state.fieldErrors?.purchaseDate}><input name="purchaseDate" required type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass} /></ClaimField>
        <ClaimField label="Nama produk" error={state.fieldErrors?.product}><input name="product" required maxLength={180} defaultValue={defaultProduct} placeholder="Nama produk Gascomp" className={inputClass} /></ClaimField>
        <ClaimField label="SKU produk" error={state.fieldErrors?.sku}><input name="sku" required maxLength={80} defaultValue={defaultSku} placeholder="SKU pada produk atau kemasan" className={inputClass} /></ClaimField>
        <ClaimField label="Toko tempat pembelian" error={state.fieldErrors?.store}><input name="store" required maxLength={160} placeholder="Nama toko atau marketplace" className={inputClass} /></ClaimField>
        <ClaimField label="Nomor pesanan" error={state.fieldErrors?.orderNumber}><input name="orderNumber" required maxLength={120} placeholder="Contoh: INV/2026/001234" className={inputClass} /></ClaimField>
        <div className="sm:col-span-2"><ClaimField label="Harga pembelian" hint="Masukkan angka Rupiah tanpa titik atau koma" error={state.fieldErrors?.purchasePrice}><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#69747b]">Rp</span><input name="purchasePrice" required maxLength={16} inputMode="numeric" pattern="[0-9]+" placeholder="250000" className={`${inputClass} pl-12`} /></div></ClaimField></div>
        <div className="sm:col-span-2"><ClaimField label="Masalah produk" error={state.fieldErrors?.problem}><textarea name="problem" required minLength={15} maxLength={3000} placeholder="Jelaskan kondisi produk dan kendala yang dialami..." className={`${inputClass} min-h-32 resize-y py-3 leading-6`} /></ClaimField></div>
      </div>

      <div className="mt-7 border-t border-[#2c3038]/8 pt-6">
        <div className="flex items-center gap-2"><FileCheck2 className="size-4 text-[#0035b9]" /><h3 className="text-sm font-extrabold">Bukti pendukung</h3></div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <ClaimField label="Invoice atau bukti pembelian" hint="Wajib · JPG, PNG, WebP, atau PDF · maksimal 4 MB" error={state.fieldErrors?.invoice}><input name="invoice" required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className={fileClass} /></ClaimField>
          <ClaimField label="Foto kondisi produk" hint="Wajib · 1–4 foto JPG, PNG, atau WebP · maksimal 4 MB per foto" error={state.fieldErrors?.damagePhotos}><input name="damagePhotos" required multiple type="file" accept="image/jpeg,image/png,image/webp" className={fileClass} /></ClaimField>
          <div className="sm:col-span-2"><ClaimField label="Video kendala produk" hint="Wajib · MP4, WebM, atau MOV · maksimal 12 MB" error={state.fieldErrors?.damageVideo}><input name="damageVideo" required type="file" accept="video/mp4,video/webm,video/quicktime" className={fileClass} /></ClaimField></div>
        </div>
      </div>

      <label className="mt-7 flex items-start gap-3 rounded-2xl bg-[#f5f7fa] p-4 text-xs leading-5 text-[#606c73]">
        <input name="agreement" value="yes" type="checkbox" required className="mt-0.5 size-4 rounded border-[#2c3038]/20 accent-[#0035b9]" />
        <span>Saya memastikan data dan bukti yang dikirim benar serta mengizinkan tim Gascomp menghubungi saya untuk pemeriksaan klaim.</span>
      </label>
      {state.fieldErrors?.agreement && <p className="mt-2 text-[10px] font-semibold text-[#b33b31]">{state.fieldErrors.agreement}</p>}

      <button type="submit" disabled={pending} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0035b9] text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(0,53,185,0.22)] transition hover:bg-[#002b96] disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? "Mengirim klaim..." : "Ajukan tiket klaim"}
      </button>
      <p className="mt-3 text-center text-[10px] leading-4 text-[#92999d]"><Upload className="mr-1 inline size-3" /> Lampiran disimpan privat dan hanya dapat dibuka melalui panel admin.</p>
    </form>
  );
}

function ClaimField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] font-extrabold text-[#4f5b62]">{label}</span>{children}{hint && <span className="mt-1.5 block text-[9px] leading-4 text-[#92999d]">{hint}</span>}{error && <span className="mt-1.5 block text-[10px] font-semibold text-[#b33b31]">{error}</span>}</label>;
}
