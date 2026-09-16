import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

const modulePath = process.env.SERVICE_CENTER_PGLITE_MODULE || process.env.CARE_PGLITE_MODULE;
test('service center migration starts empty and enforces server-only reads and writes', { skip: !modulePath }, async () => {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../../../../supabase/migrations/202609160001_service_centers.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query('select count(*)::int as count from public.service_centers')).rows[0].count, 0);
    await db.exec("set role service_role; insert into public.service_centers (name, province_code, city, address, latitude, longitude, active) values ('Visible Center', '31', 'Jakarta', 'Sample address', -6.2, 106.8, true), ('Hidden Center', '92', 'Sorong', 'Sample address', -0.8, 131.2, false); reset role;");
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role};`);
      await assert.rejects(db.query('select name from public.service_centers'), /permission denied/);
      await assert.rejects(db.exec("update public.service_centers set active = true"), /permission denied/);
      await assert.rejects(db.exec("insert into public.service_centers (name, province_code, city, address, latitude, longitude) values ('Unauthorized', '31', 'Jakarta', 'Sample address', -6.2, 106.8)"), /permission denied/);
      await db.exec('reset role;');
    }
    await db.exec('set role service_role;');
    assert.equal((await db.query('select count(*)::int as count from public.service_centers')).rows[0].count, 2);
    await assert.rejects(db.exec("update public.service_centers set province_code = '00'"), /check constraint/);
    await assert.rejects(db.exec("update public.service_centers set latitude = 'NaN'"), /check constraint/);
    await db.exec('update public.service_centers set active = false; reset role; set role anon;');
    await assert.rejects(db.query('select count(*)::int as count from public.service_centers'), /permission denied/);
  } finally { await db.close(); }
});
