"use client";

import { ContentContext } from "@/features/catalog/model/content-context";
import { migrateContent } from "@/features/catalog/model/migrate-content";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_CONTENT } from "@/features/catalog/model/default-content";
import type { SiteContent } from "@/features/catalog/model/types";
import { requestContentSave } from "@/features/catalog/model/save-request";

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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const latestRevision = useRef(0);
  const savedContent = useRef(initialContent);

  useEffect(() => {
    if (storageMode !== "local") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    startTransition(() => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as SiteContent;
          const loaded = migrateContent(parsed, DEFAULT_CONTENT);
          savedContent.current = loaded;
          setContent(loaded);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHydrated(true);
    });
  }, [storageMode]);

  const persistContent = useCallback(async (contentToSave: SiteContent, savingRevision: number) => {
    setSaveState("saving");
    setSaveError(undefined);

    try {
      const result = await requestContentSave(contentToSave, undefined, savedContent.current);
      if (!result.success) {
        setSaveState("error");
        setSaveError(result.error);
        return false;
      }
      savedContent.current = result.content;
      if (latestRevision.current === savingRevision) {
        setContent(result.content);
        setHasUnsavedChanges(false);
        setSaveState("saved");
      } else {
        setSaveState("idle");
      }
      return true;
    } catch {
      setSaveState("error");
      setSaveError("The save result could not be processed. Keep this tab open to preserve your edits and retry Save.");
      return false;
    }
  }, []);

  const updateContent = useCallback(
    (updater: (current: SiteContent) => SiteContent) => {
      setContent(updater);
      setSaveState((current) => current === "saving" ? current : "idle");
      setSaveError(undefined);
      setHasUnsavedChanges(true);
      latestRevision.current += 1;
    },
    [],
  );

  const saveContent = useCallback(async () => {
    if (!hasUnsavedChanges) return true;
    const savingRevision = latestRevision.current;

    if (storageMode !== "supabase") {
      setSaveState("saving");
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
        savedContent.current = content;
        if (latestRevision.current === savingRevision) {
          setHasUnsavedChanges(false);
          setSaveError(undefined);
          setSaveState("saved");
        } else {
          setSaveState("idle");
        }
        return true;
      } catch {
        setSaveState("error");
        setSaveError("Changes could not be saved in this browser. Check available storage and try again.");
        return false;
      }
    }

    return persistContent(content, savingRevision);
  }, [content, hasUnsavedChanges, persistContent, storageMode]);

  const cancelContent = useCallback(() => {
    if (saveState === "saving") return;
    setContent(savedContent.current);
    setHasUnsavedChanges(false);
    setSaveState("idle");
    setSaveError(undefined);
    latestRevision.current += 1;
  }, [saveState]);

  const resetContent = useCallback(() => {
    setContent(DEFAULT_CONTENT);
    setSaveState("idle");
    setSaveError(undefined);
    setHasUnsavedChanges(true);
    latestRevision.current += 1;
  }, []);

  const value = useMemo(
    () => ({ content, hydrated, storageMode, saveState, hasUnsavedChanges, saveError, updateContent, saveContent, resetContent, cancelContent }),
    [cancelContent, content, hasUnsavedChanges, hydrated, resetContent, saveContent, saveError, saveState, storageMode, updateContent],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
