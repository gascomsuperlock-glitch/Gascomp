import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
const state = {
  session: null,
  saved: 0,
  verification: {
    success: true,
    hostname: "gascompsuperlock.com",
    action: "main-site-lead",
  },
};
globalThis.mainSiteLeadsTest = state;
const mock = (source) => ({
  url: `data:text/javascript,${encodeURIComponent(source)}`,
  shortCircuit: true,
});
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return mock("export {};");
    if (specifier === "@/features/auth/server/session")
      return mock(
        "export const getAdminSession = async () => globalThis.mainSiteLeadsTest.session;",
      );
    if (specifier === "./release")
      return mock(
        "export const mainSiteEnabled = () => true; export const publicSiteOrigin = () => 'https://gascompsuperlock.com';",
      );
    if (specifier === "@/shared/integrations/supabase/server")
      return mock(
        "export const createAdminSupabaseClient = () => ({ rpc: async (_name, params) => { globalThis.mainSiteLeadsTest.saved++; return { data: params.p_id }; } });",
      );
    return next(specifier, context);
  },
});
const { submitLead, listLeads, updateLead } = await import("./leads.ts");
hooks.deregister();
const valid = {
  id: "12345678-1234-4234-8234-123456789abc",
  kind: "reseller",
  name: "Test User",
  email: "test@example.test",
  phone: "0812345678",
  message: "Synthetic test inquiry",
  consent: true,
  token: "test-token",
};
const request = (body, origin = "https://gascompsuperlock.com") =>
  new Request("https://gascompsuperlock.com/api/main-site/leads", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("lead intake validates origin, limits, CAPTCHA hostname/action and database success; private reads require authentication", async () => {
  const original = globalThis.fetch;
  process.env.GASCOMP_TURNSTILE_SECRET_KEY = "synthetic-test-secret";
  globalThis.fetch = async () => Response.json(state.verification);
  try {
    assert.equal((await listLeads(request(valid))).status, 401);
    assert.equal((await updateLead(request(valid))).status, 401);
    assert.equal(
      (await submitLead(request(valid, "https://evil.test"))).status,
      403,
    );
    assert.equal(
      (await submitLead(request({ ...valid, message: "x".repeat(25_000) })))
        .status,
      413,
    );
    assert.equal(
      (await submitLead(request({ ...valid, consent: false }))).status,
      400,
    );
    assert.equal(state.saved, 0);
    for (const verification of [
      { success: false },
      { success: true, hostname: "evil.test", action: "main-site-lead" },
      { success: true, hostname: "gascompsuperlock.com", action: "other" },
    ]) {
      state.verification = verification;
      assert.equal((await submitLead(request(valid))).status, 403);
    }
    assert.equal(state.saved, 0);
    state.verification = {
      success: true,
      hostname: "gascompsuperlock.com",
      action: "main-site-lead",
    };
    assert.equal((await submitLead(request(valid))).status, 201);
    assert.equal(state.saved, 1);
    delete process.env.GASCOMP_TURNSTILE_SECRET_KEY;
    assert.equal((await submitLead(request(valid))).status, 503);
  } finally {
    globalThis.fetch = original;
    delete process.env.GASCOMP_TURNSTILE_SECRET_KEY;
  }
});
