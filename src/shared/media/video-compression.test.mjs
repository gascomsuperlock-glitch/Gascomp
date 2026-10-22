import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === './video-preparation-policy') return next('./video-preparation-policy.ts', context);
  return next(specifier, context);
} });
const { prepareVideo, VIDEO_COMPRESSION_TIMEOUT_MS } = await import('./video-compression.ts');
hooks.deregister();

class FakeWorker {
  static current;
  constructor() { FakeWorker.current = this; }
  postMessage(file) { this.file = file; }
  terminate() { this.terminated = true; }
}
const source = new File([new Uint8Array(3 * 1024 * 1024)], 'original.mov', { type: 'video/quicktime' });
function setup(t) {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Desktop', hardwareConcurrency: 8, deviceMemory: 8 } });
  globalThis.Worker = FakeWorker;
  globalThis.VideoEncoder = class {};
  t.after(() => { delete globalThis.Worker; delete globalThis.VideoEncoder; Object.defineProperty(globalThis, 'navigator', originalNavigator); });
}
test('mobile and constrained devices upload the original without starting an encoder', async t => {
  setup(t);
  for (const device of [
    { userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/130 Mobile', hardwareConcurrency: 8, deviceMemory: 8 },
    { userAgent: 'Mozilla/5.0 (iPhone)', hardwareConcurrency: 8 },
    { userAgent: 'Desktop Safari', platform: 'MacIntel', maxTouchPoints: 5, hardwareConcurrency: 8 },
    { userAgent: 'Desktop Chrome', hardwareConcurrency: 8, deviceMemory: 4 },
    { userAgent: 'Desktop Chrome', hardwareConcurrency: 4, deviceMemory: 8 },
  ]) {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: device });
    FakeWorker.current = null;
    assert.deepEqual(await prepareVideo(source, new AbortController().signal, () => assert.fail('Unexpected compression progress')), { file: source, outcome: 'original' });
    assert.equal(FakeWorker.current, null);
  }
});
test('compressed evidence replaces only the upload copy and releases the worker', async t => {
  setup(t);
  const updates = [];
  const pending = prepareVideo(source, new AbortController().signal, value => updates.push(value));
  const worker = FakeWorker.current;
  worker.onmessage({ data: { percent: 0 } });
  worker.onmessage({ data: { percent: 100 } });
  const copy = new File(['compressed bytes'], 'original-compressed.mp4', { type: 'video/mp4' });
  worker.onmessage({ data: { file: copy } });
  assert.deepEqual(await pending, { file: copy, outcome: 'compressed' });
  assert.deepEqual(updates, [0, 99]);
  assert.equal(worker.file, source);
  assert.equal(source.name, 'original.mov');
  assert.equal(worker.terminated, true);
});
test('skip, timeout, codec failure and oversized results preserve the original and stop background work', async t => {
  setup(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const event of ['skip', 'timeout', 'error', 'message-error', 'empty', 'larger', 'unavailable']) {
    const controller = new AbortController();
    const pending = prepareVideo(source, controller.signal, () => {});
    const worker = FakeWorker.current;
    if (event === 'skip') controller.abort();
    if (event === 'timeout') t.mock.timers.tick(VIDEO_COMPRESSION_TIMEOUT_MS);
    if (event === 'error') worker.onerror({ preventDefault() {} });
    if (event === 'message-error') worker.onmessageerror();
    if (event === 'empty') worker.onmessage({ data: { file: new File([], 'empty.mp4') } });
    if (event === 'larger') worker.onmessage({ data: { file: source } });
    if (event === 'unavailable') worker.onmessage({ data: { file: null } });
    assert.deepEqual(await pending, { file: source, outcome: 'original' }, event);
    assert.equal(worker.terminated, true, event);
  }
});
test('small files and unsupported browsers do not start a worker', async t => {
  setup(t);
  FakeWorker.current = null;
  const small = new File(['small'], 'small.mp4');
  assert.deepEqual(await prepareVideo(small, new AbortController().signal, () => {}), { file: small, outcome: 'small' });
  globalThis.VideoEncoder = undefined;
  assert.deepEqual(await prepareVideo(source, new AbortController().signal, () => {}), { file: source, outcome: 'original' });
  assert.equal(FakeWorker.current, null);
});
test('a superseded worker cannot overwrite the newer selection or emit stale progress', async t => {
  setup(t);
  const controller = new AbortController();
  const updates = [];
  const pending = prepareVideo(source, controller.signal, value => updates.push(value));
  const worker = FakeWorker.current;
  controller.abort();
  worker.onmessage({ data: { percent: 90 } });
  worker.onmessage({ data: { file: new File(['stale'], 'stale.mp4') } });
  assert.deepEqual(await pending, { file: source, outcome: 'original' });
  assert.deepEqual(updates, []);
});
