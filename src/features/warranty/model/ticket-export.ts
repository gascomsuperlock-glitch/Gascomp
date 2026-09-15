import { WARRANTY_SOLUTIONS, ticketStatusLabel, type WarrantyTicket } from "./types";

export function dateRangeBounds(startDate: string, endDate: string) {
  for (const value of [startDate, endDate]) {
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) throw new Error("Select valid start and end dates.");
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Select valid start and end dates.");
  }
  if (startDate > endDate) throw new Error("End date must be on or after start date.");
  return {
    start: new Date(`${startDate}T00:00:00+07:00`).toISOString(),
    end: new Date(Date.parse(`${endDate}T00:00:00+07:00`) + 86_400_000).toISOString(),
  };
}

export function jakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function availableTicketDates(tickets: Pick<WarrantyTicket, "submittedAt">[]) {
  const dates = tickets.map(ticket => jakartaDate(new Date(ticket.submittedAt))).sort();
  return dates.length ? { start: dates[0], end: dates[dates.length - 1] } : null;
}

function cell(value: string | number) {
  let text = String(value);
  // Neutralize spreadsheet formulas, including leading whitespace/control characters.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function ticketCsv(tickets: WarrantyTicket[]) {
  const rows: (string | number)[][] = [["Date", "Name", "Phone", "Order / Tracking number", "Issue", "Product", "Status", "Solution", "Ticket number", "SKU", "Email", "Store", "Purchase date", "Purchase price (IDR)", "Updated at (Jakarta)"]];
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "short" });
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "medium" });
  for (const ticket of tickets) rows.push([
    date.format(new Date(ticket.submittedAt)), ticket.customer.name, ticket.customer.whatsapp,
    ticket.purchase.orderNumber, ticket.problem, ticket.product.name, ticketStatusLabel(ticket.status),
    ticket.solution ? WARRANTY_SOLUTIONS[ticket.solution] : "", ticket.ticketId, ticket.product.sku,
    ticket.customer.email, ticket.purchase.store, ticket.purchase.date, ticket.purchase.price, time.format(new Date(ticket.updatedAt)),
  ]);
  return "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
