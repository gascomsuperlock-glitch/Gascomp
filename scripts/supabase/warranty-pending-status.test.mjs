import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

const modulePath = process.env.WARRANTY_PGLITE_MODULE || process.env.CARE_PGLITE_MODULE;

test('pending status migration preserves historical tickets, solutions, defaults, and RLS', { skip: !modulePath }, async () => {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  const sql = await readFile(new URL('../../supabase/migrations/202610140001_warranty_pending_status.sql', import.meta.url), 'utf8');
  try {
    await db.exec(`
      create role anon;
      create table public.warranty_tickets (
        ticket_id text primary key,
        status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'rejected', 'closed')),
        solution text,
        updated_at timestamptz not null default now()
      );
      alter table public.warranty_tickets enable row level security;
      grant select on public.warranty_tickets to anon;
    `);
    const statuses = ['new', 'reviewing', 'approved', 'rejected', 'closed'];
    for (const status of statuses) {
      await db.query('insert into warranty_tickets(ticket_id, status, solution) values ($1, $2, $3)', [status, status, 'trade_in']);
    }
    const snapshot = async () => (await db.query('select * from warranty_tickets order by ticket_id')).rows;
    const before = await snapshot();
    await assert.rejects(db.query("update warranty_tickets set status = 'pending' where ticket_id = 'closed'"), /warranty_tickets_status_check/);
    await db.exec(sql);
    assert.deepEqual(await snapshot(), before);
    await db.exec(sql);
    assert.deepEqual(await snapshot(), before);

    await db.query("update warranty_tickets set status = 'pending' where ticket_id = 'closed'");
    assert.deepEqual((await snapshot()).find(row => row.ticket_id === 'closed'), { ...before.find(row => row.ticket_id === 'closed'), status: 'pending' });
    for (const status of [...statuses, 'pending']) {
      await db.query("update warranty_tickets set status = $1 where ticket_id = 'closed'", [status]);
    }
    for (const invalid of ['Pending', 'done', '', 'unknown', null]) {
      await assert.rejects(db.query("update warranty_tickets set status = $1 where ticket_id = 'closed'", [invalid]), /warranty_tickets_status_check|not-null/);
    }
    await db.query("insert into warranty_tickets(ticket_id) values ('default')");
    assert.equal((await db.query("select status from warranty_tickets where ticket_id = 'default'")).rows[0].status, 'new');
    await db.exec('set role anon');
    assert.deepEqual(await snapshot(), []);
    await assert.rejects(db.query("update warranty_tickets set status = 'pending'"), /permission denied/);
  } finally {
    await db.close();
  }
});
