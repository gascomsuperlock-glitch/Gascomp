import "server-only";
import {
  loadMainSiteRelease,
  mainSiteEnabled,
  publicSiteOrigin,
} from "./release";
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
export async function mainSiteSitemap() {
  if (!mainSiteEnabled()) return new Response(null, { status: 404 });
  try {
    const release = await loadMainSiteRelease();
    const paths = new Set(
      release.records.flatMap((record) => [
        record.path,
        ...record.categories.map((category) => category.path),
      ]),
    );
    paths.add("/shop/");
    paths.delete("/dll/");
    const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...paths].map((path) => `<url><loc>${xml(publicSiteOrigin() + path)}</loc></url>`).join("")}</urlset>`;
    return new Response(body, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Sitemap unavailable", { status: 503 });
  }
}
export async function mainSiteRobots() {
  if (!mainSiteEnabled()) return new Response(null, { status: 404 });
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /site/\nSitemap: ${publicSiteOrigin()}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain" } },
  );
}
