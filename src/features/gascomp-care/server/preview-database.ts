export function getCarePreviewDatabase(environment: Record<string, string | undefined>): { url: string; key: string } | null {
  // The preview can never replace the configured Supabase database in a build or
  // deployed application, even if local variables were copied into the host.
  if (environment.NODE_ENV !== "development") return null;
  const url = environment.GASCOMP_CARE_PREVIEW_URL?.trim();
  const key = environment.GASCOMP_CARE_PREVIEW_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key) throw new Error("unavailable");

  try {
    const parsed = new URL(url);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (!loopback || parsed.protocol !== "http:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") throw new Error("unavailable");
    return { url: parsed.origin, key };
  } catch {
    throw new Error("unavailable");
  }
}
