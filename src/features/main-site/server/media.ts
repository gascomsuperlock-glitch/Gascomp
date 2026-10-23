import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  mainSiteEnabled,
  mainSiteDirectory,
  loadMainSiteRelease,
} from "./release";
export async function mainSiteMedia(file: string) {
  if (!mainSiteEnabled() || !/^[a-f0-9]{64}\.webp$/.test(file))
    return new Response(null, { status: 404 });
  try {
    const release = await loadMainSiteRelease();
    if (!Object.values(release.media).includes(`/main-media/${file}`))
      return new Response(null, { status: 404 });
    const bytes = await readFile(join(mainSiteDirectory(), "media", file));
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
export async function legacyMedia(path: string[]) {
  if (!mainSiteEnabled()) return new Response(null, { status: 404 });
  try {
    const release = await loadMainSiteRelease();
    const legacy = `/wp-content/uploads/${path.map(encodeURIComponent).join("/")}`;
    const entry = Object.entries(release.media).find(
      ([url]) => new URL(url).pathname === legacy,
    );
    return entry
      ? new Response(null, {
          status: 307,
          headers: {
            Location: entry[1],
            "Cache-Control": "public, max-age=300",
          },
        })
      : new Response(null, { status: 404 });
  } catch {
    return new Response(null, { status: 404 });
  }
}
