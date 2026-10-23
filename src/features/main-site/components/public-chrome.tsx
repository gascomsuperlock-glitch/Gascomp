"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/shared/i18n/language-context";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const id = language === "id";
  const links = [
    ["/", id ? "Beranda" : "Home"],
    ["/product/", id ? "Produk" : "Products"],
    ["/about-us/", id ? "Tentang Kami" : "About"],
    ["/join-reseller/", "Reseller"],
    ["/panduan-instalasi/", id ? "Edukasi" : "Guides"],
    ["/blog/", "Blog"],
    ["/kontak/", id ? "Hubungi Kami" : "Contact"],
  ];
  const navigation = links.map(([href, label]) => (
    <Link key={href} href={href}>
      {label}
    </Link>
  ));
  return (
    <div className="main-website">
      <a className="main-skip" href="#main-content">
        {id ? "Langsung ke konten" : "Skip to content"}
      </a>
      <header className="main-header">
        <Link href="/" aria-label="Gascomp Superlock">
          <Image
            src="/gascomp-logo.png"
            alt="Gascomp Superlock"
            width={180}
            height={48}
            priority
          />
        </Link>
        <nav
          className="main-desktop-nav"
          aria-label={id ? "Menu utama" : "Main navigation"}
        >
          {navigation}
        </nav>
        <select
          aria-label={id ? "Bahasa" : "Language"}
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value === "id" ? "id" : "en");
            router.refresh();
          }}
        >
          <option value="id">Indonesian</option>
          <option value="en">English</option>
        </select>
        <details className="main-mobile-nav">
          <summary>Menu</summary>
          <nav aria-label={id ? "Menu ponsel" : "Mobile navigation"}>
            {navigation}
          </nav>
        </details>
      </header>
      <main id="main-content">{children}</main>
      <footer className="main-footer">
        <div>
          <strong>Gascomp Superlock</strong>
          <p>
            {id
              ? "Produk untuk kebutuhan dapur dan rumah Anda."
              : "Products for your kitchen and home."}
          </p>
        </div>
        <nav aria-label="Support">
          <a href="https://support.gascompsuperlock.com/">
            {id ? "Pusat Bantuan" : "Help Center"}
          </a>
          <a href="https://support.gascompsuperlock.com/klaim-garansi">
            {id ? "Klaim Garansi" : "Warranty Claim"}
          </a>
          <Link href="/privacy-policy-2/">
            {id ? "Kebijakan Privasi" : "Privacy Policy"}
          </Link>
          <Link href="/data-deletion/">
            {id ? "Penghapusan Data" : "Data Deletion"}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
