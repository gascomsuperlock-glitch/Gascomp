"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/features/auth/server/session";
import { deleteWarrantyTicket, updateWarrantyTicketStatus } from "@/features/warranty/server/ticket-service";
import { isWarrantySolution, type WarrantySolution } from "@/features/warranty/model/types";

export async function updateWarrantyTicketStatusAction(
  ticketId: string,
  solution: WarrantySolution | undefined,
  done = false,
): Promise<{ success: false; error: string } | { success: true; updatedAt: string }> {
  if (!(await getAdminSession())) return { success: false, error: "Your admin session has expired. Sign in again." };
  if (!/^GWC-\d{8}-[A-F0-9]{6}$/.test(ticketId) || typeof done !== "boolean" || (solution !== undefined && !isWarrantySolution(solution)) || (!done && solution === undefined)) {
    return { success: false, error: "The ticket data is invalid." };
  }

  try {
    const updatedAt = await updateWarrantyTicketStatus(ticketId, done ? "closed" : undefined, solution);
    revalidatePath("/admin");
    return { success: true, updatedAt };
  } catch (error) {
    console.error("Warranty ticket status update failed", error);
    return { success: false, error: "The ticket could not be updated. Check the connection and warranty solution migration, then retry." };
  }
}

export async function deleteWarrantyTicketsAction(ticketIds: string[]): Promise<{ deletedIds: string[]; error?: string }> {
  if (!(await getAdminSession())) return { deletedIds: [], error: "Your admin session has expired. Sign in again." };
  if (!Array.isArray(ticketIds) || !ticketIds.length || ticketIds.length > 100 || ticketIds.some((id) => typeof id !== "string" || !/^GWC-\d{8}-[A-F0-9]{6}$/.test(id))) {
    return { deletedIds: [], error: "Select between 1 and 100 valid tickets." };
  }
  const deletedIds: string[] = [];
  for (const id of new Set(ticketIds)) {
    try {
      await deleteWarrantyTicket(id);
      deletedIds.push(id);
    } catch {
      revalidatePath("/admin");
      return { deletedIds, error: "Some tickets could not be deleted. Check the database migration and connection, then retry the remaining selection." };
    }
  }
  revalidatePath("/admin");
  return { deletedIds };
}
