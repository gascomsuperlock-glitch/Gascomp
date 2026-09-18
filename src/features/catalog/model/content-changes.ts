import type { Product, SiteContent } from "./types";

export type ContentChanges = {
  mode: "changes";
  products: Product[];
  removedProductIds: string[];
  settings: Partial<Pick<SiteContent, "whatsappNumber" | "supportHours">>;
};

export type ContentSaveInput = SiteContent | ContentChanges;

export function isContentChanges(value: unknown): value is ContentChanges {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  if (input.mode !== "changes" || !Array.isArray(input.products) || input.products.length > 5000 ||
      !Array.isArray(input.removedProductIds) || input.removedProductIds.length > 5000 ||
      !input.settings || typeof input.settings !== "object" || Array.isArray(input.settings)) return false;
  const ids = input.products.map((product) => product?.id);
  if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) return false;
  if (input.removedProductIds.some((id) => typeof id !== "string" || !id || ids.includes(id)) ||
      new Set(input.removedProductIds).size !== input.removedProductIds.length) return false;
  return Object.entries(input.settings).every(([key, value]) =>
    (key === "whatsappNumber" || key === "supportHours") && typeof value === "string");
}

export function createContentChanges(content: SiteContent, baseline: SiteContent): ContentChanges {
  const previous = new Map(baseline.products.map((product) => [product.id, product]));
  const currentIds = new Set(content.products.map((product) => product.id));
  return {
    mode: "changes",
    // Both snapshots come from the same editor; a conservative comparison may
    // include an extra product but never discards a changed field or image.
    products: content.products.filter((product) => JSON.stringify(product) !== JSON.stringify(previous.get(product.id))),
    removedProductIds: baseline.products.filter((product) => !currentIds.has(product.id)).map((product) => product.id),
    settings: {
      ...(content.whatsappNumber !== baseline.whatsappNumber ? { whatsappNumber: content.whatsappNumber } : {}),
      ...(content.supportHours !== baseline.supportHours ? { supportHours: content.supportHours } : {}),
    },
  };
}

export function applyContentChanges(current: SiteContent, changes: ContentChanges): SiteContent {
  const replacements = new Map(changes.products.map((product) => [product.id, product]));
  const removed = new Set(changes.removedProductIds);
  const currentIds = new Set(current.products.map((product) => product.id));
  return {
    ...current,
    ...changes.settings,
    products: [
      ...current.products.filter((product) => !removed.has(product.id)).map((product) => replacements.get(product.id) ?? product),
      ...changes.products.filter((product) => !currentIds.has(product.id)),
    ],
  };
}
