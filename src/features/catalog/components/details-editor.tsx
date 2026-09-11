"use client";

import { Trash2 } from "lucide-react";
import { ProductVisual } from "@/features/catalog/components/product-visual";
import { getPrimaryProductImage } from "@/features/catalog/model/product-utils";
import type { Product, ProductTone } from "@/features/catalog/model/types";
import { Field, EditorHeading, fieldClass, areaClass } from "@/shared/components/ui/editor-fields";

import { VariationsEditor } from "@/features/catalog/components/variations-editor";

export function DetailsEditor({ product, update, onDelete }: { product: Product; update: (updater: (product: Product) => Product) => void; onDelete: () => void }) {
  return (
    <div>
      <EditorHeading title="Product information" copy="This name and description will appear on the customer page." />
      {product.source?.provider === "duoke" && (
        <div className="mt-5 rounded-2xl border border-[#0035b9]/12 bg-[#f3f7ff] p-4 text-[10px] leading-5 text-[#53657c]">
          <strong className="block text-xs text-[#0035b9]">Synced from Duoke</strong>
          Product identity: {product.source.productId}{product.source.storeId ? ` · Store: ${product.source.storeId}` : ""}. The name, SKU, details, and variants will be synchronized again during the next import.
        </div>
      )}
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Product name"><input value={product.name} onChange={(event) => update((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></Field>
        <Field label="Product SKU"><input value={product.sku} onChange={(event) => update((current) => ({ ...current, sku: event.target.value }))} className={fieldClass} /></Field>
        <Field label="Model or category"><input value={product.model} onChange={(event) => update((current) => ({ ...current, model: event.target.value }))} className={fieldClass} /></Field>
        <Field label="Page address" hint="Set when the product is created so its QR code remains active."><div className="mt-2 flex h-11 items-center rounded-xl border border-[#2c3038]/8 bg-[#f4f3ef] px-3.5 text-xs font-semibold text-[#6f797f]">/produk/{product.slug}</div></Field>
        <Field label="Product card color"><div className="mt-3 flex gap-2">{(["orange", "navy", "green"] as ProductTone[]).map((tone) => <button key={tone} type="button" onClick={() => update((current) => ({ ...current, tone }))} className={`size-9 rounded-full border-4 ${tone === "orange" ? "bg-[#0035b9]" : tone === "navy" ? "bg-[#233847]" : "bg-[#4f745e]"} ${product.tone === tone ? "border-[#d4e2fb] ring-2 ring-[#0035b9]" : "border-white ring-1 ring-[#2c3038]/10"}`} aria-label={`Select ${tone}`} />)}</div></Field>
        <div className="sm:col-span-2"><Field label="Short description"><textarea value={product.description} onChange={(event) => update((current) => ({ ...current, description: event.target.value }))} className={areaClass} /></Field></div>
      </div>
      <VariationsEditor product={product} update={update} />
      {product.attributes && product.attributes.length > 0 && (
        <div className="mt-8 border-t border-[#2c3038]/8 pt-7">
          <p className="text-sm font-extrabold">Attributes from Duoke</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">{product.attributes.map((attribute) => <div key={`${attribute.name}-${attribute.value}`} className="rounded-xl bg-[#f6f7f8] p-3"><dt className="text-[9px] font-extrabold uppercase tracking-wide text-[#818a8f]">{attribute.name}</dt><dd className="mt-1 text-xs font-semibold">{attribute.value}</dd></div>)}</dl>
        </div>
      )}
      <div className="mt-8 rounded-2xl bg-[#f6f4ef] p-4"><p className="text-xs font-extrabold">Card preview</p><div className="mt-4 flex max-w-md items-center gap-4 rounded-2xl bg-white p-3 shadow-sm"><ProductVisual tone={product.tone} image={getPrimaryProductImage(product)} alt={product.name} className="h-20 w-20 shrink-0 rounded-xl" /><div className="min-w-0"><p className="truncate text-[9px] font-extrabold uppercase tracking-wider text-[#0035b9]">{product.sku} · {product.model}</p><strong className="mt-1 block truncate text-sm">{product.name}</strong><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#7c858a]">{product.description}</p></div></div></div>
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#c34a3f]/15 bg-[#fff7f5] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold text-[#9e3d34]">Delete product permanently</p><p className="mt-1 max-w-lg text-[10px] leading-4 text-[#8c6b67]">Available only for drafts that have never been published. Previously published products must be archived so their QR codes remain active.</p></div><button type="button" onClick={onDelete} disabled={product.everPublished || product.archived} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#b63c35] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="size-3.5" /> Delete product</button></div>
    </div>
  );
}
