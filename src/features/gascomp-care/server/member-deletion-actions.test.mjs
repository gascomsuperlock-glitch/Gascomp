import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { beforeEach, test } from 'node:test';
const one = '12345678-abcd-1234-abcd-123456789abc';
const two = '12345678-abcd-1234-abcd-123456789def';
const state = { admin: false, origin: true, calls: [], result: { data: { deletedIds: [one] }, error: null }, unavailable: false };
globalThis.careDeletionTest = state;
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@/features/auth/server/session') return mock('export const getAdminSession = async () => globalThis.careDeletionTest.admin;');
  if (specifier === './request-security') return mock('export const isCareSameOrigin = async () => globalThis.careDeletionTest.origin;');
  if (specifier === './database') return mock(`export const careDatabase = () => {if(globalThis.careDeletionTest.unavailable) throw new Error('offline'); return {rpc:async(...args)=>{globalThis.careDeletionTest.calls.push(args);return globalThis.careDeletionTest.result;}};};`);
  if (specifier.startsWith('../') && !specifier.endsWith('.ts')) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const { deleteCareMembersAction: remove } = await import('./member-deletion-actions.ts');
hooks.deregister();
beforeEach(() => Object.assign(state, { admin: false, origin: true, calls: [], result: { data: { deletedIds: [one] }, error: null }, unavailable: false }));

test('member deletion rejects unauthenticated and cross-origin direct action calls', async () => {
  assert.deepEqual(await remove([one]), { deletedIds: [], error: 'unauthorized' });
  state.admin = true;
  state.origin = false;
  assert.deepEqual(await remove([one]), { deletedIds: [], error: 'unauthorized' });
  assert.deepEqual(state.calls, []);
});
test('member deletion validates explicit bounded UUID arrays before any database operation', async () => {
  state.admin = true;
  for (const ids of [undefined, null, one, [], [null], ['invalid'], Array(101).fill(one)]) assert.deepEqual(await remove(ids), { deletedIds: [], error: 'invalidInput' });
  assert.deepEqual(state.calls, []);
});
test('member deletion normalizes and deduplicates the selected IDs into one atomic RPC', async () => {
  state.admin = true;
  state.result = { data: { deletedIds: [one, two] }, error: null };
  assert.deepEqual(await remove([two, one.toUpperCase(), one]), { deletedIds: [one, two] });
  assert.deepEqual(state.calls, [['care_delete_members', { p_member_ids: [one, two] }]]);
});
test('unknown member batches and database failures never report partial deletion success', async () => {
  state.admin = true;
  state.result = { data: { deletedIds: [], error: 'invalidInput' }, error: null };
  assert.deepEqual(await remove([one]), { deletedIds: [], error: 'invalidInput' });
  state.result = { data: null, error: { code: 'PGRST202' } };
  assert.deepEqual(await remove([one]), { deletedIds: [], error: 'unavailable' });
  state.result = { data: { deletedIds: [one] }, error: null };
  assert.deepEqual(await remove([one, two]), { deletedIds: [], error: 'unavailable' });
  state.unavailable = true;
  assert.deepEqual(await remove([one]), { deletedIds: [], error: 'unavailable' });
});
