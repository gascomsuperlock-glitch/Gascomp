import "server-only";
import { cookies, headers } from "next/headers";
import { LANGUAGE_COOKIE_NAME, resolveLanguage } from "./language";

export async function requestLanguage() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  return resolveLanguage(cookieStore.get(LANGUAGE_COOKIE_NAME)?.value, requestHeaders.get("accept-language"));
}
