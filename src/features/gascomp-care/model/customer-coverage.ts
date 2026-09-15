import type { CareCoverage, CareCoverageResult } from "./coverage";

export type CareCustomerCoverage = Pick<CareCoverage, "id" | "itemLabel" | "purchaseDate" | "expiresOn" | "claimsRemaining" | "status">;
export type CareCustomerCoverageResult = { coverages: CareCustomerCoverage[]; error?: string };

export function toCustomerCoverage(result: CareCoverageResult): CareCustomerCoverageResult {
  return {
    error: result.error,
    coverages: result.coverages.map(({ id, itemLabel, purchaseDate, expiresOn, claimsRemaining, status }) => ({
      id, itemLabel, purchaseDate, expiresOn, claimsRemaining: status === "expired" ? 0 : claimsRemaining, status,
    })),
  };
}
