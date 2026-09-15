import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, parameters, (error, key) => error ? reject(error) : resolve(key));
  });
}
export async function hashCarePassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$32768$8$3$${salt.toString("hex")}$${key.toString("hex")}`;
}
export async function verifyCarePassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts.slice(0, 4).join("$") !== "scrypt$32768$8$3" || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
  return timingSafeEqual(await derive(password, Buffer.from(parts[4], "hex")), Buffer.from(parts[5], "hex"));
}
export function createCareToken() { return randomBytes(32).toString("base64url"); }
export function hashCareToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function createCareTemporaryPassword() { return randomBytes(18).toString("base64url"); }
export function validCarePassword(password: string) { return password.length >= 8 && password.length <= 128; }
export function normalizeCareUsername(username: string) { return username.trim().toLowerCase(); }
export function validCareUsername(username: string) { return /^[a-z0-9._-]{3,32}$/.test(username); }
