import "server-only";
import { getAdminSession } from "@/features/auth/server/session";
import { listCareDirectReports, streamCareDirectVideo, updateCareDirectStatus } from "./report-store";
const headers = { "Cache-Control": "private, no-store" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });
export async function getCareDirectReports() {
  if (!(await getAdminSession())) return error("Your admin session has expired. Sign in again.", 401);
  try { return Response.json({ reports: await listCareDirectReports() }, { headers }); }
  catch { return error("CareDirect reports could not be loaded.", 503); }
}
export async function patchCareDirectReport(request: Request, id: string) {
  if (!(await getAdminSession())) return error("Your admin session has expired. Sign in again.", 401);
  try {
    const origin = request.headers.get("origin") ?? "";
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin || parsed.host !== (request.headers.get("host") ?? new URL(request.url).host)) return error("This request could not be verified.", 403);
  } catch { return error("This request could not be verified.", 403); }
  if (!request.body) return error("Choose a valid status.", 400);
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Body timed out")), 10_000); });
    while (true) {
      const part = await Promise.race([reader.read(), deadline]);
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 1024) { void reader.cancel().catch(() => {}); return error("The request is too large.", 413); }
      chunks.push(part.value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { return error("Choose a valid status.", 400); }
    const status = body?.status;
    if (!["new", "in_progress", "resolved"].includes(status)) return error("Choose a valid status.", 400);
    const report = await updateCareDirectStatus(id, status);
    return report ? Response.json({ report }, { headers }) : error("Report not found.", 404);
  } catch { void reader.cancel().catch(() => {}); return error("The report could not be updated.", 503); }
  finally { clearTimeout(timer); reader.releaseLock(); }
}
export async function getCareDirectVideo(request: Request, id: string) {
  if (!(await getAdminSession())) return error("Your admin session has expired. Sign in again.", 401);
  try {
    const response = await streamCareDirectVideo(request, id);
    return response ?? error("Video not found.", 404);
  } catch { return error("The video could not be loaded.", 503); }
}
