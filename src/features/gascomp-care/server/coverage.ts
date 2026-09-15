import "server-only";
import type { CareCoverageResult } from "../model/coverage";
import { careDatabase } from "./database";
import { getCareSession } from "./session";

export async function loadCareCoverage(memberId: string): Promise<CareCoverageResult> {
  try {
    const { data, error } = await careDatabase().rpc("care_list_coverage", { p_member_id: memberId });
    if (error || !Array.isArray(data)) return { coverages: [], error: "unavailable" };
    return { coverages: data };
  } catch { return { coverages: [], error: "unavailable" }; }
}
export async function getMemberCareCoverage(): Promise<CareCoverageResult> {
  try {
    const session = await getCareSession();
    if (!session || session.member.mustChangePassword) return { coverages: [], error: "unauthorized" };
    return loadCareCoverage(session.member.id);
  } catch { return { coverages: [], error: "unavailable" }; }
}
