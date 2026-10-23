import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const state = {
  session: null,
  reads: 0,
  closed: 0,
  size: 100,
  snapshot: {
    version: 1,
    source: "https://gascompsuperlock.com",
    approved: false,
    records: [],
  },
};
globalThis.mainSiteSnapshotTest = state;
const mock = (source) => ({
  url: `data:text/javascript,${encodeURIComponent(source)}`,
  shortCircuit: true,
});
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return mock("export {};");
    if (specifier === "@/features/auth/server/session")
      return mock(
        "export const getAdminSession = async () => globalThis.mainSiteSnapshotTest.session;",
      );
    if (specifier === "node:fs/promises")
      return mock(`export const open = async () => {
    const state = globalThis.mainSiteSnapshotTest; state.reads++;
    return { stat: async () => ({ size: state.size }), readFile: async () => JSON.stringify(state.snapshot), close: async () => { state.closed++; } };
  };`);
    return next(specifier, context);
  },
});
const { loadMainSiteSnapshot } = await import("./snapshot.ts");
hooks.deregister();

test("preview requires both feature flag and valid admin session before filesystem access", async () => {
  delete process.env.GASCOMP_MAIN_SITE_PREVIEW_ENABLED;
  state.session = { username: "admin" };
  await assert.rejects(loadMainSiteSnapshot(), /access denied/);
  process.env.GASCOMP_MAIN_SITE_PREVIEW_ENABLED = "true";
  state.session = null;
  await assert.rejects(loadMainSiteSnapshot(), /access denied/);
  assert.equal(state.reads, 0);
  state.session = { username: "admin" };
  assert.deepEqual((await loadMainSiteSnapshot()).records, []);
  assert.equal(state.closed, 1);
  state.size = 40_000_001;
  await assert.rejects(loadMainSiteSnapshot(), /exceeds/);
  assert.equal(state.closed, 2);
  state.size = 100;
  state.snapshot.source = "https://evil.test";
  await assert.rejects(loadMainSiteSnapshot(), /Invalid/);
  assert.equal(state.closed, 3);
});
