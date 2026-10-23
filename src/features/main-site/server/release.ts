import "server-only";
import { readFile, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { MainSiteRecord } from "../model/types";

export type MainSiteRelease = {
  version: 1;
  approved: true;
  source: string;
  records: MainSiteRecord[];
  retired: string[];
  media: Record<string, string>;
};
export const mainSiteDirectory = () =>
  resolve(
    process.env.GASCOMP_MAIN_SITE_DATA_DIR ||
      join(process.cwd(), ".data/main-site"),
  );
export const mainSiteEnabled = () =>
  process.env.GASCOMP_MAIN_SITE_ENABLED === "true";

export async function loadMainSiteRelease(): Promise<MainSiteRelease> {
  if (!mainSiteEnabled()) throw new Error("Main site is disabled");
  const path = join(mainSiteDirectory(), "release.json");
  if ((await stat(path)).size > 40_000_000)
    throw new Error("Release too large");
  const data = JSON.parse(await readFile(path, "utf8")) as MainSiteRelease;
  if (
    data.version !== 1 ||
    data.approved !== true ||
    data.source !== "https://gascompsuperlock.com" ||
    !Array.isArray(data.records) ||
    data.records.length > 6000 ||
    !data.media ||
    typeof data.media !== "object" ||
    Array.isArray(data.media)
  )
    throw new Error("Invalid release");
  for (const record of data.records) {
    if (
      !Number.isSafeInteger(record.id) ||
      typeof record.title !== "string" ||
      typeof record.path !== "string" ||
      (!/^\/(?!\/)/.test(record.path) && record.path !== "/") ||
      !Array.isArray(record.nodes) ||
      !Array.isArray(record.images) ||
      !Array.isArray(record.categories)
    )
      throw new Error("Invalid release record");
  }
  for (const value of Object.values(data.media)) {
    if (
      typeof value !== "string" ||
      !/^\/main-media\/[a-f0-9]{64}\.webp$/.test(value)
    )
      throw new Error("Invalid local media mapping");
  }
  return data;
}

export function publicSiteOrigin() {
  const url = new URL(
    process.env.GASCOMP_MAIN_SITE_ORIGIN || "https://gascompsuperlock.com",
  );
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname)
      ))
  )
    throw new Error("Invalid main site origin");
  return url.origin;
}
