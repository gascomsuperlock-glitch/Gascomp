import "server-only";
import { getAdminSession } from "@/features/auth/server/session";
import { loadFromSupabase } from "@/features/catalog/server/content-store";
import { createSaveResponse } from "@/features/catalog/model/save-response";

export async function handleContentReadback() {
  if (!(await getAdminSession())) {
    return createSaveResponse({ success: false, error: "Your admin session has expired. Sign in again." }, 401);
  }
  try {
    // Never use the admin page's local-data fallback to confirm a database write.
    const content = await loadFromSupabase(true);
    const response = createSaveResponse({ success: true, content }, 200);
    response.headers.set("Cache-Control", "private, no-store, no-transform");
    return response;
  } catch {
    return createSaveResponse({ success: false, error: "The saved content could not be verified." }, 503);
  }
}
