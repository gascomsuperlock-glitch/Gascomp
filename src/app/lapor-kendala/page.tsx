import type { Metadata } from "next";
import { CareDirectForm } from "@/features/care-direct/components/care-direct-form";
import { requestLanguage } from "@/shared/i18n/request-language";

export async function generateMetadata(): Promise<Metadata> {
  const language = await requestLanguage();
  return {
    title: language === "id" ? "Lapor Kendala — Gascomp CareDirect" : "Report an issue — Gascomp CareDirect",
    description: language === "id"
      ? "Laporkan kendala produk Gascomp untuk mendapatkan penanganan langsung dari tim CareDirect."
      : "Report a Gascomp product issue for direct assistance from the CareDirect team.",
  };
}

export default function CareDirectPage() {
  return <CareDirectForm />;
}
