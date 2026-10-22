import "server-only";

type EvidenceFile = { bytes: Uint8Array; name: string; mimeType: string };

// A single byte range covers browser metadata probes and seeking. Unsupported
// range units and multipart requests fall back to the complete representation.
export function byteRange(value: string | null, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value ?? "");
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return null;
  if (!size || (first === null && last === 0) || (first !== null && first >= size)) return "unsatisfiable";
  if (first !== null && last !== null && last < first) return null;
  return {
    start: first ?? Math.max(0, size - last!),
    end: first === null || last === null ? size - 1 : Math.min(last, size - 1),
  };
}

export function evidenceHeaders(request: Request, evidence: { name: string; mimeType: string; size: number }) {
  const size = evidence.size;
  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  const safeName = evidence.name.replace(/[\r\n"\\]/g, "_");
  const asciiName = safeName.replace(/[^\x20-\x7e]/g, "_");
  const encodedName = encodeURIComponent(safeName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  const headers = new Headers({
    "Content-Type": evidence.mimeType,
    "Content-Disposition": `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
    "Content-Length": String(size),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  return headers;
}

export function evidenceResponse(request: Request, evidence: EvidenceFile) {
  const size = evidence.bytes.byteLength;
  const headers = evidenceHeaders(request, { ...evidence, size });
  if (request.method === "HEAD") return new Response(null, { headers });

  // No validator is emitted, so an If-Range condition cannot be satisfied.
  const range = byteRange(request.headers.has("if-range") ? null : request.headers.get("range"), size);
  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${size}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new Response(new Uint8Array(evidence.bytes.subarray(range.start, range.end + 1)), { status: 206, headers });
  }
  return new Response(new Uint8Array(evidence.bytes), { headers });
}
