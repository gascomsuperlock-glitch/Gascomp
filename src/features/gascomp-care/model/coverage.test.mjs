import assert from 'node:assert/strict';
import { test } from 'node:test';
import { careToday, validCareDate, normalizeCareReference, validCareReference } from './coverage.ts';
test('Care dates follow Jakarta midnight and reject impossible calendar dates', () => {
  assert.equal(careToday(new Date('2026-09-15T16:59:59Z')), '2026-09-15');
  assert.equal(careToday(new Date('2026-09-15T17:00:00Z')), '2026-09-16');
  for (const date of ['2025-02-29', '2026-04-31', '2026-13-01', '2026-9-1', '1899-12-31', 'invalid']) assert.equal(validCareDate(date), false);
  assert.equal(validCareDate('2024-02-29'), true);
});
test('Care references normalize case without accepting empty or control-character identifiers', () => {
  assert.equal(normalizeCareReference(' Order-ONE '), 'order-one');
  assert.equal(validCareReference(normalizeCareReference('  ')), false);
  assert.equal(validCareReference('line\nbreak'), false);
  assert.equal(validCareReference('a'.repeat(101)), false);
  assert.equal(validCareReference('order-one'), true);
});
