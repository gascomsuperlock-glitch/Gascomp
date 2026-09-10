"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_CONTENT, type SiteContent } from "@/lib/content";
import { saveAdminContentAction } from "@/app/admin/actions";

const STORAGE_KEY = "gascomp-help-content-v1";
const LEGACY_SAMPLE_IDS = new Set(["product-adjuster", "product-lock", "product-ignition"]);

type ContentContextValue = {
  content: SiteContent;
  hydrated: boolean;
  storageMode: "local" | "supabase" | "static";
  saveState: "idle" | "saving" | "saved" | "error";
  saveError?: string;
  updateContent: (updater: (current: SiteContent) => SiteContent) => void;
  resetContent: () => void;
};

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({
  children,
  initialContent = DEFAULT_CONTENT,
  storageMode = "local",
}: {
  children: ReactNode;
  initialContent?: SiteContent;
  storageMode?: "local" | "supabase" | "static";
}) {
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [hydrated, setHydrated] = useState(storageMode !== "local");
  const [revision, setRevision] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string>();
  const lastScheduledRevision = useRef(0);
  const latestRevision = useRef(0);

  useEffect(() => {
    if (storageMode !== "local") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    startTransition(() => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as SiteContent;
          const migratedProducts = parsed.products
            .filter((product) => !LEGACY_SAMPLE_IDS.has(product.id))
            .map((product) => ({
              ...product,
              sku: product.sku ?? product.slug.toUpperCase(),
              archived: product.archived ?? false,
              everPublished: product.everPublished ?? product.published ?? false,
              variations: product.variations ?? [],
              images: product.images ?? [],
            }));
          const mergedProducts = [...migratedProducts];

          for (const importedProduct of DEFAULT_CONTENT.products) {
            const existingIndex = mergedProducts.findIndex((product) =>
              product.source?.provider === "duoke" &&
              product.source.productId === importedProduct.source?.productId &&
              product.source.storeId === importedProduct.source?.storeId,
            );

            if (existingIndex === -1) {
              mergedProducts.push(importedProduct);
              continue;
            }

            const existing = mergedProducts[existingIndex];
            mergedProducts[existingIndex] = {
              ...existing,
              sku: importedProduct.sku,
              name: importedProduct.name,
              model: importedProduct.model,
              description: importedProduct.description,
              variations: importedProduct.variations,
              attributes: importedProduct.attributes,
              source: importedProduct.source,
            };
          }

          setContent({
            ...parsed,
            products: mergedProducts,
          });
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHydrated(true);
    });
  }, [storageMode]);

  useEffect(() => {
    if (storageMode !== "supabase" || revision === 0 || revision === lastScheduledRevision.current) return;
    const scheduledRevision = revision;
    lastScheduledRevision.current = scheduledRevision;
    setSaveState("saving");
    setSaveError(undefined);

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const result = await saveAdminContentAction(content);
        if (!result.success) {
          setSaveState("error");
          setSaveError(result.error);
          return;
        }
        if (latestRevision.current === scheduledRevision) {
          setContent(result.content);
          setSaveState("saved");
        }
      });
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [content, revision, storageMode]);

  const updateContent = useCallback(
    (updater: (current: SiteContent) => SiteContent) => {
      setContent((current) => {
        const next = updater(current);
        if (storageMode === "local") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      if (storageMode === "supabase") {
        latestRevision.current += 1;
        setRevision(latestRevision.current);
      }
    },
    [storageMode],
  );

  const resetContent = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setContent(DEFAULT_CONTENT);
    if (storageMode === "supabase") {
      latestRevision.current += 1;
      setRevision(latestRevision.current);
    }
  }, [storageMode]);

  const value = useMemo(
    () => ({ content, hydrated, storageMode, saveState, saveError, updateContent, resetContent }),
    [content, hydrated, resetContent, saveError, saveState, storageMode, updateContent],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useContent must be used inside ContentProvider");
  return value;
}
