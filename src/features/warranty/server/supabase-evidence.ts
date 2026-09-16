import "server-only";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import { byteRange, evidenceHeaders } from "./evidence-response";

const MAX_EVIDENCE_BYTES = 50 * 1024 * 1024;

// Keep the SDK's private Storage authentication on the server. The custom fetch
// forwards only our normalized range, never arbitrary browser headers or URLs.
export async function supabaseEvidenceResponse(request: Request, ticketId: string, evidenceId: string) {
  const upstream: { response?: Response; range?: string } = {};
  const controller = new AbortController();
  const signal = AbortSignal.any([request.signal, controller.signal, AbortSignal.timeout(120_000)]);
  const client = createAdminSupabaseClient(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const storage = new URL(url).pathname.includes("/storage/v1/object/");
    const headers = new Headers(init?.headers);
    if (storage && upstream.range) headers.set("Range", upstream.range);
    const response = await fetch(input, {
      ...init, headers, cache: "no-store",
      ...(storage && request.method === "HEAD" ? { method: "HEAD" } : {}),
      signal: AbortSignal.any([signal, AbortSignal.timeout(storage ? 120_000 : 15_000), ...(init?.signal ? [init.signal] : [])]),
    });
    if (storage) upstream.response = response;
    return response;
  });
  if (!client) return null;
  try {
    const [ticket, metadata] = await Promise.all([
      client.from("warranty_tickets").select("deleted_at").eq("ticket_id", ticketId).maybeSingle(),
      client.from("warranty_evidence").select("original_name, storage_path, mime_type, size_bytes")
        .eq("ticket_id", ticketId).eq("id", evidenceId).maybeSingle(),
    ]);
    if (ticket.error || metadata.error) throw new Error("Evidence metadata unavailable.");
    if (!ticket.data || ticket.data.deleted_at || !metadata.data) return null;
    const size = Number(metadata.data.size_bytes);
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_EVIDENCE_BYTES) throw new Error("Invalid evidence size.");
    const headers = evidenceHeaders(request, { size, name: metadata.data.original_name, mimeType: metadata.data.mime_type });
    const range = byteRange(request.method === "HEAD" || request.headers.has("if-range") ? null : request.headers.get("range"), size);
    if (range === "unsatisfiable") {
      headers.set("Content-Range", `bytes */${size}`);
      headers.set("Content-Length", "0");
      return new Response(null, { status: 416, headers });
    }
    if (range) upstream.range = `bytes=${range.start}-${range.end}`;
    const file = await client.storage.from("warranty-evidence").download(metadata.data.storage_path).asStream();
    const response = upstream.response;
    if (response?.status === 404) return null;
    if (file.error || !response || ![200, 206].includes(response.status)) throw new Error("Evidence unavailable.");
    let length = size;
    if (response.status === 206) {
      if (!range || response.headers.get("content-range") !== `bytes ${range.start}-${range.end}/${size}`) throw new Error("Invalid evidence range.");
      length = range.end - range.start + 1;
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    }
    if (response.headers.has("content-length") && Number(response.headers.get("content-length")) !== length) throw new Error("Invalid evidence length.");
    headers.set("Content-Length", String(length));
    if (request.method === "HEAD") return new Response(null, { headers });
    if (!file.data) throw new Error("Evidence body missing.");
    let received = 0;
    const body = file.data.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, stream) {
        received += chunk.byteLength;
        if (received > length) throw new Error("Evidence length exceeded.");
        stream.enqueue(chunk);
      },
      flush() {
        if (received !== length) throw new Error("Evidence transfer incomplete.");
      },
    }));
    return new Response(body, { status: response.status, headers });
  } catch {
    controller.abort();
    return new Response("Evidence is temporarily unavailable. Please retry.", {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
