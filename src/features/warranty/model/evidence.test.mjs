import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEvidenceFile, validateEvidenceSelection, allowedExtension, evidenceInputs, MAX_INVOICE_SIZE, MAX_PHOTO_SIZE, MAX_PHOTO_COUNT, MAX_VIDEO_SIZE } from "./evidence.ts";
import { registerHooks } from "node:module";
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "./types") return next("./types.ts", context);
  return next(specifier, context);
} });
const { normalizeLocalTicket } = await import("./ticket-mappers.ts");
hooks.deregister();

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

test("warranty videos accept 1 MB and 23 MB through the inclusive 50 MB limit", () => {
  assert.equal(MAX_VIDEO_SIZE, 52428800);
  for (const type of ["video/mp4", "video/webm", "video/quicktime"]) {
    for (const size of [1, 1024 * 1024, 23 * 1024 * 1024, 52428800]) {
      assert.equal(validateEvidenceSelection([{ type, size }], "video"), null);
    }
    assert.equal(validateEvidenceSelection([{ type, size: 52428801 }], "video"), "The issue video must be no larger than 50 MB.");
  }
});

test("video picker accepts video MIME types and missing MIME for recognized extensions", () => {
  for (const name of ["screen.MOV", "clip.mkv", "clip.avi", "clip.3gp", "clip.mts", "clip.wmv", "clip.ogv"]) {
    for (const type of ["", "application/octet-stream"]) assert.equal(validateEvidenceFile({ name, type, size: 100 }, "video"), null);
  }
  assert.equal(validateEvidenceFile({ name: "clip", type: "video/x-matroska", size: 100 }, "video"), null);
  for (const type of ["", "application/octet-stream", "text/html"]) assert.ok(validateEvidenceFile({ name: "page.html", type, size: 100 }, "video"));
  for (const type of ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/x-msvideo", "video/3gpp", "video/mpeg", "video/mp2t", "video/x-ms-wmv", "video/x-flv", "video/ogg"]) {
    assert.match(allowedExtension({ type }, "video"), /^\.[a-z0-9]+$/);
  }
});
