import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { after, beforeEach, test } from 'node:test';

const state = { primaryCalls: 0, previewCalls: 0, previewAvailable: false };
globalThis.careDatabaseRoutingTest = state;
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return mock('export {};');
  if (specifier === '@supabase/supabase-js') return mock('export const createClient = () => { globalThis.careDatabaseRoutingTest.previewCalls++; return { rpc: async () => ({ data: globalThis.careDatabaseRoutingTest.previewAvailable, error: globalThis.careDatabaseRoutingTest.previewAvailable ? null : {code:"OFFLINE"} }) }; };');
  if (specifier === '@/shared/integrations/supabase/server') return mock('export const createAdminSupabaseClient = () => { globalThis.careDatabaseRoutingTest.primaryCalls++; return { rpc: async () => ({data:true,error:null}) }; };');
  if (specifier === './preview-database') return next('./preview-database.ts', context);
  return next(specifier, context);
} });
const { getCareAvailability } = await import('./database.ts');
hook.deregister();
const original = Object.fromEntries(['NODE_ENV', 'GASCOMP_CARE_PREVIEW_URL', 'GASCOMP_CARE_PREVIEW_KEY'].map(key => [key, process.env[key]]));
beforeEach(() => {
  Object.assign(state, { primaryCalls: 0, previewCalls: 0, previewAvailable: false });
  process.env.NODE_ENV = 'development';
  process.env.GASCOMP_CARE_PREVIEW_URL = 'http://127.0.0.1:54329';
  process.env.GASCOMP_CARE_PREVIEW_KEY = 'local-test-key';
});
after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

test('preview outages never fall back to the existing primary Supabase database', async () => {
  assert.equal(await getCareAvailability(), false);
  assert.equal(state.previewCalls, 1);
  assert.equal(state.primaryCalls, 0);
});
test('production uses the existing primary connection even with copied preview settings', async () => {
  process.env.NODE_ENV = 'production';
  assert.equal(await getCareAvailability(), true);
  assert.equal(state.primaryCalls, 1);
  assert.equal(state.previewCalls, 0);
});
test('invalid preview settings report unavailable without opening the primary connection', async () => {
  process.env.GASCOMP_CARE_PREVIEW_URL = 'https://unexpected.example';
  assert.equal(await getCareAvailability(), false);
  assert.equal(state.primaryCalls, 0);
  assert.equal(state.previewCalls, 0);
});
