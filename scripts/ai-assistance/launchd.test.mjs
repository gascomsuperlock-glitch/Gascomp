import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { generateServices, serviceFiles, serviceLabels, workerEnvironment } from "./launchd.mjs";
import { isolatedEnvironment, readPrivateEnvironment } from "./worker-launcher.mjs";

const values = {
  GASCOMP_AI_SITE_URL: "https://support.gascompsuperlock.com",
  GASCOMP_AI_WORKER_TOKEN: "test-only-secret-do-not-print-123456789",
  GASCOMP_AI_MODEL: "local-test-model",
};

test("launchd rendering keeps hostile path characters literal and token out of process arguments", () => {
  const repository = "/Users/Test Name/a<&\"'$(echo injected)>";
  const environment = workerEnvironment(values, repository);
  const files = serviceFiles({ environment, repository, node: "/Applications/Node & Tools/node" });
  assert.ok(files.worker.includes("/Applications/Node &amp; Tools/node"));
  assert.ok(files.worker.includes("a&lt;&amp;&quot;&apos;$(echo injected)&gt;"));
  assert.ok(files.worker.includes("<key>SuccessfulExit</key><false/>"));
  assert.ok(files.worker.includes("<key>ThrottleInterval</key><integer>15</integer>"));
  assert.ok(files.chrome.includes("--remote-debugging-address=127.0.0.1"));
  assert.ok(files.chrome.includes("--user-data-dir="));
  for (const plist of [files.worker, files.chrome]) {
    assert.ok(!plist.includes(environment.GASCOMP_AI_WORKER_TOKEN));
    assert.ok(!plist.includes("/bin/sh"));
    assert.ok(!plist.includes("EnvironmentVariables"));
  }
});

test("generation creates private valid plists and refuses overwrite for recovery safety", (context) => {
  const repository = mkdtempSync(join(realpathSync(tmpdir()), "gascomp launchd & "));
  context.after(() => rmSync(repository, { recursive: true, force: true }));
  const environment = workerEnvironment(values, repository);
  assert.equal(existsSync(join(repository, "scraping")), false);
  serviceFiles({ environment, repository });
  assert.equal(existsSync(join(repository, "scraping")), false);
  const files = generateServices({ environment, repository });
  assert.equal(statSync(files.directory).mode & 0o777, 0o700);
  assert.equal(statSync(files.config).mode & 0o777, 0o600);
  assert.equal(readPrivateEnvironment(files.config).GASCOMP_AI_WORKER_TOKEN, values.GASCOMP_AI_WORKER_TOKEN);
  for (const label of Object.values(serviceLabels)) {
    const path = join(files.directory, `${label}.plist`);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.ok(!readFileSync(path, "utf8").includes(values.GASCOMP_AI_WORKER_TOKEN));
    if (process.platform === "darwin") assert.equal(spawnSync("/usr/bin/plutil", ["-lint", path]).status, 0);
  }
  const original = readFileSync(files.config, "utf8");
  assert.throws(() => generateServices({ environment: { ...environment, GASCOMP_AI_MODEL: "changed" }, repository }), /already exist/);
  assert.equal(readFileSync(files.config, "utf8"), original);
});

test("configuration rejects remote model/CDP, unsafe website and missing secrets without exposing values", () => {
  for (const override of [
    { GASCOMP_AI_SITE_URL: "http://example.com" },
    { GASCOMP_AI_SITE_URL: "https://example.com/a" },
    { GASCOMP_AI_SITE_URL: "https://secret@example.com" },
    { GASCOMP_AI_MODEL_BASE_URL: "https://api.openai.com/v1" },
    { GASCOMP_AI_CHROME_CDP_URL: "http://0.0.0.0:9222" },
    { GASCOMP_AI_CHROME_CDP_URL: "http://127.0.0.1:9222/other" },
    { GASCOMP_AI_WORKER_TOKEN: "short" },
    { GASCOMP_AI_MODEL: "" },
    { GASCOMP_AI_BROWSER_HOSTS: "support.gascompsuperlock.com.attacker.test" },
  ]) assert.throws(() => workerEnvironment({ ...values, ...override }));
  assert.equal(workerEnvironment({ ...values, GASCOMP_AI_SITE_URL: "http://localhost:3000" }).GASCOMP_AI_SITE_URL, "http://localhost:3000");
});

test("launcher excludes personal model secrets and refuses public or symlinked config", (context) => {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "gascomp-launchd-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const environment = workerEnvironment(values);
  const isolated = isolatedEnvironment(environment, { HOME: "/user", PATH: "/bin", OPENAI_API_KEY: "private", ANTHROPIC_API_KEY: "private", HERMES_HOME: "/personal" });
  assert.equal(isolated.HOME, "/user");
  assert.equal(isolated.OPENAI_API_KEY, undefined);
  assert.equal(isolated.ANTHROPIC_API_KEY, undefined);
  assert.equal(isolated.HERMES_HOME, undefined);
  const path = join(directory, "configuration.json");
  writeFileSync(path, JSON.stringify(environment), { mode: 0o600 });
  const link = join(directory, "link.json");
  symlinkSync(path, link);
  assert.throws(() => readPrivateEnvironment(link), /owner-only/);
  chmodSync(path, 0o644);
  assert.throws(() => readPrivateEnvironment(path), /owner-only/);
  chmodSync(path, 0o600);
  assert.equal(readPrivateEnvironment(path).GASCOMP_AI_MODEL, values.GASCOMP_AI_MODEL);
});

test("an explicitly configured source vault survives the private worker environment", () => {
  const environment = workerEnvironment({ ...values, GASCOMP_AI_SOURCE_VAULT: "/private/source vault" });
  assert.equal(environment.GASCOMP_AI_SOURCE_VAULT, "/private/source vault");
  assert.equal(isolatedEnvironment(environment).GASCOMP_AI_SOURCE_VAULT, "/private/source vault");
  assert.equal(workerEnvironment(values).GASCOMP_AI_SOURCE_VAULT, undefined);
});

test("response mode defaults to grounded and preserves explicit exact rollback", () => {
  assert.equal(workerEnvironment(values).GASCOMP_AI_RESPONSE_MODE, "grounded");
  const environment = workerEnvironment({ ...values, GASCOMP_AI_RESPONSE_MODE: "exact" });
  assert.equal(isolatedEnvironment(environment).GASCOMP_AI_RESPONSE_MODE, "exact");
  assert.throws(() => workerEnvironment({ ...values, GASCOMP_AI_RESPONSE_MODE: "unrestricted" }), /response_mode/i);
});
