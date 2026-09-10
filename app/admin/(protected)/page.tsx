import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ContentProvider } from "@/components/content-provider";
import { loadAdminSiteContent } from "@/lib/site-content-store";
import { listWarrantyTickets } from "@/lib/warranty-tickets";

export const metadata: Metadata = {
  title: "Dashboard Admin",
  description: "Kelola produk dan konten bantuan Gascomp.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const [loaded, ticketResult] = await Promise.all([
    loadAdminSiteContent(),
    listWarrantyTickets().then(
      (tickets) => ({ tickets, error: undefined }),
      (error: unknown) => {
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        console.error("Warranty tickets load failed", error);
        return {
          tickets: [],
          error: code === "PGRST205" || code === "42P01"
            ? "Tiket garansi belum tersedia. Jalankan migrasi 202609100002_warranty.sql di Supabase SQL Editor, lalu muat ulang halaman."
            : "Tiket garansi gagal dimuat. Periksa koneksi Supabase lalu muat ulang halaman.",
        };
      },
    ),
  ]);

  return (
    <ContentProvider initialContent={loaded.content} storageMode={loaded.storageMode}>
      <AdminDashboard initialTickets={ticketResult.tickets} backendError={loaded.error} ticketError={ticketResult.error} />
    </ContentProvider>
  );
}
