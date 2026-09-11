import { redirect } from "next/navigation";
import { getAdminSession } from "@/features/auth/server/session";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return children;
}
