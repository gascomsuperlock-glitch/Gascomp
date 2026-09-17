import { createHash } from "node:crypto";
import type { KnowledgeEntry, KnowledgeSnapshot } from "./types";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isLanguage(value: unknown): value is "en" | "id" { return value === "en" || value === "id"; }
export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

// Use this exact compact, UTF-8 representation in the Python publisher as well.
export function snapshotVersion(entries: KnowledgeEntry[]) {
  const canonical = [...entries].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(entry => ({
    answer: entry.answer, id: entry.id, kind: entry.kind, language: entry.language, questions: entry.questions,
    ...(entry.sku ? { sku: entry.sku } : {}),
  }));
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

export function validateSnapshot(value: unknown): KnowledgeSnapshot {
  if (!isRecord(value) || typeof value.version !== "string" || !Array.isArray(value.entries) || !value.entries.length || value.entries.length > 2000) throw new Error("Invalid knowledge snapshot.");
  const ids = new Set<string>();
  const entries: KnowledgeEntry[] = value.entries.map(raw => {
    if (!isRecord(raw) || Object.keys(raw).some(key => !["id", "kind", "language", "questions", "sku", "answer"].includes(key)) || typeof raw.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(raw.id) || ids.has(raw.id) || !isLanguage(raw.language) || !["answer", "greeting", "clarification", "handoff"].includes(String(raw.kind)) || typeof raw.answer !== "string" || !raw.answer.trim() || raw.answer.length > 12000 || !Array.isArray(raw.questions) || !raw.questions.length || raw.questions.length > 50 || raw.questions.some(q => typeof q !== "string" || !q.trim() || q.length > 500) || (raw.sku !== undefined && (typeof raw.sku !== "string" || !raw.sku.trim() || raw.sku.length > 100))) throw new Error("Invalid knowledge entry.");
    if (raw.kind === "answer" && !raw.questions.length) throw new Error("Answers require a question.");
    if (["greeting", "clarification", "handoff"].includes(String(raw.kind)) && raw.sku) throw new Error("Global templates cannot have a SKU.");
    // Reject private/local destinations, Obsidian links, and non-HTTPS schemes.
    if (/\[\[|(?:localhost|\.local\b|127\.\d|0\.0\.0\.0|\[::1\])|(?:file|javascript|data|http):/i.test(raw.answer)) throw new Error("Knowledge includes an unsafe link.");
    for (const match of raw.answer.matchAll(/https:\/\/[^\s)\]>]+/gi)) {
      const url = new URL(match[0]);
      if (url.username || url.password || /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.|\[)/.test(url.hostname)) throw new Error("Knowledge includes a private link.");
    }
    ids.add(raw.id);
    return raw as KnowledgeEntry;
  });
  for (const language of ["en", "id"]) for (const kind of ["greeting", "clarification", "handoff"]) {
    if (entries.filter(entry => entry.language === language && entry.kind === kind).length !== 1) throw new Error("One greeting, clarification, and handoff are required per language.");
  }
  if (snapshotVersion(entries) !== value.version) throw new Error("Knowledge version does not match its content.");
  return { version: value.version, entries };
}
