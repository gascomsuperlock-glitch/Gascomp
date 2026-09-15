import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

test('Care soft deletion is atomic, revokes access, and preserves all history', { skip: !process.env.CARE_PGLITE_MODULE }, async t => {
  const { PGlite } = await import(pathToFileURL(process.env.CARE_PGLITE_MODULE).href);
  const db = new PGlite();
  const query = async (sql, parameters = []) => (await db.query(sql, parameters)).rows;
  const scalar = async (sql, parameters = []) => Object.values((await query(sql, parameters))[0])[0];
  const apply = async name => db.exec(await readFile(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'));
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await apply('202609150003_gascomp_care_accounts');
    await apply('202609150004_gascomp_care_coverage');
    const members = await query("insert into care_members(name,username,whatsapp,password_hash) values ('Fictional One','delete.one','628000000001','fixture'), ('Fictional Two','delete.two','628000000002','fixture'), ('Fictional Three','delete.three','628000000003','fixture') returning *");
    const [one, two, three] = members;
    const today = await scalar("select to_char((now() at time zone 'Asia/Jakarta')::date,'YYYY-MM-DD')");
    await scalar('select care_add_purchase($1,$2,$3,$4,1)', [one.id, 'keep-purchase', 'Fictional item', today]);
    const purchase = (await query('select * from care_purchases'))[0];
    await scalar('select care_record_claim($1,$2,$3,$4)', [one.id, purchase.id, 'keep-claim', today]);
    await scalar('select care_open_session($1,1,$2)', [one.id, 'delete-session']);
    await scalar('select care_open_session($1,1,$2)', [two.id, 'keep-session']);
    const tables = ['care_members', 'care_sessions', 'care_purchases', 'care_claims'];
    const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table, await query(`select * from ${table} order by ${table === 'care_sessions' ? 'token_hash' : 'id'}`)])));
    const beforeMigration = await snapshot();
    await apply('202609150005_gascomp_care_member_deletion');
    const remove = ids => scalar('select care_delete_members($1::uuid[])', [ids]);
    const unknown = '00000000-0000-0000-0000-000000000001';

    await t.test('migration only adds null deletion markers and preserves accounts, sessions, purchases and claims', async () => {
      const after = await snapshot();
      after.care_members = after.care_members.map(({ deleted_at, ...rest }) => { assert.equal(deleted_at, null); return rest; });
      assert.deepEqual(after, beforeMigration);
    });
    await t.test('invalid batch and mixed known/unknown IDs produce no partial deletions', async () => {
      const before = await snapshot();
      for (const ids of [[], [one.id, unknown], [null], Array(101).fill(one.id)]) assert.deepEqual(await remove(ids), { deletedIds: [], error: 'invalidInput' });
      assert.deepEqual(await snapshot(), before);
    });
    await t.test('soft delete increments credential version, revokes sessions and preserves history', async () => {
      assert.deepEqual(await remove([one.id, one.id]), { deletedIds: [one.id] });
      const [deleted] = await query('select * from care_members where id=$1', [one.id]);
      assert.ok(deleted.deleted_at);
      assert.equal(deleted.credential_version, 2);
      assert.equal(deleted.username, one.username);
      assert.equal((await query('select * from care_sessions where member_id=$1', [one.id])).length, 0);
      assert.deepEqual(await query('select * from care_purchases'), beforeMigration.care_purchases);
      assert.deepEqual(await query('select * from care_claims'), beforeMigration.care_claims);
      assert.equal((await query("select * from care_read_session('keep-session')"))[0].id, two.id);
    });
    await t.test('deleted accounts cannot reopen or rotate sessions, reset passwords, purchase, or confirm claims', async () => {
      assert.equal(await scalar('select care_open_session($1,1,$2)', [one.id, 'stale-verified-login']), false);
      assert.equal(await scalar('select care_open_session($1,2,$2)', [one.id, 'current-version-login']), false);
      assert.deepEqual(await query("select * from care_read_session('delete-session')"), []);
      assert.equal(await scalar('select care_reset_password($1,$2)', [one.id, 'must-not-change']), false);
      assert.equal(await scalar('select care_change_password($1,2,$2,$3,$4)', [one.id, 'delete-session', 'must-not-change', 'replacement']), false);
      assert.equal(await scalar('select care_add_purchase($1,$2,$3,$4,1)', [one.id, 'blocked-purchase', 'Fictional item', today]), 'invalidInput');
      assert.equal(await scalar('select care_record_claim($1,$2,$3,$4)', [one.id, purchase.id, 'blocked-claim', today]), 'coverageNotFound');
      assert.deepEqual(await scalar('select care_list_coverage($1)', [one.id]), []);
      await assert.rejects(query("insert into care_members(name,username,whatsapp,password_hash) values ('Reserved', 'delete.one','628000000004','fixture')"), /duplicate key/);
    });
    await t.test('already-deleted retry is idempotent and overlapping batches delete only remaining active members', async () => {
      const [before] = await query('select * from care_members where id=$1', [one.id]);
      assert.deepEqual(await remove([one.id]), { deletedIds: [one.id] });
      assert.deepEqual((await query('select * from care_members where id=$1', [one.id]))[0], before);
      assert.deepEqual(await remove([three.id, one.id]), { deletedIds: [one.id, three.id].sort() });
      assert.equal((await query('select * from care_members where deleted_at is null')).length, 1);
    });
    await t.test('a failure while revoking sessions rolls back the deletion marker and credential change', async () => {
      const before = await snapshot();
      await db.exec("create function reject_session_delete() returns trigger language plpgsql as $$ begin raise exception 'fixture revocation failure'; end $$; create trigger reject_session_delete before delete on care_sessions for each row execute function reject_session_delete();");
      await assert.rejects(remove([two.id]), /fixture revocation failure/);
      assert.deepEqual(await snapshot(), before);
      await db.exec('drop trigger reject_session_delete on care_sessions; drop function reject_session_delete();');
    });
    await t.test('anonymous callers cannot delete accounts and service role can perform the guarded operation', async () => {
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(remove([two.id]), /permission denied/);
        await db.exec('reset role');
      }
      await db.exec('set role service_role');
      assert.deepEqual(await remove([two.id]), { deletedIds: [two.id] });
      await db.exec('reset role');
    });
  } finally { await db.close(); }
});
