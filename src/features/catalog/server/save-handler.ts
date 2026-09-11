import "server-only";
import { getAdminSession } from "@/features/auth/server/session";
import { saveAdminContentAction } from "@/features/catalog/server/actions";
import { readSaveRequest } from "@/features/catalog/model/save-request-body";

export async function handleContentSave(request: Request) {
  const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  // Reject cross-site writes even when a browser includes the session cookie.
  const origins = new Set([new URL(request.url).origin]);
  const configuredUrl = process.env.GASCOMP_PUBLIC_BASE_URL;
  if (configuredUrl) {
    try { origins.add(new URL(configuredUrl).origin); } catch { /* Invalid configuration adds no trusted origin. */ }
  }
  if (!origins.has(request.headers.get("origin") ?? "")) {
    return reply({ success: false, error: "The save request origin is not allowed." }, 403);
  }
  if (!(await getAdminSession())) {
    return reply({ success: false, error: "Your admin session has expired. Sign in again." }, 401);
  }
  const parsed = await readSaveRequest(request);
  if (!parsed.success) return reply(parsed, parsed.status);
  const result = await saveAdminContentAction(parsed.content);
  return reply(result, result.success ? 200 : 422);
}
