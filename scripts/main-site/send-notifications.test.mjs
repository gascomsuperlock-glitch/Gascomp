import assert from "node:assert/strict";
import { test } from "node:test";
import { notifyLeads } from "./send-notifications.mjs";
test("notification dry run does not claim, mutate, or send messages", async () => {
  const client = {
    from: () => ({ select: () => ({ is: async () => ({ count: 3 }) }) }),
    rpc: () => {
      throw new Error("Unexpected claim");
    },
  };
  assert.deepEqual(await notifyLeads({ client }), {
    pending: 3,
    sent: 0,
    dryRun: true,
  });
});
test("notifications contain only an admin link and acknowledge accepted mail with the claim token", async () => {
  const id = "12345678-1234-4234-8234-123456789abc";
  const filters = [];
  let claim;
  const query = {
    eq: (key, value) => {
      filters.push([key, value]);
      return query;
    },
    select: async () => ({ data: [{ id }] }),
  };
  const client = {
    rpc: async (_name, args) => {
      claim = args.p_claim;
      return {
        data: [
          {
            id,
            kind: "contact",
            name: "PRIVATE NAME",
            message: "PRIVATE MESSAGE",
          },
        ],
      };
    },
    from: () => ({ update: () => query }),
  };
  let mail;
  const result = await notifyLeads({
    client,
    transport: {
      sendMail: async (message) => {
        mail = message;
        return { accepted: ["admin@example.test"] };
      },
    },
    from: "site@example.test",
    to: "admin@example.test",
    origin: "https://gascompsuperlock.com",
    send: true,
  });
  assert.equal(result.sent, 1);
  assert.doesNotMatch(JSON.stringify(mail), /PRIVATE/);
  assert.deepEqual(filters, [
    ["id", id],
    ["notification_claim", claim],
  ]);
  assert.equal(mail.disableFileAccess, true);
});
