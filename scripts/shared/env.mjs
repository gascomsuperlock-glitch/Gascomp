import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { root } from "./paths.mjs";

export function loadEnvFile(envPath = resolve(root, ".env.local"), environment = process.env) {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match || environment[match[1]]) continue;
    environment[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
