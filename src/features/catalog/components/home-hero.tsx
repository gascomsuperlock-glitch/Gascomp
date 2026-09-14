"use client";

import localFont from "next/font/local";
import { ArrowDown, ArrowRight, BookOpenCheck, Check, MessageCircle, Play, ScanLine, Sparkles } from "lucide-react";
import { getWhatsappUrl } from "@/shared/lib/whatsapp";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import styles from "./home-hero.module.css";

const raleway = localFont({
  src: "../../../../public/fonts/raleway-latin.woff2",
  weight: "500 700",
  display: "swap",
  variable: "--hero-heading-font",
});
const openSans = localFont({
  src: "../../../../public/fonts/open-sans-latin.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--hero-body-font",
});

export function HomeHero({ whatsappNumber }: { whatsappNumber: string }) {
  const { language } = useLanguage();
  const copy = dictionaries[language].hero;

  return (
    <section aria-labelledby="home-hero-title" className={`${styles.hero} ${raleway.variable} ${openSans.variable}`}>
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><span /> {copy.eyebrow}</p>
          <h1 id="home-hero-title" className={styles.title}>{copy.titleStart}<br /><span>{copy.titleEnd}</span></h1>
          <p className={styles.description}>{copy.description}</p>
          <div className={styles.actions}>
            <a href="#produk" className={styles.primaryAction}>{copy.findProduct} <ArrowRight aria-hidden="true" size={20} /></a>
            <a href={getWhatsappUrl(whatsappNumber, undefined, undefined, language)} target="_blank" rel="noreferrer" className={styles.secondaryAction}><MessageCircle aria-hidden="true" size={18} /> {copy.talkToUs}</a>
          </div>
          <div className={styles.reassurance}>
            <span><Check aria-hidden="true" size={16} /> {copy.officialGuides}</span>
            <span><Check aria-hidden="true" size={16} /> {copy.noAccount}</span>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.orbit} aria-hidden="true" />
          <div className={styles.sticker} aria-hidden="true"><Sparkles size={25} /><span>{copy.sticker.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</span></div>
          <div className={styles.guide}>
            <div className={styles.guideHeader}><span>{copy.guideLabel}</span><span className={styles.guideDots} aria-hidden="true"><i /><i /><i /></span></div>
            <div className={styles.guideBody}>
              <span className={styles.guideIcon}><BookOpenCheck aria-hidden="true" size={37} strokeWidth={1.6} /></span>
              <h2>{copy.guideTitleStart}<br />{copy.guideTitleEnd}</h2>
              <p>{copy.guideCopy}</p>
              <a href="#produk" className={styles.guideLink}><span className={styles.playIcon}><Play aria-hidden="true" size={17} fill="currentColor" /></span>{copy.exploreTutorials}<ArrowRight aria-hidden="true" size={18} /></a>
            </div>
            <div className={styles.guideFooter}><Check aria-hidden="true" size={16} /> {copy.guideFooter}</div>
          </div>
          <div className={styles.scanNote}><ScanLine aria-hidden="true" size={30} /><p>{copy.scanLead}<strong>{copy.scanStrong}</strong></p><ArrowRight aria-hidden="true" size={19} /></div>
        </div>
      </div>
      <div className={styles.footer}><span>{copy.footerMessage}</span><a href="#produk">{copy.getStarted} <ArrowDown aria-hidden="true" size={16} /></a></div>
    </section>
  );
}
