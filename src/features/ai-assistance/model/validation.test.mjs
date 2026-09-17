import assert from 'node:assert/strict';
import { test } from 'node:test';
import { snapshotVersion, validateSnapshot } from './validation.ts';
const entries = () => ['en','id'].flatMap(language => ['greeting','clarification','handoff'].map(kind => ({ id: `${language}.${kind}`, kind, language, questions: ['Example question'], answer: `Exact ${language} ${kind}.\n` }))).concat([{ id: 'answer.en', kind: 'answer', language: 'en', questions: ['How?'], answer: 'Exact café answer.\n', sku: 'DEMO-1' }]);
const snapshot = (rows = entries()) => ({ version: snapshotVersion(rows), entries: rows });
test('snapshot hash ignores entry order but preserves exact Unicode and whitespace', () => {
  const rows = entries();
  assert.equal(snapshotVersion(rows), snapshotVersion([...rows].reverse()));
  assert.notEqual(snapshotVersion(rows), snapshotVersion(rows.map(row => ({...row,answer:row.answer.trim()}))));
  assert.equal(validateSnapshot(snapshot()).entries.at(-1).answer, 'Exact café answer.\n');
});
test('knowledge fails closed on invalid hashes, duplicates, missing bilingual templates and unsafe URLs', () => {
  assert.throws(() => validateSnapshot({...snapshot(),version:'bad'}));
  assert.throws(() => validateSnapshot(snapshot([...entries(),entries()[0]])));
  assert.throws(() => validateSnapshot(snapshot(entries().filter(row => row.id !== 'id.clarification'))));
  for (const answer of ['', 'http://example.com', 'https://localhost/a', 'https://192.168.0.1/a','[local](file:///private/a)','[[Private Note]]']) {
    assert.throws(() => validateSnapshot(snapshot(entries().map(row => row.id === 'answer.en' ? {...row,answer} : row))));
  }
  assert.throws(() => validateSnapshot(snapshot(entries().map(row => ({...row,unexpected:'text'})))));
});
