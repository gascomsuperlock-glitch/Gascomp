export type ContentNode = {
  text?: string;
  tag?: string;
  href?: string;
  src?: string;
  alt?: string;
  children?: ContentNode[];
};

export type MainSiteRecord = {
  id: number;
  kind: "page" | "post" | "product";
  path: string;
  title: string;
  nodes: ContentNode[];
  forms: { fields: { name: string; type: string; required: boolean }[] }[];
  removed: Record<string, number>;
  images: { src: string; alt: string }[];
  categories: { id: number; name: string; path: string }[];
};

export type MainSiteSnapshot = {
  version: 1;
  source: string;
  exportedAt: string;
  approved: false;
  records: MainSiteRecord[];
};
