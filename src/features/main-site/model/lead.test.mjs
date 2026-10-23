import assert from "node:assert/strict";
import { test } from "node:test";
import { validateLead } from "./lead.mjs";
const valid = {
  id: "12345678-1234-4234-8234-123456789abc",
  kind: "contact",
  name: "Test User",
  email: "TEST@EXAMPLE.COM",
  phone: "+62 812345678",
  message: "Synthetic contact inquiry",
  consent: true,
};
test("lead validation normalizes contact details and rejects malformed or oversized input", () => {
  assert.equal(validateLead(valid).email, "test@example.com");
  for (const change of [
    { consent: false },
    { id: "../file" },
    { kind: "admin" },
    { email: "bad\r\nBcc:x@y.test" },
    { message: "x".repeat(4001) },
    { phone: "javascript:alert(1)" },
    { name: "\u0000user" },
  ])
    assert.throws(() => validateLead({ ...valid, ...change }));
});
