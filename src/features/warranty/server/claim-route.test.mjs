import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const state = { calls:0 };
globalThis.claimRouteTest = state;
const hooks = registerHooks({resolve(s,c,n) {
  if (s === 'server-only') return {url:'data:text/javascript,export {};',shortCircuit:true};
  if (s === './claim-actions') return {url:'data:text/javascript,'+encodeURIComponent('export async function createWarrantyClaim(_, form) {globalThis.claimRouteTest.calls++; return {success:true,ticketId:form.get("ticket")};}'),shortCircuit:true};
  return n(s,c);
}});
const {postWarrantyClaim} = await import('./claim-route.ts');
hooks.deregister();
function request(headers={}, body=new FormData()) {
  return new Request('https://support.example/warranty/claims',{method:'POST',headers:{origin:'https://support.example',...headers},body});
}
test('cross-origin, missing-origin and oversized requests are rejected before creating claims', async () => {
  for (const origin of ['https://evil.example', '', 'null', 'https://support.example/path']) assert.equal((await postWarrantyClaim(request({origin}))).status,403);
  assert.equal((await postWarrantyClaim(request({'content-length':String(73*1024*1024)}))).status,413);
  assert.equal((await postWarrantyClaim(request({'content-type':'application/json'}, '{}'))).status,415);
  assert.equal(state.calls,0);
});
test('streamed bodies without content length still enforce the size cap', async () => {
  let count=0, cancelled=false;
  const stream = new ReadableStream({pull(c){count++;c.enqueue(new Uint8Array(1024*1024));},cancel(){cancelled=true;}});
  const r = request({'content-type':'multipart/form-data; boundary=example'});
  const streamed = new Request(r.url,{method:'POST',headers:r.headers,body:stream,duplex:'half'});
  assert.equal((await postWarrantyClaim(streamed)).status,413);
  assert.ok(count<=75);
  assert.equal(cancelled,true);
  assert.equal(state.calls,0);
});
test('stalled upload bodies return an error instead of holding the request open', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const r=request();
  const stream = new ReadableStream({pull(){}});
  const result=postWarrantyClaim(new Request(r.url,{method:'POST',headers:r.headers,body:stream,duplex:'half'}));
  t.mock.timers.tick(45_000);
  assert.equal((await result).status,503);
  assert.equal(state.calls,0);
});
test('valid multipart submission returns uncached confirmation and supports a trusted host behind proxy TLS', async () => {
  const data = new FormData();data.set('ticket','GWC-20260916-ABC123');
  const response = await postWarrantyClaim(new Request('http://internal:3000/warranty/claims', {method:'POST',headers:{host:'support.example',origin:'https://support.example'},body:data}));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).ticketId,'GWC-20260916-ABC123');
  assert.equal(state.calls,1);
});

test('browser multipart boundaries retain their original letter casing', async () => {
  const boundary='----WebKitFormBoundaryAaBb123';
  const body=`--${boundary}\r\nContent-Disposition: form-data; name="ticket"\r\n\r\nGWC-20260916-BROWSER\r\n--${boundary}--\r\n`;
  const response=await postWarrantyClaim(request({'content-type':`multipart/form-data; boundary=${boundary}`},body));
  assert.equal((await response.json()).ticketId,'GWC-20260916-BROWSER');
});
