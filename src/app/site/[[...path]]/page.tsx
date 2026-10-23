import type { Metadata } from "next";
import { pageTitle } from "@/features/main-site/model/labels";
import { notFound } from "next/navigation";
import { requestLanguage } from "@/shared/i18n/request-language";
import { PublicPage } from "@/features/main-site/components/public-page";
import {
  loadMainSiteRelease,
  mainSiteEnabled,
  publicSiteOrigin,
} from "@/features/main-site/server/release";

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};
const pathname = (segments?: string[]) =>
  segments?.length ? `/${segments.map(encodeURIComponent).join("/")}/` : "/";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!mainSiteEnabled()) return {};
  const path = pathname((await params).path);
  const release = await loadMainSiteRelease();
  const record = release.records.find((item) => item.path === path);
  const language = await requestLanguage();
  return {
    title: {
      absolute: `${pageTitle(path, language, record?.title)} | Gascomp Superlock`,
    },
    alternates: { canonical: `${publicSiteOrigin()}${path}` },
    description:
      language === "id"
        ? "Produk, panduan, dan dukungan resmi Gascomp Superlock."
        : "Official Gascomp Superlock products, guides, and support.",
  };
}
export default async function MainSitePage({ params, searchParams }: Props) {
  if (!mainSiteEnabled()) notFound();
  const path = pathname((await params).path);
  if (path === "/dll/") notFound();
  const release = await loadMainSiteRelease();
  const known = release.records.some(
    (item) =>
      item.path === path ||
      item.categories.some((category) => category.path === path),
  );
  if (!known && !["/shop/"].includes(path)) notFound();
  const search = await searchParams;
  const query = typeof search.q === "string" ? search.q.slice(0, 80) : "";
  const page =
    typeof search.page === "string" && /^\d{1,5}$/.test(search.page)
      ? Number(search.page)
      : 1;
  return (
    <PublicPage
      release={release}
      path={path}
      language={await requestLanguage()}
      query={query}
      page={page}
      siteKey={process.env.GASCOMP_TURNSTILE_SITE_KEY || ""}
    />
  );
}
