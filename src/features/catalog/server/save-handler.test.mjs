import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const product = { id: "new", name: "New product" };
const content = { products: [{ id: "existing", name: "Existing product" }, product], whatsappNumber: "123", supportHours: "Monday" };
const state = { authorized: false, calls: [], result: { success: true, content } };
globalThis.compactSaveRouteTest = state;
const mock = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return mock("");
  if (specifier.endsWith("/auth/server/session")) return mock("export const getAdminSession = async () => globalThis.compactSaveRouteTest.authorized;");
  if (specifier.endsWith("/catalog/server/actions")) return mock("export async function saveAdminContentAction(input) { const s=globalThis.compactSaveRouteTest; s.calls.push(input); return s.result; }");
  if (specifier.includes("/catalog/model/")) return { url: new URL(`../model/${specifier.split('/').at(-1)}.ts`, import.meta.url).href, shortCircuit: true };
  if (specifier === "./content-changes") return { url: new URL("../model/content-changes.ts", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { handleContentSave } = await import("./save-handler.ts");
hooks.deregister();
const request = (body, origin="https://example.test") => new Request("https://example.test/admin/content", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

test("compact saves keep origin/session checks and legacy full-content responses", async () => {
  const changes = { mode: "changes", products: [product], removedProductIds: [], settings: {} };
  assert.equal((await handleContentSave(request(changes))).status, 401);
  state.authorized = true;
  assert.equal((await handleContentSave(request(changes, "https://untrusted.test"))).status, 403);
  assert.equal((await handleContentSave(request({ ...changes, removedProductIds: [product.id] }))).status, 400);
  assert.deepEqual(state.calls, []);
  const compact = await handleContentSave(request(changes));
  assert.equal(compact.status, 200);
  assert.deepEqual(state.calls, [changes]);
  assert.deepEqual(await compact.json(), { success: true, mode: "changes", content: { ...content, products: [product] } });
  const legacy = await handleContentSave(request(content));
  assert.deepEqual(await legacy.json(), { success: true, content });
  state.result = { success: false, error: "Storage unavailable" };
  const failed = await handleContentSave(request(changes));
  assert.equal(failed.status, 422);
  assert.deepEqual(await failed.json(), state.result);
});
