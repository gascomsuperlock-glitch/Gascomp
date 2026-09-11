import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEvidenceFile, allowedExtension, evidenceInputs, MAX_INVOICE_SIZE, MAX_PHOTO_SIZE, MAX_VIDEO_SIZE } from "./evidence.ts";
import { normalizeLocalTicket } from "./ticket-mappers.ts";

test("evidence validation preserves MIME and inclusive size limits", () => {
  for (const [kind, type, limit, extension] of [
    ["invoice", "application/pdf", MAX_INVOICE_SIZE, ".pdf"],
    ["photo", "image/webp", MAX_PHOTO_SIZE, ".webp"],
    ["video", "video/quicktime", MAX_VIDEO_SIZE, ".mov"],
  ]) {
    assert.equal(validateEvidenceFile({ type, size: limit }, kind), null);
    assert.ok(validateEvidenceFile({ type, size: limit + 1 }, kind));
    assert.equal(allowedExtension({ type }, kind), extension);
  }
  assert.ok(validateEvidenceFile({ type: "application/pdf", size: 1 }, "photo"));
  assert.ok(validateEvidenceFile({ type: "image/svg+xml", size: 1 }, "invoice"));
  assert.ok(validateEvidenceFile({ type: "image/jpeg", size: 1 }, "video"));
});

test("evidence identity remains stable with optional video", () => {
  const input = { invoice: {}, damagePhotos: [{}, {}] };
  assert.deepEqual(evidenceInputs(input).map(({ id }) => id), ["invoice", "photo-1", "photo-2"]);
  assert.deepEqual(evidenceInputs({ ...input, damageVideo: {} }).map(({ id }) => id), ["invoice", "photo-1", "photo-2", "video"]);
});

test("legacy local tickets and current evidence lists remain readable", () => {
  assert.equal(normalizeLocalTicket({}), null);
  const legacy = { ticketId: "GWC-20260911-ABCDEF", submittedAt: "2026-09-11T01:00:00Z",
    evidence: { damageVideo: { originalName: "clip.mp4", storedName: "video.mp4", mimeType: "video/mp4", size: 20 } } };
  const normalized = normalizeLocalTicket(legacy);
  assert.equal(normalized.status, "new");
  assert.equal(normalized.updatedAt, legacy.submittedAt);
  assert.equal(normalized.purchase.orderNumber, "-");
  assert.equal(normalized.evidence[0].kind, "video");
  assert.deepEqual(normalizeLocalTicket({ ...legacy, evidence: normalized.evidence }).evidence, normalized.evidence);
});
