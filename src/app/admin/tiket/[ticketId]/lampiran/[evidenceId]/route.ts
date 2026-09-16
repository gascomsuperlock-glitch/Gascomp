import { getAdminSession } from "@/features/auth/server/session";
import { warrantyEvidenceResponse } from "@/features/warranty/server/ticket-service";
import { evidenceResponse } from "@/features/warranty/server/evidence-response";
import { createVideoPreview } from "@/features/warranty/server/video-preview";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string; evidenceId: string }> },
) {
  const privateHeaders = { "Cache-Control": "private, no-store" };
  if (!(await getAdminSession())) return new Response("Unauthorized", { status: 401, headers: privateHeaders });
  const { ticketId, evidenceId } = await params;
  if (!/^GWC-\d{8}-[A-F0-9]{6}$/.test(ticketId) || !/^[A-Za-z0-9-]+$/.test(evidenceId)) {
    return new Response("Evidence not found", { status: 404, headers: privateHeaders });
  }

  const query = new URL(request.url).searchParams;
  if (query.get("preview") === "1" && query.get("download") !== "1") {
    // Conversion requires the whole original, regardless of a preview range.
    // Original playback below forwards ranges directly without this buffer.
    const original = await warrantyEvidenceResponse(new Request(request.url, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    }), ticketId, evidenceId);
    if (!original) return new Response("Evidence not found", { status: 404, headers: privateHeaders });
    if (!original.ok) return original;
    let preview: Uint8Array | null = null;
    try {
      preview = await createVideoPreview(new Uint8Array(await original.arrayBuffer()), request.signal);
    } catch { /* A cancelled or incomplete transfer must not produce a preview. */ }
    if (!preview) return new Response("The video preview is unavailable. Retry or download the original video to open it in a compatible player.", {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
    return evidenceResponse(request, { bytes: preview, name: "video-preview.mp4", mimeType: "video/mp4" });
  }
  return await warrantyEvidenceResponse(request, ticketId, evidenceId)
    ?? new Response("Evidence not found", { status: 404, headers: privateHeaders });
}

export const HEAD = GET;
