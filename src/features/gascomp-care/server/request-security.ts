import "server-only";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { hashCareToken } from "./password";

export async function shouldLimitCareAttempts(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development") return true;
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return !(url.origin === origin && url.host === requestHeaders.get("host")
      && ["http:", "https:"].includes(url.protocol)
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  } catch { return true; }
}

export async function isCareSameOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
export async function careRequestIpKey(): Promise<string> {
  const requestHeaders = await headers();
  // The reverse proxy must append/overwrite X-Forwarded-For; use its final hop.
  const ip = requestHeaders.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  return hashCareToken(isIP(ip) ? ip : "unknown");
}
