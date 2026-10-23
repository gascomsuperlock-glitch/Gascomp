import "server-only";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { getAdminSession } from "@/features/auth/server/session";
import type { MainSiteSnapshot } from "../model/types";

export async function loadMainSiteSnapshot(): Promise<MainSiteSnapshot | null> {
  if (
    process.env.GASCOMP_MAIN_SITE_PREVIEW_ENABLED !== "true" ||
    !(await getAdminSession())
  ) {
    throw new Error("Main site preview access denied");
  }
  // A fixed path prevents query parameters from selecting arbitrary server files.
  const file = await open(
    join(process.cwd(), ".data/main-site/snapshot.json"),
    "r",
  ).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!file) return null;
  try {
    if ((await file.stat()).size > 40_000_000)
      throw new Error("Snapshot exceeds preview limit");
    const data = JSON.parse(await file.readFile("utf8")) as MainSiteSnapshot;
    if (
      data.version !== 1 ||
      data.source !== "https://gascompsuperlock.com" ||
      data.approved !== false ||
      !Array.isArray(data.records) ||
      data.records.length > 6000
    ) {
      throw new Error("Invalid migration snapshot");
    }
    for (const record of data.records) {
      if (
        !Number.isSafeInteger(record.id) ||
        typeof record.title !== "string" ||
        typeof record.path !== "string" ||
        !["page", "post", "product"].includes(record.kind) ||
        !Array.isArray(record.nodes) ||
        !Array.isArray(record.forms) ||
        !Array.isArray(record.images)
      )
        throw new Error("Invalid migration record");
    }
    return data;
  } finally {
    await file.close();
  }
}
