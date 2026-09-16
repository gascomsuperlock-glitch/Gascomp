import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submitClaim, CLAIM_CONNECTION_ERROR, CLAIM_TIMEOUT_ERROR } from './claim-transport.ts';
class FakeXHR {
  upload = {};
  status = 200;
  static current;
  constructor() { FakeXHR.current = this; }
  open(method, url) { this.method = method; this.url = url; }
  send(data) { this.data = data; }
  abort() { this.aborted = true; this.onabort?.(); }
}
globalThis.XMLHttpRequest = FakeXHR;
test('upload completion shows processing and does not confirm a claim until the server responds', async () => {
  const events = [];
  let completed = false;
  const data = new FormData(); data.set('name', 'Retained customer');
  const result = submitClaim(data, event => events.push(event)).then(value => {completed = true; return value;});
  const xhr = FakeXHR.current;
  xhr.upload.onprogress({lengthComputable:true,loaded:46,total:100});
  xhr.upload.onload();
  await Promise.resolve();
  assert.equal(completed, false);
  assert.deepEqual(events, [{phase:'uploading',percent:0},{phase:'uploading',percent:46},{phase:'processing',percent:100}]);
  xhr.response = {success:true,ticketId:'GWC-20260916-ABC123'};xhr.onload();
  assert.equal((await result).ticketId, 'GWC-20260916-ABC123');
  assert.equal(xhr.data.get('name'), 'Retained customer');
});
test('upload stall and processing stall both resolve with an honest timeout and abort transport', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  for (const phase of ['uploading','processing']) {
    const result = submitClaim(new FormData(), () => {});
    const xhr = FakeXHR.current;
    if (phase === 'processing') xhr.upload.onload();
    t.mock.timers.tick(phase === 'processing' ? 105_000 : 45_000);
    assert.deepEqual(await result, {error:CLAIM_TIMEOUT_ERROR});
    assert.equal(xhr.aborted, true);
  }
});
test('network failures and proxy HTML errors stop pending without fabricating success', async () => {
  for (const event of ['onerror','onload','ontimeout']) {
    const result = submitClaim(new FormData(), () => {});
    FakeXHR.current.response = null;FakeXHR.current[event]();
    assert.equal((await result).error, event === 'ontimeout' ? CLAIM_TIMEOUT_ERROR : CLAIM_CONNECTION_ERROR);
  }
});
test('server validation preserves field errors for correction', async () => {
  const result = submitClaim(new FormData(), () => {});
  const expected = {error:'Review the supporting evidence.',fieldErrors:{damageVideo:'Invalid video'}};
  FakeXHR.current.response = expected;FakeXHR.current.onload();
  assert.deepEqual(await result, expected);
});
