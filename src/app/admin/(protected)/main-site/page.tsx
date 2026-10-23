import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/features/auth/server/session";
import { MainSitePreview } from "@/features/main-site/components/preview";
import { loadMainSiteSnapshot } from "@/features/main-site/server/snapshot";
import { requestLanguage } from "@/shared/i18n/request-language";

export const metadata: Metadata = {
  title: "Main site migration",
  robots: { index: false, follow: false },
};

export default async function MainSitePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ record?: string }>;
}) {
  if (process.env.GASCOMP_MAIN_SITE_PREVIEW_ENABLED !== "true") notFound();
  if (!(await getAdminSession())) redirect("/admin/login");
  const language = await requestLanguage();
  const { record } = await searchParams;
  const result = await loadMainSiteSnapshot().then(
    (snapshot) => ({ snapshot, failed: false }),
    () => ({ snapshot: null, failed: true }),
  );
  return (
    <MainSitePreview
      {...result}
      selected={typeof record === "string" ? record : undefined}
      language={language}
    />
  );
}
