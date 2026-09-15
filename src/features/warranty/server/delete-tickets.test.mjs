import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const state = { authorized: false, deleted: [], fail: '' };
globalThis.deleteTicketsTest = state;
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({resolve(specifier, context, next) {
  if (specifier === 'next/cache') return mock('export const revalidatePath = () => {};');
  if (specifier.endsWith('/auth/server/session')) return mock('export const getAdminSession = async () => globalThis.deleteTicketsTest.authorized;');
  if (specifier.endsWith('/warranty/server/ticket-service')) return mock(`export const updateWarrantyTicketStatus = async () => ''; export const deleteWarrantyTicket = async id => { const s=globalThis.deleteTicketsTest; if(s.fail===id)throw Error('Unavailable'); s.deleted.push(id); };`);
  if (specifier.endsWith('/warranty/model/types')) return {url:new URL('../model/types.ts',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}});
const { deleteWarrantyTicketsAction } = await import('./admin-actions.ts');hooks.deregister();
const one='GWC-20260915-AAAAAA', two='GWC-20260915-BBBBBB';
test('deletion validates the session and complete selection before any mutation',async()=>{
  assert.ok((await deleteWarrantyTicketsAction([one])).error);
  state.authorized=true;
  for(const ids of [[],[one,'../private'],Array(101).fill(one),null]) assert.ok((await deleteWarrantyTicketsAction(ids)).error);
  assert.deepEqual(state.deleted,[]);
});
test('partial deletion reports exactly the successful IDs and deduplicates selection',async()=>{
  state.fail=two;
  const partial=await deleteWarrantyTicketsAction([one,one,two]);
  assert.deepEqual(partial.deletedIds,[one]);assert.ok(partial.error);
  assert.deepEqual(state.deleted,[one]);
  state.fail='';
  assert.deepEqual((await deleteWarrantyTicketsAction([two])).deletedIds,[two]);
});
