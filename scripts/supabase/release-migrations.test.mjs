import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createManagementClient, createPlan, runMigrations } from './release-migrations.mjs';

const projectRef = 'abcdefghijklmnopqrst';
const oldFile = '202609160001_existing.sql';
const newFile = '202609160002_new_option.sql';
const sha = value => createHash('sha256').update(value).digest('hex');
const baseline = { projectRef, firstAutomatedVersion: '202609160002', legacyFiles: { [oldFile]: sha('old SQL') }, legacyRemoteHistory: [{ version: '202609160001', name: 'existing' }] };
const files = () => new Map([[oldFile, 'old SQL'], [newFile, 'new SQL']]);
const history = () => [...baseline.legacyRemoteHistory];
const applied = () => ({ version: '20260916120000', name: createPlan(files(), baseline, history())[0].name });

test('release plans freeze legacy files without replaying manually applied migrations', () => {
  assert.deepEqual(createPlan(files(), baseline, history()).map(item => item.file), [newFile]);
  assert.deepEqual(createPlan(files(), baseline, [...history(), applied()]), []);
  for (const input of [files().set(oldFile, 'changed'), new Map([[newFile, 'new SQL']]), files().set('202609150001_old.sql', 'SQL')]) {
    assert.throws(() => createPlan(input, baseline, history()), /Legacy|legacy/);
  }
});

test('release rejects changed applied SQL, unknown remote entries, and missing baseline history', () => {
  assert.throws(() => createPlan(files().set(newFile, 'modified'), baseline, [...history(), applied()]), /Unrecognized/);
  assert.throws(() => createPlan(files(), baseline, [...history(), { version: 'other', name: 'manual' }]), /Unrecognized/);
  assert.throws(() => createPlan(files(), baseline, []), /missing/);
  assert.throws(() => createPlan(files(), baseline, [...history(), ...history()]), /Duplicate/);
  assert.throws(() => createPlan(files(), baseline, { migrations: history() }), /Invalid migration history/);
});

test('release rejects removed applied files, duplicate versions, and backdated migrations', () => {
  assert.throws(() => createPlan(new Map([[oldFile, 'old SQL']]), baseline, [...history(), applied()]), /Unrecognized/);
  assert.throws(() => createPlan(files().set('202609160002_duplicate.sql', 'SQL'), baseline, history()), /duplicate/);
  const later = files().set('202609170001_later.sql', 'later SQL');
  const last = createPlan(later, baseline, history())[1];
  assert.throws(() => createPlan(later, baseline, [...history(), { version: 'later', name: last.name }]), /before an already applied/);
});

test('preview uses only GET and wrong project is rejected before any request', async () => {
  const calls = [];
  const request = async method => { calls.push(method); return history(); };
  const options = { files: files(), baseline, projectRef, request, log() {} };
  assert.deepEqual(await runMigrations(options), [newFile]);
  assert.deepEqual(calls, ['GET']);
  await assert.rejects(runMigrations({ ...options, projectRef: 'wrong' }), /does not match/);
  assert.deepEqual(calls, ['GET']);
});

test('release verifies recorded migration before continuing and rerun does not apply twice', async () => {
  const remote = history();
  let posts = 0;
  const request = async (method, body) => {
    if (method === 'GET') return [...remote];
    posts++;
    assert.equal(body.query, 'new SQL');
    remote.push({ version: 'generated', name: body.name });
    return {};
  };
  const options = { files: files(), baseline, projectRef, request, apply: true, log() {} };
  await runMigrations(options);
  await runMigrations(options);
  assert.equal(posts, 1);
});

test('failed or unconfirmed migration prevents the next migration from running', async () => {
  for (const fails of [true, false]) {
    let posts = 0;
    const request = async method => {
      if (method === 'GET') return history();
      posts++;
      if (fails) throw new Error('Request failed');
      return {};
    };
    await assert.rejects(runMigrations({ files: files().set('202609170001_next.sql', 'next SQL'), baseline, projectRef, request, apply: true, log() {} }), /failed|not confirmed/);
    assert.equal(posts, 1);
  }
});

test('ambiguous apply response is not retried and recorded success is recovered on a fresh run', async () => {
  const remote = history();
  let posts = 0;
  const request = async (method, body) => {
    if (method === 'GET') return [...remote];
    posts++;
    remote.push({ version: 'generated', name: body.name });
    throw new Error('Connection lost');
  };
  const options = { files: files(), baseline, projectRef, request, apply: true, log() {} };
  await assert.rejects(runMigrations(options), /Connection lost/);
  assert.deepEqual(await runMigrations(options), []);
  assert.equal(posts, 1);
});

test('Management API pins HTTPS destination and never logs provider error bodies or tokens', async () => {
  let calls = 0;
  const request = createManagementClient({ token: 'private-token', projectRef, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, `https://api.supabase.com/v1/projects/${projectRef}/database/migrations`);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer private-token');
    assert.ok(options.signal instanceof AbortSignal);
    return new Response('private-token private SQL details', { status: 403 });
  } });
  await assert.rejects(request('POST', { name: 'test', query: 'private SQL' }), error => {
    assert.match(error.message, /HTTP 403/);
    assert.doesNotMatch(error.message, /private-token|private SQL/);
    return true;
  });
  assert.equal(calls, 1);
});
