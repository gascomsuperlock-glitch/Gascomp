import assert from "node:assert/strict";
import { test } from "node:test";
import { requestContentSave } from "./save-request.ts";
import { readSaveRequest } from "./save-request-body.ts";

const content = { products: [], whatsappNumber: "123", supportHours: "Monday" };

test("save uses the stable authenticated endpoint and returns saved content", async () => {
  const result = await requestContentSave(content, async (url, init) => {
    assert.equal(url, "/admin/content");
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.redirect, "error");
    assert.deepEqual(JSON.parse(init.body), content);
    return Response.json({ success: true, content });
  });
  assert.deepEqual(result, { success: true, content });
});

test("hosting HTML errors produce actionable messages without exposing response bodies", async () => {
  for (const [status, expected] of [[401, /session has expired/], [403, /origin/], [404, /Deploy/], [413, /size limit/], [502, /502/], [503, /503/], [504, /may still be processing/]]) {
    const result = await requestContentSave(content, async () => new Response("private proxy details", { status }));
    assert.equal(result.success, false);
    assert.match(result.error, expected);
    assert.ok(!result.error.includes("private proxy details"));
  }
});

test("failed transport does not assert that the save never reached the server", async () => {
  let calls = 0;
  const result = await requestContentSave(content, async () => { calls++; throw new TypeError("Failed to fetch"); });
  assert.equal(calls, 1);
  assert.match(result.error, /may have reached the server/);
});

test("invalid or truncated responses never report a successful save", async () => {
  for (const response of [new Response("<html>Login</html>"), new Response("{", { headers: { "content-type": "application/json" } }), Response.json({ success: true }), Response.json({ success: true, content }, { status: 500 })]) {
    const result = await requestContentSave(content, async () => response);
    assert.equal(result.success, false);
    assert.match(result.error, /invalid save response/);
  }
});

test("server validation failures remain visible", async () => {
  const failure = { success: false, error: "Changes were not saved to Supabase." };
  assert.deepEqual(await requestContentSave(content, async () => Response.json(failure, { status: 422 })), failure);
});

function request(body, headers = {}) {
  return new Request("https://example.com/admin/content", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
}

test("save body accepts valid content and rejects malformed content", async () => {
  assert.deepEqual(await readSaveRequest(request(JSON.stringify(content))), { success: true, content });
  for (const body of ["{", "null", "{}", '{"products":[]}']) {
    assert.equal((await readSaveRequest(request(body))).status, 400);
  }
  assert.equal((await readSaveRequest(request("{}", { "Content-Type": "text/plain" }))).status, 415);
});

test("save body enforces byte limits with and without a content-length header", async () => {
  assert.equal((await readSaveRequest(request("{}", { "content-length": "101" }), 100)).status, 413);
  assert.equal((await readSaveRequest(request(JSON.stringify(content)), 10)).status, 413);
  const body = JSON.stringify({ ...content, supportHours: "日" });
  const bytes = new TextEncoder().encode(body).length;
  assert.equal((await readSaveRequest(request(body), bytes)).success, true);
  assert.equal((await readSaveRequest(request(body), bytes - 1)).status, 413);
});
