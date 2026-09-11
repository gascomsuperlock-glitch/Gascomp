import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { ContentProvider } from "@/features/catalog/components/content-provider";
import { loadAdminSiteContent } from "@/features/catalog/server/content-store";
import { listWarrantyTickets } from "@/features/warranty/server/ticket-service";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Manage Gascomp products and help content.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const publicBaseUrl = getPublicBaseUrl();
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
            ? "Warranty tickets are unavailable. Run migration 202609100002_warranty.sql in the Supabase SQL Editor, then reload the page."
            : "Warranty tickets could not be loaded. Check the Supabase connection, then reload the page.",
        };
      },
    ),
  ]);

  return (
    <ContentProvider initialContent={loaded.content} storageMode={loaded.storageMode}>
      <AdminDashboard initialTickets={ticketResult.tickets} backendError={loaded.error} ticketError={ticketResult.error} publicBaseUrl={publicBaseUrl} />
    </ContentProvider>
  );
}

function getPublicBaseUrl() {
  const configuredUrl = process.env.GASCOMP_PUBLIC_BASE_URL?.trim();
  if (!configuredUrl) return undefined;

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return undefined;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return undefined;
  }
}
