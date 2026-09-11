import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { root, dataPath } from "./paths.mjs";
import { loadEnvFile } from "./env.mjs";

test("script paths resolve from the module location", () => {
  assert.equal(root, resolve(import.meta.dirname, "../.."));
  assert.ok(existsSync(resolve(root, "package.json")));
  assert.ok(existsSync(dataPath("catalog", "duoke-products.json")));
  assert.ok(existsSync(dataPath("knowledge", "duoke-bot-messages.json")));
});

test("environment loading preserves process overrides and quoted values", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "gascomp-env-"));
  try {
    const file = resolve(directory, ".env.local");
    writeFileSync(file, 'EXISTING=file\nQUOTED="hello world"\nSINGLE=\'value\'\nEMPTY=fallback\n# ignored\ninvalid\n');
    const environment = { EXISTING: "process", EMPTY: "" };
    loadEnvFile(file, environment);
    assert.deepEqual(environment, { EXISTING: "process", QUOTED: "hello world", SINGLE: "value", EMPTY: "fallback" });
    loadEnvFile(resolve(directory, "missing"), environment);
    assert.equal(environment.EXISTING, "process");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
