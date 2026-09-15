import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

// Optional disposable PostgreSQL engine; never uses application/production credentials.
// CARE_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test scripts/supabase/gascomp-care-schema.test.mjs
test('GascompCare SQL account isolation and credential transactions', { skip: !process.env.CARE_PGLITE_MODULE }, async (t) => {
  const { PGlite } = await import(pathToFileURL(process.env.CARE_PGLITE_MODULE).href);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    const migration = await readFile(new URL('../../supabase/migrations/202609150003_gascomp_care_accounts.sql', import.meta.url), 'utf8');
    const call = async (sql, args = []) => (await db.query(sql, args)).rows;
    const scalar = async (sql, args = []) => Object.values((await call(sql, args))[0])[0];
    // Fictional existing-site sentinels model data and Storage metadata, not blob backups.
    await db.exec(`
      create table public.products(id text primary key, name text not null, sku text not null, published boolean not null);
      create table public.warranty_tickets(id text primary key, order_number text not null, status text not null);
      create table public.warranty_evidence(id text primary key, ticket_id text references public.warranty_tickets(id), storage_path text not null);
      create schema storage;
      create table storage.buckets(id text primary key, public boolean not null, file_size_limit bigint not null);
      create table storage.objects(id text primary key, bucket_id text references storage.buckets(id), name text not null, metadata jsonb not null);
      insert into public.products values ('existing-product', 'Fictional Existing Product', 'DEMO-PRESERVE-001', true), ('existing-draft', 'Fictional Draft Product', 'DEMO-PRESERVE-002', false);
      insert into public.warranty_tickets values ('existing-ticket', 'DEMO-ORDER-PRESERVE', 'open');
      insert into public.warranty_evidence values ('existing-evidence', 'existing-ticket', 'fictional-ticket/invoice.png');
      insert into storage.buckets values ('product-images', true, 5242880), ('warranty-evidence', false, 52428800);
      insert into storage.objects values
        ('existing-image', 'product-images', 'fictional-product/photo.png', '{"size":42,"mimetype":"image/png","etag":"fictional-image-checksum"}'),
        ('existing-invoice', 'warranty-evidence', 'fictional-ticket/invoice.png', '{"size":84,"mimetype":"image/png","etag":"fictional-invoice-checksum"}');
    `);
    const existingTables = ['public.products', 'public.warranty_tickets', 'public.warranty_evidence', 'storage.buckets', 'storage.objects'];
    const snapshot = async tables => Object.fromEntries(await Promise.all(tables.map(async table => [table, await call(`select * from ${table} order by id`)])));
    const beforeMigration = await snapshot(existingTables);
    await db.exec(migration);
    await t.test('adding Care preserves all existing catalog, warranty, evidence and Storage metadata rows', async () => {
      assert.deepEqual(await snapshot(existingTables), beforeMigration);
    });
    const [member] = await call("insert into care_members(name,username,whatsapp,password_hash) values ('Sample One','sample.one','628000000001','test-hash') returning *");
    const [other] = await call("insert into care_members(name,username,whatsapp,password_hash) values ('Sample Two','sample.two','628000000002','other-hash') returning *");

    await t.test('reapplying a migration with existing Care tables fails without replacing any account or existing-site data', async () => {
      const tables = [...existingTables, 'public.care_members'];
      const beforeRetry = await snapshot(tables);
      await assert.rejects(db.exec(migration), /already exists/);
      // SQL Editor/driver callers must roll back the aborted transaction before continuing.
      await db.exec('rollback');
      assert.deepEqual(await snapshot(tables), beforeRetry);
      assert.equal(await scalar('select care_schema_ready()'), true);
    });
    await t.test('duplicate and noncanonical usernames are rejected', async () => {
      await assert.rejects(call("insert into care_members(name,username,whatsapp,password_hash) values ('Duplicate','sample.one','628000000001','hash')"), /duplicate key/);
      await assert.rejects(call("insert into care_members(name,username,whatsapp,password_hash) values ('Uppercase','SAMPLE.ONE','628000000001','hash')"), /check constraint/);
    });
    await t.test('public roles cannot read accounts or invoke authentication functions', async () => {
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(call('select * from care_members'), /permission denied/);
        await assert.rejects(call('select care_schema_ready()'), /permission denied/);
        await assert.rejects(call("select * from care_read_session('a')"), /permission denied/);
        await db.exec('reset role');
      }
      await db.exec('set role service_role');
      assert.equal(await scalar('select care_schema_ready()'), true);
      await db.exec('reset role');
    });
    await t.test('sessions read only their owner and respect database expiry', async () => {
      assert.equal(await scalar('select care_open_session($1,1,$2)', [member.id, 'token-a']), true);
      assert.equal(await scalar('select care_open_session($1,1,$2)', [other.id, 'token-b']), true);
      assert.equal((await call('select * from care_read_session($1)', ['token-a']))[0].id, member.id);
      assert.equal((await call('select * from care_read_session($1)', ['token-b']))[0].id, other.id);
      assert.deepEqual(await call("select * from care_read_session('unknown')"), []);
      await call("update care_sessions set expires_at = now() - interval '1 second' where token_hash = 'token-b'");
      assert.deepEqual(await call("select * from care_read_session('token-b')"), []);
    });
    await t.test('reset revokes all sessions and rejects a delayed login with stale credentials', async () => {
      assert.equal(await scalar('select care_reset_password($1,$2)', [member.id, 'replacement-hash']), true);
      assert.deepEqual(await call("select * from care_read_session('token-a')"), []);
      assert.equal(await scalar('select care_open_session($1,1,$2)', [member.id, 'stale-login']), false);
      assert.equal(await scalar('select care_open_session($1,2,$2)', [member.id, 'reset-session']), true);
    });
    await t.test('password change requires owner session, revokes all old sessions and creates one fresh session', async () => {
      assert.equal(await scalar('select care_change_password($1,2,$2,$3,$4)', [member.id, 'token-b', 'new-hash', 'forged-session']), false);
      assert.equal(await scalar('select care_open_session($1,2,$2)', [member.id, 'second-session']), true);
      assert.equal(await scalar('select care_change_password($1,2,$2,$3,$4)', [member.id, 'reset-session', 'new-hash', 'fresh-session']), true);
      for (const token of ['reset-session', 'second-session']) assert.deepEqual(await call('select * from care_read_session($1)', [token]), []);
      const [current] = await call("select * from care_read_session('fresh-session')");
      assert.equal(current.must_change_password, false);
      assert.equal(current.id, member.id);
      assert.equal('password_hash' in current, false);
      assert.equal(await scalar('select care_change_password($1,2,$2,$3,$4)', [member.id, 'reset-session', 'late-hash', 'late-session']), false);
      assert.equal(await scalar('select care_open_session($1,2,$2)', [member.id, 'late-login']), false);
    });
    await t.test('shared rate limits count usernames and IPs and expire after 15 minutes', async () => {
      for (let i = 0; i < 5; i++) assert.equal(await scalar('select care_consume_login_attempt($1,$2)', ['user-key', `ip-${i}`]), true);
      assert.equal(await scalar("select care_consume_login_attempt('user-key','new-ip')"), false);
      for (let i = 0; i < 30; i++) assert.equal(await scalar('select care_consume_login_attempt($1,$2)', [`user-${i}`, 'shared-ip']), true);
      assert.equal(await scalar("select care_consume_login_attempt('new-user','shared-ip')"), false);
      await db.exec("update care_login_attempts set attempted_at = now() - interval '16 minutes'");
      assert.equal(await scalar("select care_consume_login_attempt('user-key','shared-ip')"), true);
    });
    await t.test('failed password transaction does not revoke sessions or alter the password', async () => {
      const [before] = await call('select password_hash,credential_version from care_members where id=$1', [member.id]);
      await assert.rejects(call('select care_change_password($1,3,$2,$3,$4)', [member.id, 'fresh-session', 'broken-hash', null]), /not-null/);
      assert.deepEqual((await call('select password_hash,credential_version from care_members where id=$1', [member.id]))[0], before);
      assert.equal((await call("select * from care_read_session('fresh-session')"))[0].id, member.id);
    });
  } finally {
    await db.close();
  }
});
