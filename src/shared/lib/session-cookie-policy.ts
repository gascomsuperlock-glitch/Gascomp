type SessionCookieContext = {
  production: boolean;
  localHttpPreview: boolean;
  host: string | null;
  origin: string | null;
};

export function shouldSecureSessionCookie({ production, localHttpPreview, host, origin }: SessionCookieContext): boolean {
  if (!production) return false;
  if (!localHttpPreview || !host || !origin) return true;

  try {
    const url = new URL(origin);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    // Only an explicitly enabled HTTP preview on this exact loopback origin can
    // omit Secure. Real deployments and HTTPS previews keep the default policy.
    return !(loopback && url.protocol === "http:" && url.origin === origin && url.host === host);
  } catch {
    return true;
  }
}
