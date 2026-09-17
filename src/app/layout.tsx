import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ContentProvider } from "@/features/catalog/components/content-provider";
import { AssistantPanel } from "@/features/ai-assistance/components/assistant-panel";
import { FloatingWhatsappButton } from "@/features/catalog/components/floating-whatsapp-button";
import { loadPublicSiteContent } from "@/features/catalog/server/content-store";
import { LanguageProvider } from "@/shared/i18n/language-context";
import { LANGUAGE_COOKIE_NAME, parseLanguage } from "@/shared/i18n/language";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gascomp Help Center",
    template: "%s | Gascomp",
  },
  description:
    "Official video tutorials, troubleshooting guides, and FAQs for Gascomp products.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [loaded, cookieStore] = await Promise.all([loadPublicSiteContent(), cookies()]);
  const language = parseLanguage(cookieStore.get(LANGUAGE_COOKIE_NAME)?.value);
  return (
    <html lang={language} className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLanguage={language}>
          <ContentProvider initialContent={loaded.content} storageMode={loaded.storageMode}>
            {children}
            {process.env.GASCOMP_AI_ASSISTANCE_ENABLED === "true" ? <AssistantPanel /> : <FloatingWhatsappButton />}
          </ContentProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
