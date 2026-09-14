import type { WarrantyTicket } from "./types";

export type WarrantyTicketVersions = Record<string, string>;

export function getWarrantyTicketVersion(ticket: WarrantyTicket) {
  return `${ticket.status}:${ticket.updatedAt || ticket.submittedAt}`;
}

export function getWarrantyTicketVersions(tickets: WarrantyTicket[]): WarrantyTicketVersions {
  return Object.fromEntries(
    tickets.map((ticket) => [ticket.ticketId, getWarrantyTicketVersion(ticket)]),
  );
}

export function getChangedWarrantyTickets(
  previousTickets: WarrantyTicket[],
  currentTickets: WarrantyTicket[],
) {
  const previousVersions = getWarrantyTicketVersions(previousTickets);
  return currentTickets.filter(
    (ticket) => previousVersions[ticket.ticketId] !== getWarrantyTicketVersion(ticket),
  );
}

export function getUnreadWarrantyTickets(
  tickets: WarrantyTicket[],
  seenVersions: WarrantyTicketVersions | null,
) {
  if (seenVersions === null) {
    return tickets.filter((ticket) => ticket.status === "new");
  }

  return tickets.filter(
    (ticket) => seenVersions[ticket.ticketId] !== getWarrantyTicketVersion(ticket),
  );
}
