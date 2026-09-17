import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import { getAssistancePreviewDatabase } from "./preview-database";

export function assistanceDatabase() {
  const preview = getAssistancePreviewDatabase(process.env);
  if (preview) return createClient(preview.url, preview.key, { auth: { autoRefreshToken: false, persistSession: false } });
  const database = createAdminSupabaseClient();
  if (!database) throw new Error("Assistant service is unavailable.");
  return database;
}
