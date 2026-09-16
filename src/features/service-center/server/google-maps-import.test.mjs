import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const state = { admin: false, headers: new Headers(), calls: 0 };
globalThis.mapsImportTest = state;
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return mock('export {};');
  if (specifier === 'next/headers') return mock('export const headers = async () => globalThis.mapsImportTest.headers;');
  if (specifier === '@/features/auth/server/session') return mock('export const getAdminSession = async () => globalThis.mapsImportTest.admin;');
  if (specifier.startsWith('.') && context.parentURL?.includes('/service-center/') && !/\.(?:ts|mjs)$/.test(specifier)) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const { importGoogleMapsLocation } = await import('./google-maps-import.ts');
const { importGoogleMapsAction } = await import('./maps-actions.ts');
hooks.deregister();
const placeUrl = 'https://www.google.com/maps/place/Sample/?hl=en';
const place = [];
place[10] = '0x123:0x456'; place[11] = 'Sample Center';
place[39] = 'Sample street, Bandung, Jawa Barat, Indonesia';
place[9] = [null,null,-6.9,107.6]; place[183] = [null,[null,null,null,'Bandung','40123','Jawa Barat','ID']];
const payload = []; payload[6] = place;
const initialization = []; initialization[3] = []; initialization[3][6] = JSON.stringify(payload);
const page = `<script>window.APP_INITIALIZATION_STATE=${JSON.stringify(initialization)};</script>`;
const html = body => new Response(body, { headers: { 'content-type':'text/html' } });

test('rejects unsupported URLs before fetching and checks every redirect hop', async () => {
  let calls = 0;
  const unexpected = async () => { calls++; throw new Error('Unexpected request'); };
  for (const url of ['', null, 'http://maps.google.com/', 'https://127.0.0.1/', 'https://google.com.evil.example/maps', 'https://user:pass@www.google.com/maps', 'https://www.google.com:444/maps']) {
    assert.ok((await importGoogleMapsLocation(url, unexpected)).error);
  }
  assert.equal(calls, 0);
  for (const target of ['http://127.0.0.1/', 'https://evil.example/', 'https://accounts.google.com/login', 'file:///etc/passwd']) {
    let hops = 0;
    const result = await importGoogleMapsLocation('https://maps.app.goo.gl/example', async () => { hops++; return new Response(null, { status:302, headers:{ location:target } }); });
    assert.ok(result.error);
    assert.equal(hops, 1);
  }
});

test('follows bounded safe redirects, does not send credentials, and returns a reviewable preview', async () => {
  const calls = [];
  const result = await importGoogleMapsLocation('https://maps.app.goo.gl/example', async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'manual');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal);
    assert.equal(new Headers(options.headers).has('cookie'), false);
    assert.equal(new Headers(options.headers).has('authorization'), false);
    return calls.length === 1 ? new Response(null, { status:302,headers:{location:placeUrl} }) : html(page);
  });
  assert.deepEqual(calls, ['https://maps.app.goo.gl/example', placeUrl]);
  assert.equal(result.data.name,'Sample Center');
  assert.equal(result.data.provinceCode,'32');
  assert.match(result.warning,/phone/);
  assert.equal(result.data.whatsapp,undefined);
});

test('bounds redirect loops, response sizes, provider blocks and network failure', async () => {
  let calls = 0;
  const loop = await importGoogleMapsLocation(placeUrl, async () => { calls++; return new Response(null, {status:302,headers:{location:placeUrl}}); });
  assert.ok(loop.error); assert.equal(calls,6);
  for (const response of [new Response(null,{status:429}), new Response('x',{headers:{'content-type':'application/octet-stream'}}), html('Before you continue to Google'),html('Our systems have detected unusual traffic'),html('x'.repeat(3*1024*1024+1))]) {
    assert.ok((await importGoogleMapsLocation(placeUrl,async()=>response)).error);
  }
  const oversized = new Response('x',{headers:{'content-type':'text/html','content-length':String(4*1024*1024)}});
  assert.match((await importGoogleMapsLocation(placeUrl,async()=>oversized)).error,/too large/);
  assert.ok((await importGoogleMapsLocation(placeUrl,async()=>{throw new Error('private transport detail');})).error);
});

test('admin authentication and same-origin verification precede external requests', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { state.calls++; return html(page); };
  try {
    state.admin=false;
    assert.match((await importGoogleMapsAction(placeUrl)).error,/session/);
    state.admin=true;
    for (const origin of ['', 'null', 'https://foreign.example', 'ftp://local.example','https://local.example/path']) {
      state.headers = new Headers({host:'local.example',origin});
      assert.ok((await importGoogleMapsAction(placeUrl)).error);
    }
    assert.equal(state.calls,0);
    state.headers=new Headers({host:'local.example',origin:'https://local.example'});
    assert.equal((await importGoogleMapsAction(placeUrl)).data.name,'Sample Center');
    assert.equal(state.calls,1);
  } finally { globalThis.fetch=original; delete globalThis.mapsImportTest; }
});

test('reads only the declared same-origin preview resource and does not follow its redirects', async () => {
  const declared = '<link rel="preload" as="fetch" href="/maps/preview/place?pb=sample&amp;hl=en">';
  const calls = [];
  const result = await importGoogleMapsLocation(placeUrl, async (url) => {
    calls.push(url);
    return calls.length === 1 ? html(declared) : new Response(")]}'\n"+JSON.stringify(payload), {headers:{'content-type':'application/json'}});
  });
  assert.equal(result.data.name,'Sample Center');
  assert.deepEqual(calls,[placeUrl,'https://www.google.com/maps/preview/place?pb=sample&hl=en']);
  const denied = [];
  const redirect = await importGoogleMapsLocation(placeUrl, async (url) => {
    denied.push(url);
    return denied.length === 1 ? html(declared) : new Response(null,{status:302,headers:{location:'https://evil.example/'}});
  });
  assert.ok(redirect.error);
  assert.equal(denied.length,2);
  for (const target of ['https://evil.example/maps/preview/place','https://www.google.com/url?q=https://evil.example/']) {
    let requested=0;
    assert.ok((await importGoogleMapsLocation(placeUrl,async()=>{requested++;return html(`<link rel="preload" href="${target}">`);})).error);
    assert.equal(requested,1);
  }
});
