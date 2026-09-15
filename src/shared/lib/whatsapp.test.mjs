import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getWarrantyWhatsappUrl } from './whatsapp.ts';

test('warranty chat uses the configured number and exact owner-requested message', () => {
  const url = new URL(getWarrantyWhatsappUrl('0812-3456-7890'));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/6281234567890');
  assert.equal(url.searchParams.get('text'), 'kak, aku sudah claim garansi');
  assert.equal(getWarrantyWhatsappUrl('+62 812 3456 7890'), url.href);
});
test('missing WhatsApp destination does not produce a redirect', () => {
  assert.equal(getWarrantyWhatsappUrl(''), null);
  assert.equal(getWarrantyWhatsappUrl('  '), null);
});
