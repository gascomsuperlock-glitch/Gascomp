import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { configuration, loopbackOrigin, runPilot, syntheticSnapshot } from "./pilot.mjs";
import { validateSnapshot } from "../../src/features/ai-assistance/model/validation.ts";

const environment = {
  GASCOMP_AI_SITE_URL: "http://localhost:3100",
  GASCOMP_AI_PILOT_DATABASE_URL: "http://127.0.0.1:54329",
  GASCOMP_AI_PILOT_ISOLATED: "true",
  GASCOMP_AI_WORKER_TOKEN: "test-only-token-must-never-appear-in-output",
};

test("pilot defaults to no writes and requires explicit exclusive isolation for execution", () => {
  assert.equal(configuration([], {}).run, false);
  assert.equal(configuration([], {}).durationSeconds, 60);
  assert.equal(configuration(["--run", "--duration-seconds", "86400"], environment).durationSeconds, 86400);
  for (const key of ["GASCOMP_AI_PILOT_DATABASE_URL", "GASCOMP_AI_PILOT_ISOLATED", "GASCOMP_AI_WORKER_TOKEN"]) {
    assert.throws(() => configuration(["--run"], { ...environment, [key]: undefined }));
  }
  for (const args of [["--token", "secret"], ["--duration-seconds"], ["--duration-seconds", "0"], ["--duration-seconds", "Infinity"]]) {
    assert.throws(() => configuration(args, environment));
  }
});

test("pilot rejects external destinations, credentials, URL suffixes, and non-loopback database origins", () => {
  for (const url of ["https://support.gascompsuperlock.com", "http://localhost.example.com", "http://127.0.0.1@example.com", "http://user:secret@localhost", "http://0.0.0.0", "http://localhost/path", "http://localhost?secret=token", "file:///tmp"]) {
    assert.throws(() => loopbackOrigin(url));
  }
  assert.equal(loopbackOrigin("http://[::1]:3100"), "http://[::1]:3100");
  assert.throws(() => configuration(["--run"], { ...environment, GASCOMP_AI_PILOT_DATABASE_URL: "https://example.supabase.co" }));
});

test("dry-run CLI does not connect even when the loopback service is absent or print tokens", () => {
  const result = spawnSync(process.execPath, [new URL("./pilot.mjs", import.meta.url).pathname], {
    env: { ...process.env, ...environment, GASCOMP_AI_SITE_URL: "http://127.0.0.1:1" }, encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).writes, false);
  assert.ok(!result.stdout.includes(environment.GASCOMP_AI_WORKER_TOKEN));
  assert.ok(!result.stderr.includes(environment.GASCOMP_AI_WORKER_TOKEN));
});

test("synthetic fixtures satisfy the actual publication contract and preserve source text", () => {
  const initial = syntheticSnapshot();
  assert.deepEqual(validateSnapshot(initial), initial);
  assert.notEqual(initial.version, syntheticSnapshot(2).version);
  assert.ok(initial.entries.some((entry) => entry.answer.includes("\nExact source line.")));
});

test("transport failures produce content-free failed reports and do not follow redirects", async () => {
  const secret = "PRIVATE RESPONSE TEXT";
  const calls = [];
  const report = await runPilot(configuration(["--run"], environment), {
    fetchImpl: async (url, options) => { calls.push({ url, options }); throw new Error(secret); },
  });
  assert.equal(report.passed, false);
  assert.equal(report.cleanupFailed, true);
  assert.ok(!JSON.stringify(report).includes(secret));
  assert.ok(!JSON.stringify(report).includes(environment.GASCOMP_AI_WORKER_TOKEN));
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.redirect === "error"));
});
