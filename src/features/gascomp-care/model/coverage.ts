export type CareCoverage = {
  id: string;
  memberId: string;
  purchaseReference: string;
  itemLabel: string;
  purchaseDate: string;
  expiresOn: string;
  units: number;
  claimLimit: number;
  claimsUsed: number;
  claimsRemaining: number;
  status: "active" | "expired" | "exhausted";
  claims: Array<{ id: string; reference: string; usedOn: string }>;
};
export type CareCoverageResult = { coverages: CareCoverage[]; error?: string };
export type CareCoverageActionState = { success?: boolean; error?: string };

export function careToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}
export function validCareDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01") return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validCareId(value: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
}
export function normalizeCareReference(value: string): string { return value.trim().toLowerCase(); }
export function validCareReference(value: string): boolean { return value.length >= 1 && value.length <= 100 && !/[\u0000-\u001f\u007f]/.test(value); }
