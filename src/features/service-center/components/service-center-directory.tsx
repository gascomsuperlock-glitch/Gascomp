"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock3, MapPin, MessageCircle, Navigation, Phone, Search } from "lucide-react";
import { SiteHeader } from "@/shared/components/site-header";
import { useLanguage } from "@/shared/i18n/language-context";
import { INDONESIA_PROVINCES } from "../model/provinces";
import type { ServiceCenter } from "../model/types";

const InteractiveMap = dynamic(() => import("./service-center-map"), { ssr: false, loading: () => <MapLoading /> });
const copy = {
  en: {
    eyebrow: "HERE TO HELP", title: "Find a Service Center", description: "Find Gascomp service locations across Indonesia. Contact the center before visiting to confirm availability and opening hours.",
    search: "Search locations", placeholder: "Center name, city, or address", province: "Province", all: "All provinces", locations: "locations found", reset: "Reset filters",
    empty: "Locations are coming soon", emptyCopy: "We are preparing our service center directory. Contact Gascomp support for assistance.",
    noResults: "No service centers found", noResultsCopy: "There are no listed locations matching these filters. Try another province or contact support.",
    unavailable: "The service center directory is temporarily unavailable. Please try again or contact support.", retry: "Try again", support: "Contact support",
    map: "Location map", mapHint: "Select a marker or choose a location below to explore the map.", loading: "Loading map…", view: "Show on map", directions: "Open Google Maps", phone: "Call", hours: "Opening hours", details: "Service locations", skip: "Skip to locations",
  },
  id: {
    eyebrow: "SIAP MEMBANTU", title: "Temukan Service Center", description: "Cari lokasi layanan Gascomp di seluruh Indonesia. Hubungi service center sebelum berkunjung untuk memastikan ketersediaan layanan dan jam operasional.",
    search: "Cari lokasi", placeholder: "Nama service center, kota, atau alamat", province: "Provinsi", all: "Semua provinsi", locations: "lokasi ditemukan", reset: "Atur ulang filter",
    empty: "Lokasi akan segera tersedia", emptyCopy: "Kami sedang menyiapkan daftar service center. Hubungi layanan Gascomp untuk mendapatkan bantuan.",
    noResults: "Service center tidak ditemukan", noResultsCopy: "Belum ada lokasi yang sesuai dengan filter ini. Coba provinsi lain atau hubungi layanan pelanggan.",
    unavailable: "Daftar service center sedang tidak tersedia. Silakan coba lagi atau hubungi layanan pelanggan.", retry: "Coba lagi", support: "Hubungi layanan pelanggan",
    map: "Peta lokasi", mapHint: "Pilih penanda atau lokasi di bawah untuk menjelajahi peta.", loading: "Memuat peta…", view: "Lihat di peta", directions: "Buka Google Maps", phone: "Telepon", hours: "Jam operasional", details: "Lokasi layanan", skip: "Lewati ke daftar lokasi",
  },
};

function MapLoading() {
  const { language } = useLanguage();
  return <div role="status" className="grid h-[400px] place-items-center rounded-2xl bg-[#eaf2f6] text-sm text-[#53657c]">{copy[language].loading}</div>;
}

export function ServiceCenterDirectory({ centers, error }: { centers: ServiceCenter[]; error?: string }) {
  const { language } = useLanguage();
  const t = copy[language];
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(language);
    return centers.filter((center) => center.active && (!province || center.provinceCode === province) && `${center.name} ${center.city} ${center.address}`.toLocaleLowerCase(language).includes(search));
  }, [centers, province, query, language]);
  const currentId = filtered.some((center) => center.id === selectedId) ? selectedId : undefined;
  const provinces = [...INDONESIA_PROVINCES].sort((a, b) => (language === "id" ? a.nameId.localeCompare(b.nameId, "id") : a.nameEn.localeCompare(b.nameEn, "en")));

  function selectCenter(id: string) {
    setSelectedId(id);
    document.getElementById(`location-${id}`)?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }

  return (
    <div className="min-h-screen bg-[#fffdf7] text-[#021b40] [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#0035b9] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#0035b9]">
      <a href="#locations" className="sr-only focus:not-sr-only">{t.skip}</a>
      <SiteHeader />
      <main>
        <section className="bg-[#0035b9] px-5 py-12 text-white sm:px-8 sm:py-16">
          <div className="mx-auto max-w-6xl"><p className="text-xs font-bold tracking-widest text-[#daef69]">GASCOMP · {t.eyebrow}</p><h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">{t.title}</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">{t.description}</p></div>
        </section>
        <section id="locations" aria-label={t.details} className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><p>{t.unavailable}</p><div className="mt-4 flex flex-wrap gap-4"><button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-full bg-[#0035b9] px-5 font-bold text-white">{t.retry}</button><Link href="/#hubungi" className="inline-flex min-h-11 items-center font-bold underline">{t.support}</Link></div></div> : <>
            <div className="grid gap-4 rounded-2xl border border-[#021b40]/10 bg-white p-5 shadow-sm sm:grid-cols-[1fr_280px]">
              <label className="min-w-0 text-sm font-bold">{t.search}<span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#cbd5e1] px-3"><Search aria-hidden="true" className="size-5 shrink-0 text-[#637086]" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(undefined); }} placeholder={t.placeholder} className="h-full w-full min-w-0 bg-transparent text-base font-normal outline-offset-2" /></span></label>
              <label className="min-w-0 text-sm font-bold">{t.province}<select value={province} onChange={(event) => { setProvince(event.target.value); setSelectedId(undefined); }} className="mt-2 h-12 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-base font-normal"><option value="">{t.all}</option>{provinces.map((item) => <option key={item.code} value={item.code}>{language === "id" ? item.nameId : item.nameEn}</option>)}</select></label>
            </div>
            <div className="my-5 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm font-semibold">{new Intl.NumberFormat(language).format(filtered.length)} {t.locations}</p>{(query || province) && <button type="button" onClick={() => { setQuery(""); setProvince(""); setSelectedId(undefined); }} className="min-h-11 text-sm font-bold text-[#0035b9] underline">{t.reset}</button>}</div>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="order-2 min-w-0 space-y-4 lg:order-1">
                {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#021b40]/20 bg-white p-8 text-center"><MapPin aria-hidden="true" className="mx-auto size-9 text-[#0035b9]" /><h2 className="mt-4 text-xl font-bold">{centers.length ? t.noResults : t.empty}</h2><p className="mt-3 text-sm leading-6 text-[#53657c]">{centers.length ? t.noResultsCopy : t.emptyCopy}</p><Link href="/#hubungi" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#daef69] px-5 text-sm font-bold">{t.support}</Link></div> : filtered.map((center) => {
                  const region = INDONESIA_PROVINCES.find((item) => item.code === center.provinceCode);
                  const digits = center.whatsapp.replace(/\D/g, "");
                  const whatsapp = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
                  return <article id={`location-${center.id}`} key={center.id} className={`scroll-mt-5 rounded-2xl border bg-white p-5 transition ${currentId === center.id ? "border-[#0035b9] ring-2 ring-[#0035b9]/15" : "border-[#021b40]/10"}`}>
                    <p className="text-xs font-bold text-[#0035b9]">{language === "id" ? region?.nameId : region?.nameEn} · {center.city}</p><h2 className="mt-2 break-words text-lg font-extrabold">{center.name}</h2><p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-[#53657c]">{center.address}</p>
                    {center.hours && <p className="mt-3 flex items-start gap-2 whitespace-pre-line text-sm leading-6 text-[#53657c]"><Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0" /><span><span className="sr-only">{t.hours}: </span>{center.hours}</span></p>}
                    <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">{center.phone && <a href={`tel:${center.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center gap-2"><Phone aria-hidden="true" className="size-4" />{t.phone}</a>}{whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2"><MessageCircle aria-hidden="true" className="size-4" />WhatsApp</a>}</div>
                    <div className="mt-3 flex flex-wrap gap-3"><button type="button" aria-pressed={currentId === center.id} onClick={() => { setSelectedId(center.id); document.getElementById("service-map")?.scrollIntoView({ behavior: "instant", block: "nearest" }); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0035b9]/20 px-4 text-xs font-bold text-[#0035b9]"><MapPin aria-hidden="true" className="size-4" />{t.view}</button><a href={center.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${center.latitude},${center.longitude}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-bold text-white"><Navigation aria-hidden="true" className="size-4" />{t.directions}</a></div>
                  </article>;
                })}
              </div>
              <section id="service-map" aria-label={t.map} className="order-1 min-w-0 lg:sticky lg:top-6 lg:order-2"><h2 className="mb-2 text-lg font-bold">{t.map}</h2><p className="mb-4 text-sm leading-6 text-[#53657c]">{t.mapHint}</p><InteractiveMap centers={filtered} selectedId={currentId} onSelect={selectCenter} language={language} /></section>
            </div>
          </>}
        </section>
      </main>
    </div>
  );
}
