import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCarePreviewDatabase } from './preview-database.ts';

const preview = { NODE_ENV: 'development', GASCOMP_CARE_PREVIEW_URL: 'http://127.0.0.1:54329', GASCOMP_CARE_PREVIEW_KEY: 'local-test-only-key' };

test('development can isolate Care on loopback without replacing other feature connections', () => {
  assert.deepEqual(getCarePreviewDatabase(preview), { url: preview.GASCOMP_CARE_PREVIEW_URL, key: preview.GASCOMP_CARE_PREVIEW_KEY });
  assert.equal(getCarePreviewDatabase({ NODE_ENV: 'development' }), null);
});

test('production and test always ignore preview database settings', () => {
  for (const NODE_ENV of ['production', 'test', undefined]) {
    assert.equal(getCarePreviewDatabase({ ...preview, NODE_ENV }), null);
    assert.equal(getCarePreviewDatabase({ ...preview, NODE_ENV, GASCOMP_CARE_PREVIEW_URL: 'https://untrusted.example' }), null);
  }
});

test('a broken preview configuration fails closed instead of writing to the primary database', () => {
  for (const GASCOMP_CARE_PREVIEW_URL of ['', 'invalid', 'https://remote.supabase.co', 'http://localhost.evil:54329', 'http://192.168.1.5:54329', 'http://user@localhost:54329', 'http://localhost:54329/path', 'http://localhost:54329?test=1']) {
    assert.throws(() => getCarePreviewDatabase({ ...preview, GASCOMP_CARE_PREVIEW_URL }), /unavailable/);
  }
  assert.throws(() => getCarePreviewDatabase({ ...preview, GASCOMP_CARE_PREVIEW_KEY: '' }), /unavailable/);
});
