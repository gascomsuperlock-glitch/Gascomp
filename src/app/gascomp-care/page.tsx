import { CareMemberPage, CareUnavailable } from "@/features/gascomp-care/components/care-customer-page";
import { getCareAvailability, requireCareMember } from "@/features/gascomp-care/server/session";

export default async function GascompCarePage() {
  if (!await getCareAvailability()) return <CareUnavailable />;
  const member = await requireCareMember();
  return <CareMemberPage member={member} />;
}
