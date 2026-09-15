import { redirect } from "next/navigation";
import { CarePasswordForm, CareUnavailable } from "@/features/gascomp-care/components/care-customer-page";
import { getCareAvailability, getCareSession } from "@/features/gascomp-care/server/session";

export default async function GascompCareChangePasswordPage() {
  if (!await getCareAvailability()) return <CareUnavailable />;
  const session = await getCareSession();
  if (!session) redirect("/gascomp-care/login");
  return <CarePasswordForm mustChangePassword={session.member.mustChangePassword} />;
}
