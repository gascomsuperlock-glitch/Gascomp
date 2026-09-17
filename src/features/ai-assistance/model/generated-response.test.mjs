import assert from "node:assert/strict";
import { test } from "node:test";
import { validateGeneratedResponse } from "./generated-response.ts";

test("generated responses accept bounded grounded or general plain text", () => {
  assert.deepEqual(validateGeneratedResponse({
    text: "Check that the power cable is seated firmly.\nThen try another outlet.",
    kind: "answer",
    basis: "knowledge",
    sourceIds: ["grs-01.power", "grs-01.manual"],
  }), {
    text: "Check that the power cable is seated firmly.\nThen try another outlet.",
    kind: "answer",
    basis: "knowledge",
    sourceIds: ["grs-01.power", "grs-01.manual"],
  });
  assert.equal(validateGeneratedResponse({ text: "Which product do you mean?", kind: "clarification", basis: "general", sourceIds: [] }).basis, "general");
});

test("generated responses reject malformed provenance and unsafe presentation text", () => {
  const valid = { text: "A plain response.", kind: "answer", basis: "knowledge", sourceIds: ["source.one"] };
  for (const response of [
    { ...valid, extra: true },
    { ...valid, text: "" },
    { ...valid, text: "x".repeat(3001) },
    { ...valid, text: "Open https://example.com" },
    { ...valid, text: "Open ftp://example.com" },
    { ...valid, text: "Contact wa.me/62123" },
    { ...valid, text: "Open example.com/support" },
    { ...valid, text: "Open [support](https://example.com)" },
    { ...valid, text: "<strong>Unsafe</strong>" },
    { ...valid, text: "< strong>Unsafe</strong>" },
    { ...valid, text: "Read [[Private Note]]" },
    { ...valid, text: "Hidden\u0000text" },
    { ...valid, kind: "greeting" },
    { ...valid, basis: "general" },
    { ...valid, sourceIds: [] },
    { ...valid, sourceIds: ["source.one", "source.one"] },
    { ...valid, sourceIds: ["source.one", "two", "three", "four", "five", "six"] },
    { ...valid, sourceIds: ["INVALID ID"] },
    { ...valid, basis: "general", sourceIds: ["source.one"] },
  ]) assert.throws(() => validateGeneratedResponse(response));
});
