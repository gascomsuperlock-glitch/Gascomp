"use server";

import { getAdminSession } from "@/features/auth/server/session";
import type { CareActionState, CareMember } from "../model/types";
import { careDatabase, memberColumns, toCareMember } from "./database";
import { createCareTemporaryPassword, hashCarePassword, normalizeCareUsername, validCareUsername } from "./password";
import { isCareSameOrigin } from "./request-security";

export async function listCareMembers(input: { query?: string; page?: number } = {}): Promise<{ members: CareMember[]; total: number; error?: string }> {
  if (!await getAdminSession()) return { members: [], total: 0, error: "unauthorized" };
  const page = Number.isSafeInteger(input.page) && input.page! > 0 ? Math.min(input.page!, 100000) : 1;
  const query = String(input.query ?? "").trim().slice(0, 100);
  try {
    let request = careDatabase().from("care_members").select(memberColumns, { count: "exact" }).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
    if (query) {
      // Strip PostgREST expression syntax and escape LIKE wildcards before interpolation.
      const safe = query.replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/[_%]/g, "\\$&");
      if (!safe) return { members: [], total: 0 };
      request = request.or(`name.ilike.%${safe}%,username.ilike.%${safe}%,member_number.ilike.%${safe}%`);
    }
    const { data, count, error } = await request;
    if (error) return { members: [], total: 0, error: "unavailable" };
    return { members: (data ?? []).map(toCareMember), total: count ?? 0 };
  } catch { return { members: [], total: 0, error: "unavailable" }; }
}

export async function createCareMemberAction(_previous: CareActionState, form: FormData): Promise<CareActionState> {
  if (!await getAdminSession() || !await isCareSameOrigin()) return { error: "unauthorized" };
  const name = String(form.get("name") ?? "").trim();
  const username = normalizeCareUsername(String(form.get("username") ?? ""));
  const whatsapp = String(form.get("whatsapp") ?? "").trim();
  const orderReference = String(form.get("orderReference") ?? "").trim();
  const fieldErrors: Record<string, string> = {};
  if (!name || name.length > 100) fieldErrors.name = "invalidInput";
  if (!validCareUsername(username)) fieldErrors.username = "invalidInput";
  if (!/^[+\d ()-]{6,30}$/.test(whatsapp) || whatsapp.replace(/\D/g, "").length < 6) fieldErrors.whatsapp = "invalidInput";
  if (orderReference.length > 100) fieldErrors.orderReference = "invalidInput";
  if (Object.keys(fieldErrors).length) return { error: "invalidInput", fieldErrors };
  try {
    const password = createCareTemporaryPassword();
    const { data, error } = await careDatabase().from("care_members").insert({ name, username, whatsapp, order_reference: orderReference, password_hash: await hashCarePassword(password) }).select(memberColumns).single();
    if (error?.code === "23505") return { error: "duplicateUsername", fieldErrors: { username: "duplicateUsername" } };
    if (error || !data) return { error: "unavailable" };
    return { success: true, credentials: { username, password }, member: toCareMember(data) };
  } catch { return { error: "unavailable" }; }
}

export async function resetCarePasswordAction(memberId: string): Promise<CareActionState> {
  if (!await getAdminSession() || !await isCareSameOrigin()) return { error: "unauthorized" };
  if (typeof memberId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(memberId)) return { error: "invalidInput" };
  try {
    const db = careDatabase();
    const { data: row, error } = await db.from("care_members").select("username").eq("id", memberId).maybeSingle();
    if (error) return { error: "unavailable" };
    if (!row) return { error: "invalidInput" };
    const password = createCareTemporaryPassword();
    const reset = await db.rpc("care_reset_password", { p_member_id: memberId, p_password_hash: await hashCarePassword(password) });
    if (reset.error) return { error: "unavailable" };
    if (!reset.data) return { error: "invalidInput" };
    return { success: true, credentials: { username: row.username, password } };
  } catch { return { error: "unavailable" }; }
}
