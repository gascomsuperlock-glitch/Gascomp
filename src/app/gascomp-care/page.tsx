import { CareMemberPage, CareUnavailable } from "@/features/gascomp-care/components/care-customer-page";
import { getCareAvailability, requireCareMember } from "@/features/gascomp-care/server/session";

import { getMemberCareCoverage } from "@/features/gascomp-care/server/coverage";

import { toCustomerCoverage } from "@/features/gascomp-care/model/customer-coverage";

export default async function GascompCarePage() {
  if (!await getCareAvailability()) return <CareUnavailable />;
  const member = await requireCareMember();
  const coverage = await getMemberCareCoverage();
  return <CareMemberPage member={member} coverage={toCustomerCoverage(coverage)} />;
}
