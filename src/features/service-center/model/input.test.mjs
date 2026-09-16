import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === './provinces' && context.parentURL?.includes('/service-center/model/')) return next('./provinces.ts', context);
  return next(specifier, context);
} });
const { validateServiceCenterInput, isGoogleMapsUrl } = await import('./input.ts');
const { INDONESIA_PROVINCES } = await import('./provinces.ts');
hooks.deregister();
const input = { name: 'Sample Service Center', provinceCode: '31', city: 'Jakarta', address: 'Sample address', phone: '', whatsapp: '', hours: '', mapsUrl: '', latitude: -6.2, longitude: 106.8, active: false };

test('all 38 BPS provinces are unique and accepted, including six Papua provinces', () => {
  assert.equal(INDONESIA_PROVINCES.length, 38);
  assert.equal(new Set(INDONESIA_PROVINCES.map(p => p.code)).size, 38);
  for (const province of INDONESIA_PROVINCES) assert.ok(validateServiceCenterInput({ ...input, provinceCode: province.code }).value);
  assert.deepEqual(INDONESIA_PROVINCES.filter(p => p.code.startsWith('9')).map(p => p.code), ['91', '92', '94', '95', '96', '97']);
});

test('validation trims fields, preserves explicit inactive state, and excludes unknown properties', () => {
  const result = validateServiceCenterInput({ ...input, name: ' Center ', secret: 'never returned' });
  assert.equal(result.value.name, 'Center');
  assert.equal(result.value.active, false);
  assert.equal('secret' in result.value, false);
});

test('validation rejects malformed, foreign-region, and coercible inputs', () => {
  for (const candidate of [null, [], {}, { ...input, provinceCode: '00' }, { ...input, latitude: NaN }, { ...input, longitude: Infinity },
    { ...input, latitude: 45 }, { ...input, longitude: 150 }, { ...input, longitude: '106.8' }, { ...input, active: 'false' },
    { ...input, name: ' ' }, { ...input, id: '../../unsafe' }, { ...input, phone: '<script>' }, { ...input, hours: 'x'.repeat(301) }]) {
    assert.ok(validateServiceCenterInput(candidate).error);
  }
});

test('Google Maps links require approved HTTPS hosts and Maps paths', () => {
  for (const url of ['', 'https://maps.app.goo.gl/abc', 'https://goo.gl/maps/abc', 'https://www.google.com/maps/search/?api=1&query=Jakarta', 'https://maps.google.co.id/?q=Jakarta']) assert.equal(isGoogleMapsUrl(url), true, url);
  for (const url of ['javascript:alert(1)', 'http://maps.google.com', 'https://google.com.evil.example/maps/', 'https://www.google.com/url?q=https://evil.example', 'https://user@maps.google.com', 'https://maps.google.com:444/maps', 'https://goo.gl/abc']) assert.equal(isGoogleMapsUrl(url), false, url);
});
