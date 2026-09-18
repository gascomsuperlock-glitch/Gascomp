"use client";

import { useEffect, useState } from "react";
import { generateBrandedQr } from "../model/branded-qr";
import { Check, Copy, Download, ExternalLink, LoaderCircle, QrCode } from "lucide-react";

export function QrCodeCard({ slug, name, sku, published, archived, publicBaseUrl }: { slug: string; name: string; sku: string; published: boolean; archived: boolean; publicBaseUrl?: string }) {
  const [result, setResult] = useState<{ productUrl: string; dataUrl?: string; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  const [copyError, setCopyError] = useState("");
  const [copied, setCopied] = useState(false);
  const productUrl = publicBaseUrl ? `${publicBaseUrl}/produk/${slug}` : "";

  const dataUrl = result?.productUrl === productUrl ? result.dataUrl : undefined;
  const error = result?.productUrl === productUrl ? result.error : undefined;
  const loading = Boolean(productUrl && !dataUrl && !error);

  useEffect(() => {
    if (!productUrl) return;
    let cancelled = false;
    generateBrandedQr(productUrl).then((url) => {
      if (!cancelled) setResult({ productUrl, dataUrl: url });
    }).catch(() => {
      if (!cancelled) setResult({ productUrl, error: "Unable to generate this QR code. Please try again." });
    });
    return () => {
      cancelled = true;
    };
  }, [productUrl, attempt]);

  async function copyUrl() {
    if (!productUrl) return;
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopyError("");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError("Unable to copy the link. Select and copy the URL above.");
    }
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
            <img src={dataUrl} alt={`QR code for ${name}`} className="size-full" />
          ) : (
            <div role="status" className="flex size-full flex-col items-center justify-center gap-3 bg-[#f5f3ee] text-center text-xs text-[#69747b]">
              {loading ? <LoaderCircle className="size-10 animate-spin" /> : <QrCode className="size-12" />}
              <span>{loading ? "Generating QR code..." : error ? "QR code unavailable" : "Configure the production domain to generate QR codes."}</span>
            </div>
          )}
        </div>
        <button type="button" onClick={downloadQr} disabled={!dataUrl} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2c3038] text-xs font-extrabold text-white transition hover:bg-[#293c4a] disabled:opacity-50">
          <Download className="size-4" /> Download QR PNG
        </button>
      </div>

      <div className="min-w-0 self-center">
        <p className="text-[10px] font-extrabold tracking-[0.14em] text-[#0035b9]">PRODUCT QR CODE</p>
        <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">{name}</h3>
        <p className="mt-2 break-words text-xs font-bold text-[#69747b]">SKU: {sku}</p>
        {!published && !archived && <p className="mt-3 rounded-xl bg-[#fff5ec] p-3 text-xs leading-5 text-[#8c4a2d]">This product is a draft. Publish and save it before distributing its QR code.</p>}
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#6e787e]">Print this QR code on the product or packaging. Customers will go directly to this model&apos;s help page.</p>
        <div className="mt-6 rounded-xl border border-[#2c3038]/9 bg-[#f8f7f3] p-3">
          <p className="break-all text-xs font-semibold text-[#5f6b72]">{productUrl || "The production domain is not configured"}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={copyUrl} disabled={!productUrl} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#2c3038]/10 bg-white px-4 text-xs font-extrabold transition hover:border-[#0035b9]/30 disabled:cursor-not-allowed disabled:opacity-50">
            {copied ? <Check className="size-4 text-[#3d8a58]" /> : <Copy className="size-4 text-[#0035b9]" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          {productUrl ? <a href={productUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#2c3038]/10 bg-white px-4 text-xs font-extrabold transition hover:border-[#0035b9]/30"><ExternalLink className="size-4 text-[#0035b9]" /> Open page</a> : <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-full border border-[#2c3038]/10 bg-white px-4 text-xs font-extrabold opacity-50"><ExternalLink className="size-4 text-[#0035b9]" /> Open page</span>}
        </div>
        {copyError && <p role="alert" className="mt-3 text-xs text-[#a23f36]">{copyError}</p>}
        {error && <div role="alert" className="mt-3 text-xs text-[#a23f36]">{error} <button type="button" className="font-bold underline" onClick={() => { setResult(undefined); setAttempt((value) => value + 1); }}>Retry</button></div>}
        <p className={`mt-5 rounded-xl p-4 text-xs leading-5 ${productUrl ? "bg-[#edf8f0] text-[#3e7652]" : "bg-[#fff5ec] text-[#8c4a2d]"}`}>{productUrl ? <>This QR code points to <strong>{publicBaseUrl}</strong> and opens this product&apos;s help page. Save any publication changes and verify the page before printing.</> : <>Set <strong>GASCOMP_PUBLIC_BASE_URL</strong> to the production subdomain. Local QR generation is disabled to prevent printing a localhost address.</>}</p>
      </div>
    </div>
  );
}
