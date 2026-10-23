import Link from "next/link";
import { pageTitle } from "../model/labels";
import type { MainSiteRelease } from "../server/release";
import { SafeContent } from "./safe-content";
import { PublicChrome } from "./public-chrome";
import { LeadForm } from "./lead-form";
import type { MainSiteRecord } from "../model/types";
import "./public.css";

export function PublicPage({
  release,
  path,
  language,
  query = "",
  page = 1,
  siteKey,
}: {
  release: MainSiteRelease;
  path: string;
  language: "id" | "en";
  query?: string;
  page?: number;
  siteKey: string;
}) {
  const id = language === "id";
  const record = release.records.find((item) => item.path === path);
  const products = release.records.filter((item) => item.kind === "product");
  const posts = release.records.filter((item) => item.kind === "post");
  const categories = [
    ...new Map(
      products
        .flatMap((item) => item.categories)
        .map((item) => [item.path, item]),
    ).values(),
  ];
  const category = categories.find((item) => item.path === path);
  const paths = new Map(
    release.records.map((item) => [`${release.source}${item.path}`, item.path]),
  );
  for (const item of categories)
    paths.set(`${release.source}${item.path}`, item.path);
  paths.set(
    `${release.source}/dll/`,
    "https://support.gascompsuperlock.com/klaim-garansi",
  );
  const catalog =
    ["/product/", "/produk/", "/shop/"].includes(path) || Boolean(category);
  const blog = ["/blog/", "/panduan-instalasi/"].includes(path);
  const contact = ["/kontak/", "/hubungi-kami/"].includes(path);
  const reseller = ["/join-reseller/", "/join-gascomp/"].includes(path);
  const cards = (items: MainSiteRecord[]) => (
    <div className="main-cards">
      {items.map((item) => (
        <Link className="main-card" key={item.id} href={item.path}>
          <div className="main-card-image">
            {item.images[0] ? (
              <SafeContent
                nodes={[{ tag: "img", ...item.images[0] }]}
                paths={paths}
                media={release.media}
              />
            ) : (
              <span>GASCOMP</span>
            )}
          </div>
          <h3>{item.title}</h3>
          <span>{id ? "Lihat selengkapnya" : "View details"} →</span>
        </Link>
      ))}
    </div>
  );
  let items = catalog
    ? products.filter(
        (item) =>
          (!category ||
            item.categories.some((value) => value.path === category.path)) &&
          item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      )
    : posts;
  if (blog && query)
    items = items.filter((item) =>
      item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );
  const pageCount = Math.max(1, Math.ceil(items.length / 12));
  const current = Math.min(Math.max(1, page), pageCount);
  return (
    <PublicChrome>
      {path === "/" ? (
        <>
          <section className="main-hero">
            <div>
              <p className="main-eyebrow">GASCOMP SUPERLOCK</p>
              <h1>
                {id
                  ? "Temukan kebutuhan dapur dan rumah Anda."
                  : "Find what your kitchen and home need."}
              </h1>
              <p>
                {id
                  ? "Jelajahi regulator gas, kompor, dan peralatan rumah tangga Gascomp. Temukan produk serta panduan penggunaannya dalam satu tempat."
                  : "Explore Gascomp gas regulators, stoves, and household appliances. Find products and guides in one place."}
              </p>
              <div className="main-actions">
                <Link className="main-button" href="/product/">
                  {id ? "Jelajahi Produk" : "Explore Products"}
                </Link>
                <Link className="main-button secondary" href="/join-reseller/">
                  {id ? "Menjadi Reseller" : "Become a Reseller"}
                </Link>
              </div>
            </div>
            <div className="main-hero-product">
              {products[0]?.images[0] && (
                <SafeContent
                  nodes={[{ tag: "img", ...products[0].images[0] }]}
                  paths={paths}
                  media={release.media}
                />
              )}
            </div>
          </section>
          <section className="main-section">
            <h2>{id ? "Kategori produk" : "Product categories"}</h2>
            <div className="main-categories">
              {categories.map((item) => (
                <Link key={item.id} href={item.path}>
                  {item.name} →
                </Link>
              ))}
            </div>
          </section>
          <section className="main-section">
            <h2>{id ? "Jelajahi produk kami" : "Explore our products"}</h2>
            {cards(products.slice(0, 8))}
          </section>
          <section className="main-support">
            <h2>
              {id ? "Bantuan untuk produk Anda" : "Help with your product"}
            </h2>
            <p>
              {id
                ? "Panduan, video, klaim garansi, dan tim dukungan Gascomp."
                : "Guides, videos, warranty claims, and Gascomp support."}
            </p>
            <a
              className="main-button"
              href="https://support.gascompsuperlock.com/"
            >
              {id ? "Buka Pusat Bantuan" : "Open Help Center"}
            </a>
          </section>
        </>
      ) : (
        <section className="main-section">
          <nav className="main-breadcrumb">
            <Link href="/">{id ? "Beranda" : "Home"}</Link> /{" "}
            {pageTitle(path, language, category?.name ?? record?.title)}
          </nav>
          <h1>{pageTitle(path, language, category?.name ?? record?.title)}</h1>
          {catalog || blog ? (
            <>
              <form className="main-search" action={path}>
                <label htmlFor="main-search">{id ? "Cari" : "Search"}</label>
                <input
                  id="main-search"
                  name="q"
                  defaultValue={query}
                  maxLength={80}
                  placeholder={
                    id ? "Nama atau model produk" : "Product name or model"
                  }
                />
                <button className="main-button">
                  {id ? "Cari" : "Search"}
                </button>
              </form>
              {items.length ? (
                cards(items.slice((current - 1) * 12, current * 12))
              ) : (
                <p role="status">
                  {id
                    ? "Tidak ada hasil yang tersedia."
                    : "No results available."}
                </p>
              )}
              <nav className="main-pagination" aria-label="Pagination">
                {current > 1 && (
                  <Link
                    href={`${path}?q=${encodeURIComponent(query)}&page=${current - 1}`}
                  >
                    ← {id ? "Sebelumnya" : "Previous"}
                  </Link>
                )}
                <span>
                  {current} / {pageCount}
                </span>
                {current < pageCount && (
                  <Link
                    href={`${path}?q=${encodeURIComponent(query)}&page=${current + 1}`}
                  >
                    {id ? "Berikutnya" : "Next"} →
                  </Link>
                )}
              </nav>
            </>
          ) : (
            <>
              {record?.kind === "product" && (
                <div className="main-product-images">
                  <SafeContent
                    nodes={record.images.map((image) => ({
                      tag: "img",
                      ...image,
                    }))}
                    paths={paths}
                    media={release.media}
                  />
                </div>
              )}
              {contact || reseller ? (
                <>
                  <p>
                    {id
                      ? reseller
                        ? "Tertarik menjadi reseller? Kirim informasi Anda agar tim kami dapat menindaklanjuti."
                        : "Kirim pertanyaan Anda kepada tim Gascomp."
                      : reseller
                        ? "Interested in becoming a reseller? Send your details so our team can follow up."
                        : "Send your question to the Gascomp team."}
                  </p>
                  <LeadForm
                    kind={reseller ? "reseller" : "contact"}
                    language={language}
                    siteKey={siteKey}
                  />
                </>
              ) : (
                record && (
                  <SafeContent
                    nodes={record.nodes}
                    paths={paths}
                    media={release.media}
                  />
                )
              )}
              {record?.kind === "product" && (
                <div className="main-actions">
                  <Link className="main-button" href="/kontak/">
                    {id ? "Tanyakan Produk Ini" : "Ask About This Product"}
                  </Link>
                  <a href="https://support.gascompsuperlock.com/">
                    {id ? "Panduan dan bantuan" : "Guides and support"}
                  </a>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </PublicChrome>
  );
}
