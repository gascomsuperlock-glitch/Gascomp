import { createElement, type ReactNode } from "react";
import { safeUrl } from "../model/content.mjs";
import type { ContentNode } from "../model/types";

const elements = new Set([
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
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

export function SafeContent({
  nodes,
  paths,
  media,
}: {
  nodes: ContentNode[];
  paths: Map<string, string>;
  media?: Record<string, string>;
}) {
  let count = 0;
  function render(node: ContentNode, key: number, depth: number): ReactNode {
    if (!node || typeof node !== "object" || depth > 80 || ++count > 40_000)
      return null;
    if (typeof node.text === "string") return node.text;
    if (typeof node.tag !== "string") return null;
    const children = Array.isArray(node.children)
      ? node.children.map((child, index) => render(child, index, depth + 1))
      : [];
    if (node.tag === "a") {
      const href = safeUrl(node.href);
      if (!href) return <span key={key}>{children}</span>;
      const previewPath = paths.get(href);
      if (
        media &&
        new URL(href).origin === "https://gascompsuperlock.com" &&
        !previewPath
      )
        return <span key={key}>{children}</span>;
      return (
        <a
          key={key}
          href={previewPath ?? href}
          rel="noreferrer noopener"
          target={previewPath ? undefined : "_blank"}
        >
          {children}
        </a>
      );
    }
    if (node.tag === "img") {
      const remote = safeUrl(node.src, true);
      const candidate = remote && media ? media[remote] : remote;
      const src = media
        ? candidate && /^\/main-media\/[a-f0-9]{64}\.webp$/.test(candidate)
          ? candidate
          : null
        : candidate;
      if (!src) return null;
      // Import preview uses only allowlisted raster URLs; no image proxy fetches.
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={src}
          alt={typeof node.alt === "string" ? node.alt : ""}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      );
    }
    if (!elements.has(node.tag)) return null;
    return createElement(
      node.tag,
      { key },
      node.tag === "br" ? undefined : children,
    );
  }
  return (
    <div className="migration-content">
      {nodes.map((node, index) => render(node, index, 0))}
    </div>
  );
}
