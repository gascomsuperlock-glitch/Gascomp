import { redirect } from "next/navigation";
import { CareLoginForm, CareUnavailable } from "@/features/gascomp-care/components/care-customer-page";
import { getCareAvailability, getCareSession } from "@/features/gascomp-care/server/session";

export default async function GascompCareLoginPage() {
  if (!await getCareAvailability()) return <CareUnavailable />;
  const session = await getCareSession();
  if (session) redirect(session.member.mustChangePassword ? "/gascomp-care/change-password" : "/gascomp-care");
  return <CareLoginForm />;
}
