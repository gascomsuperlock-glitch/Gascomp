import { getAdminSession } from "@/features/auth/server/session";
import { readWarrantyEvidence } from "@/features/warranty/server/ticket-service";
import { evidenceResponse } from "@/features/warranty/server/evidence-response";
import { createVideoPreview } from "@/features/warranty/server/video-preview";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string; evidenceId: string }> },
) {
  if (!(await getAdminSession())) return new Response("Unauthorized", { status: 401 });
  const { ticketId, evidenceId } = await params;
  if (!/^GWC-\d{8}-[A-F0-9]{6}$/.test(ticketId) || !/^[A-Za-z0-9-]+$/.test(evidenceId)) {
    return new Response("Evidence not found", { status: 404 });
  }

  const evidence = await readWarrantyEvidence(ticketId, evidenceId);
  if (!evidence) return new Response("Evidence not found", { status: 404 });
  const query = new URL(request.url).searchParams;
  if (query.get("preview") === "1" && query.get("download") !== "1") {
    const preview = await createVideoPreview(evidence.bytes, request.signal);
    if (!preview) return new Response("The video preview is unavailable. Retry or download the original video to open it in a compatible player.", {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
    return evidenceResponse(request, { bytes: preview, name: "video-preview.mp4", mimeType: "video/mp4" });
  }
  return evidenceResponse(request, evidence);
}

export const HEAD = GET;
