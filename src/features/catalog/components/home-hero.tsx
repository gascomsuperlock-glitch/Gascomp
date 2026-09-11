import localFont from "next/font/local";
import { ArrowDown, ArrowRight, BookOpenCheck, Check, MessageCircle, ScanLine, ShieldCheck } from "lucide-react";
import { getWhatsappUrl } from "@/shared/lib/whatsapp";
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
  const supportUrl = getWhatsappUrl(whatsappNumber);

  return (
    <section aria-labelledby="home-hero-title" className={`${styles.hero} ${raleway.variable} ${openSans.variable}`}>
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><span /> OFFICIAL GASCOMP PRODUCT GUIDES</p>
          <h1 id="home-hero-title" className={styles.title}>
            Use your product<br />
            <span>with confidence.</span>
          </h1>
          <p className={styles.description}>
            A little guidance goes a long way. Find video tutorials, clear answers,
            and support for your Gascomp product, all in one place.
          </p>
          <div className={styles.actions}>
            <a href="#produk" className={styles.primaryAction}>
              Choose my product <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a href={supportUrl} target="_blank" rel="noreferrer" className={styles.secondaryAction}>
              <MessageCircle aria-hidden="true" size={18} /> Ask support
            </a>
          </div>
          <div className={styles.reassurance}>
            <span><Check aria-hidden="true" size={16} /> No login required</span>
            <span><Check aria-hidden="true" size={16} /> Guidance from Gascomp</span>
          </div>
        </div>

        <div className={styles.visual}>
          <svg className={styles.supergraphic} viewBox="0 0 500 560" fill="none" aria-hidden="true">
            <path d="M0 560 278 58h83c20 0 34 11 44 29L665 560H535L323 174 109 560Z" fill="currentColor" />
          </svg>
          <div className={styles.guide}>
            <div className={styles.guideHeader}>
              <span className={styles.guideLabel}>YOUR EVERYDAY GUIDE</span>
              <ShieldCheck aria-hidden="true" size={23} />
            </div>
            <h2 className={styles.guideTitle}>Getting started?<br />We make it simple.</h2>
            <div className={styles.steps}>
              <a href="#produk" className={styles.step}>
                <span className={styles.stepNumber}>01</span>
                <span><strong>Find your product</strong><small>Match the name, model, or SKU.</small></span>
                <ArrowRight aria-hidden="true" size={18} />
              </a>
              <a href="#produk" className={styles.step}>
                <span className={styles.stepNumber}>02</span>
                <span><strong>Follow your guide</strong><small>Choose a product to see tutorials.</small></span>
                <BookOpenCheck aria-hidden="true" size={18} />
              </a>
              <a href={supportUrl} target="_blank" rel="noreferrer" className={styles.step}>
                <span className={styles.stepNumber}>03</span>
                <span><strong>Let us help</strong><small>Talk to the Gascomp support team.</small></span>
                <MessageCircle aria-hidden="true" size={18} />
              </a>
            </div>
            <div className={styles.scanNote}>
              <ScanLine aria-hidden="true" size={24} />
              <p>Have the packaging?<br /><strong>Scan its QR code to open your guide.</strong></p>
            </div>
          </div>
          <span className={styles.visualCaption}>GASCOMP / PRODUCT HELP CENTER</span>
        </div>
      </div>
      <div className={styles.footer}>
        <span>Made for your everyday confidence.</span>
        <a href="#produk">Explore product guides <ArrowDown aria-hidden="true" size={16} /></a>
      </div>
    </section>
  );
}
