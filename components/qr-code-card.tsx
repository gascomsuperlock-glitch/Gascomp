"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react";

export function QrCodeCard({ slug, name }: { slug: string; name: string }) {
  const [origin, setOrigin] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const productUrl = origin ? `${origin}/produk/${slug}` : `/produk/${slug}`;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    QRCode.toDataURL(productUrl, {
      width: 640,
      margin: 2,
      color: { dark: "#2c3038", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [origin, productUrl]);

  async function copyUrl() {
    await navigator.clipboard.writeText(productUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadQr() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `qr-${slug}.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[280px_1fr]">
      <div className="rounded-[24px] border border-[#2c3038]/9 bg-white p-5 shadow-sm">
        <div className="aspect-square overflow-hidden rounded-2xl border border-[#2c3038]/8 bg-white p-3">
          {dataUrl ? (
            // A generated data URL does not benefit from Next image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`QR untuk ${name}`} className="size-full" />
          ) : (
            <div className="grid size-full place-items-center bg-[#f5f3ee] text-[#a1a7aa]"><QrCode className="size-12" /></div>
          )}
        </div>
        <button type="button" onClick={downloadQr} disabled={!dataUrl} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2c3038] text-xs font-extrabold text-white transition hover:bg-[#293c4a] disabled:opacity-50">
          <Download className="size-4" /> Unduh QR PNG
        </button>
      </div>

      <div className="self-center">
        <p className="text-[10px] font-extrabold tracking-[0.14em] text-[#0035b9]">QR KHUSUS PRODUK</p>
        <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">{name}</h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#6e787e]">Cetak QR ini pada produk atau kemasan. Pelanggan akan langsung masuk ke halaman panduan model ini.</p>
        <div className="mt-6 rounded-xl border border-[#2c3038]/9 bg-[#f8f7f3] p-3">
          <p className="truncate text-xs font-semibold text-[#5f6b72]">{productUrl}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={copyUrl} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#2c3038]/10 bg-white px-4 text-xs font-extrabold transition hover:border-[#0035b9]/30">
            {copied ? <Check className="size-4 text-[#3d8a58]" /> : <Copy className="size-4 text-[#0035b9]" />}
            {copied ? "Tersalin" : "Salin tautan"}
          </button>
          <a href={productUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#2c3038]/10 bg-white px-4 text-xs font-extrabold transition hover:border-[#0035b9]/30"><ExternalLink className="size-4 text-[#0035b9]" /> Coba halaman</a>
        </div>
        <p className="mt-5 rounded-xl bg-[#eef4ff] p-4 text-xs leading-5 text-[#315b9a]">Gunakan domain website final sebelum mengunduh QR untuk dicetak agar alamatnya tidak mengarah ke localhost.</p>
      </div>
    </div>
  );
}
