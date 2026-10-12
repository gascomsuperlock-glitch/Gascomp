import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requestLanguage } from "@/shared/i18n/request-language";
import { careCopy } from "@/features/gascomp-care/model/copy";

export async function generateMetadata(): Promise<Metadata> {
  const language = await requestLanguage();
  return { title: "GascompCare", description: careCopy[language].description, robots: { index: false, follow: false } };
}

export default function GascompCareLayout({ children }: { children: ReactNode }) { return children; }
