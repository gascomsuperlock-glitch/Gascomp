"use server";

import { getAdminSession } from "@/features/auth/server/session";
import { careToday, normalizeCareReference, validCareDate, validCareId, validCareReference, type CareCoverageActionState, type CareCoverageResult } from "../model/coverage";
import { loadCareCoverage } from "./coverage";
import { careDatabase } from "./database";
import { isCareSameOrigin } from "./request-security";

export async function listCareCoverage(memberId: string): Promise<CareCoverageResult> {
  if (!await getAdminSession()) return { coverages: [], error: "unauthorized" };
  if (typeof memberId !== "string" || !validCareId(memberId)) return { coverages: [], error: "invalidInput" };
  return loadCareCoverage(memberId);
}
const resultErrors = new Set(["invalidInput", "duplicatePurchase", "duplicateClaim", "coverageExpired", "coverageExhausted", "coverageNotFound"]);
async function executeCoverageMutation(name: string, parameters: Record<string, string | number>): Promise<CareCoverageActionState> {
  try {
    const { data, error } = await careDatabase().rpc(name, parameters);
    if (error) return { error: "unavailable" };
    return data === "ok" ? { success: true } : { error: resultErrors.has(data) ? data : "unavailable" };
  } catch { return { error: "unavailable" }; }
}
export async function addCarePurchaseAction(_previous: CareCoverageActionState, form: FormData): Promise<CareCoverageActionState> {
  if (!await getAdminSession() || !await isCareSameOrigin()) return { error: "unauthorized" };
  const memberId = String(form.get("memberId") ?? "");
  const purchaseReference = normalizeCareReference(String(form.get("purchaseReference") ?? ""));
  const itemLabel = String(form.get("itemLabel") ?? "").trim();
  const purchaseDate = String(form.get("purchaseDate") ?? "");
  const unitsText = String(form.get("units") ?? "");
  const units = Number(unitsText);
  if (!validCareId(memberId) || !validCareReference(purchaseReference) || !itemLabel || itemLabel.length > 200 || !validCareDate(purchaseDate) || purchaseDate > careToday() || !/^\d+$/.test(unitsText) || !Number.isInteger(units) || units < 1 || units > 10) return { error: "invalidInput" };
  return executeCoverageMutation("care_add_purchase", { p_member_id: memberId, p_purchase_reference: purchaseReference, p_item_label: itemLabel, p_purchase_date: purchaseDate, p_units: units });
}
export async function recordCareClaimAction(_previous: CareCoverageActionState, form: FormData): Promise<CareCoverageActionState> {
  if (!await getAdminSession() || !await isCareSameOrigin()) return { error: "unauthorized" };
  const memberId = String(form.get("memberId") ?? "");
  const coverageId = String(form.get("coverageId") ?? "");
  const requestId = String(form.get("requestId") ?? "").toLowerCase();
  if (!validCareId(memberId) || !validCareId(coverageId) || !validCareId(requestId)) return { error: "invalidInput" };
  return executeCoverageMutation("care_record_claim", { p_member_id: memberId, p_coverage_id: coverageId, p_reference: requestId, p_used_on: careToday() });
}
