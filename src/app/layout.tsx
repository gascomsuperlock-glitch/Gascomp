import type { Metadata } from "next";
import { ContentProvider } from "@/features/catalog/components/content-provider";
import { loadPublicSiteContent } from "@/features/catalog/server/content-store";
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
  const loaded = await loadPublicSiteContent();
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <ContentProvider initialContent={loaded.content} storageMode={loaded.storageMode}>{children}</ContentProvider>
      </body>
    </html>
  );
}
