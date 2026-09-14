"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpenCheck, CircleHelp, Clock3, MessageCircle, Play, ScanLine, Search, ShieldCheck, X } from "lucide-react";
import { HomeHero } from "@/features/catalog/components/home-hero";
import { useContent } from "@/features/catalog/hooks/use-content";
import { ProductVisual } from "@/features/catalog/components/product-visual";
import { SiteHeader } from "@/shared/components/site-header";
import { Brand } from "@/shared/components/brand";
import { getPrimaryProductImage } from "@/features/catalog/model/product-utils";
import { getWhatsappUrl } from "@/shared/lib/whatsapp";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import styles from "./home-page.module.css";

export function HomePage() {
  const { content, hydrated } = useContent();
  const { language } = useLanguage();
  const copy = dictionaries[language].home;
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const publishedProducts = useMemo(() => content.products.filter((product) => product.published && !product.archived), [content.products]);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return publishedProducts.filter((product) => `${product.name} ${product.model} ${product.sku}`.toLowerCase().includes(normalized));
  }, [publishedProducts, query]);
  const supportUrl = getWhatsappUrl(content.whatsappNumber, undefined, undefined, language);
  const helpSteps = [
    { icon: Play, title: copy.helpStepOneTitle, copy: copy.helpStepOneCopy, color: "#c9edfa" },
    { icon: BookOpenCheck, title: copy.helpStepTwoTitle, copy: copy.helpStepTwoCopy, color: "#daef69" },
    { icon: MessageCircle, title: copy.helpStepThreeTitle, copy: copy.helpStepThreeCopy, color: "#ffb39d" },
  ];

  function clearSearch() {
    setQuery("");
    searchInput.current?.focus();
  }

  return (
    <div className={styles.page}>
      <a href="#main-content" className={styles.skipLink}>{copy.skipToContent}</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <HomeHero whatsappNumber={content.whatsappNumber} />
        <div className={styles.quickLinks}>
          <a href="#produk"><BookOpenCheck aria-hidden="true" /> {copy.productGuides} <ArrowRight aria-hidden="true" /></a>
          <Link href="/klaim-garansi"><ShieldCheck aria-hidden="true" /> {copy.warrantySupport} <ArrowRight aria-hidden="true" /></Link>
          <a href="#hubungi"><MessageCircle aria-hidden="true" /> {copy.helpingHand} <ArrowRight aria-hidden="true" /></a>
        </div>

        <section id="produk" className={styles.catalog} aria-labelledby="catalog-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>{copy.catalogEyebrow}</p><h2 id="catalog-title">{copy.catalogTitleStart}<br /><span>{copy.catalogTitleEnd}</span></h2></div>
              <p>{copy.catalogDescription}</p>
            </div>
            <div className={styles.searchRow}>
              <label className={styles.search}>
                <Search aria-hidden="true" size={21} />
                <span className="sr-only">{copy.searchLabel}</span>
                <input ref={searchInput} name="product-search" type="search" autoComplete="off" spellCheck={false} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
              </label>
              {query && <button type="button" onClick={clearSearch} className={styles.clearSearch}><X aria-hidden="true" size={16} /> {copy.clear}</button>}
              <p role="status" className={styles.resultCount}>{hydrated ? `${new Intl.NumberFormat(language).format(filteredProducts.length)} ${filteredProducts.length === 1 ? copy.product : copy.products}` : copy.loadingProducts}</p>
            </div>
            <div className={`${styles.products} ${filteredProducts.length > 50 ? styles.largeCatalog : ""}`} aria-busy={!hydrated}>
              {hydrated && filteredProducts.map((product) => (
                <Link key={product.id} href={`/produk/${product.slug}`} className={styles.productCard}>
                  <div className={styles.productImage}><ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-60 rounded-2xl" /><span className={styles.productBadge}>{copy.productGuide}</span></div>
                  <div className={styles.productCopy}>
                    <p translate="no">{product.sku} · {product.model}</p>
                    <h3 translate="no">{product.name}</h3>
                    <p className={styles.productDescription}>{product.description || copy.productFallback}</p>
                    <span className={styles.productAction}>{copy.productAction} <span><ArrowRight aria-hidden="true" size={19} /></span></span>
                  </div>
                </Link>
              ))}
            </div>
            {hydrated && filteredProducts.length === 0 && <div className={styles.empty}>
              <CircleHelp aria-hidden="true" size={36} />
              <h3>{publishedProducts.length === 0 ? copy.guidesComing : copy.noMatch}</h3>
              <p>{publishedProducts.length === 0 ? copy.guidesComingCopy : copy.noMatchCopy}</p>
              <div>{query && <button type="button" onClick={clearSearch}>{copy.clearSearch} <X aria-hidden="true" size={16} /></button>}<a href={supportUrl} target="_blank" rel="noreferrer">{copy.askSupport} <ArrowRight aria-hidden="true" size={16} /></a></div>
            </div>}
            <div className={styles.qrNote}><ScanLine aria-hidden="true" size={25} /><p>{copy.qrLead} <strong>{copy.qrStrong}</strong></p></div>
          </div>
        </section>

        <section id="bantuan" className={styles.help} aria-labelledby="help-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{copy.helpEyebrow}</p><h2 id="help-title">{copy.helpTitleStart}<br />{copy.helpTitleEnd}</h2></div><p>{copy.helpDescription}</p></div>
            <div className={styles.helpCards}>{helpSteps.map(({ icon: Icon, title, copy, color }, index) => <div key={title} className={styles.helpCard} style={{ backgroundColor: color }}>
              <div><span className={styles.helpIcon}><Icon aria-hidden="true" size={25} /></span><span className={styles.stepNumber}>0{index + 1}</span></div>
              <h3>{title}</h3><p>{copy}</p>
            </div>)}</div>
          </div>
        </section>

        <section id="hubungi" className={styles.contact} aria-labelledby="contact-title">
          <div className={styles.contactInner}>
            <div><p className={styles.eyebrow}>{copy.contactEyebrow}</p><h2 id="contact-title">{copy.contactTitleStart}<br /><span>{copy.contactTitleEnd}</span></h2><p className={styles.hours}><Clock3 aria-hidden="true" size={17} /> {content.supportHours}</p></div>
            <a href={supportUrl} target="_blank" rel="noreferrer" className={styles.contactAction}><MessageCircle aria-hidden="true" size={21} /> {copy.chatWhatsapp} <ArrowRight aria-hidden="true" size={20} /></a>
          </div>
        </section>
      </main>
      <footer className={styles.footer}><div className={styles.container}><Brand compact /><p>{copy.footerMessage}</p><span>{copy.footerName}</span></div></footer>
    </div>
  );
}
