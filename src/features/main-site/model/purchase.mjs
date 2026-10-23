import { parseFragment } from "parse5";

export function purchaseUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  const nodes = parseFragment(value).childNodes;
  if (nodes.some((node) => node.nodeName !== "#text")) return null;
  const decoded = nodes.map((node) => node.value).join("");
  if (/[\u0000-\u0020\u007f\\]/u.test(decoded)) return null;
  try {
    const url = new URL(decoded);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      return null;
    const product =
      url.hostname === "shopee.co.id" &&
      /(?:-i\.780929103\.\d+|\/product\/780929103\/\d+)\/?$/.test(url.pathname);
    const short =
      url.hostname === "s.shopee.co.id" &&
      /^\/[A-Za-z0-9]+$/.test(url.pathname);
    return product || short ? url.href : null;
  } catch {
    return null;
  }
}
