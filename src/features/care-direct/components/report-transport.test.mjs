import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submitReport, REPORT_CONNECTION_ERROR, REPORT_TIMEOUT_ERROR } from './report-transport.ts';
class FakeXHR {
  upload = {}; status = 200; static current;
  constructor() { FakeXHR.current = this; }
  open(method, url) { this.method = method; this.url = url; }
  send(data) { this.data = data; }
  abort() { this.aborted = true; this.onabort?.(); }
}
globalThis.XMLHttpRequest = FakeXHR;
test('upload completion waits for persisted report confirmation and retains submission identity', async () => {
  const events = []; let completed = false;
  const data = new FormData(); data.set('submissionId', 'same-retry-key');
  const response = submitReport(data, event => events.push(event), new AbortController().signal).then(result => { completed = true; return result; });
  const xhr = FakeXHR.current;
  assert.equal(xhr.url, '/care-direct/reports');
  xhr.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 }); xhr.upload.onload();
  await Promise.resolve(); assert.equal(completed, false);
  assert.deepEqual(events.at(-1), { phase: 'processing', percent: 100 });
  xhr.response = { success: true, reportId: 'CD-report' }; xhr.onload();
  assert.equal((await response).reportId, 'CD-report');
  assert.equal(xhr.data.get('submissionId'), 'same-retry-key');
});
test('upload and processing stalls abort without claiming success', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const processing of [false, true]) {
    const response = submitReport(new FormData(), () => {}, new AbortController().signal);
    const xhr = FakeXHR.current;
    if (processing) xhr.upload.onload();
    t.mock.timers.tick(processing ? 105_000 : 45_000);
    assert.deepEqual(await response, { error: REPORT_TIMEOUT_ERROR }); assert.equal(xhr.aborted, true);
  }
});
test('unmount signal cancels transport and late progress is ignored', async () => {
  const controller = new AbortController(); const events = [];
  const response = submitReport(new FormData(), value => events.push(value), controller.signal);
  const xhr = FakeXHR.current; controller.abort(); xhr.upload.onload();
  assert.equal((await response).error, REPORT_CONNECTION_ERROR); assert.equal(xhr.aborted, true); assert.equal(events.length, 1);
});
test('proxy errors and success-shaped error statuses are not confirmations', async () => {
  for (const response of [null, { success: true, reportId: 'CD-false' }]) {
    const promise = submitReport(new FormData(), () => {}, new AbortController().signal);
    FakeXHR.current.response = response; FakeXHR.current.status = 502; FakeXHR.current.onload();
    assert.equal((await promise).error, REPORT_CONNECTION_ERROR);
  }
});
test('server field validation survives transport for correction', async () => {
  const promise = submitReport(new FormData(), () => {}, new AbortController().signal);
  const expected = { error: 'Invalid data', fieldErrors: { video: 'Invalid video' } };
  FakeXHR.current.response = expected; FakeXHR.current.status = 422; FakeXHR.current.onload();
  assert.deepEqual(await promise, expected);
});
