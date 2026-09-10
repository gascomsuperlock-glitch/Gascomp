import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { Brand } from "@/components/brand";
import { getAdminSession, isAuthConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Login Admin",
  description: "Akses aman dashboard konten Gascomp.",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f4f7fb] px-5 py-12 text-[#2c3038]">
      <div className="absolute -left-40 -top-40 size-[430px] rounded-full bg-[#dce9ff] blur-3xl" />
      <div className="absolute -bottom-48 -right-36 size-[460px] rounded-full bg-[#f3dcf8] blur-3xl" />

      <div className="relative w-full max-w-[440px]">
        <div className="mb-7 flex items-center justify-between px-2">
          <Brand />
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#68747d] transition hover:text-[#0066ff]">
            <ArrowLeft className="size-4" /> Kembali ke website
          </Link>
        </div>

        <section className="rounded-[28px] border border-[#2c3038]/8 bg-white p-6 shadow-[0_30px_80px_rgba(32,64,104,0.13)] sm:p-9">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#e9f2ff] text-[#0066ff]">
            <ShieldCheck className="size-5" />
          </span>
          <p className="mt-7 text-[10px] font-extrabold tracking-[0.16em] text-[#0066ff]">AREA TERBATAS</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">Login admin</h1>
          <p className="mt-3 text-sm leading-6 text-[#758089]">Masuk untuk mengelola SKU, tutorial, FAQ, dan QR produk Gascomp.</p>
          <AdminLoginForm configured={isAuthConfigured()} />
        </section>

        <p className="mt-5 text-center text-[10px] font-semibold text-[#8a949b]">Sesi akan berakhir otomatis setelah 8 jam.</p>
      </div>
    </main>
  );
}
