import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

test('Care coverage SQL preserves accounts and enforces ownership, dates and quota', { skip: !process.env.CARE_PGLITE_MODULE }, async t => {
  const { PGlite } = await import(pathToFileURL(process.env.CARE_PGLITE_MODULE).href);
  const db = new PGlite();
  const query = async (sql, parameters = []) => (await db.query(sql, parameters)).rows;
  const scalar = async (sql, parameters = []) => Object.values((await query(sql, parameters))[0])[0];
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../../supabase/migrations/202609150003_gascomp_care_accounts.sql', import.meta.url), 'utf8'));
    const [member] = await query("insert into care_members(name,username,whatsapp,password_hash) values ('Fictional Member','coverage.member','628000000001','fixture') returning *");
    const [other] = await query("insert into care_members(name,username,whatsapp,password_hash) values ('Fictional Other','coverage.other','628000000002','fixture') returning *");
    const before = await query('select * from care_members order by id');
    await db.exec(await readFile(new URL('../../supabase/migrations/202609150004_gascomp_care_coverage.sql', import.meta.url), 'utf8'));
    const today = await scalar("select to_char((now() at time zone 'Asia/Jakarta')::date,'YYYY-MM-DD')");
    const tomorrow = await scalar("select to_char((now() at time zone 'Asia/Jakarta')::date + 1,'YYYY-MM-DD')");
    const add = (ref, date = today, units = 1, owner = member.id) => scalar("select care_add_purchase($1,$2,'Fictional protected item',$3,$4)", [owner, ref, date, units]);
    const list = owner => scalar('select care_list_coverage($1)', [owner]);
    let coverage;
    await t.test('additive migration preserves preexisting member records and starts with genuine empty coverage', async () => {
      assert.deepEqual(await query('select * from care_members order by id'), before);
      assert.deepEqual(await list(member.id), []);
    });
    await t.test('purchases reject invalid dates and quantities and deduplicate globally without replacing ownership', async () => {
      assert.equal(await add('future', tomorrow), 'invalidInput');
      assert.equal(await add('zero', today, 0), 'invalidInput');
      assert.equal(await add('too-many', today, 11), 'invalidInput');
      assert.equal(await add(' ORDER-ONE '), 'ok');
      assert.equal(await add('order-one'), 'ok');
      assert.equal(await add('ORDER-ONE', today, 1, other.id), 'duplicatePurchase');
      assert.equal(await add('order-one', today, 2), 'duplicatePurchase');
      [coverage] = await list(member.id);
      assert.equal((await list(member.id)).length, 1);
      assert.equal(coverage.purchaseReference, 'order-one');
      assert.equal(coverage.claimLimit, 3);
      assert.equal(coverage.claimsUsed, 0);
      assert.equal(coverage.status, 'active');
      assert.deepEqual(await list(other.id), []);
    });
    await t.test('leap purchase clamps anniversary before subtracting one inclusive day and scales quota', async () => {
      assert.equal(await add('leap-one', '2024-02-29'), 'ok');
      assert.equal(await add('leap-two', '2024-02-29', 2), 'ok');
      assert.equal(await add('leap-four', '2024-02-29', 4), 'ok');
      const rows = await list(member.id);
      assert.equal(rows.find(row => row.purchaseReference === 'leap-one').expiresOn, '2025-02-27');
      assert.equal(rows.find(row => row.purchaseReference === 'leap-two').expiresOn, '2026-02-27');
      assert.equal(rows.find(row => row.purchaseReference === 'leap-four').expiresOn, '2028-02-28');
      assert.equal(rows.find(row => row.purchaseReference === 'leap-two').claimLimit, 6);
    });
    await t.test('claims reject wrong owner, expiry, future dates and dates outside coverage', async () => {
      const expired = (await list(member.id)).find(row => row.purchaseReference === 'leap-one');
      assert.equal(await scalar('select care_record_claim($1,$2,$3,$4)', [other.id, coverage.id, 'wrong-owner', today]), 'coverageNotFound');
      assert.equal(await scalar('select care_record_claim($1,$2,$3,$4)', [member.id, expired.id, 'expired-claim', '2024-03-01']), 'coverageExpired');
      assert.equal(await scalar('select care_record_claim($1,$2,$3,$4)', [member.id, coverage.id, 'future-claim', tomorrow]), 'invalidInput');
      assert.equal(await scalar('select care_record_claim($1,$2,$3,$4)', [member.id, coverage.id, 'before-purchase', '1900-01-01']), 'invalidInput');
      assert.equal((await list(member.id)).find(row => row.id === coverage.id).claimsUsed, 0);
    });
    await t.test('approved claim records are globally unique, retry safely, and exhaust the serialized quota', async () => {
      const claim = ref => scalar('select care_record_claim($1,$2,$3,$4)', [member.id, coverage.id, ref, today]);
      assert.equal(await claim(' CLAIM-ONE '), 'ok');
      assert.equal(await claim('claim-one'), 'ok');
      assert.equal(await add('other-purchase', today, 1, other.id), 'ok');
      const [otherCoverage] = await list(other.id);
      assert.equal(await scalar('select care_record_claim($1,$2,$3,$4)', [other.id, otherCoverage.id, 'claim-one', today]), 'duplicateClaim');
      assert.equal(await claim('claim-two'), 'ok');
      assert.equal(await claim('claim-three'), 'ok');
      assert.equal(await claim('claim-four'), 'coverageExhausted');
      assert.equal(await claim('claim-one'), 'ok');
      const result = (await list(member.id)).find(row => row.id === coverage.id);
      assert.equal(result.claimsUsed, 3);
      assert.equal(result.claimsRemaining, 0);
      assert.equal(result.claims.length, 3);
      assert.equal(result.status, 'exhausted');
    });
    await t.test('insert failure rolls back the ledger and leaves its previous balance intact', async () => {
      const [otherCoverage] = await list(other.id);
      await db.exec("create function reject_fixture_claim() returns trigger language plpgsql as $$ begin raise exception 'fixture insert failure'; end $$; create trigger reject_fixture_claim before insert on care_claims for each row execute function reject_fixture_claim();");
      await assert.rejects(scalar('select care_record_claim($1,$2,$3,$4)', [other.id, otherCoverage.id, 'rollback-claim', today]), /fixture insert failure/);
      assert.equal((await list(other.id))[0].claimsUsed, 0);
      await db.exec('drop trigger reject_fixture_claim on care_claims; drop function reject_fixture_claim();');
    });
    await t.test('anonymous roles cannot read coverage or call RPCs; service role cannot bypass mutation functions', async () => {
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(query('select * from care_purchases'), /permission denied/);
        await assert.rejects(list(member.id), /permission denied/);
        await assert.rejects(add('unauthorized'), /permission denied/);
        await db.exec('reset role');
      }
      await db.exec('set role service_role');
      assert.ok((await list(member.id)).length);
      await assert.rejects(query("insert into care_claims(coverage_id,reference,used_on) values ($1,'bypass',$2)", [coverage.id, today]), /permission denied/);
      assert.equal(await add('service-purchase'), 'ok');
      await db.exec('reset role');
    });
  } finally { await db.close(); }
});
