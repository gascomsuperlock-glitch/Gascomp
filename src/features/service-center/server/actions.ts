"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/features/auth/server/session";
import type { ServiceCenter, ServiceCenterInput } from "../model/types";
import { deleteServiceCenter, loadServiceCenters, saveServiceCenter } from "./store";

export async function listServiceCentersAction(): Promise<{ centers: ServiceCenter[]; error?: string }> {
  if (!await getAdminSession()) return { centers: [], error: "Your admin session has expired. Please sign in again." };
  return loadServiceCenters();
}

export async function saveServiceCenterAction(input: ServiceCenterInput): Promise<{ center?: ServiceCenter; error?: string }> {
  if (!await getAdminSession()) return { error: "Your admin session has expired. Please sign in again." };
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  try {
    const url = new URL(origin ?? "");
    if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin || url.host !== host) throw new Error("Invalid origin.");
  } catch { return { error: "This request could not be verified. Reload the page and try again." }; }
  const result = await saveServiceCenter(input);
  if (result.center) revalidatePath("/service-center");
  return result;
}

export async function deleteServiceCenterAction(id: string): Promise<{ deletedId?: string; error?: string }> {
  if (!await getAdminSession()) return { error: "Your admin session has expired. Please sign in again." };
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  try {
    const url = new URL(origin ?? "");
    if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin || url.host !== requestHeaders.get("host")) throw new Error("Invalid origin.");
  } catch { return { error: "This request could not be verified. Reload the page and try again." }; }
  const result = await deleteServiceCenter(id);
  if (result.deletedId) revalidatePath("/service-center");
  return result;
}
