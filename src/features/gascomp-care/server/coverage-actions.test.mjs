import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { beforeEach, test } from 'node:test';
const memberId = '12345678-abcd-1234-abcd-123456789abc';
const coverageId = '12345678-abcd-1234-abcd-123456789def';
const requestId = '12345678-abcd-1234-abcd-123456789fed';
const state = { admin: false, origin: true, session: null, result: { data: [], error: null }, calls: [], unavailable: false };
globalThis.careCoverageTest = state;
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return mock('export {};');
  if (specifier === '@/features/auth/server/session') return mock('export const getAdminSession = async () => globalThis.careCoverageTest.admin;');
  if (specifier === './request-security') return mock('export const isCareSameOrigin = async () => globalThis.careCoverageTest.origin;');
  if (specifier === './session') return mock('export const getCareSession = async () => globalThis.careCoverageTest.session;');
  if (specifier === './database') return mock(`export const careDatabase = () => { if(globalThis.careCoverageTest.unavailable) throw new Error('offline'); return {rpc:async(...args)=>{globalThis.careCoverageTest.calls.push(args); return globalThis.careCoverageTest.result;}}; };`);
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.endsWith('.ts')) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const { listCareCoverage, addCarePurchaseAction: purchase, recordCareClaimAction: claim } = await import('./coverage-actions.ts');
const { getMemberCareCoverage } = await import('./coverage.ts');
const { careToday } = await import('../model/coverage.ts');
hooks.deregister();
const form = values => { const result = new FormData(); for (const [key,value] of Object.entries(values)) result.set(key,value); return result; };
const purchaseForm = overrides => form({ memberId, purchaseReference: ' ORDER-ONE ', itemLabel: 'Fictional protected item', purchaseDate: '2024-02-29', units: '2', ...overrides });
const claimForm = overrides => form({ memberId, coverageId, requestId, ...overrides });
beforeEach(() => Object.assign(state, { admin: false, origin: true, session: null, result: { data: [], error: null }, calls: [], unavailable: false }));

test('coverage mutations and admin list require authentication and same-origin mutations', async () => {
  assert.equal((await listCareCoverage(memberId)).error, 'unauthorized');
  assert.equal((await purchase({}, purchaseForm())).error, 'unauthorized');
  assert.equal((await claim({}, claimForm())).error, 'unauthorized');
  state.admin = true;
  state.origin = false;
  assert.equal((await purchase({}, purchaseForm())).error, 'unauthorized');
  assert.equal((await claim({}, claimForm())).error, 'unauthorized');
  assert.deepEqual(state.calls, []);
});
test('member coverage uses only authenticated session ownership and blocks temporary sessions', async () => {
  assert.equal((await getMemberCareCoverage()).error, 'unauthorized');
  state.session = { member: { id: memberId, mustChangePassword: true } };
  assert.equal((await getMemberCareCoverage()).error, 'unauthorized');
  assert.deepEqual(state.calls, []);
  state.session.member.mustChangePassword = false;
  assert.deepEqual(await getMemberCareCoverage(), { coverages: [] });
  assert.deepEqual(state.calls, [['care_list_coverage', { p_member_id: memberId }]]);
});
test('missing coverage schema or outage stays distinct from genuine empty coverage', async () => {
  state.admin = true;
  assert.deepEqual(await listCareCoverage(memberId), { coverages: [] });
  state.result = { data: null, error: { code: 'PGRST202' } };
  assert.deepEqual(await listCareCoverage(memberId), { coverages: [], error: 'unavailable' });
  state.unavailable = true;
  assert.equal((await listCareCoverage(memberId)).error, 'unavailable');
  assert.equal((await purchase({}, purchaseForm())).error, 'unavailable');
});
test('purchase validation rejects future/impossible dates and fractional or out-of-range units before any write', async () => {
  state.admin = true;
  for (const override of [{ purchaseDate: '9999-01-01' }, { purchaseDate: '2025-02-29' }, { units: '1.5' }, { units: '0' }, { units: '11' }, { memberId: 'invalid' }, { purchaseReference: ' ' }, { itemLabel: '' }]) assert.equal((await purchase({}, purchaseForm(override))).error, 'invalidInput');
  assert.deepEqual(state.calls, []);
  state.result = { data: 'ok', error: null };
  assert.deepEqual(await purchase({}, purchaseForm()), { success: true });
  assert.deepEqual(state.calls[0], ['care_add_purchase', { p_member_id: memberId, p_purchase_reference: 'order-one', p_item_label: 'Fictional protected item', p_purchase_date: '2024-02-29', p_units: 2 }]);
});
test('claim action supplies member ownership and maps atomic quota, duplicate and expiry outcomes', async () => {
  state.admin = true;
  assert.equal((await claim({}, claimForm({ requestId: 'manual-reference' }))).error, 'invalidInput');
  assert.equal((await claim({}, claimForm({ requestId: '' }))).error, 'invalidInput');
  assert.equal((await claim({}, claimForm({ coverageId: 'invalid' }))).error, 'invalidInput');
  assert.deepEqual(state.calls, []);
  for (const outcome of ['duplicateClaim', 'coverageExpired', 'coverageExhausted', 'coverageNotFound']) {
    state.result = { data: outcome, error: null };
    assert.equal((await claim({}, claimForm())).error, outcome);
  }
  assert.deepEqual(state.calls[0], ['care_record_claim', { p_member_id: memberId, p_coverage_id: coverageId, p_reference: requestId, p_used_on: careToday() }]);
  state.result = { data: 'ok', error: null };
  assert.deepEqual(await claim({}, claimForm()), { success: true });
});

test('claim confirmation ignores client dates/references and derives the date in Jakarta', async () => {
  state.admin = true;
  state.result = { data: 'ok', error: null };
  assert.deepEqual(await claim({}, claimForm({ requestId: requestId.toUpperCase(), reference: 'operator-selected', usedOn: '1900-01-01' })), { success: true });
  assert.deepEqual(state.calls[0], ['care_record_claim', { p_member_id: memberId, p_coverage_id: coverageId, p_reference: requestId, p_used_on: careToday() }]);
});
