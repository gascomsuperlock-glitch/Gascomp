import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import { getCarePreviewDatabase } from "./preview-database";
import type { CareMember } from "../model/types";

export const memberColumns = "id,member_number,name,username,whatsapp,order_reference,created_at,must_change_password";
export function careDatabase() {
  const preview = getCarePreviewDatabase(process.env);
  if (preview) return createClient(preview.url, preview.key, { auth: { autoRefreshToken: false, persistSession: false } });
  const db = createAdminSupabaseClient();
  if (!db) throw new Error("unavailable");
  return db;
}
export async function getCareAvailability(): Promise<boolean> {
  try {
    const { data, error } = await careDatabase().rpc("care_schema_ready");
    return !error && data === true;
  } catch { return false; }
}
export function toCareMember(row: Record<string, unknown>): CareMember {
  return {
    id: String(row.id), memberNumber: String(row.member_number), name: String(row.name),
    username: String(row.username), whatsapp: String(row.whatsapp), orderReference: String(row.order_reference ?? ""),
    createdAt: String(row.created_at), mustChangePassword: row.must_change_password === true,
  };
}
