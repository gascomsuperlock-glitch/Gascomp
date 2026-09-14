export const DUPLICATE_CLAIM_ERROR = "A warranty claim already exists for this order number and product SKU. Contact support about your existing claim.";
export const EXPIRED_CLAIM_ERROR = "The one-year warranty period has expired.";

export function normalizeClaimIdentity(value: string) {
  return value.trim().toLowerCase();
}

export function formatJakartaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function purchaseDateError(value: string, now = new Date()): string | undefined {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "Select a valid purchase date.";
  const today = formatJakartaDate(now);
  if (value > today) return "The purchase date cannot be in the future.";
  const year = date.getUTCFullYear() + 1;
  const month = date.getUTCMonth();
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  const expiry = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  if (today > expiry) return EXPIRED_CLAIM_ERROR;
}
