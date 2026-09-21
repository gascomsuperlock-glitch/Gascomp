import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) return next(specifier + '.ts', context);
  return next(specifier, context);
} });
const { dateRangeBounds, availableTicketDates, ticketCsv } = await import('./ticket-export.ts');
const { isWarrantySolution } = await import('./types.ts');
const { normalizeLocalTicket } = await import('./ticket-mappers.ts');
hooks.deregister();
test('date ranges include both days in Jakarta across leap years and year changes', () => {
  assert.deepEqual(dateRangeBounds('2024-02-01', '2024-02-29'), { start: '2024-01-31T17:00:00.000Z', end: '2024-02-29T17:00:00.000Z' });
  assert.deepEqual(dateRangeBounds('2026-12-31', '2026-12-31'), { start: '2026-12-30T17:00:00.000Z', end: '2026-12-31T17:00:00.000Z' });
  for (const date of ['', '2026-00-01', '2026-13-01', '2026-02-29', '2026-04-31', '../2026-01']) assert.throws(() => dateRangeBounds(date, date));
  assert.throws(() => dateRangeBounds('2026-09-16', '2026-09-15'));
});
test('available dates follow the full dataset using Jakarta dates and handle no data', () => {
  assert.equal(availableTicketDates([]), null);
  assert.deepEqual(availableTicketDates([{ submittedAt: '2026-09-14T17:00:00Z' }, { submittedAt: '2026-08-31T16:59:59Z' }]), { start: '2026-08-31', end: '2026-09-15' });
});
test('CSV preserves delimiters and newlines and neutralizes formulas', () => {
  const csv = ticketCsv([{ ticketId: 'GWC-20260915-AAAAAA', status: 'closed', solution: 'partial_refund',
    submittedAt: '2026-08-31T18:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    customer: { name: ' \t=HYPERLINK("bad")', whatsapp: '00123456789', email: 'test@example.invalid' },
    product: { name: 'Sample, product', sku: 'SKU' }, purchase: { orderNumber: '000123456789012345678', store: 'Sample', date: '2026-08-01', price: 100 },
    problem: 'Line 1\n"Line 2"', evidence: [] }]);
  assert.ok(csv.startsWith('\uFEFF"Date"'));
  assert.ok(csv.includes('"\' \t=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"00123456789","000123456789012345678"'));
  assert.ok(csv.includes('"01/09/2026"'));
  assert.ok(csv.includes('"Closed","Refund dana sebagian"'));
  assert.ok(csv.includes('"Line 1\n""Line 2"""'));
  assert.equal(ticketCsv([]).split('\r\n').length, 2);
  assert.equal(isWarrantySolution('toString'), false);
  assert.equal(isWarrantySolution('warranty_claim'), true);
});
test('usage guidance survives ticket normalization and exports the owner-requested label', () => {
  assert.equal(isWarrantySolution('usage_guidance'), true);
  assert.equal(isWarrantySolution('Edukasi cara pemakaian/kendala'), false);
  const ticket = normalizeLocalTicket({ ticketId: 'GWC-20260916-AAAAAA',
    status: 'closed', solution: 'usage_guidance', submittedAt: '2026-09-16T00:00:00Z' });
  assert.equal(ticket.solution, 'usage_guidance');
  assert.ok(ticketCsv([ticket]).includes('"Closed","Edukasi cara pemakaian/kendala"'));
  assert.equal(normalizeLocalTicket({ ...ticket, solution: undefined }).solution, null);
});
