import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';

const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === './video-preparation-policy' || specifier === '../model/video-evidence') return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const { validateVideoPlayback } = await import('./video-validation.ts');
hooks.deregister();

test('mobile signature validation avoids a browser decoder but still rejects unsupported bytes', async t => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Android Mobile' } });
  t.after(() => Object.defineProperty(globalThis, 'navigator', originalNavigator));
  // No document or video decoder is available in this test. A valid container
  // must be deferred to server verification, never treated as a decode failure.
  const bytes = await readFile(new URL('../server/fixtures/valid.mp4', import.meta.url));
  assert.equal(await validateVideoPlayback(new File([bytes], 'video.mp4', { type: 'video/mp4' })), null);
  const invalid = new File(['this is not a video'], 'video.mp4', { type: 'video/mp4' });
  assert.match(await validateVideoPlayback(invalid), /Choose a video file/);
});
