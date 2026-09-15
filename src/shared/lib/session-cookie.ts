import "server-only";

import { headers } from "next/headers";
import { shouldSecureSessionCookie } from "./session-cookie-policy";

export async function getSessionCookieSecurity(): Promise<boolean> {
  const requestHeaders = await headers();
  return shouldSecureSessionCookie({
    production: process.env.NODE_ENV === "production",
    localHttpPreview: process.env.GASCOMP_LOCAL_HTTP_PREVIEW === "true",
    host: requestHeaders.get("host"),
    origin: requestHeaders.get("origin"),
  });
}
