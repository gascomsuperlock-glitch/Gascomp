import assert from "node:assert/strict";
import { test } from "node:test";
import {
  selectRelease,
  recordDigest,
  recordKey,
  collectImages,
} from "./release.mjs";
const records = [
  { id: 1, kind: "page", path: "/", title: "Home", nodes: [], images: [] },
  { id: 2, kind: "post", path: "/spam/", title: "Spam", nodes: [], images: [] },
];
const snapshot = {
  version: 1,
  source: "https://gascompsuperlock.com",
  records,
};
const review = () => ({
  decisions: records.map((record) => ({
    key: recordKey(record),
    digest: recordDigest(record),
    action: record.id === 1 ? "keep" : "drop",
    reason: "Reviewed test fixture",
  })),
});
test("publication requires complete, current decisions and excludes rejected records", () => {
  assert.throws(() => selectRelease(snapshot, { decisions: [] }));
  const stale = review();
  stale.decisions[0].digest = "old";
  assert.throws(() => selectRelease(snapshot, stale));
  const pending = review();
  pending.decisions[0].action = "pending";
  assert.throws(() => selectRelease(snapshot, pending));
  const result = selectRelease(snapshot, review());
  assert.equal(result.records.length, 1);
  assert.deepEqual(result.retired, ["/spam/"]);
  assert.equal(result.approved, true);
});
test("image collection covers nested content and product galleries without duplicates", () => {
  assert.deepEqual(
    collectImages([
      {
        nodes: [{ children: [{ tag: "img", src: "one" }] }],
        images: [{ src: "one" }, { src: "two" }],
      },
    ]),
    ["one", "two"],
  );
});
