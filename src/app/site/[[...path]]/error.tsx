"use client";
import { useLanguage } from "@/shared/i18n/language-context";
export default function MainSiteError({ reset }: { reset: () => void }) {
  const { language } = useLanguage();
  return (
    <main className="p-8">
      <h1>
        {language === "id"
          ? "Halaman sementara tidak tersedia"
          : "This page is temporarily unavailable"}
      </h1>
      <button onClick={reset} className="mt-4 underline">
        {language === "id" ? "Coba lagi" : "Try again"}
      </button>
    </main>
  );
}
