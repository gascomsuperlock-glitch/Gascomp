"use server";

import { adminTicketPath } from "@/shared/lib/ticket-links";
import { getSessionCookieSecurity } from "@/shared/lib/session-cookie";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, adminSessionOptions, createSessionToken, getAdminSession, isAuthConfigured, verifyCredentials } from "@/features/auth/server/session";

export type LoginState = {
  error?: string;
  redirectTo?: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return { error: "Admin login is not configured on the server." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  if (!verifyCredentials(username, password)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "The username or password is incorrect." };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    createSessionToken(username),
    { ...adminSessionOptions, secure: await getSessionCookieSecurity() },
  );
  // The form navigates on the client. A Server Action redirect() makes the server fetch the target page
  // from itself, which fails behind the Hostinger proxy and logs "failed to get redirect response".
  return { redirectTo: adminTicketPath(formData.get("ticket")) };
}

export async function logoutAction() {
  const session = await getAdminSession();
  if (!session) return;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionOptions,
    secure: await getSessionCookieSecurity(),
    maxAge: 0,
  });
}
