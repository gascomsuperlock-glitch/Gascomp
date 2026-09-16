"use server";

import { headers } from "next/headers";
import { getAdminSession } from "@/features/auth/server/session";
import { importGoogleMapsLocation, type GoogleMapsImportResult } from "./google-maps-import";

export async function importGoogleMapsAction(url: string): Promise<GoogleMapsImportResult> {
  if (!await getAdminSession()) return { error: "Your admin session has expired. Please sign in again." };
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  try {
    const parsed = new URL(origin ?? "");
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.origin !== origin || parsed.host !== requestHeaders.get("host")) throw new Error("Invalid origin.");
  } catch { return { error: "This request could not be verified. Reload the page and try again." }; }
  return importGoogleMapsLocation(url);
}
