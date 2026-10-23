import { createHash } from "node:crypto";
import { SOURCE_ORIGIN, sourcePath } from "./content.mjs";

export const recordDigest = (record) =>
  createHash("sha256").update(JSON.stringify(record)).digest("hex");
export const recordKey = (record) => `${record.kind}-${record.id}`;

export function selectRelease(snapshot, review) {
  if (
    snapshot.version !== 1 ||
    snapshot.source !== SOURCE_ORIGIN ||
    !Array.isArray(snapshot.records) ||
    !Array.isArray(review.decisions)
  )
    throw new Error("Invalid migration input");
  const decisions = new Map();
  for (const decision of review.decisions) {
    if (
      decisions.has(decision.key) ||
      !["keep", "drop"].includes(decision.action) ||
      typeof decision.reason !== "string" ||
      !decision.reason.trim()
    )
      throw new Error(
        "Every decision requires a unique key, action and reason",
      );
    decisions.set(decision.key, decision);
  }
  if (decisions.size !== snapshot.records.length)
    throw new Error("Every source record must be reviewed");
  const records = [];
  const retired = [];
  const seen = new Set();
  for (const record of snapshot.records) {
    const decision = decisions.get(recordKey(record));
    if (!decision || decision.digest !== recordDigest(record))
      throw new Error("Review is missing or stale");
    const path = sourcePath(`${SOURCE_ORIGIN}${record.path}`);
    if (seen.has(path)) throw new Error("Duplicate permalink");
    seen.add(path);
    if (decision.action === "keep") records.push(record);
    else retired.push(path);
  }
  if (!records.some((record) => record.path === "/"))
    throw new Error("A reviewed home page is required");
  return {
    version: 1,
    approved: true,
    source: SOURCE_ORIGIN,
    builtAt: new Date().toISOString(),
    records,
    retired,
    media: {},
  };
}

export function collectImages(records) {
  const urls = new Set();
  const visit = (nodes) => {
    for (const node of nodes || []) {
      if (node.tag === "img" && node.src) urls.add(node.src);
      visit(node.children);
    }
  };
  for (const record of records) {
    visit(record.nodes);
    for (const image of record.images || []) urls.add(image.src);
  }
  return [...urls];
}
