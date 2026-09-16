import { INDONESIA_PROVINCES } from "./provinces";
import type { ServiceCenterInput } from "./types";

export type GoogleMapsImportData = Partial<Pick<ServiceCenterInput,
  "name" | "provinceCode" | "city" | "address" | "phone" | "hours" | "latitude" | "longitude"
>>;

const MAX_PAGE_LENGTH = 3_000_000;
const foreignPlaceError = "This place is outside Indonesia. Choose a service center in Indonesia.";

function at(value: unknown, ...indices: number[]): unknown {
  for (const index of indices) value = Array.isArray(value) ? value[index] : undefined;
  return value;
}

function cleanText(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text && text.length <= limit ? text : undefined;
}

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const named: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code = entity[2].toLowerCase() === "x" ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3]);
  }
  return result;
}

/** Follow only a public place-data resource explicitly declared by the Maps page. */
export function getGoogleMapsPreviewUrl(html: string, pageUrl: string): string | undefined {
  if (html.length > MAX_PAGE_LENGTH) return undefined;
  let page: URL;
  try { page = new URL(pageUrl); } catch { return undefined; }
  if (page.protocol !== "https:" || page.username || page.password || page.port || !["www.google.com", "google.com", "maps.google.com", "www.google.co.id", "google.co.id", "maps.google.co.id"].includes(page.hostname)) return undefined;
  for (const match of html.matchAll(/<link\b[^>]{0,12000}>/gi)) {
    const attrs = attributes(match[0]);
    if (!attrs.href || !["preload", "prefetch"].includes(attrs.rel?.toLowerCase())) continue;
    try {
      const url = new URL(attrs.href, page);
      if (url.origin === page.origin && !url.username && !url.password && url.pathname === "/maps/preview/place" && url.href.length <= 12000) return url.href;
    } catch { /* Ignore a malformed public resource declaration. */ }
  }
  return undefined;
}

function json(value: string): unknown {
  try { return JSON.parse(value.replace(/^\s*\)\]\}'\s*/, "")); } catch { return undefined; }
}

/** Extract a JSON array without executing the surrounding Maps JavaScript. */
function initializationState(html: string): unknown {
  const marker = /\bAPP_INITIALIZATION_STATE\s*=\s*/.exec(html);
  if (!marker) return undefined;
  const start = marker.index + marker[0].length;
  if (html[start] !== "[") return undefined;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "[" || char === "{") { if (++depth > 200) return undefined; }
    else if (char === "]" || char === "}") {
      if (--depth === 0) return json(html.slice(start, i + 1));
    }
  }
  return undefined;
}

function provinceCode(region: unknown): string | undefined {
  const value = cleanText(region, 1000)?.toLowerCase().replace(/\./g, "");
  if (!value) return undefined;
  const aliases: [string, string][] = [
    ["special region of yogyakarta", "34"], ["daerah istimewa yogyakarta", "34"], ["diy", "34"],
    ["special capital region of jakarta", "31"], ["daerah khusus ibukota jakarta", "31"], ["jakarta raya", "31"],
    ["bangka belitung", "19"], ["special region of aceh", "11"],
    ...INDONESIA_PROVINCES.flatMap((province): [string, string][] => [[province.nameEn.toLowerCase(), province.code], [province.nameId.toLowerCase(), province.code]]),
  ];
  // Match a complete province component, never a substring of another province or street.
  for (const component of value.split(",").map((part) => part.trim().replace(/\s+\d{5}$/, "").replace(/^(?:provinsi|province of)\s+/, ""))) {
    const found = aliases.find(([name]) => name === component);
    if (found) return found[1];
  }
  return undefined;
}

function coordinates(latitude: unknown, longitude: unknown): GoogleMapsImportData {
  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return {};
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return {};
  if (latitude < -11.1 || latitude > 6.2 || longitude < 94.9 || longitude > 141.1) throw new Error(foreignPlaceError);
  return { latitude, longitude };
}

function selectedPlace(payload: unknown): GoogleMapsImportData | undefined {
  const place = at(payload, 6);
  // These fields identify a selected place. Do not recursively traverse related results.
  if (!Array.isArray(place) || !cleanText(place[11], 150) || typeof place[10] !== "string" || !/^0x[\da-f]+:0x[\da-f]+$/i.test(place[10])) return undefined;
  const postal = at(place, 183, 1);
  const country = cleanText(at(postal, 6) ?? place[243], 100);
  if (country && !["id", "indonesia"].includes(country.toLowerCase())) throw new Error(foreignPlaceError);
  const result: GoogleMapsImportData = { ...coordinates(at(place, 9, 2), at(place, 9, 3)) };
  const fields = {
    name: cleanText(place[11], 150),
    address: cleanText(place[39], 1000) ?? (Array.isArray(place[2]) && place[2].every((part) => typeof part === "string") ? cleanText(place[2].join(", "), 1000) : undefined),
    city: cleanText(at(postal, 3), 120) ?? cleanText(at(place, 82, 3), 120),
    phone: cleanText(at(place, 178, 0, 0), 30),
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value && (key !== "phone" || (/^[+\d ()-]{6,30}$/.test(value) && value.replace(/\D/g, "").length >= 6))) Object.assign(result, { [key]: value });
  }
  const province = provinceCode(at(postal, 5)) ?? provinceCode(result.address);
  if (province) result.provinceCode = province;
  // Maps' regular opening hours are separate from secondary service-specific hours.
  const currentDays = at(place, 203, 0);
  const days = Array.isArray(currentDays) ? currentDays : at(place, 34, 1);
  if (Array.isArray(days) && days.length <= 7) {
    const rows = days.map((row) => {
      const day = cleanText(at(row, 0), 20);
      const currentRanges = at(row, 3);
      const ranges = Array.isArray(currentDays)
        ? (Array.isArray(currentRanges) ? currentRanges.map((range) => at(range, 0)) : undefined)
        : at(row, 1);
      return day && Array.isArray(ranges) && ranges.length > 0 && ranges.every((range) => typeof range === "string" && range.trim()) ? `${day}: ${ranges.join(", ")}` : undefined;
    });
    const hours = rows.length > 0 && rows.every(Boolean) ? cleanText(rows.join("; "), 300) : undefined;
    if (hours) result.hours = hours;
  }
  return result;
}

function urlPoint(url: string): GoogleMapsImportData {
  try {
    const parsed = new URL(url);
    if (/\/maps\/dir(?:\/|$)/.test(parsed.pathname)) return {};
    // @lat,lng is a camera position, not the selected business point.
    const point = parsed.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    const query = (parsed.searchParams.get("query") ?? parsed.searchParams.get("q"))?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    const searchPath = parsed.pathname.match(/^\/maps\/search\/([^/]+)\/?$/);
    const pathPoint = searchPath && decodeURIComponent(searchPath[1]).replace(/\+/g, " ").match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    const pair = point ?? query ?? pathPoint;
    return pair ? coordinates(Number(pair[1]), Number(pair[2])) : {};
  } catch (error) {
    if (error instanceof Error && error.message === foreignPlaceError) throw error;
    return {};
  }
}

export function parseGoogleMapsPage(html: string, url: string): GoogleMapsImportData {
  if (html.length > MAX_PAGE_LENGTH) return {};
  const raw = json(html);
  const direct = selectedPlace(raw);
  if (direct) return direct;
  const state = initializationState(html);
  for (const index of [6, 5]) {
    const encoded = at(state, 3, index);
    if (typeof encoded === "string") {
      const details = selectedPlace(json(encoded));
      if (details) return details;
    }
  }
  return urlPoint(url);
}
