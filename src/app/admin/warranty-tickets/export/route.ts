import { getAdminSession } from "@/features/auth/server/session";
import { dateRangeBounds, ticketCsv, jakartaDate } from "@/features/warranty/model/ticket-export";
import { listWarrantyTicketsForRange } from "@/features/warranty/server/ticket-service";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await getAdminSession())) return Response.json({ error: "Your admin session has expired. Sign in again." }, { status: 401, headers });
  const params = new URL(request.url).searchParams;
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  let bounds;
  try {
    bounds = dateRangeBounds(start, end);
    if (end > jakartaDate()) throw new Error("Future dates are unavailable.");
  } catch {
    return Response.json({ error: "Select valid dates, with the end on or after the start and no later than today." }, { status: 400, headers });
  }
  try {
    const tickets = await listWarrantyTicketsForRange(bounds);
    return new Response(ticketCsv(tickets), { headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="warranty-tickets-${start}-to-${end}.csv"`,
      "X-Ticket-Count": String(tickets.length),
    } });
  } catch {
    return Response.json({ error: "The export could not be prepared. Please try again." }, { status: 500, headers });
  }
}
