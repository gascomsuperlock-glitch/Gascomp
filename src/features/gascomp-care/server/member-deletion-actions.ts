"use server";

import { getAdminSession } from "@/features/auth/server/session";
import { validCareId } from "../model/coverage";
import { careDatabase } from "./database";
import { isCareSameOrigin } from "./request-security";

export async function deleteCareMembersAction(memberIds: string[]): Promise<{ deletedIds: string[]; error?: string }> {
  if (!await getAdminSession() || !await isCareSameOrigin()) return { deletedIds: [], error: "unauthorized" };
  if (!Array.isArray(memberIds) || memberIds.length < 1 || memberIds.length > 100 || memberIds.some(id => typeof id !== "string" || !validCareId(id))) return { deletedIds: [], error: "invalidInput" };
  const ids = [...new Set(memberIds.map(id => id.toLowerCase()))].sort();
  try {
    const { data, error } = await careDatabase().rpc("care_delete_members", { p_member_ids: ids });
    if (error || !data || !Array.isArray(data.deletedIds)) return { deletedIds: [], error: "unavailable" };
    if (data.error) return { deletedIds: [], error: data.error === "invalidInput" ? "invalidInput" : "unavailable" };
    if (data.deletedIds.length !== ids.length || !data.deletedIds.every((id: unknown, index: number) => id === ids[index])) return { deletedIds: [], error: "unavailable" };
    return { deletedIds: data.deletedIds };
  } catch { return { deletedIds: [], error: "unavailable" }; }
}
