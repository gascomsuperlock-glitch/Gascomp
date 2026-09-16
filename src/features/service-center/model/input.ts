import { INDONESIA_PROVINCES } from "./provinces";
import type { ServiceCenterInput } from "./types";

const provinceCodes = new Set<string>(INDONESIA_PROVINCES.map(({ code }) => code));
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function isServiceCenterId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isGoogleMapsUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname === "maps.app.goo.gl") return url.pathname.length > 1;
    if (url.hostname === "goo.gl") return url.pathname.startsWith("/maps/");
    if (["maps.google.com", "maps.google.co.id"].includes(url.hostname)) return true;
    return ["google.com", "www.google.com", "google.co.id", "www.google.co.id"].includes(url.hostname)
      && (url.pathname === "/maps" || url.pathname.startsWith("/maps/"));
  } catch { return false; }
}

export function validateServiceCenterInput(input: unknown): { value?: ServiceCenterInput; error?: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Invalid service center details." };
  const candidate = input as Record<string, unknown>;
  const textFields = ["name", "provinceCode", "city", "address", "phone", "whatsapp", "hours", "mapsUrl"] as const;
  const values = {} as Record<typeof textFields[number], string>;
  for (const field of textFields) {
    if (typeof candidate[field] !== "string") return { error: "Invalid service center details." };
    values[field] = candidate[field].trim();
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(values[field])) return { error: "Service center details contain unsupported characters." };
  }
  if (!values.name || values.name.length > 150) return { error: "Enter a service center name of up to 150 characters." };
  if (!provinceCodes.has(values.provinceCode)) return { error: "Select a province in Indonesia." };
  if (!values.city || values.city.length > 120) return { error: "Enter a city or regency of up to 120 characters." };
  if (!values.address || values.address.length > 1000) return { error: "Enter an address of up to 1,000 characters." };
  if (values.hours.length > 300) return { error: "Opening hours must be 300 characters or fewer." };
  for (const field of ["phone", "whatsapp"] as const) {
    if (values[field] && (!/^[+\d ()-]{6,30}$/.test(values[field]) || values[field].replace(/\D/g, "").length < 6)) {
      return { error: "Enter a valid phone or WhatsApp number." };
    }
  }
  if (values.mapsUrl.length > 2048 || !isGoogleMapsUrl(values.mapsUrl)) return { error: "Use a valid HTTPS Google Maps link." };
  if (typeof candidate.latitude !== "number" || !Number.isFinite(candidate.latitude)
    || candidate.latitude < -11.1 || candidate.latitude > 6.2
    || typeof candidate.longitude !== "number" || !Number.isFinite(candidate.longitude)
    || candidate.longitude < 94.9 || candidate.longitude > 141.1) {
    return { error: "Enter valid coordinates within Indonesia (latitude -11.1 to 6.2, longitude 94.9 to 141.1)." };
  }
  if (typeof candidate.active !== "boolean") return { error: "Select the service center visibility." };
  if (candidate.id !== undefined && !isServiceCenterId(candidate.id)) return { error: "Invalid service center identifier." };
  return { value: { ...values, latitude: candidate.latitude, longitude: candidate.longitude, active: candidate.active,
    ...(candidate.id ? { id: candidate.id as string } : {}) } };
}
