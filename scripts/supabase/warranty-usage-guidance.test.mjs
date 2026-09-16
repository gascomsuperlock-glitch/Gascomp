import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

const modulePath = process.env.WARRANTY_PGLITE_MODULE || process.env.CARE_PGLITE_MODULE;

test('usage guidance migration preserves historical tickets and expands only the solution constraint', { skip: !modulePath }, async () => {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  const apply = async name => db.exec(await readFile(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'));
  try {
    await db.exec(`
      create role anon;
      create table public.warranty_tickets (
        ticket_id text primary key,
        status text not null,
        updated_at timestamptz not null default now()
      );
      alter table public.warranty_tickets enable row level security;
      grant select on public.warranty_tickets to anon;
    `);
    await apply('202609150002_warranty_ticket_solution');
    const previousValues = ['warranty_claim', 'missing_item', 'wrong_item', 'return_refund', 'spare_part', 'partial_refund', null];
    for (const [index, solution] of previousValues.entries()) {
      await db.query('insert into warranty_tickets(ticket_id, status, solution) values ($1, $2, $3)', [`historical-${index}`, index % 2 ? 'closed' : 'new', solution]);
    }
    const snapshot = async () => (await db.query('select * from warranty_tickets order by ticket_id')).rows;
    const before = await snapshot();
    const insert = solution => db.query("insert into warranty_tickets(ticket_id, status, solution) values ('new-guidance', 'closed', $1)", [solution]);
    await assert.rejects(insert('usage_guidance'), /warranty_tickets_solution_check/);

    await apply('202609160002_warranty_usage_guidance_solution');
    assert.deepEqual(await snapshot(), before);
    await apply('202609160002_warranty_usage_guidance_solution');
    assert.deepEqual(await snapshot(), before);
    await insert('usage_guidance');
    assert.equal((await db.query("select solution from warranty_tickets where ticket_id = 'new-guidance'")).rows[0].solution, 'usage_guidance');

    for (const invalid of ['unknown', '', 'Edukasi cara pemakaian/kendala']) {
      await assert.rejects(db.query("update warranty_tickets set solution = $1 where ticket_id = 'new-guidance'", [invalid]), /warranty_tickets_solution_check/);
    }
    assert.deepEqual((await snapshot()).filter(row => row.ticket_id.startsWith('historical-')), before);
    await db.exec('set role anon');
    assert.deepEqual((await db.query('select * from warranty_tickets')).rows, []);
    await assert.rejects(insert('usage_guidance'), /permission denied/);
    await db.exec('reset role');
  } finally {
    await db.close();
  }
});
