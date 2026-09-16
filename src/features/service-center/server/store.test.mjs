import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { after, beforeEach, test } from 'node:test';

const directory = await mkdtemp(path.join(os.tmpdir(), 'service-center-test-'));
const state = { admin: false, configured: true, results: [], queries: [], revalidated: [], headers: new Headers() };
const db = { from(table) {
  const operations = [];
  state.queries.push({ table, operations });
  const builder = new Proxy({}, { get(_target, key) {
    if (key === 'then') return (resolve, reject) => Promise.resolve(state.results.shift() ?? { data: [], error: null }).then(resolve, reject);
    return (...args) => { operations.push([key, ...args]); return builder; };
  } });
  return builder;
} };
globalThis.serviceCenterTest = { state, db };
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return mock('export {};');
  if (specifier === 'next/headers') return mock('export const headers = async () => globalThis.serviceCenterTest.state.headers;');
  if (specifier === 'next/cache') return mock('export const revalidatePath = path => globalThis.serviceCenterTest.state.revalidated.push(path);');
  if (specifier === '@/features/auth/server/session') return mock('export const getAdminSession = async () => globalThis.serviceCenterTest.state.admin;');
  if (specifier === '@/shared/integrations/supabase/server') return mock('export const createAdminSupabaseClient = () => globalThis.serviceCenterTest.state.configured ? globalThis.serviceCenterTest.db : null;');
  if (specifier.startsWith('.') && context.parentURL?.includes('/service-center/') && !specifier.endsWith('.ts') && !specifier.endsWith('.mjs')) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const previousCwd = process.cwd();
process.chdir(directory);
const { loadPublicServiceCenters, loadServiceCenters, saveServiceCenter, deleteServiceCenter } = await import('./store.ts');
const { listServiceCentersAction, saveServiceCenterAction, deleteServiceCenterAction } = await import('./actions.ts');
process.chdir(previousCwd);
hooks.deregister();
after(async () => { await rm(directory, { recursive: true, force: true }); delete globalThis.serviceCenterTest; });
const input = { name: 'Sample Center', provinceCode: '31', city: 'Jakarta', address: 'Sample address', phone: '', whatsapp: '', hours: '', mapsUrl: '', latitude: -6.2, longitude: 106.8, active: true };
const id = '12345678-abcd-1234-abcd-123456789abc';
const row = { id, name: input.name, province_code: input.provinceCode, city: input.city, address: input.address, phone: '', whatsapp: '', hours: '', maps_url: '', latitude: input.latitude, longitude: input.longitude, active: true };
beforeEach(() => {
  Object.assign(state, { admin: false, configured: true, results: [], queries: [], revalidated: [], headers: new Headers({ origin: 'https://gascomp.example', host: 'gascomp.example' }) });
  for (const key of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) delete process.env[key];
});

test('direct admin actions require authentication and same-origin mutations', async () => {
  assert.ok((await listServiceCentersAction()).error);
  assert.ok((await saveServiceCenterAction(input)).error);
  state.admin = true;
  for (const origin of ['', 'https://foreign.example', 'null', 'ftp://gascomp.example', 'https://gascomp.example/path']) {
    if (origin) state.headers.set('origin', origin); else state.headers.delete('origin');
    assert.ok((await saveServiceCenterAction(input)).error);
  }
  assert.equal(state.queries.length, 0);
});

test('public reads filter inactive centers and paginate past database row limits', async () => {
  state.results.push({ data: Array.from({ length: 500 }, (_, index) => ({ ...row, name: `Center ${index}` })), error: null }, { data: [{ ...row, active: false }, row], error: null });
  const result = await loadPublicServiceCenters();
  assert.equal(result.centers.length, 501);
  assert.equal(result.centers.every(center => center.active), true);
  assert.deepEqual(state.queries.map(q => q.operations.find(op => op[0] === 'range')), [['range', 0, 499], ['range', 500, 999]]);
  for (const query of state.queries) assert.ok(query.operations.some(op => op[0] === 'eq' && op[1] === 'active' && op[2] === true));
});

test('configured failures never return fallback data and missing migration is actionable only for admins', async () => {
  state.results.push({ data: null, error: { code: '42P01', message: 'private database details' } });
  assert.equal((await loadPublicServiceCenters()).error, 'Service centers are unavailable. Please try again later.');
  state.results.push({ data: null, error: { code: 'PGRST205' } });
  assert.match((await loadServiceCenters()).error, /migration/);
  state.configured = false;
  process.env.SUPABASE_URL = 'https://incomplete.example';
  assert.ok((await loadPublicServiceCenters()).error);
  assert.ok((await saveServiceCenter(input)).error);
});

test('save validates before persistence, updates only the supplied identity, and refreshes public route', async () => {
  state.admin = true;
  assert.ok((await saveServiceCenterAction({ ...input, latitude: 70 })).error);
  assert.equal(state.queries.length, 0);
  state.results.push({ data: { ...row, active: false }, error: null });
  assert.equal((await saveServiceCenterAction({ ...input, id, active: false })).center.active, false);
  assert.ok(state.queries[0].operations.some(op => op[0] === 'eq' && op[1] === 'id' && op[2] === id));
  assert.deepEqual(state.revalidated, ['/service-center']);
  state.results.push({ data: null, error: null });
  assert.match((await saveServiceCenterAction({ ...input, id })).error, /no longer exists/);
});

test('empty local directory persists concurrent additions, edits and deactivation without losing records', async () => {
  state.configured = false;
  assert.deepEqual(await loadPublicServiceCenters(), { centers: [] });
  const saved = await Promise.all([saveServiceCenter(input), saveServiceCenter({ ...input, name: 'Second Center' })]);
  assert.ok(saved.every(result => result.center?.id));
  assert.equal((await loadPublicServiceCenters()).centers.length, 2);
  assert.ok((await saveServiceCenter({ ...saved[0].center, active: false })).center);
  assert.equal((await loadPublicServiceCenters()).centers.length, 1);
  assert.equal((await loadServiceCenters()).centers.length, 2);
  await writeFile(path.join(directory, '.data', 'service-centers.json'), 'invalid-json');
  assert.ok((await loadPublicServiceCenters()).error);
  assert.ok((await saveServiceCenter(input)).error);
});


test('deletion requires an administrator, matching origin and a valid single UUID before any database access', async () => {
  assert.match((await deleteServiceCenterAction(id)).error, /session has expired/);
  state.admin = true;
  for (const origin of ['', 'https://foreign.example', 'null', 'ftp://gascomp.example', 'https://gascomp.example/path']) {
    state.headers.set('origin', origin);
    assert.ok((await deleteServiceCenterAction(id)).error);
  }
  state.headers.set('origin', 'https://gascomp.example');
  for (const invalid of ['', null, undefined, {}, [id], '../private', `${id},${id}`]) {
    assert.match((await deleteServiceCenterAction(invalid)).error, /identifier/);
  }
  assert.deepEqual(state.queries, []);
  assert.deepEqual(state.revalidated, []);
});

test('database deletion targets only the requested location, refreshes the public route and tolerates retries', async () => {
  state.admin = true;
  for (let attempt = 0; attempt < 2; attempt++) {
    state.results.push({ data: null, error: null });
    assert.deepEqual(await deleteServiceCenterAction(id), { deletedId: id });
  }
  for (const query of state.queries) {
    assert.equal(query.table, 'service_centers');
    assert.deepEqual(query.operations, [['delete'], ['eq', 'id', id]]);
  }
  assert.deepEqual(state.revalidated, ['/service-center', '/service-center']);
});

test('failed deletion exposes no database details, does not report success, and does not revalidate', async () => {
  state.admin = true;
  state.results.push({ data: null, error: { code: '08006', message: 'private database information' } });
  assert.deepEqual(await deleteServiceCenterAction(id), { error: 'The service center could not be deleted. Please try again later.' });
  state.results.push({ data: null, error: { code: 'PGRST205' } });
  assert.match((await deleteServiceCenterAction(id)).error, /migration/);
  assert.deepEqual(state.revalidated, []);
  state.configured = false;
  process.env.SUPABASE_URL = 'https://incomplete.example';
  assert.ok((await deleteServiceCenter(id)).error);
});

test('local deletion and concurrent edits preserve other locations and never recreate a deleted identity', async () => {
  state.configured = false;
  await rm(path.join(directory, '.data', 'service-centers.json'), { force: true });
  const first = (await saveServiceCenter(input)).center;
  const second = (await saveServiceCenter({ ...input, name: 'Retained location' })).center;
  const results = await Promise.all([
    deleteServiceCenter(first.id.toUpperCase()),
    saveServiceCenter({ ...second, city: 'Updated city' }),
    saveServiceCenter({ ...input, name: 'New inactive location', active: false }),
  ]);
  assert.ok(results.every(result => !result.error));
  assert.deepEqual((await loadServiceCenters()).centers.map(center => center.name).sort(), ['New inactive location', 'Retained location']);
  assert.equal((await loadPublicServiceCenters()).centers[0].city, 'Updated city');
  assert.equal((await loadPublicServiceCenters()).centers.length, 1);
  assert.match((await saveServiceCenter({ ...first, name: 'Stale editor' })).error, /no longer exists/);
  assert.deepEqual(await deleteServiceCenter(first.id), { deletedId: first.id });
  await writeFile(path.join(directory, '.data', 'service-centers.json'), 'invalid-json');
  assert.ok((await deleteServiceCenter(second.id)).error);
});
