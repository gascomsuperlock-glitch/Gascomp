import { getAdminSession } from "@/lib/auth";
import { readWarrantyEvidence } from "@/lib/warranty-tickets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string; evidenceId: string }> },
) {
  if (!(await getAdminSession())) return new Response("Unauthorized", { status: 401 });
  const { ticketId, evidenceId } = await params;
  if (!/^GWC-\d{8}-[A-F0-9]{6}$/.test(ticketId) || !/^[A-Za-z0-9-]+$/.test(evidenceId)) {
    return new Response("Lampiran tidak ditemukan", { status: 404 });
  }

  const evidence = await readWarrantyEvidence(ticketId, evidenceId);
  if (!evidence) return new Response("Lampiran tidak ditemukan", { status: 404 });
  const safeName = evidence.name.replace(/[\r\n"]/g, "_");
  return new Response(new Uint8Array(evidence.bytes), {
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
