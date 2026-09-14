export const LANGUAGE_COOKIE_NAME = "gascomp-language";

export const supportedLanguages = ["id", "en"] as const;

export type AppLanguage = (typeof supportedLanguages)[number];

export function parseLanguage(value: string | null | undefined): AppLanguage {
  return value === "id" ? "id" : "en";
}
