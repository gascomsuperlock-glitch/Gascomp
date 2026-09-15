import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldSecureSessionCookie } from './session-cookie-policy.ts';

const preview = { production: true, localHttpPreview: true, host: '127.0.0.1:3100', origin: 'http://127.0.0.1:3100' };

test('HTTP loopback previews allow cookies in WebKit only after explicit opt-in', () => {
  for (const host of ['127.0.0.1:3100', 'localhost:3100', '[::1]:3100']) {
    assert.equal(shouldSecureSessionCookie({ ...preview, host, origin: `http://${host}` }), false);
    assert.equal(shouldSecureSessionCookie({ ...preview, host, origin: `http://${host}`, localHttpPreview: false }), true);
  }
});

test('production and HTTPS cookies retain Secure even when the preview flag is set', () => {
  for (const host of ['support.gascompsuperlock.com', 'localhost.evil.example', '192.168.1.5', '127.0.0.2']) {
    assert.equal(shouldSecureSessionCookie({ ...preview, host, origin: `http://${host}` }), true);
    assert.equal(shouldSecureSessionCookie({ ...preview, host, origin: `https://${host}` }), true);
  }
  assert.equal(shouldSecureSessionCookie({ ...preview, origin: 'https://127.0.0.1:3100' }), true);
});

test('missing, malformed, mismatched, and noncanonical origins cannot downgrade cookies', () => {
  for (const origin of [null, '', 'null', 'invalid', 'http://localhost:3100', 'http://127.0.0.1:3000', 'http://127.0.0.1:3100/', 'http://user@127.0.0.1:3100', 'http://127.0.0.1:3100?preview=1']) {
    assert.equal(shouldSecureSessionCookie({ ...preview, origin }), true);
  }
  assert.equal(shouldSecureSessionCookie({ ...preview, host: null }), true);
});

test('the existing development cookie behavior remains unchanged', () => {
  assert.equal(shouldSecureSessionCookie({ ...preview, production: false, localHttpPreview: false }), false);
});
