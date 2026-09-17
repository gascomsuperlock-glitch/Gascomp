import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openPreviewDatabase, previewServer } from "./preview-database.mjs";

test("local preview uses real private SQL, rejects unauthenticated requests, and preserves sessions across restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gascomp-ai-preview-"));
  const key = randomUUID();
  let db;
  let server;
  try {
    db = await openPreviewDatabase(join(directory, "postgres"));
    server = previewServer(db, key);
    await new Promise(done => server.listen(0, "127.0.0.1", done));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const request = (action, payload, authenticate = true) => fetch(`${origin}/rest/v1/rpc/gascomp_ai_command`, {
      method: "POST", headers: { "Content-Type": "application/json", ...(authenticate ? { apikey: key, Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ action, payload }),
    });
    assert.equal((await request("session", { tokenHash: "visitor-one", language: "en" }, false)).status, 401);
    assert.equal((await request("arbitrary-sql", {})).status, 400);
    const initial = await request("session", { tokenHash: "visitor-one", language: "en" });
    assert.equal(initial.status, 200);
    assert.deepEqual(await initial.json(), { messages: [], availability: "unavailable", pending: false, greeting: null, handoff: null });
    const sent = await request("send", { tokenHash: "visitor-one", requestId: randomUUID(), text: "Synthetic local question", language: "en" });
    const conversation = await sent.json();
    assert.equal(conversation.messages.length, 1);
    assert.equal(conversation.messages[0].role, "user");
    assert.equal(conversation.pending, false);
    const other = await request("session", { tokenHash: "visitor-two", language: "en" });
    assert.equal((await other.json()).messages.length, 0);
    assert.equal((await stat(join(directory, "postgres"))).mode & 0o077, 0);
    await new Promise(done => server.close(done)); server = null;
    await db.close(); db = null;
    db = await openPreviewDatabase(join(directory, "postgres"));
    const result = await db.query("select public.gascomp_ai_command('messages', $1::jsonb) as result", [JSON.stringify({ tokenHash: "visitor-one", language: "en" })]);
    assert.equal(result.rows[0].result.messages[0].text, "Synthetic local question");
    assert.equal(result.rows[0].result.availability, "unavailable");
  } finally {
    if (server) await new Promise(done => server.close(done));
    if (db) await db.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("local preview refuses a changed fingerprint for every ordered migration", async () => {
  for (const version of ["202609170001", "202609170002", "202609170003"]) {
    const directory = await mkdtemp(join(tmpdir(), "gascomp-ai-preview-version-"));
    try {
      const db = await openPreviewDatabase(join(directory, "postgres"));
      await db.exec("reset role");
      await db.query("update public.ai_assistance_preview_migrations set digest = 'different-version' where version = $1", [version]);
      await db.close();
      await assert.rejects(openPreviewDatabase(join(directory, "postgres")), /schema version changed/);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
});

test("local preview applies every ordered AI migration once", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gascomp-ai-preview-ordered-"));
  try {
    let db = await openPreviewDatabase(join(directory, "postgres"));
    await db.exec("reset role");
    const first = await db.query("select version from public.ai_assistance_preview_migrations order by version");
    assert.deepEqual(first.rows.map(row => row.version), ["202609170001", "202609170002", "202609170003"]);
    await db.close();
    db = await openPreviewDatabase(join(directory, "postgres"));
    await db.exec("reset role");
    const reopened = await db.query("select version, count(*)::int as count from public.ai_assistance_preview_migrations group by version order by version");
    assert.deepEqual(reopened.rows, [
      { version: "202609170001", count: 1 },
      { version: "202609170002", count: 1 },
      { version: "202609170003", count: 1 },
    ]);
    await db.close();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
