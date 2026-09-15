import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { careDatabase, toCareMember } from "./database";
import { hashCareToken } from "./password";
import type { CareMember } from "../model/types";
export { getCareAvailability } from "./database";

export const CARE_SESSION_COOKIE = "gascomp_care_session";
export const careSessionOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/gascomp-care", maxAge: 8 * 60 * 60 };
export async function getCareSessionToken() {
  return (await cookies()).get(CARE_SESSION_COOKIE)?.value;
}
export async function getCareSession(): Promise<{ member: CareMember } | null> {
  const token = await getCareSessionToken();
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { data, error } = await careDatabase().rpc("care_read_session", { p_token_hash: hashCareToken(token) });
  if (error) throw new Error("unavailable");
  return data?.length ? { member: toCareMember(data[0]) } : null;
}
export async function requireCareMember(): Promise<CareMember> {
  const session = await getCareSession();
  if (!session) redirect("/gascomp-care/login");
  if (session.member.mustChangePassword) redirect("/gascomp-care/change-password");
  return session.member;
}
