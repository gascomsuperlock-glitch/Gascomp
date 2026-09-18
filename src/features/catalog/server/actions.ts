"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/features/auth/server/session";
import type { SiteContent } from "@/features/catalog/model/types";
import type { ContentSaveInput } from "@/features/catalog/model/content-changes";
import { persistSiteContent } from "@/features/catalog/server/content-store";

export async function saveAdminContentAction(content: ContentSaveInput): Promise<
  { success: true; content: SiteContent } | { success: false; error: string }
> {
  if (!(await getAdminSession())) return { success: false, error: "Your admin session has expired. Sign in again." };

  try {
    const savedContent = await persistSiteContent(content);
    revalidatePath("/");
    revalidatePath("/produk/[slug]", "page");
    return { success: true, content: savedContent };
  } catch (error) {
    console.error("Admin content save failed", error);
    return { success: false, error: "Changes were not saved to Supabase. Check the connection and try again." };
  }
}
