"use client";

import { ContentContext } from "@/features/catalog/model/content-context";
import { migrateContent } from "@/features/catalog/model/migrate-content";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_CONTENT } from "@/features/catalog/model/default-content";
import type { SiteContent } from "@/features/catalog/model/types";
import { saveAdminContentAction } from "@/features/catalog/server/actions";

const STORAGE_KEY = "gascomp-help-content-v1";

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
          setContent(migrateContent(parsed, DEFAULT_CONTENT));
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

