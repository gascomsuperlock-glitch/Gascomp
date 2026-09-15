import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { beforeEach, test } from 'node:test';

const state = { admin: false, headers: new Headers(), cookie: undefined, writes: [], queries: [], rpcCalls: [], results: [], rpcResults: [], configured: true };
const db = {
  from(table) {
    const query = { table, operations: [] };
    state.queries.push(query);
    const builder = new Proxy({}, { get(_target, property) {
      if (property === 'then') return (resolve, reject) => Promise.resolve(state.results.shift() ?? { data: null, error: null }).then(resolve, reject);
      return (...args) => { query.operations.push([property, ...args]); return builder; };
    } });
    return builder;
  },
  async rpc(name, parameters) {
    state.rpcCalls.push([name, parameters]);
    const result = state.rpcResults.shift();
    if (result instanceof Error) throw result;
    return result ?? { data: true, error: null };
  },
};
globalThis.careActionTest = { state, db };
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return mock('export {};');
  if (specifier === '@/shared/lib/session-cookie') return mock('export const getSessionCookieSecurity = async () => true;');
  if (specifier === 'next/headers') return mock(`
    export const headers = async () => globalThis.careActionTest.state.headers;
    export const cookies = async () => ({ get: () => ({value: globalThis.careActionTest.state.cookie}), set: (...args) => {globalThis.careActionTest.state.writes.push(args); globalThis.careActionTest.state.cookie=args[1];} });
  `);
  if (specifier === 'next/navigation') return mock('export const redirect = path => {throw new Error(`REDIRECT:${path}`)};');
  if (specifier === '@/features/auth/server/session') return mock('export const getAdminSession = async () => globalThis.careActionTest.state.admin;');
  if (specifier === '@/shared/integrations/supabase/server') return mock('export const createAdminSupabaseClient = () => globalThis.careActionTest.state.configured ? globalThis.careActionTest.db : null;');
  if (specifier.startsWith('./') && context.parentURL?.includes('/gascomp-care/server/') && !specifier.endsWith('.ts') && !specifier.endsWith('.mjs')) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const { loginCareAction: login, changeCarePasswordAction: change, logoutCareAction: logout } = await import('./member-actions.ts');
const { createCareMemberAction: create, resetCarePasswordAction: reset, listCareMembers: list } = await import('./admin-actions.ts');
const { getCareSession, requireCareMember, getCareAvailability } = await import('./session.ts');
const { isCareSameOrigin, careRequestIpKey, shouldLimitCareAttempts } = await import('./request-security.ts');
const { hashCarePassword, hashCareToken, createCareToken } = await import('./password.ts');
hooks.deregister();
const password = 'An original member password';
const passwordHash = await hashCarePassword(password);
const id = '12345678-abcd-1234-abcd-123456789abc';
const row = { id, name: 'Sample Member', username: 'member.one', member_number: 'GC-TEST', whatsapp: '08123456789', order_reference: '', created_at: '2026-09-15T00:00:00Z', must_change_password: true, password_hash: passwordHash, credential_version: 7 };
const form = values => { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; };
beforeEach(() => {
  Object.assign(state, { admin: false, headers: new Headers({ origin: 'https://care.example', host: 'care.example', 'x-forwarded-for': '198.51.100.1' }), cookie: undefined, writes: [], queries: [], rpcCalls: [], results: [], rpcResults: [], configured: true });
});

test('member and admin mutation endpoints reject missing or foreign origins before database work', async () => {
  for (const origin of ['', 'https://evil.example', 'invalid']) {
    if (origin) state.headers.set('origin', origin); else state.headers.delete('origin');
    assert.equal(await isCareSameOrigin(), false);
    assert.equal((await login({}, form({ username: 'member.one', password }))).error, 'unauthorized');
    state.admin = true;
    assert.equal((await create({}, form({}))).error, 'unauthorized');
    assert.equal((await reset(id)).error, 'unauthorized');
    assert.equal((await change({}, form({}))).error, 'unauthorized');
    await assert.rejects(logout(), /unauthorized/);
  }
  assert.equal(state.queries.length, 0);
  assert.equal(state.rpcCalls.length, 0);
});
test('request IP uses a validated final proxy hop and unknown fallback', async () => {
  state.headers.set('x-forwarded-for', 'spoofed, 198.51.100.8');
  assert.equal(await careRequestIpKey(), hashCareToken('198.51.100.8'));
  state.headers.set('x-forwarded-for', '2001:db8::1');
  assert.equal(await careRequestIpKey(), hashCareToken('2001:db8::1'));
  state.headers.set('x-forwarded-for', 'arbitrary-attacker-key');
  assert.equal(await careRequestIpKey(), hashCareToken('unknown'));
  state.headers.delete('x-forwarded-for');
  assert.equal(await careRequestIpKey(), hashCareToken('unknown'));
});
test('admin session is required to create, list, and reset accounts even through direct action calls', async () => {
  assert.equal((await create({}, form({}))).error, 'unauthorized');
  assert.equal((await reset(id)).error, 'unauthorized');
  assert.equal((await list()).error, 'unauthorized');
  assert.equal(state.queries.length, 0);
  assert.equal(state.rpcCalls.length, 0);
});
test('account creation validates input and returns only profile plus one-time credentials', async () => {
  state.admin = true;
  assert.equal((await create({}, form({ name: 'Member', username: 'INVALID!', whatsapp: 'bad' }))).error, 'invalidInput');
  assert.equal(state.queries.length, 0);
  state.results.push({ data: row, error: null });
  const result = await create({}, form({ name: row.name, username: ' MEMBER.ONE ', whatsapp: row.whatsapp }));
  assert.equal(result.success, true);
  assert.equal(result.credentials.username, 'member.one');
  assert.ok(result.credentials.password.length >= 15);
  assert.equal('password_hash' in result.member, false);
  const inserted = state.queries[0].operations.find(op => op[0] === 'insert')[1];
  assert.match(inserted.password_hash, /^scrypt\$/);
  assert.notEqual(inserted.password_hash, result.credentials.password);
  state.results.push({ data: null, error: { code: '23505' } });
  assert.equal((await create({}, form({ name: row.name, username: row.username, whatsapp: row.whatsapp }))).error, 'duplicateUsername');
});
test('login generic failure and database rate limit never issue a cookie', async () => {
  for (const account of [null, row]) {
    state.results.push({ data: account, error: null });
    assert.equal((await login({}, form({ username: row.username, password: 'wrong password' }))).error, 'invalidCredentials');
  }
  state.rpcResults.push({ data: false, error: null });
  assert.equal((await login({}, form({ username: row.username, password }))).error, 'rateLimited');
  assert.equal(state.writes.length, 0);
});
test('login issues a protected cookie only after atomically opening the matching credential version', async () => {
  state.results.push({ data: row, error: null });
  await assert.rejects(login({}, form({ username: row.username, password })), /REDIRECT:\/gascomp-care\/change-password/);
  const opened = state.rpcCalls.find(call => call[0] === 'care_open_session')[1];
  assert.equal(opened.p_version, 7);
  assert.equal(opened.p_member_id, id);
  assert.equal(opened.p_token_hash, hashCareToken(state.cookie));
  assert.equal(state.writes[0][2].httpOnly, true);
  assert.equal(state.writes[0][2].sameSite, 'lax');
  assert.equal(state.writes[0][2].path, '/gascomp-care');
  assert.equal(state.writes[0][2].maxAge, 28800);
});
test('a concurrent reset rejecting the verified credential version prevents login', async () => {
  state.results.push({ data: row, error: null });
  state.rpcResults.push({ data: true, error: null }, { data: false, error: null });
  assert.equal((await login({}, form({ username: row.username, password }))).error, 'invalidCredentials');
  assert.equal(state.writes.length, 0);
});
test('missing and expired sessions cannot reach member content or change passwords', async () => {
  assert.equal(await getCareSession(), null);
  await assert.rejects(requireCareMember(), /REDIRECT:\/gascomp-care\/login/);
  assert.equal((await change({}, form({ currentPassword: password, password: 'A replacement member password', confirmPassword: 'A replacement member password' }))).error, 'unauthorized');
  state.cookie = createCareToken();
  state.rpcResults.push({ data: [], error: null });
  assert.equal(await getCareSession(), null);
  state.rpcResults.push({ data: [row], error: null });
  await assert.rejects(requireCareMember(), /REDIRECT:\/gascomp-care\/change-password/);
});
test('password change verifies current password and passes session ownership to atomic rotation', async () => {
  state.cookie = createCareToken();
  const oldToken = state.cookie;
  state.rpcResults.push({ data: [row], error: null }, { data: true, error: null }, { data: true, error: null });
  state.results.push({ data: row, error: null });
  const nextPassword = 'NewPass8';
  await assert.rejects(change({}, form({ currentPassword: password, password: nextPassword, confirmPassword: nextPassword })), /REDIRECT:\/gascomp-care$/);
  const changeCall = state.rpcCalls.find(call => call[0] === 'care_change_password')[1];
  assert.equal(changeCall.p_member_id, id);
  assert.equal(changeCall.p_version, 7);
  assert.equal(changeCall.p_token_hash, hashCareToken(oldToken));
  assert.equal(changeCall.p_new_token_hash, hashCareToken(state.cookie));
  assert.notEqual(state.cookie, oldToken);
  assert.match(changeCall.p_password_hash, /^scrypt\$/);
});
test('password change rejects incorrect passwords and sessions revoked during verification', async () => {
  for (const [currentPassword, expected] of [['incorrect current password', 'currentPasswordIncorrect'], [password, 'unauthorized']]) {
    state.cookie = createCareToken();
    state.rpcResults = [{ data: [row], error: null }, { data: true, error: null }, { data: false, error: null }];
    state.results.push({ data: row, error: null });
    const nextPassword = 'NewPass8';
    assert.equal((await change({}, form({ currentPassword, password: nextPassword, confirmPassword: nextPassword }))).error, expected);
  }
  assert.equal(state.writes.length, 0);
});
test('admin reset delegates credential and session revocation to one atomic database operation', async () => {
  state.admin = true;
  state.results.push({ data: { username: row.username }, error: null });
  const result = await reset(id);
  assert.equal(result.success, true);
  assert.equal(result.credentials.username, row.username);
  assert.equal(state.rpcCalls.length, 1);
  assert.equal(state.rpcCalls[0][0], 'care_reset_password');
  assert.equal(state.rpcCalls[0][1].p_member_id, id);
  assert.match(state.rpcCalls[0][1].p_password_hash, /^scrypt\$/);
});
test('database outages remain explicit and logout does not pretend server revocation succeeded', async () => {
  state.configured = false;
  assert.equal(await getCareAvailability(), false);
  assert.equal((await login({}, form({ username: row.username, password }))).error, 'unavailable');
  state.cookie = createCareToken();
  await assert.rejects(getCareSession(), /unavailable/);
  await assert.rejects(logout(), /unavailable/);
  assert.equal(state.writes.length, 0);
  state.configured = true;
  state.results.push({ error: { message: 'offline' } });
  await assert.rejects(logout(), /unavailable/);
  assert.equal(state.writes.length, 0);
});
test('logout deletes only the presented session hash then clears its cookie', async () => {
  state.cookie = createCareToken();
  const token = state.cookie;
  state.results.push({ error: null });
  await assert.rejects(logout(), /REDIRECT:\/gascomp-care\/login/);
  assert.deepEqual(state.queries[0].operations, [['delete'], ['eq', 'token_hash', hashCareToken(token)]]);
  assert.equal(state.writes[0][1], '');
  assert.equal(state.writes[0][2].maxAge, 0);
});

async function inEnvironment(environment, run) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = environment;
  try { await run(); } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
}
test('only development requests with matching loopback origins bypass attempt limits', async () => {
  for (const environment of ['development', 'production', 'test']) {
    await inEnvironment(environment, async () => {
      for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000', 'support.gascompsuperlock.com', 'localhost.evil.example']) {
        state.headers = new Headers({ host, origin: `http://${host}` });
        assert.equal(await shouldLimitCareAttempts(), environment !== 'development' || !['localhost:3000', '127.0.0.1:3000', '[::1]:3000'].includes(host));
      }
      for (const origin of ['', 'invalid', 'http://localhost:3100', 'http://localhost:3000/path']) {
        state.headers = new Headers({ host: 'localhost:3000', origin });
        assert.equal(await shouldLimitCareAttempts(), true);
      }
    });
  }
});
test('local development login and password replacement skip counters while still checking credentials', async () => {
  await inEnvironment('development', async () => {
    state.headers = new Headers({ host: 'localhost:3000', origin: 'http://localhost:3000' });
    for (let attempt = 0; attempt < 6; attempt++) {
      state.results.push({ data: row, error: null });
      assert.equal((await login({}, form({ username: row.username, password: 'wrong password' }))).error, 'invalidCredentials');
    }
    state.results.push({ data: row, error: null });
    await assert.rejects(login({}, form({ username: row.username, password })), /REDIRECT:/);
    state.rpcResults.push({ data: [row], error: null });
    state.results.push({ data: row, error: null });
    const replacement = 'A replacement member password';
    await assert.rejects(change({}, form({ currentPassword: password, password: replacement, confirmPassword: replacement })), /REDIRECT:/);
    assert.equal(state.rpcCalls.some(([name]) => name === 'care_consume_login_attempt'), false);
    assert.equal(state.writes.length, 2);
  });
});
test('production support website keeps database limits for login and password replacement', async () => {
  await inEnvironment('production', async () => {
    state.headers = new Headers({ host: 'support.gascompsuperlock.com', origin: 'https://support.gascompsuperlock.com' });
    state.rpcResults.push({ data: false, error: null });
    assert.equal((await login({}, form({ username: row.username, password }))).error, 'rateLimited');
    state.cookie = createCareToken();
    state.rpcResults.push({ data: [row], error: null }, { data: false, error: null });
    const replacement = 'A replacement member password';
    assert.equal((await change({}, form({ currentPassword: password, password: replacement, confirmPassword: replacement }))).error, 'rateLimited');
    assert.equal(state.writes.length, 0);
  });
});

test('password replacement rejects fewer than eight characters before database work', async () => {
  assert.equal((await change({}, form({ currentPassword: password, password: 'Short7!', confirmPassword: 'Short7!' }))).error, 'invalidInput');
  assert.equal(state.queries.length, 0);
  assert.equal(state.rpcCalls.length, 0);
  assert.equal(state.writes.length, 0);
});
