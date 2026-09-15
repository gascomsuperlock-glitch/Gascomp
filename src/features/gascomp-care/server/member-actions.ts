"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieSecurity } from "@/shared/lib/session-cookie";
import type { CareActionState } from "../model/types";
import { careDatabase } from "./database";
import { createCareToken, hashCarePassword, hashCareToken, normalizeCareUsername, validCarePassword, validCareUsername, verifyCarePassword } from "./password";
import { careRequestIpKey, isCareSameOrigin, shouldLimitCareAttempts } from "./request-security";
import { CARE_SESSION_COOKIE, careSessionOptions, getCareSession, getCareSessionToken } from "./session";

// A valid fixed hash forces unknown accounts through the same expensive verification.
const dummyHash = `scrypt$32768$8$3$${"00".repeat(16)}$${"00".repeat(64)}`;
export async function loginCareAction(_previous: CareActionState, form: FormData): Promise<CareActionState> {
  if (!await isCareSameOrigin()) return { error: "unauthorized" };
  const username = normalizeCareUsername(String(form.get("username") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!validCareUsername(username) || !password || password.length > 128) return { error: "invalidCredentials" };
  let mustChangePassword = false;
  try {
    const db = careDatabase();
    if (await shouldLimitCareAttempts()) {
      const attempt = await db.rpc("care_consume_login_attempt", { p_username_key: hashCareToken(username), p_ip_key: await careRequestIpKey() });
      if (attempt.error) return { error: "unavailable" };
      if (!attempt.data) return { error: "rateLimited" };
    }
    const { data: row, error } = await db.from("care_members").select("id,password_hash,credential_version,must_change_password").eq("username", username).is("deleted_at", null).maybeSingle();
    if (error) return { error: "unavailable" };
    const valid = await verifyCarePassword(password, row?.password_hash ?? dummyHash);
    if (!row || !valid) return { error: "invalidCredentials" };
    const token = createCareToken();
    const opened = await db.rpc("care_open_session", { p_member_id: row.id, p_version: row.credential_version, p_token_hash: hashCareToken(token) });
    if (opened.error) return { error: "unavailable" };
    if (!opened.data) return { error: "invalidCredentials" };
    (await cookies()).set(CARE_SESSION_COOKIE, token, { ...careSessionOptions, secure: await getSessionCookieSecurity() });
    mustChangePassword = row.must_change_password;
  } catch { return { error: "unavailable" }; }
  redirect(mustChangePassword ? "/gascomp-care/change-password" : "/gascomp-care");
}

export async function changeCarePasswordAction(_previous: CareActionState, form: FormData): Promise<CareActionState> {
  if (!await isCareSameOrigin()) return { error: "unauthorized" };
  const currentPassword = String(form.get("currentPassword") ?? "");
  const password = String(form.get("password") ?? "");
  if (!validCarePassword(password) || !currentPassword || currentPassword.length > 128) return { error: "invalidInput" };
  if (password !== String(form.get("confirmPassword") ?? "")) return { error: "passwordMismatch" };
  if (password === currentPassword) return { error: "invalidInput" };
  try {
    const session = await getCareSession();
    const token = await getCareSessionToken();
    if (!session || !token) return { error: "unauthorized" };
    const db = careDatabase();
    if (await shouldLimitCareAttempts()) {
      const attempt = await db.rpc("care_consume_login_attempt", { p_username_key: hashCareToken(`change:${session.member.username}`), p_ip_key: `change:${await careRequestIpKey()}` });
      if (attempt.error) return { error: "unavailable" };
      if (!attempt.data) return { error: "rateLimited" };
    }
    const { data: row, error } = await db.from("care_members").select("password_hash,credential_version").eq("id", session.member.id).single();
    if (error) return { error: "unavailable" };
    if (!await verifyCarePassword(currentPassword, row.password_hash)) return { error: "currentPasswordIncorrect" };
    const newToken = createCareToken();
    const changed = await db.rpc("care_change_password", { p_member_id: session.member.id, p_version: row.credential_version, p_token_hash: hashCareToken(token), p_password_hash: await hashCarePassword(password), p_new_token_hash: hashCareToken(newToken) });
    if (changed.error) return { error: "unavailable" };
    if (!changed.data) return { error: "unauthorized" };
    (await cookies()).set(CARE_SESSION_COOKIE, newToken, { ...careSessionOptions, secure: await getSessionCookieSecurity() });
  } catch { return { error: "unavailable" }; }
  redirect("/gascomp-care");
}

export async function logoutCareAction(): Promise<void> {
  if (!await isCareSameOrigin()) throw new Error("unauthorized");
  const token = await getCareSessionToken();
  if (token) {
    const { error } = await careDatabase().from("care_sessions").delete().eq("token_hash", hashCareToken(token));
    if (error) throw new Error("unavailable");
  }
  (await cookies()).set(CARE_SESSION_COOKIE, "", { ...careSessionOptions, secure: await getSessionCookieSecurity(), maxAge: 0 });
  redirect("/gascomp-care/login");
}
