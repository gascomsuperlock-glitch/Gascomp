"use client";

import { useContext } from "react";
import { ContentContext } from "@/features/catalog/model/content-context";

export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useContent must be used inside ContentProvider");
  return value;
}
