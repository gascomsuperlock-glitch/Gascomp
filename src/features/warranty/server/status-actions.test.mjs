import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const state = { authorized: false, updates: [], revalidated: [], fail: false };
globalThis.statusActionTest = state;
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'next/cache') return mock('export const revalidatePath = path => globalThis.statusActionTest.revalidated.push(path);');
  if (specifier.endsWith('/auth/server/session')) return mock('export const getAdminSession = async () => globalThis.statusActionTest.authorized;');
  if (specifier.endsWith('/warranty/server/ticket-service')) return mock(`
    export const deleteWarrantyTicket = async () => {};
    export const updateWarrantyTicketStatus = async (...args) => {
      if (globalThis.statusActionTest.fail) throw new Error('Storage unavailable');
      globalThis.statusActionTest.updates.push(args);
      return '2026-09-17T00:00:00Z';
    };
  `);
  if (specifier.endsWith('/warranty/model/types')) return { url: new URL('../model/types.ts', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { setWarrantyTicketStatusAction: update } = await import('./admin-actions.ts');
hooks.deregister();

test('status changes require authentication, validate inputs, and preserve solutions', async (t) => {
  const id = 'GWC-20260917-AAAAAA';
  assert.equal((await update(id, 'reviewing')).success, false);
  assert.deepEqual(state.updates, []);
  state.authorized = true;
  for (const args of [[id, 'pending'], [id, 'done'], [id, 'toString'], [id, null], [id, undefined], [id, {}], ['../private', 'new'], [null, 'new'], [[id], 'new']]) {
    assert.equal((await update(...args)).success, false);
  }
  assert.deepEqual(state.updates, []);
  assert.deepEqual(state.revalidated, []);

  for (const status of ['new', 'reviewing', 'approved', 'rejected', 'closed']) {
    assert.deepEqual(await update(id, status), { success: true, updatedAt: '2026-09-17T00:00:00Z' });
    assert.deepEqual(state.updates.pop(), [id, status, undefined]);
    assert.equal(state.revalidated.pop(), '/admin');
  }

  state.fail = true;
  const errors = t.mock.method(console, 'error', () => {});
  const failed = await update(id, 'approved');
  assert.equal(failed.success, false);
  assert.match(failed.error, /could not be updated/);
  assert.equal(errors.mock.callCount(), 1);
  assert.deepEqual(state.updates, []);
  assert.deepEqual(state.revalidated, []);
});
