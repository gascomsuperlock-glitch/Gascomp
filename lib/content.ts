import duokeCatalogJson from "@/data/duoke-products.json";

export type ProductTone = "orange" | "navy" | "green";

export type TutorialVideo = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  duration: string;
};

export type ProductIssue = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  warning?: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type ProductAttribute = {
  name: string;
  value: string;
};

export type ProductVariation = {
  id: string;
  name: string;
  sku: string;
  sourceId?: string;
  attributes?: ProductAttribute[];
};

export type ProductImage = {
  id: string;
  name: string;
  dataUrl?: string;
  url?: string;
  storagePath?: string;
  alt: string;
  variationId?: string;
  isPrimary: boolean;
};

export type ProductSource = {
  provider: "duoke";
  productId: string;
  storeId?: string;
  syncedAt?: string;
};

export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  model: string;
  description: string;
  tone: ProductTone;
  published: boolean;
  archived: boolean;
  everPublished: boolean;
  variations: ProductVariation[];
  attributes?: ProductAttribute[];
  source?: ProductSource;
  images: ProductImage[];
  videos: TutorialVideo[];
  issues: ProductIssue[];
  faqs: FaqItem[];
};

export type SiteContent = {
  whatsappNumber: string;
  supportHours: string;
  products: Product[];
};

type DuokeCatalog = {
  schemaVersion: number;
  source: "duoke";
  syncedAt: string | null;
  products: Array<{
    sourceProductId: string;
    storeId: string | null;
    slug: string;
    sku: string;
    name: string;
    model: string | null;
    description: string | null;
    attributes: ProductAttribute[];
    variations: Array<{
      sourceVariationId: string;
      name: string;
      sku: string;
      attributes: ProductAttribute[];
    }>;
  }>;
};

const duokeCatalog = duokeCatalogJson as DuokeCatalog;
const tones: ProductTone[] = ["orange", "navy", "green"];

export const DEFAULT_CONTENT: SiteContent = {
  whatsappNumber: "6281234567890",
  supportHours: "Senin–Sabtu, 08.00–17.00 WIB",
  products: duokeCatalog.products.map((product, index) => ({
    id: `duoke-${product.storeId ? `${product.storeId}-` : ""}${product.sourceProductId}`,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    model: product.model ?? "",
    description: product.description ?? "",
    tone: tones[index % tones.length],
    published: false,
    archived: false,
    everPublished: false,
    attributes: product.attributes,
    source: {
      provider: "duoke",
      productId: product.sourceProductId,
      storeId: product.storeId ?? undefined,
      syncedAt: duokeCatalog.syncedAt ?? undefined,
    },
    variations: product.variations.map((variation) => ({
      id: `duoke-variation-${product.sourceProductId}-${variation.sourceVariationId}`,
      sourceId: variation.sourceVariationId,
      name: variation.name,
      sku: variation.sku,
      attributes: variation.attributes,
    })),
    images: [],
    videos: [],
    issues: [],
    faqs: [],
  })),
};

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createSlug(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || `produk-${Date.now()}`;
}

export function getPrimaryProductImage(product: Product) {
  return product.images.find((image) => image.isPrimary) ?? product.images[0];
}

export function getProductImageSource(image?: ProductImage) {
  return image?.url || image?.dataUrl || "";
}

export function getYoutubeId(url: string) {
  if (!url.trim()) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
}

export function getYoutubeEmbedUrl(url: string) {
  const id = getYoutubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

export function normalizeWhatsapp(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function getWhatsappUrl(number: string, productName?: string, issue?: string) {
  const context = productName ? ` untuk ${productName}` : "";
  const issueText = issue ? ` Kendala saya: ${issue}.` : "";
  const message = `Halo Admin Gascomp, saya membutuhkan bantuan${context}.${issueText}`;
  return `https://wa.me/${normalizeWhatsapp(number)}?text=${encodeURIComponent(message)}`;
}
