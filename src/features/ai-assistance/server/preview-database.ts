export function getAssistancePreviewDatabase(environment: Record<string, string | undefined>): { url: string; key: string } | null {
  // Builds and deployed applications always use their configured Supabase database.
  if (environment.NODE_ENV !== "development") return null;
  const url = environment.GASCOMP_AI_PREVIEW_URL?.trim();
  const key = environment.GASCOMP_AI_PREVIEW_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Assistant preview database is unavailable.");

  try {
    const parsed = new URL(url);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    const originOnly = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?\/?$/i.test(url);
    if (!loopback || !originOnly || parsed.protocol !== "http:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") throw new Error("Invalid preview origin");
    return { url: parsed.origin, key };
  } catch {
    throw new Error("Assistant preview database is unavailable.");
  }
}
