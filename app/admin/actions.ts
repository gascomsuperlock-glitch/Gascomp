"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionOptions,
  createSessionToken,
  getAdminSession,
  isAuthConfigured,
  verifyCredentials,
} from "@/lib/auth";
import type { SiteContent } from "@/lib/content";
import { persistSiteContent } from "@/lib/site-content-store";
import { updateWarrantyTicketStatus } from "@/lib/warranty-tickets";
import { WARRANTY_TICKET_STATUSES, type WarrantyTicketStatus } from "@/lib/warranty-ticket-types";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return { error: "Login admin belum dikonfigurasi pada server." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Masukkan username dan password." };
  }

  if (!verifyCredentials(username, password)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Username atau password tidak sesuai." };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    createSessionToken(username),
    adminSessionOptions,
  );
  redirect("/admin");
}

export async function logoutAction() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionOptions,
    maxAge: 0,
  });
  redirect("/admin/login");
}

export async function saveAdminContentAction(content: SiteContent): Promise<
  { success: true; content: SiteContent } | { success: false; error: string }
> {
  if (!(await getAdminSession())) return { success: false, error: "Sesi admin berakhir. Silakan login kembali." };

  try {
    const savedContent = await persistSiteContent(content);
    revalidatePath("/");
    revalidatePath("/produk/[slug]", "page");
    return { success: true, content: savedContent };
  } catch (error) {
    console.error("Admin content save failed", error);
    return { success: false, error: "Perubahan belum tersimpan ke Supabase. Coba lagi setelah memeriksa koneksi." };
  }
}

export async function updateWarrantyTicketStatusAction(
  ticketId: string,
  status: WarrantyTicketStatus,
): Promise<{ success: boolean; error?: string }> {
  if (!(await getAdminSession())) return { success: false, error: "Sesi admin berakhir. Silakan login kembali." };
  if (!/^GWC-\d{8}-[A-F0-9]{6}$/.test(ticketId) || !WARRANTY_TICKET_STATUSES.includes(status)) {
    return { success: false, error: "Data tiket tidak valid." };
  }

  try {
    await updateWarrantyTicketStatus(ticketId, status);
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Warranty ticket status update failed", error);
    return { success: false, error: "Status tiket belum dapat diperbarui." };
  }
}
