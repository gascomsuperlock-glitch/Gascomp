import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const state = { authorized: false, calls: 0, fail: false };
globalThis.saveReadbackTest = state;
const mock = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return mock("");
  if (specifier.endsWith("/auth/server/session")) return mock("export const getAdminSession = async () => globalThis.saveReadbackTest.authorized;");
  if (specifier.endsWith("/catalog/server/content-store")) return mock(`export async function loadFromSupabase(includeDrafts) {
    const s = globalThis.saveReadbackTest; s.calls++; s.includeDrafts = includeDrafts;
    if (s.fail) throw new Error('Private database details');
    return { products: [], supportHours: 'Monday', whatsappNumber: '123' };
  }`);
  if (specifier.endsWith("/catalog/model/save-response")) return { url: new URL("../model/save-response.ts", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { handleContentReadback } = await import("./save-readback-handler.ts");
hooks.deregister();

test("save readback requires an admin session and never confirms fallback content", async () => {
  assert.equal((await handleContentReadback()).status, 401);
  assert.equal(state.calls, 0);
  state.authorized = true;
  const response = await handleContentReadback();
  assert.equal(response.status, 200);
  assert.equal(state.includeDrafts, true);
  assert.equal(response.headers.get("cache-control"), "private, no-store, no-transform");
  assert.deepEqual(await response.json(), { success: true, content: { products: [], supportHours: "Monday", whatsappNumber: "123" } });
  state.fail = true;
  const failure = await handleContentReadback();
  assert.equal(failure.status, 503);
  const body = await failure.json();
  assert.equal(body.success, false);
  assert.ok(!JSON.stringify(body).includes("Private database details"));
});
