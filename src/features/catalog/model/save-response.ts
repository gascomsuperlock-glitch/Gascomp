export function createSaveResponse(body: unknown, status: number) {
  const json = JSON.stringify(body);
  const length = new TextEncoder().encode(json).byteLength;
  return new Response(json, {
    status,
    headers: {
      "Cache-Control": "no-store, no-transform",
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": String(length),
      "Content-Encoding": "identity",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
