import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("lead storage rejects public access and serializes idempotency and acceptance limits", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../../supabase/migrations/202610230001_main_site_leads.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from public.main_site_leads"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select public.submit_main_site_lead('12345678-1234-4234-8234-123456789abc','contact','Test User','test@example.test','0812345678','Synthetic test message')",
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select * from public.claim_main_site_notifications('12345678-1234-4234-8234-123456789abc')",
      ),
      /permission denied/,
    );
    await db.exec("reset role; set role authenticated;");
    await assert.rejects(
      db.query("select * from public.main_site_leads"),
      /permission denied/,
    );
    await db.exec("reset role; set role service_role;");
    const query =
      "select public.submit_main_site_lead($1,'contact','Test User','test@example.test','0812345678',$2)";
    const id = "12345678-1234-4234-8234-123456789abc";
    await db.query(query, [id, "Synthetic test message"]);
    await db.query(query, [id, "Synthetic test message"]);
    assert.equal(
      (await db.query("select * from public.main_site_leads")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(query, [id, "Different message"]),
      /conflict/,
    );
    for (let i = 1; i <= 4; i++)
      await db.query(query, [
        `12345678-1234-4234-8234-123456789ab${i}`,
        "Synthetic test message",
      ]);
    await assert.rejects(
      db.query(query, [
        "12345678-1234-4234-8234-123456789ab5",
        "Synthetic test message",
      ]),
      /limit reached/,
    );
    const claimed = await db.query(
      "select * from public.claim_main_site_notifications('12345678-1234-4234-8234-123456789aaa')",
    );
    assert.equal(claimed.rows.length, 5);
    assert.deepEqual(Object.keys(claimed.rows[0]).sort(), ["id", "kind"]);
    const nextWorker = await db.query(
      "select * from public.claim_main_site_notifications('12345678-1234-4234-8234-123456789bbb')",
    );
    assert.equal(nextWorker.rows.length, 0);
  } finally {
    await db.close();
  }
});
