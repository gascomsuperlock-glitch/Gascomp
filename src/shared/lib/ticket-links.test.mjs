import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminTicketPath, parseTicketId, ticketLoginUrl } from './ticket-links.ts';
import { getWarrantyWhatsappUrl } from './whatsapp.ts';
const id = 'GWC-20260915-A1B2C3';
test('claim message contains the saved ticket and the login-preserving admin link', () => {
  const link = ticketLoginUrl('https://help.example.com', id);
  const message = new URL(getWarrantyWhatsappUrl('081234567890', id, link)).searchParams.get('text');
  assert.equal(message, `kak, aku sudah claim garansi\nTicket: ${id}\nhttps://help.example.com/admin/login?ticket=${id}`);
  assert.equal(adminTicketPath(new URL(link).searchParams.get('ticket')), `/admin?ticket=${id}`);
});
test('untrusted ticket parameters cannot redirect outside the admin route', () => {
  for (const input of ['https://evil.example', '//evil.example', '../other', `${id}&next=https://evil.example`, [id], null]) {
    assert.equal(parseTicketId(input), undefined);
    assert.equal(adminTicketPath(input), '/admin');
  }
  assert.throws(() => ticketLoginUrl('javascript:alert(1)', id));
});
