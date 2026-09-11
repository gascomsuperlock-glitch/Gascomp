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
  provider: "duoke" | "warehouse-xlsx";
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

export type DuokeCatalog = {
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
