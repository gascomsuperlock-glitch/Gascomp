import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "gascomp_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  username: string;
  expiresAt: number;
};

function getAuthConfig() {
  return {
    username: process.env.GASCOMP_ADMIN_USERNAME?.trim() ?? "",
    password: process.env.GASCOMP_ADMIN_PASSWORD ?? "",
    secret: process.env.GASCOMP_AUTH_SECRET ?? "",
  };
}

export function isAuthConfigured() {
  const config = getAuthConfig();
  return Boolean(
    config.username &&
      config.password.length >= 12 &&
      config.secret.length >= 32,
  );
}

function secureEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function sign(payload: string) {
  return createHmac("sha256", getAuthConfig().secret)
    .update(payload)
    .digest("base64url");
}

export function verifyCredentials(username: string, password: string) {
  if (!isAuthConfigured()) return false;
  const config = getAuthConfig();
  return secureEqual(username, config.username) && secureEqual(password, config.password);
}

export function createSessionToken(username: string) {
  if (!isAuthConfigured()) throw new Error("Admin authentication is not configured");

  const payload: SessionPayload = {
    username,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token || !isAuthConfigured()) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !secureEqual(signature, sign(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;
    const config = getAuthConfig();

    if (
      payload.expiresAt <= Date.now() ||
      !secureEqual(payload.username, config.username)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export const adminSessionOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/admin",
  maxAge: SESSION_DURATION_SECONDS,
  priority: "high" as const,
};
