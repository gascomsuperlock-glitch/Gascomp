import { resolve } from "node:path";

export const root = resolve(import.meta.dirname, "../..");
export const dataPath = (...parts) => resolve(root, "data", ...parts);
// The knowledge vault lives in the douke-chat workspace next to this repository.
export const defaultVaultDir = resolve(root, "..", "douke-chat/knowledge/approved/Douke Knowledge Base");
export const vaultDir = resolve(process.env.DOUKE_VAULT_DIR || defaultVaultDir);
export const vaultPath = (...parts) => resolve(vaultDir, ...parts);
// Generated product and answer notes belong inside the Duoke root the
// assistant indexes, not beside it.
export const duokeDir = resolve(vaultDir, "Duoke");
export const duokePath = (...parts) => resolve(duokeDir, ...parts);
