import { parseFragment } from "parse5";

export const SOURCE_ORIGIN = "https://gascompsuperlock.com";
const tags = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "br",
  "blockquote",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);
const discard = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template",
  "noscript",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "link",
  "meta",
  "base",
  "video",
  "audio",
]);
const trustedLinks = new Set([
  "gascompsuperlock.com",
  "www.gascompsuperlock.com",
  "support.gascompsuperlock.com",
  "wa.me",
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "www.instagram.com",
  "instagram.com",
  "www.facebook.com",
  "facebook.com",
  "shopee.co.id",
  "www.tokopedia.com",
  "tokopedia.com",
]);

export function safeUrl(value, image = false) {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\u0000-\u0020\u007f\\]/u.test(value)
  )
    return null;
  try {
    const url = new URL(value, SOURCE_ORIGIN);
    if (url.username || url.password || url.port || url.protocol !== "https:")
      return null;
    if (image) {
      if (
        url.origin !== SOURCE_ORIGIN ||
        !url.pathname.startsWith("/wp-content/uploads/") ||
        !/\.(?:png|jpe?g|webp|gif|avif)$/i.test(url.pathname)
      )
        return null;
      return url.href;
    }
    if (!trustedLinks.has(url.hostname)) return null;
    if (
      url.origin === SOURCE_ORIGIN &&
      (/\.(?:php|sql|zip|gz|bak)(?:\/|$)/i.test(url.pathname) ||
        /^\/wp-(?:admin|json|content|includes)(?:\/|$)/i.test(url.pathname))
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function sourcePath(value) {
  const safe = safeUrl(value);
  if (!safe) throw new Error("Invalid source permalink");
  const url = new URL(safe);
  if (
    url.origin !== SOURCE_ORIGIN ||
    url.search ||
    url.hash ||
    /%2f|%5c|%00/i.test(url.pathname)
  )
    throw new Error("Invalid source permalink");
  return url.pathname;
}

export function normalizeHtml(html) {
  if (typeof html !== "string" || Buffer.byteLength(html) > 2_000_000)
    throw new Error("Content exceeds import limit");
  const removed = {};
  const forms = [];
  let count = 0;
  const record = (key) => {
    removed[key] = (removed[key] || 0) + 1;
  };
  const walk = (node, depth = 0) => {
    if (++count > 40_000 || depth > 80)
      throw new Error("Content structure exceeds import limit");
    if (node.nodeName === "#text") return [{ text: node.value }];
    const tag = node.tagName;
    if (discard.has(tag)) {
      record(tag);
      if (tag === "form") {
        const fields = [];
        const collect = (child, level = 0) => {
          if (level > 80 || fields.length > 200)
            throw new Error("Form structure exceeds import limit");
          if (["input", "textarea", "select"].includes(child.tagName)) {
            const attrs = Object.fromEntries(
              (child.attrs || []).map((a) => [a.name, a.value]),
            );
            // Never preserve values, nonces, hidden fields or submission destinations.
            if (attrs.type !== "hidden")
              fields.push({
                name: (attrs.name || "").slice(0, 120),
                type: (attrs.type || child.tagName).slice(0, 40),
                required: "required" in attrs,
              });
          }
          for (const item of child.childNodes || []) collect(item, level + 1);
        };
        collect(node);
        forms.push({ fields });
      }
      return [];
    }
    const children = (node.childNodes || []).flatMap((child) =>
      walk(child, depth + 1),
    );
    if (!tags.has(tag)) return children;
    const attrs = Object.fromEntries(
      (node.attrs || []).map((a) => [a.name, a.value]),
    );
    if (tag === "img") {
      const src = safeUrl(attrs.src, true);
      if (!src) {
        record("image-url");
        return [];
      }
      return [{ tag, src, alt: (attrs.alt || "").slice(0, 500), children: [] }];
    }
    if (tag === "a") {
      const href = safeUrl(attrs.href);
      if (!href) {
        record("link-url");
        return children;
      }
      return [{ tag, href, children }];
    }
    return [{ tag, children }];
  };
  return { nodes: walk(parseFragment(html)), removed, forms };
}

export function plainText(html) {
  const text = (nodes) =>
    nodes
      .map((node) => ("text" in node ? node.text : text(node.children)))
      .join(" ");
  return text(normalizeHtml(html).nodes).replace(/\s+/g, " ").trim();
}

export function normalizeRecord(record, kind) {
  if (!record || !Number.isSafeInteger(record.id) || record.id <= 0)
    throw new Error("Invalid source record");
  const isProduct = kind === "product";
  if (record.is_password_protected || record.content?.protected)
    throw new Error("Protected content cannot be imported");
  const path = sourcePath(isProduct ? record.permalink : record.link);
  const result = normalizeHtml(
    isProduct ? record.description : record.content?.rendered || "",
  );
  const title = plainText(
    isProduct ? record.name : record.title?.rendered || "",
  );
  return {
    id: record.id,
    kind,
    path,
    title,
    ...result,
    images: isProduct
      ? (record.images || [])
          .map((img) => ({
            src: safeUrl(img.src, true),
            alt: plainText(img.alt || title),
          }))
          .filter((img) => img.src)
      : [],
    categories: isProduct
      ? (record.categories || []).map((category) => ({
          id: category.id,
          name: plainText(category.name),
          path: sourcePath(category.link),
        }))
      : [],
  };
}
