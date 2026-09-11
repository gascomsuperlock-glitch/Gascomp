"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Check, Plus, RefreshCw, Star, Trash2, Upload } from "lucide-react";
import { createId } from "@/shared/lib/create-id";
import { getProductImageSource } from "@/features/catalog/model/product-utils";
import type { Product, ProductImage } from "@/features/catalog/model/types";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGES = 6;
const MAX_STORED_LENGTH = 600_000;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProductImageEditor({ product, update }: { product: Product; update: (updater: (product: Product) => Product) => void }) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function processFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error("Select a JPG, PNG, or WebP image.");
    if (file.size > MAX_FILE_SIZE) throw new Error("The maximum image size is 8 MB.");
    return compressImage(file);
  }

  async function addImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (product.images.length >= MAX_IMAGES) {
      setError(`A product can have up to ${MAX_IMAGES} images.`);
      return;
    }

    setBusyId("new");
    setError("");
    try {
      const dataUrl = await processFile(file);
      const image: ProductImage = {
        id: createId("image"),
        name: file.name,
        dataUrl,
        alt: `Photo of ${product.name}`,
        isPrimary: product.images.length === 0,
      };
      update((current) => ({ ...current, images: [...current.images, image] }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The image could not be processed.");
    } finally {
      setBusyId(null);
    }
  }

  async function replaceImage(imageId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusyId(imageId);
    setError("");
    try {
      const dataUrl = await processFile(file);
      update((current) => ({
        ...current,
        images: current.images.map((image) => image.id === imageId ? { ...image, name: file.name, dataUrl, url: undefined, storagePath: undefined } : image),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The image could not be processed.");
    } finally {
      setBusyId(null);
    }
  }

  function setPrimary(imageId: string) {
    update((current) => ({
      ...current,
      images: current.images.map((image) => ({ ...image, isPrimary: image.id === imageId })),
    }));
  }

  function deleteImage(imageId: string) {
    const target = product.images.find((image) => image.id === imageId);
    if (!target || !window.confirm(`Delete image “${target.name}”?`)) return;

    update((current) => {
      const remaining = current.images.filter((image) => image.id !== imageId);
      if (target.isPrimary && remaining[0]) remaining[0] = { ...remaining[0], isPrimary: true };
      return { ...current, images: remaining };
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-[-0.025em]">Product images</h2>
          <p className="mt-1.5 max-w-lg text-xs leading-5 text-[#7a8489]">Upload up to {MAX_IMAGES} photos per SKU. Images are compressed before storage to keep pages fast.</p>
        </div>
        <button type="button" onClick={() => uploadRef.current?.click()} disabled={busyId !== null || product.images.length >= MAX_IMAGES} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0035b9] px-4 text-xs font-extrabold text-white disabled:opacity-50">
          {busyId === "new" ? <RefreshCw className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add image
        </button>
        <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={addImage} className="sr-only" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-[10px] font-semibold text-[#707a80]">
        <span className="rounded-full bg-[#f2f4f7] px-3 py-1.5">JPG, PNG, or WebP</span>
        <span className="rounded-full bg-[#f2f4f7] px-3 py-1.5">Up to 8 MB per file</span>
        <span className="rounded-full bg-[#f2f4f7] px-3 py-1.5">Square aspect ratio recommended</span>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0ef] p-3 text-xs font-semibold text-[#b33b31]">{error}</p>}

      {product.images.length === 0 ? (
        <button type="button" onClick={() => uploadRef.current?.click()} className="mt-7 grid w-full place-items-center rounded-[22px] border border-dashed border-[#2c3038]/16 bg-[#fafbfc] px-6 py-14 text-center transition hover:border-[#0035b9]/35 hover:bg-[#f6f9ff]">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#e9f2ff] text-[#0035b9]"><Upload className="size-5" /></span>
          <strong className="mt-4 text-sm">Upload the first product photo</strong>
          <span className="mt-1.5 text-xs text-[#889197]">This photo automatically becomes the primary image.</span>
        </button>
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {product.images.map((image, index) => (
            <article key={image.id} className="overflow-hidden rounded-[20px] border border-[#2c3038]/9 bg-[#fafafa]">
              <div className="relative aspect-[4/3] bg-[#f0f2f5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getProductImageSource(image)} alt={image.alt || product.name} className="size-full object-contain p-4" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-extrabold text-[#5f6970] shadow-sm">IMAGE {index + 1}</span>
                {image.isPrimary && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#0035b9] px-2.5 py-1 text-[9px] font-extrabold text-white shadow-sm"><Star className="size-2.5 fill-current" /> PRIMARY</span>}
                {busyId === image.id && <div className="absolute inset-0 grid place-items-center bg-white/75 backdrop-blur-sm"><RefreshCw className="size-6 animate-spin text-[#0035b9]" /></div>}
              </div>

              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate text-xs font-extrabold">{image.name}</p><span className="shrink-0 text-[9px] font-semibold text-[#8d959a]">{image.dataUrl ? formatDataUrlSize(image.dataUrl) : "Supabase Storage"}</span></div>
                <label className="block"><span className="text-[10px] font-extrabold text-[#59646b]">Alternative text</span><input value={image.alt} onChange={(event) => update((current) => ({ ...current, images: current.images.map((item) => item.id === image.id ? { ...item, alt: event.target.value } : item) }))} className="mt-2 h-10 w-full rounded-xl border border-[#2c3038]/10 bg-white px-3 text-xs font-semibold outline-none focus:border-[#0035b9]/40" /></label>
                <label className="block"><span className="text-[10px] font-extrabold text-[#59646b]">Linked variation</span><select value={image.variationId ?? ""} onChange={(event) => update((current) => ({ ...current, images: current.images.map((item) => item.id === image.id ? { ...item, variationId: event.target.value || undefined } : item) }))} className="mt-2 h-10 w-full rounded-xl border border-[#2c3038]/10 bg-white px-3 text-xs font-semibold outline-none focus:border-[#0035b9]/40"><option value="">All variations</option>{product.variations.map((variation) => <option key={variation.id} value={variation.id}>{variation.name} · {variation.sku}</option>)}</select></label>

                <div className="flex flex-wrap gap-2 border-t border-[#2c3038]/8 pt-3">
                  {!image.isPrimary && <button type="button" onClick={() => setPrimary(image.id)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#2c3038]/10 bg-white px-3 text-[10px] font-extrabold text-[#48555d]"><Star className="size-3" /> Make primary</button>}
                  {image.isPrimary && <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#eaf4ee] px-3 text-[10px] font-extrabold text-[#3f7f57]"><Check className="size-3" /> Primary image</span>}
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#2c3038]/10 bg-white px-3 text-[10px] font-extrabold text-[#48555d]"><RefreshCw className="size-3" /> Replace<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => replaceImage(image.id, event)} className="sr-only" /></label>
                  <button type="button" onClick={() => deleteImage(image.id)} className="ml-auto grid size-9 place-items-center rounded-full bg-[#fff0ef] text-[#b33b31]" aria-label={`Delete ${image.name}`}><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      let maxDimension = 1200;
      let quality = 0.8;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(source);
          reject(new Error("The browser cannot process this image."));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/webp", quality);
        if (dataUrl.length <= MAX_STORED_LENGTH) {
          URL.revokeObjectURL(source);
          resolve(dataUrl);
          return;
        }
        maxDimension = Math.round(maxDimension * 0.82);
        quality = Math.max(0.5, quality - 0.07);
      }

      URL.revokeObjectURL(source);
      reject(new Error("The image is still too large after compression. Select another image."));
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("The image file cannot be read."));
    };
    image.src = source;
  });
}

function formatDataUrlSize(dataUrl: string) {
  const bytes = Math.round((dataUrl.length * 3) / 4);
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
