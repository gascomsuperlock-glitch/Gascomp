"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/features/auth/server/session";
import { updateWarrantyTicketStatus } from "@/features/warranty/server/ticket-service";
import { WARRANTY_TICKET_STATUSES, type WarrantyTicketStatus } from "@/features/warranty/model/types";

export async function updateWarrantyTicketStatusAction(
  ticketId: string,
  status: WarrantyTicketStatus,
): Promise<{ success: false; error: string } | { success: true; updatedAt: string }> {
  if (!(await getAdminSession())) return { success: false, error: "Your admin session has expired. Sign in again." };
  if (!/^GWC-\d{8}-[A-F0-9]{6}$/.test(ticketId) || !WARRANTY_TICKET_STATUSES.includes(status)) {
    return { success: false, error: "The ticket data is invalid." };
  }

  try {
    const updatedAt = await updateWarrantyTicketStatus(ticketId, status);
    revalidatePath("/admin");
    return { success: true, updatedAt };
  } catch (error) {
    console.error("Warranty ticket status update failed", error);
    return { success: false, error: "The ticket status could not be updated." };
  }
}
