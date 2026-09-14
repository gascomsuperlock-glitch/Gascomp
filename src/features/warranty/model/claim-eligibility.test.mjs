import assert from 'node:assert/strict';
import { test } from 'node:test';
import { purchaseDateError, EXPIRED_CLAIM_ERROR, formatJakartaDate, normalizeClaimIdentity } from './claim-eligibility.ts';

test('Jakarta calendar dates cross midnight seven hours ahead of UTC', () => {
  assert.equal(formatJakartaDate(new Date('2026-09-13T16:59:59Z')), '2026-09-13');
  assert.equal(formatJakartaDate(new Date('2026-09-13T17:00:00Z')), '2026-09-14');
});

test('warranty includes the first anniversary and expires the next Jakarta day', () => {
  assert.equal(purchaseDateError('2025-09-14', new Date('2026-09-14T16:59:59Z')), undefined);
  assert.equal(purchaseDateError('2025-09-14', new Date('2026-09-14T17:00:00Z')), EXPIRED_CLAIM_ERROR);
});
test('leap-day purchases expire after February 28 of the next year', () => {
  assert.equal(purchaseDateError('2024-02-29', new Date('2025-02-28T00:00:00Z')), undefined);
  assert.equal(purchaseDateError('2024-02-29', new Date('2025-03-01T00:00:00Z')), EXPIRED_CLAIM_ERROR);
});
test('invalid and future dates cannot bypass eligibility', () => {
  for (const value of ['', '2026-02-30', 'not-a-date', '2027-01-01']) assert.ok(purchaseDateError(value, new Date('2026-09-14T00:00:00Z')));
});
test('claim identity ignores surrounding whitespace and case but preserves punctuation', () => {
  assert.equal(normalizeClaimIdentity('  ORDER-AbC  '), normalizeClaimIdentity('order-abc'));
  assert.notEqual(normalizeClaimIdentity('order-abc'), normalizeClaimIdentity('orderabc'));
});
