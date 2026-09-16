import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hooks = registerHooks({ resolve(s,c,n) { return s === 'server-only' ? {url:'data:text/javascript,export {};',shortCircuit:true} : n(s,c); } });
const { uploadClaimEvidence, claimStorageFetch } = await import('./claim-storage.ts');
hooks.deregister();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('evidence uploads overlap with at most three active requests', async () => {
  let active = 0, peak = 0;
  const done = [];
  await uploadClaimEvidence([1,2,3,4,5,6], async item => {
    peak = Math.max(peak, ++active);
    await delay(10);
    done.push(item); active--;
  });
  assert.equal(peak, 3);
  assert.deepEqual(done.sort(), [1,2,3,4,5,6]);
});
test('upload failure stops new work and settles late uploads before rollback', async () => {
  const done = [];
  await assert.rejects(uploadClaimEvidence([1,2,3,4,5,6], async item => {
    if (item === 2) throw new Error('Storage unavailable');
    await delay(20); done.push(item);
  }), /Storage unavailable/);
  assert.deepEqual(done.sort(), [1,3]);
  await delay(30);
  assert.deepEqual(done.sort(), [1,3]);
});
test('stalled provider requests abort and subsequent retries cannot reset the save budget', async () => {
  let calls = 0;
  const bounded = claimStorageFetch(20, async (_url, init) => {
    calls++;
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), {once:true}));
  });
  const keepAlive = setTimeout(() => {}, 100);
  try {
    await assert.rejects(bounded('https://example.test/storage/v1/object'), {name:'TimeoutError'});
    await assert.rejects(bounded('https://example.test/rest/v1/tickets'), /timed out/);
    assert.equal(calls, 1);
  } finally { clearTimeout(keepAlive); }
});
test('request cancellation is preserved when adding storage timeouts', async () => {
  const controller = new AbortController();
  const bounded = claimStorageFetch(1000, async (_url, init) => {
    controller.abort();
    assert.equal(init.signal.aborted, true);
    return new Response();
  });
  await bounded('https://example.test/rest/v1/tickets', {signal:controller.signal});
});
