"use client";

import { useId, useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown } from "lucide-react";
import { useContent } from "@/features/catalog/hooks/use-content";
import { dictionaries, localizeMessage } from "@/shared/i18n/dictionaries";
import { useLanguage } from "@/shared/i18n/language-context";
import type { WarrantyClaimState } from "@/features/warranty/server/claim-actions";
import { availableClaimProducts, exactClaimProduct, matchesClaimProduct, prefilledClaimProduct, type ClaimProduct } from "@/features/warranty/model/claim-products";

type Selection = { id: string } | { field: "name" | "sku"; query: string };

export function ClaimProductFields({ defaultProduct, defaultSku, pending, fieldErrors, inputClass }: {
  defaultProduct: string;
  defaultSku: string;
  pending: boolean;
  fieldErrors: WarrantyClaimState["fieldErrors"];
  inputClass: string;
}) {
  const { content, hydrated } = useContent();
  const { language } = useLanguage();
  const copy = dictionaries[language].warranty;
  const id = useId();
  const products = useMemo(() => availableClaimProducts(content.products), [content.products]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [invalid, setInvalid] = useState(false);
  const selected = !hydrated ? null : selection === null
    ? prefilledClaimProduct(products, defaultSku, defaultProduct)
    : "id" in selection ? products.find((product) => product.id === selection.id) ?? null : null;
  const hasUnavailableDefault = hydrated && selection === null && Boolean(defaultSku || defaultProduct) && !selected;

  function search(field: "name" | "sku", query: string) {
    const exact = exactClaimProduct(products, field, query);
    setSelection(exact ? { id: exact.id } : { field, query });
    setInvalid(false);
  }

  return <>
    {(["name", "sku"] as const).map((field) => {
      const formName = field === "name" ? "product" : "sku";
      const label = field === "name" ? copy.productName : copy.productSku;
      const value = selected?.[field] ?? (selection && "field" in selection && selection.field === field ? selection.query : "");
      const error = invalid && !selected ? copy.chooseProduct : localizeMessage(fieldErrors?.[formName], language);
      const fieldId = `${id}-${field}`;
      return <div key={field} className="min-w-0" onInvalid={() => setInvalid(true)}>
        <label htmlFor={fieldId} className="text-[11px] font-extrabold text-[#4f5b62]">{label}</label>
        <Combobox.Root<ClaimProduct>
          items={products}
          value={selected}
          inputValue={value}
          name={formName}
          required
          modal={false}
          disabled={pending || !hydrated}
          autoComplete="off"
          filter={matchesClaimProduct}
          itemToStringLabel={(product) => product[field]}
          itemToStringValue={(product) => product[field]}
          isItemEqualToValue={(item, other) => item.id === other.id}
          onValueChange={(product) => {
            if (product) {
              setSelection({ id: product.id });
              setInvalid(false);
            }
          }}
          onInputValueChange={(query, details) => {
            if (details.reason === "input-change" || details.reason === "input-clear" || details.reason === "clear-press") search(field, query);
          }}
        >
          <div className="relative">
            <Combobox.Input id={fieldId} placeholder={field === "name" ? copy.searchProductName : copy.searchProductSku}
              className={`${inputClass} pr-12 disabled:opacity-60`}
              aria-invalid={Boolean(error)} aria-describedby={`${id}-hint${error ? ` ${fieldId}-error` : ""}`} />
            <Combobox.Trigger aria-label={label} className="absolute right-1 bottom-1 grid size-10 place-items-center rounded-lg text-[#53657c] disabled:opacity-40">
              <ChevronDown aria-hidden="true" className="size-4" />
            </Combobox.Trigger>
          </div>
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={6} className="z-50">
              <Combobox.Popup className="w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#2c3038]/10 bg-white shadow-xl">
                <Combobox.Empty className="p-4 text-xs leading-5 text-[#69747b] empty:p-0">{products.length ? copy.noProductMatches : copy.noPublishedProducts}</Combobox.Empty>
                <Combobox.List className="max-h-[min(16rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 empty:p-0">
                  {(product: ClaimProduct) => <Combobox.Item key={product.id} value={product} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-[#edf4ff] data-[selected]:text-[#0035b9]">
                    <span className="min-w-0 flex-1"><span translate="no" className="block break-words font-semibold">{product.name}</span><span translate="no" className="mt-1 block break-all text-xs text-[#69747b]">{product.sku}</span></span>
                    <Combobox.ItemIndicator><Check aria-hidden="true" className="size-4" /></Combobox.ItemIndicator>
                  </Combobox.Item>}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
        {error && <p id={`${fieldId}-error`} role="alert" className="mt-1.5 text-[10px] font-semibold text-[#b33b31]">{error}</p>}
      </div>;
    })}
    <p id={`${id}-hint`} role="status" className="-mt-2 text-xs leading-5 text-[#69747b] sm:col-span-2">
      {!hydrated ? copy.loadingProducts : hasUnavailableDefault ? copy.unavailableProduct : products.length ? copy.productSearchHint : copy.noPublishedProducts}
    </p>
  </>;
}
