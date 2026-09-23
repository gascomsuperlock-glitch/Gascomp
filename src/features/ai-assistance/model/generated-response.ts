const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/;
const URL_PATTERN = /(?:\b[a-z][a-z0-9+.-]*:\/\/|\b(?:mailto|data|javascript|file):|\bwww\.|\bwa\.me(?:\/|\b)|\b(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:\/|\b))/i;
const MARKUP_PATTERN = /(?:<\s*\/?\s*[a-z][^>]*>|!?\[[^\]]*\]\([^)]*\)|\[\[|\]\])/i;
// The customer reads this text directly, so a nested payload, a fenced code
// block, or an echo of this schema must never reach them.
const STRUCTURED_PAYLOAD_PATTERN = /```|[[{]\s*["']|"[A-Za-z_][A-Za-z0-9_]*"\s*:|\\["nrt]|\b(?:sourceIds|basis|kind)\s*:\s*["'[{]/i;

// A listing name such as `{COD} PAKET ...` opens with a bracket but is ordinary
// prose, so a whole-text match must actually parse as a serialized payload.
function looksStructured(text: string): boolean {
  if (STRUCTURED_PAYLOAD_PATTERN.test(text)) return true;
  const trimmed = text.trim();
  if (!"[{".includes(trimmed[0] ?? "") || !"]}".includes(trimmed[trimmed.length - 1] ?? "")) return false;
  try { JSON.parse(trimmed); } catch { return false; }
  return true;
}

export type GeneratedResponse = {
  text: string;
  kind: "answer" | "clarification" | "handoff";
  basis: "knowledge" | "general";
  sourceIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateGeneratedResponse(value: unknown): GeneratedResponse {
  if (!isRecord(value) || Object.keys(value).some(key => !["text", "kind", "basis", "sourceIds"].includes(key))) {
    throw new Error("Invalid generated response.");
  }
  const { text, kind, basis, sourceIds } = value;
  if (typeof text !== "string" || !text.trim() || text.length > 3000 || CONTROL_CHARACTER_PATTERN.test(text) || URL_PATTERN.test(text) || MARKUP_PATTERN.test(text) || looksStructured(text)) {
    throw new Error("Invalid generated response text.");
  }
  if (kind !== "answer" && kind !== "clarification" && kind !== "handoff") throw new Error("Invalid generated response kind.");
  if (basis !== "knowledge" && basis !== "general") throw new Error("Invalid generated response basis.");
  if (!Array.isArray(sourceIds) || sourceIds.length > 5 || sourceIds.some(id => typeof id !== "string" || !SOURCE_ID_PATTERN.test(id)) || new Set(sourceIds).size !== sourceIds.length) {
    throw new Error("Invalid generated response sources.");
  }
  if ((basis === "knowledge" && sourceIds.length === 0) || (basis === "general" && sourceIds.length !== 0)) {
    throw new Error("Generated response basis does not match its sources.");
  }
  return { text, kind, basis, sourceIds };
}
