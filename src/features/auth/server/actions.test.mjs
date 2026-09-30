import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { beforeEach, test } from 'node:test';

const state = { cookie: undefined, writes: [] };
globalThis.adminActionTest = { state };
process.env.GASCOMP_ADMIN_USERNAME = 'local-admin';
process.env.GASCOMP_ADMIN_PASSWORD = 'local-test-password';
process.env.GASCOMP_AUTH_SECRET = 'local-test-secret-0123456789abcdef';
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return mock('export {};');
  if (specifier === '@/shared/lib/session-cookie') return mock('export const getSessionCookieSecurity = async () => true;');
  if (specifier === 'next/headers') return mock(`
    export const cookies = async () => ({ get: () => ({ value: globalThis.adminActionTest.state.cookie }), set: (...args) => { globalThis.adminActionTest.state.writes.push(args); globalThis.adminActionTest.state.cookie = args[1]; } });
  `);
  // A Server Action redirect() fetches the target from this server, which fails behind the production proxy.
  if (specifier === 'next/navigation') return mock('export const redirect = path => { throw new Error(`REDIRECT:${path}`); };');
  if (specifier.startsWith('@/')) return next(new URL(`../../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return next(specifier, context);
} });
const { loginAction, logoutAction } = await import('./actions.ts');
hooks.deregister();

const form = values => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

beforeEach(() => { state.cookie = undefined; state.writes = []; });

test('login returns the dashboard destination with its ticket instead of redirecting on the server', async () => {
  const result = await loginAction({}, form({ username: 'local-admin', password: 'local-test-password', ticket: 'GWC-20260930-ABC123' }));
  assert.deepEqual(result, { redirectTo: '/admin?ticket=GWC-20260930-ABC123' });
  assert.equal(state.writes.length, 1);
  assert.equal(state.writes[0][0], 'gascomp_admin_session');
  assert.equal(state.writes[0][2].secure, true);
});

test('login ignores an invalid ticket and rejects wrong credentials without a cookie', async () => {
  assert.deepEqual(await loginAction({}, form({ username: 'local-admin', password: 'local-test-password', ticket: 'javascript:alert(1)' })), { redirectTo: '/admin' });
  state.writes = [];
  assert.deepEqual(await loginAction({}, form({ username: 'local-admin', password: 'wrong password value' })), { error: 'The username or password is incorrect.' });
  assert.equal(state.writes.length, 0);
});

test('logout clears an active session and leaves navigation to the client', async () => {
  await loginAction({}, form({ username: 'local-admin', password: 'local-test-password' }));
  state.writes = [];
  assert.equal(await logoutAction(), undefined);
  assert.equal(state.writes.length, 1);
  assert.equal(state.writes[0][1], '');
  assert.equal(state.writes[0][2].maxAge, 0);
  state.writes = [];
  assert.equal(await logoutAction(), undefined);
  assert.equal(state.writes.length, 0);
});
