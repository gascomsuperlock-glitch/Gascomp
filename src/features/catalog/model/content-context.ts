"use client";

import { createContext } from "react";
import type { SiteContent } from "./types";

export type ContentContextValue = {
  content: SiteContent;
  hydrated: boolean;
  storageMode: "local" | "supabase" | "static";
  saveState: "idle" | "saving" | "saved" | "error";
  hasUnsavedChanges: boolean;
  saveError?: string;
  updateContent: (updater: (current: SiteContent) => SiteContent) => void;
  saveContent: () => Promise<boolean>;
  cancelContent: () => void;
  resetContent: () => void;
};

export const ContentContext = createContext<ContentContextValue | null>(null);
