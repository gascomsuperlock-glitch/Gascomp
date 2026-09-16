import type { Product } from "@/features/catalog/model/types";

export type ClaimProduct = Pick<Product, "id" | "name" | "sku" | "model" | "published" | "archived">;

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function availableClaimProducts<T extends ClaimProduct>(products: T[]): T[] {
  return products.filter((product) => product.published && !product.archived);
}

export function matchesClaimProduct(product: ClaimProduct, query: string): boolean {
  const searchable = normalize(`${product.name} ${product.sku} ${product.model}`);
  return normalize(query).split(/\s+/).every((part) => searchable.includes(part));
}

export function exactClaimProduct<T extends ClaimProduct>(products: T[], field: "name" | "sku", value: string): T | null {
  if (!normalize(value)) return null;
  const matches = availableClaimProducts(products).filter((product) => normalize(product[field]) === normalize(value));
  // Duplicate names must be resolved by choosing a result with its SKU.
  return matches.length === 1 ? matches[0] : null;
}

export function prefilledClaimProduct<T extends ClaimProduct>(products: T[], sku: string, name: string): T | null {
  // A supplied SKU is authoritative; never silently switch to a different SKU by name.
  return sku.trim() ? exactClaimProduct(products, "sku", sku) : exactClaimProduct(products, "name", name);
}
