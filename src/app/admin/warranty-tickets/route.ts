import { getAdminSession } from "@/features/auth/server/session";
import { listWarrantyTickets } from "@/features/warranty/server/ticket-service";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json(
      { success: false, error: "Your admin session has expired. Sign in again." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const tickets = await listWarrantyTickets();
    return Response.json({ success: true, tickets }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Warranty notification refresh failed", error);
    return Response.json(
      { success: false, error: "Warranty updates could not be checked." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
