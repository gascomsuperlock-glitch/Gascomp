import assert from "node:assert/strict";
import test from "node:test";
import {
  getChangedWarrantyTickets,
  getUnreadWarrantyTickets,
  getWarrantyTicketVersions,
} from "./notifications.ts";

function ticket(ticketId, status = "new", updatedAt = "2026-09-14T08:00:00.000Z") {
  return {
    ticketId,
    status,
    submittedAt: "2026-09-14T08:00:00.000Z",
    updatedAt,
    customer: { name: "Customer", email: "customer@example.com", whatsapp: "628123456789" },
    product: { name: "Regulator", sku: "GR-01" },
    purchase: { store: "Store", date: "2026-09-13", orderNumber: "ORDER-1", price: 100000 },
    problem: "Issue",
    evidence: [],
  };
}

test("first notification visit highlights existing new claims only", () => {
  const tickets = [ticket("GWC-20260914-AAAAAA"), ticket("GWC-20260914-BBBBBB", "reviewing")];

  assert.deepEqual(
    getUnreadWarrantyTickets(tickets, null).map((item) => item.ticketId),
    ["GWC-20260914-AAAAAA"],
  );
});

test("stored versions detect new tickets and later status updates", () => {
  const original = ticket("GWC-20260914-AAAAAA");
  const seen = getWarrantyTicketVersions([original]);
  const updated = ticket("GWC-20260914-AAAAAA", "reviewing", "2026-09-14T09:00:00.000Z");
  const added = ticket("GWC-20260914-BBBBBB");

  assert.deepEqual(
    getUnreadWarrantyTickets([updated, added], seen).map((item) => item.ticketId),
    ["GWC-20260914-AAAAAA", "GWC-20260914-BBBBBB"],
  );
});

test("poll comparison ignores unchanged tickets", () => {
  const unchanged = ticket("GWC-20260914-AAAAAA");
  const updated = ticket("GWC-20260914-BBBBBB", "approved", "2026-09-14T10:00:00.000Z");
  const previous = [unchanged, ticket("GWC-20260914-BBBBBB", "reviewing")];

  assert.deepEqual(
    getChangedWarrantyTickets(previous, [unchanged, updated]).map((item) => item.ticketId),
    ["GWC-20260914-BBBBBB"],
  );
});
