import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE_NAME, parseLanguage } from "@/shared/i18n/language";
import { careCopy } from "@/features/gascomp-care/model/copy";

export async function generateMetadata(): Promise<Metadata> {
  const language = parseLanguage((await cookies()).get(LANGUAGE_COOKIE_NAME)?.value);
  return { title: "GascompCare", description: careCopy[language].description, robots: { index: false, follow: false } };
}

export default function GascompCareLayout({ children }: { children: ReactNode }) { return children; }
