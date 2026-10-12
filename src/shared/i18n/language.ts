export const LANGUAGE_COOKIE_NAME = "gascomp-language";

export const supportedLanguages = ["id", "en"] as const;

export type AppLanguage = (typeof supportedLanguages)[number];

export function parseLanguage(value: string | null | undefined): AppLanguage {
  return value === "id" ? "id" : "en";
}

// A saved choice wins. First-time visitors get their browser's language, so an
// Indonesian phone is not left to machine-translate the English interface.
export function resolveLanguage(saved: string | null | undefined, acceptLanguage: string | null | undefined): AppLanguage {
  if (saved === "id" || saved === "en") return saved;
  for (const entry of (acceptLanguage ?? "").split(",")) {
    const tag = entry.split(";")[0].trim().toLowerCase().split("-")[0];
    if (tag === "id" || tag === "en") return tag;
  }
  return "en";
}
