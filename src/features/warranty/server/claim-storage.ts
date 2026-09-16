import "server-only";

// Bound each provider request and the whole save, including SDK retries.
export function claimStorageFetch(budgetMs = 50_000, fetchImplementation: typeof fetch = fetch): typeof fetch {
  const deadline = Date.now() + budgetMs;
  return (input, init) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return Promise.reject(new Error("Claim storage timed out."));
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const timeout = AbortSignal.timeout(Math.min(remaining, url.includes("/storage/") ? 40_000 : 15_000));
    const existing = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    return fetchImplementation(input, { ...init, signal: existing ? AbortSignal.any([existing, timeout]) : timeout });
  };
}

// Settle all started operations before cleanup so a late upload cannot escape it.
export async function uploadClaimEvidence<T>(items: T[], upload: (item: T) => Promise<void>) {
  let next = 0;
  let failure: unknown;
  let failed = false;
  const workers = Array.from({ length: Math.min(3, items.length) }, async () => {
    while (!failed && next < items.length) {
      const item = items[next++];
      try { await upload(item); } catch (error) { failed = true; failure = error; }
    }
  });
  await Promise.all(workers);
  if (failed) throw failure;
}
