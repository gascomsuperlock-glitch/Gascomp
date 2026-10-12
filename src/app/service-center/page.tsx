import type { Metadata } from "next";
import { ServiceCenterDirectory } from "@/features/service-center/components/service-center-directory";
import { loadPublicServiceCenters } from "@/features/service-center/server/store";
import { requestLanguage } from "@/shared/i18n/request-language";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await requestLanguage();
  return {
    title: language === "id" ? "Lokasi Service Center" : "Service Center Locations",
    description: language === "id" ? "Temukan lokasi service center Gascomp di seluruh Indonesia." : "Find Gascomp service center locations across Indonesia.",
  };
}

export default async function ServiceCenterPage() {
  const result = await loadPublicServiceCenters();
  return <ServiceCenterDirectory centers={result.centers} error={result.error} />;
}
