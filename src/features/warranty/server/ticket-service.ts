import "server-only";
import { purchaseDateError } from "../model/claim-eligibility";
import { randomBytes } from "node:crypto";
import { isSupabaseConfigured } from "@/shared/integrations/supabase/server";
import type { WarrantyTicketInput } from "../model/input";
import type { WarrantyTicketStatus, WarrantySolution } from "../model/types";
import { deleteLocalTicket, saveLocalTicket, listLocalTickets, updateLocalTicketStatus, readLocalEvidence } from "./local-ticket-store";
import { deleteSupabaseTicket, saveSupabaseTicket, listSupabaseTickets, updateSupabaseTicketStatus, readSupabaseEvidence } from "./supabase-ticket-store";

function createTicketId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `GWC-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function saveWarrantyTicket(input: WarrantyTicketInput) {
  const error = purchaseDateError(input.purchaseDate);
  if (error) throw new Error(error);
  const ticketId = createTicketId();
  const submittedAt = new Date().toISOString();
  const ticket = isSupabaseConfigured()
    ? await saveSupabaseTicket(input, ticketId, submittedAt)
    : await saveLocalTicket(input, ticketId, submittedAt);
  return { ticketId: ticket.ticketId, submittedAt: ticket.submittedAt };
}

export async function listWarrantyTickets() {
  return isSupabaseConfigured() ? listSupabaseTickets() : listLocalTickets();
}

export async function updateWarrantyTicketStatus(ticketId: string, status: WarrantyTicketStatus | undefined, solution: WarrantySolution | undefined) {
  return isSupabaseConfigured() ? updateSupabaseTicketStatus(ticketId, status, solution) : updateLocalTicketStatus(ticketId, status, solution);
}

export async function readWarrantyEvidence(ticketId: string, evidenceId: string) {
  return isSupabaseConfigured() ? readSupabaseEvidence(ticketId, evidenceId) : readLocalEvidence(ticketId, evidenceId);
}

export async function deleteWarrantyTicket(ticketId: string) {
  return isSupabaseConfigured() ? deleteSupabaseTicket(ticketId) : deleteLocalTicket(ticketId);
}

export async function listWarrantyTicketsForRange(bounds: { start: string; end: string }) {
  const tickets = isSupabaseConfigured() ? await listSupabaseTickets(bounds) : await listLocalTickets();
  return tickets.filter(ticket => Date.parse(ticket.submittedAt) >= Date.parse(bounds.start) && Date.parse(ticket.submittedAt) < Date.parse(bounds.end))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.ticketId.localeCompare(b.ticketId));
}
