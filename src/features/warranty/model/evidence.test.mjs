import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEvidenceFile, validateEvidenceSelection, allowedExtension, evidenceInputs, MAX_INVOICE_SIZE, MAX_PHOTO_SIZE, MAX_PHOTO_COUNT, MAX_VIDEO_SIZE } from "./evidence.ts";
import { normalizeLocalTicket } from "./ticket-mappers.ts";

test("evidence validation preserves MIME and inclusive size limits", () => {
  for (const [kind, type, limit, extension] of [
    ["invoice", "application/pdf", MAX_INVOICE_SIZE, ".pdf"],
    ["photo", "image/webp", MAX_PHOTO_SIZE, ".webp"],
    ["video", "video/quicktime", MAX_VIDEO_SIZE, ".mov"],
  ]) {
    assert.equal(validateEvidenceFile({ type, size: limit }, kind), null);
    assert.equal(validateEvidenceFile({ type, size: 1 }, kind), null);
    assert.match(validateEvidenceFile({ type, size: 0 }, kind), /empty/);
    assert.ok(validateEvidenceFile({ type, size: limit + 1 }, kind));
    assert.equal(allowedExtension({ type }, kind), extension);
  }
  assert.ok(validateEvidenceFile({ type: "application/pdf", size: 1 }, "photo"));
  assert.ok(validateEvidenceFile({ type: "image/svg+xml", size: 1 }, "invoice"));
  assert.ok(validateEvidenceFile({ type: "image/jpeg", size: 1 }, "video"));
});

test("evidence selections enforce required uploads and file counts", () => {
  for (const [kind, type] of [["invoice", "application/pdf"], ["photo", "image/jpeg"], ["video", "video/mp4"]]) {
    assert.ok(validateEvidenceSelection([], kind));
    assert.equal(validateEvidenceSelection([{ type, size: 1 }], kind), null);
    assert.ok(validateEvidenceSelection(Array(MAX_PHOTO_COUNT + 1).fill({ type, size: 1 }), kind));
    if (kind !== "photo") assert.ok(validateEvidenceSelection(Array(2).fill({ type, size: 1 }), kind));
  }
  assert.equal(validateEvidenceSelection(Array(MAX_PHOTO_COUNT).fill({ type: "image/jpeg", size: MAX_PHOTO_SIZE }), "photo"), null);
});

test("every selected photo is validated and a corrected selection clears the error", () => {
  const valid = { type: "image/png", size: 1 };
  for (const invalid of [
    { type: "image/png", size: 0 },
    { type: "image/png", size: MAX_PHOTO_SIZE + 1 },
    { type: "application/pdf", size: 1 },
  ]) {
    assert.ok(validateEvidenceSelection([valid, invalid], "photo"));
    assert.equal(validateEvidenceSelection([valid, valid], "photo"), null);
  }
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
