import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from '../shared/paths.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');

// Legacy SQL is frozen, not declared applied: some changes were made manually,
// and optional tutorial metadata is still deferred. Never replay this baseline.
export function createPlan(files, baseline, history) {
  if (!Array.isArray(history) || history.some(row => typeof row.version !== 'string' || typeof row.name !== 'string')) {
    throw new Error('Invalid migration history response.');
  }
  for (const [name, checksum] of Object.entries(baseline.legacyFiles)) {
    if (!files.has(name) || digest(files.get(name)) !== checksum) {
      throw new Error(`Legacy migration changed or missing: ${name}`);
    }
  }
  const migrations = [];
  const versions = new Set();
  for (const [file, query] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const match = /^(\d{12,14})_([a-z0-9_]+)\.sql$/.exec(file);
    if (!match || versions.has(match[1])) throw new Error(`Invalid or duplicate migration version: ${file}`);
    versions.add(match[1]);
    if (Object.hasOwn(baseline.legacyFiles, file)) continue;
    if (match[1] < baseline.firstAutomatedVersion) throw new Error(`Unreviewed legacy migration: ${file}`);
    if (!query.trim()) throw new Error(`Empty migration: ${file}`);
    migrations.push({ file, query, name: `release_${match[1]}_${digest(query)}` });
  }
  const legacy = baseline.legacyRemoteHistory;
  for (const expected of legacy) {
    if (!history.some(row => row.version === expected.version && row.name === expected.name)) {
      throw new Error(`Baseline migration is missing from the database: ${expected.name}`);
    }
  }
  const names = new Set();
  for (const row of history) {
    if (names.has(row.name)) throw new Error('Duplicate remote migration name.');
    names.add(row.name);
    if (!legacy.some(item => item.version === row.version && item.name === row.name) && !migrations.some(item => item.name === row.name)) {
      throw new Error('Unrecognized remote migration or modified applied SQL. Review migration history before release.');
    }
  }
  let pending = false;
  for (const migration of migrations) {
    if (!names.has(migration.name)) pending = true;
    else if (pending) throw new Error('A migration was inserted before an already applied release.');
  }
  return migrations.filter(item => !names.has(item.name));
}

export function createManagementClient({ token, projectRef, fetchImpl = fetch }) {
  if (!token?.trim() || !/^[a-z]{20}$/.test(projectRef ?? '')) {
    throw new Error('Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_ID.');
  }
  return async (method, body) => {
    let response;
    try {
      response = await fetchImpl(`https://api.supabase.com/v1/projects/${projectRef}/database/migrations`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'error',
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      // Provider errors can echo SQL or credentials. Never print their bodies.
      throw new Error(`Supabase ${method} failed${response ? ` (HTTP ${response.status})` : ' or timed out'}. Check token permissions and migration history before retrying.`);
    }
  };
}

export async function runMigrations({ files, baseline, projectRef, request, apply = false, log = console.log }) {
  if (projectRef !== baseline.projectRef) throw new Error('Supabase project does not match the reviewed release baseline.');
  let history = await request('GET');
  const plan = createPlan(files, baseline, history);
  log(`${plan.length} pending migration(s). Mode: ${apply ? 'apply' : 'preview'}.`);
  for (const migration of plan) {
    log(`${apply ? 'Applying' : 'Pending'}: ${migration.file}`);
    if (!apply) continue;
    // Do not retry POST automatically: after an ambiguous response, a fresh run
    // checks the recorded name/checksum before considering another application.
    await request('POST', { name: migration.name, query: migration.query });
    history = await request('GET');
    createPlan(files, baseline, history);
    if (!history.some(row => row.name === migration.name)) throw new Error('Migration was not confirmed in remote history. Release stopped.');
  }
  if (apply && createPlan(files, baseline, history).length) throw new Error('Pending migrations remain.');
  return plan.map(item => item.file);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--apply', '--preview'].includes(arg)) || args.length > 1) throw new Error('Usage: node scripts/supabase/release-migrations.mjs [--preview|--apply]');
  const baseline = JSON.parse(await readFile(resolve(root, 'supabase/release-baseline.json'), 'utf8'));
  const directory = resolve(root, 'supabase/migrations');
  const files = new Map(await Promise.all((await readdir(directory)).filter(name => name.endsWith('.sql')).map(async name => [name, await readFile(resolve(directory, name), 'utf8')])));
  const projectRef = process.env.SUPABASE_PROJECT_ID;
  await runMigrations({ files, baseline, projectRef, request: createManagementClient({ token: process.env.SUPABASE_ACCESS_TOKEN, projectRef }), apply: args.includes('--apply') });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
