import "server-only";

import { isGoogleMapsUrl } from "../model/input";
import { parseGoogleMapsPage, getGoogleMapsPreviewUrl, type GoogleMapsImportData } from "../model/google-maps-import";

export type GoogleMapsImportResult = { data?: GoogleMapsImportData; warning?: string; error?: string };
const MAX_PAGE_BYTES = 3 * 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

async function readLimitedPage(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length")) > MAX_PAGE_BYTES) {
    await response.body?.cancel();
    throw new Error("The Google Maps page is too large to read. Please enter the location manually.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let page = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PAGE_BYTES) throw new Error("The Google Maps page is too large to read. Please enter the location manually.");
      page += decoder.decode(value, { stream: true });
    }
    return page + decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export async function importGoogleMapsLocation(input: unknown, request: typeof fetch = fetch): Promise<GoogleMapsImportResult> {
  if (typeof input !== "string" || !input.trim() || input.trim().length > 2048 || !isGoogleMapsUrl(input.trim())) {
    return { error: "Paste a valid HTTPS Google Maps place link." };
  }
  const signal = AbortSignal.timeout(12000);
  let current = input.trim();
  try {
    for (let redirects = 0; redirects <= 5; redirects++) {
      // Validate every hop before sending a request. Never forward admin cookies or credentials.
      if (!isGoogleMapsUrl(current)) return { error: "This link redirects outside supported Google Maps pages. Copy the place's Share link instead." };
      const pageUrl = new URL(current);
      if (!["maps.app.goo.gl", "goo.gl"].includes(pageUrl.hostname)) {
        pageUrl.searchParams.set("hl", "en");
        current = pageUrl.href;
      }
      const response = await request(current, {
        redirect: "manual", signal, cache: "no-store",
        headers: { "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9" },
      });
      if (REDIRECT_STATUSES.has(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || redirects === 5) return { error: "This Google Maps link could not be resolved. Copy a new place link and try again." };
        current = new URL(location, current).href;
        continue;
      }
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
        await response.body?.cancel();
        return { error: "Google Maps did not provide a readable place page. Try another Share link or enter the details manually." };
      }
      const page = await readLimitedPage(response);
      if (/id=["']captcha-form["']|Our systems have detected unusual traffic|Before you continue to Google/i.test(page)) {
        return { error: "Google Maps requires a browser check. Open the link in your browser and enter the location manually." };
      }
      let data = parseGoogleMapsPage(page, current);
      const previewUrl = getGoogleMapsPreviewUrl(page, current);
      if (previewUrl && isGoogleMapsUrl(previewUrl) && new URL(previewUrl).origin === new URL(current).origin) {
        const preview = await request(previewUrl, {
          redirect: "manual", signal, cache: "no-store",
          headers: { "Accept": "application/json,text/plain", "Accept-Language": "en-US,en;q=0.9" },
        });
        if (preview.ok && /application\/json|text\/plain/.test(preview.headers.get("content-type") ?? "")) {
          const details = parseGoogleMapsPage(await readLimitedPage(preview), current);
          if (Object.keys(details).length) data = details;
        } else {
          await preview.body?.cancel();
        }
      }
      if (!Object.keys(data).length) return { error: "No place details could be read. Copy the Share link for a specific place, or fill in the form manually." };
      const missing = [!data.name && "name", !data.address && "address", !data.provinceCode && "province", !data.city && "city / regency", (data.latitude === undefined || data.longitude === undefined) && "map coordinates", !data.phone && "phone", !data.hours && "opening hours"].filter(Boolean);
      return { data, ...(missing.length ? { warning: `Some details were not available: ${missing.join(", ")}. Review the imported fields and complete any missing details.` } : {}) };
    }
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("The Google Maps page is too large") || error.message.includes("Indonesia"))) return { error: error.message };
    return { error: "Google Maps could not be read right now. Try again or enter the location manually." };
  }
  return { error: "This Google Maps link could not be resolved." };
}
