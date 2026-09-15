import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const state = { authorized: false, bounds: [] };
globalThis.dateExportTest = state;
const mock = source => ({url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true});
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier.endsWith('/auth/server/session')) return mock('export const getAdminSession = async () => globalThis.dateExportTest.authorized;');
  if (specifier.endsWith('/warranty/server/ticket-service')) return mock('export const listWarrantyTicketsForRange = async bounds => {globalThis.dateExportTest.bounds.push(bounds); return [];};');
  if (specifier.endsWith('/warranty/model/ticket-export')) return {url:new URL('../model/ticket-export.ts',import.meta.url).href,shortCircuit:true};
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) return next(specifier+'.ts',context);
  return next(specifier,context);
}});
const { GET } = await import('../../../app/admin/warranty-tickets/export/route.ts');
hooks.deregister();
const request = query => new Request('http://localhost/admin/warranty-tickets/export?'+query);
test('date export authenticates, validates real nonfuture ranges, and includes the whole last day', async () => {
  assert.equal((await GET(request('start=2024-02-29&end=2024-02-29'))).status,401);
  state.authorized=true;
  for(const query of ['', 'start=2024-02-30&end=2024-02-30','start=2024-03-01&end=2024-02-29','start=2024-01-01&end=9999-12-31']) assert.equal((await GET(request(query))).status,400);
  assert.deepEqual(state.bounds,[]);
  const response=await GET(request('start=2024-02-29&end=2024-02-29'));
  assert.equal(response.status,200);
  assert.deepEqual(state.bounds,[{start:'2024-02-28T17:00:00.000Z',end:'2024-02-29T17:00:00.000Z'}]);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(response.headers.get('x-ticket-count'),'0');
});
