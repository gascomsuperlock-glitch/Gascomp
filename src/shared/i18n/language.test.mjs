import assert from "node:assert/strict";
import { test } from "node:test";
import { dictionaries, localizeMessage } from "./dictionaries.ts";
import { parseLanguage, supportedLanguages } from "./language.ts";

test("language parsing accepts Indonesian and falls back to English", () => {
  assert.deepEqual(supportedLanguages, ["id", "en"]);
  assert.equal(parseLanguage("id"), "id");
  assert.equal(parseLanguage("en"), "en");
  assert.equal(parseLanguage("invalid"), "en");
  assert.equal(parseLanguage(undefined), "en");
});

test("both language dictionaries expose the same customer interface sections", () => {
  assert.deepEqual(Object.keys(dictionaries.id), Object.keys(dictionaries.en));
  for (const section of Object.keys(dictionaries.en)) {
    assert.deepEqual(Object.keys(dictionaries.id[section]), Object.keys(dictionaries.en[section]));
  }
});

test("warranty errors are localized without changing unknown source values", () => {
  assert.equal(localizeMessage("Enter your full name.", "id"), "Masukkan nama lengkap Anda.");
  assert.equal(localizeMessage("Unknown provider response", "id"), "Unknown provider response");
  assert.equal(localizeMessage("Enter your full name.", "en"), "Enter your full name.");
});
