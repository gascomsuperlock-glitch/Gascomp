export function parseTicketId(value: unknown): string | undefined {
  return typeof value === "string" && /^GWC-\d{8}-[A-F0-9]{6}$/.test(value) ? value : undefined;
}

export function adminTicketPath(value: unknown) {
  const ticketId = parseTicketId(value);
  return ticketId ? `/admin?ticket=${encodeURIComponent(ticketId)}` : "/admin";
}

export function ticketLoginUrl(origin: string, ticketId: string) {
  const url = new URL("/admin/login", origin);
  if (!["http:", "https:"].includes(url.protocol) || !parseTicketId(ticketId)) throw new Error("Invalid ticket link.");
  url.searchParams.set("ticket", ticketId);
  return url.toString();
}
