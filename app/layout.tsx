import type { Metadata } from "next";
import { ContentProvider } from "@/components/content-provider";
import { loadPublicSiteContent } from "@/lib/site-content-store";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pusat Bantuan Gascomp",
    template: "%s | Gascomp",
  },
  description:
    "Video tutorial, solusi kendala, dan FAQ resmi untuk produk Gascomp.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const loaded = await loadPublicSiteContent();
  return (
    <html lang="id" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <ContentProvider initialContent={loaded.content} storageMode={loaded.storageMode}>{children}</ContentProvider>
      </body>
    </html>
  );
}
