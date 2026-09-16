import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === './provinces' && context.parentURL?.includes('/service-center/model/')) return next('./provinces.ts', context);
  return next(specifier, context);
} });
const { parseGoogleMapsPage, getGoogleMapsPreviewUrl } = await import('./google-maps-import.ts');
hooks.deregister();

const pageUrl = 'https://www.google.com/maps/place/Example/@-6,106,12z';

// Reduced synthetic fixture using the selected-place structure observed in a public
// Maps preview response. No downloaded reviews, contributor identities, or photos.
function fixture() {
  const place = [];
  place[2] = ['Example Street 12', 'Sleman Regency, Special Region of Yogyakarta 55582'];
  place[9] = [null, null, -7.65, 110.42];
  place[10] = '0x2e7a5f:0x123456';
  place[11] = 'Example Service Center';
  place[39] = 'Example Street 12, Sleman Regency, Special Region of Yogyakarta 55582';
  place[178] = [['0811-0000-000', [['0811-0000-000', 1], ['+62 811-0000-000', 2]]]];
  place[183] = [null, ['Example District', 'Example Street 12', 'Example Street 12', 'Sleman Regency', '55582', 'Special Region of Yogyakarta', 'ID']];
  place[243] = 'ID';
  const payload = [];
  payload[4] = [[50000, 106.8, -6.2]]; // Camera coordinates must never win.
  payload[6] = place;
  return payload;
}

function preview(payload) { return ")]}'\n" + JSON.stringify(payload); }
function html(payload, slot = 6) {
  const state = [];
  state[3] = [];
  state[3][slot] = preview(payload);
  return `<script>window.APP_INITIALIZATION_STATE=${JSON.stringify(state)};window.other="ignored";</script>`;
}

test('extracts the selected public place and structured Indonesian address', () => {
  const expected = {
    name: 'Example Service Center', address: 'Example Street 12, Sleman Regency, Special Region of Yogyakarta 55582',
    city: 'Sleman Regency', provinceCode: '34', phone: '0811-0000-000', latitude: -7.65, longitude: 110.42,
  };
  assert.deepEqual(parseGoogleMapsPage(preview(fixture()), pageUrl), expected);
  assert.deepEqual(parseGoogleMapsPage(html(fixture()), pageUrl), expected);
  assert.deepEqual(parseGoogleMapsPage(html(fixture(), 5), pageUrl), expected);
  assert.equal('whatsapp' in expected, false);
});

test('ignores related places, page camera positions, and unverified place reference labels', () => {
  const payload = fixture();
  payload[6][99] = fixture();
  payload[6][178] = null;
  const result = parseGoogleMapsPage(html(payload), pageUrl);
  assert.equal(result.phone, undefined);
  assert.equal(result.latitude, -7.65);
  const referenceOnly = [['0x2e7a5f:0x123456', 'URL title is not verified place data', [[50000, 106.8, -6.2]]]];
  assert.deepEqual(parseGoogleMapsPage(html(referenceOnly, 5), pageUrl), {});
  assert.deepEqual(parseGoogleMapsPage(preview([fixture()]), pageUrl), {});
});

test('uses exact province components and distinguishes the Papua and island provinces', () => {
  for (const [name, code] of [['Papua', '94'], ['West Papua', '91'], ['Southwest Papua', '92'], ['Papua Barat Daya', '92'], ['Riau Islands', '21'], ['North Maluku', '82'], ['Daerah Istimewa Yogyakarta', '34'], ['DKI Jakarta', '31']]) {
    const payload = fixture();
    payload[6][183][1][5] = name;
    assert.equal(parseGoogleMapsPage(preview(payload), pageUrl).provinceCode, code, name);
  }
  const payload = fixture();
  payload[6][183][1][5] = 'Unknown province';
  payload[6][39] = 'Jakarta Street 12, Unknown province';
  assert.equal(parseGoogleMapsPage(preview(payload), pageUrl).provinceCode, undefined);
});

test('falls back only to verified address lines and city components', () => {
  const payload = fixture();
  payload[6][39] = null;
  payload[6][183] = null;
  payload[6][82] = [null, null, null, 'Sleman Regency'];
  const result = parseGoogleMapsPage(preview(payload), pageUrl);
  assert.equal(result.address, payload[6][2].join(', '));
  assert.equal(result.city, 'Sleman Regency');
  assert.equal(result.provinceCode, '34');
});

test('imports bounded regular opening hours without using secondary service hours', () => {
  const payload = fixture();
  payload[6][34] = [null, [['Monday', ['09:00–17:00']], ['Tuesday', ['Closed']]]];
  payload[6][118] = [['Special service', 'Open 24 hours']];
  assert.equal(parseGoogleMapsPage(preview(payload), pageUrl).hours, 'Monday: 09:00–17:00; Tuesday: Closed');
  payload[6][34] = null;
  assert.equal(parseGoogleMapsPage(preview(payload), pageUrl).hours, undefined);
  payload[6][34] = [null, [['Monday', ['x'.repeat(301)]]]];
  assert.equal(parseGoogleMapsPage(preview(payload), pageUrl).hours, undefined);
});

test('imports current public weekly hours from the selected place schedule', () => {
  const payload = fixture();
  // Shape observed in the public National Monument preview; dates are metadata,
  // while the displayed ranges can include closure or multiple opening periods.
  payload[6][203] = [[
    ['Wednesday', 3, [2026, 9, 16], [['8\u202fAM–9\u202fPM', [[8], [21]]]], 0, 1],
    ['Thursday', 4, [2026, 9, 17], [['8 AM–noon', [[8], [12]]], ['1–9 PM', [[13], [21]]]], 0, 1],
    ['Monday', 1, [2026, 9, 21], [['Closed']], 0, 2],
  ], ['Open · Closes 9 PM']];
  assert.equal(parseGoogleMapsPage(preview(payload), pageUrl).hours, 'Wednesday: 8 AM–9 PM; Thursday: 8 AM–noon, 1–9 PM; Monday: Closed');
  payload[6][203][0][0][3] = [['x'.repeat(301)]];
  assert.equal(parseGoogleMapsPage(preview(payload), pageUrl).hours, undefined);
  payload[6][203][0][0][3] = [];
  assert.equal(parseGoogleMapsPage(preview(payload), pageUrl).hours, undefined);
});

test('rejects explicitly foreign places even within the coarse coordinate bounds', () => {
  const payload = fixture();
  payload[6][183][1][6] = 'SG';
  assert.throws(() => parseGoogleMapsPage(preview(payload), pageUrl), /outside Indonesia/);
  payload[6][183][1][6] = 'ID';
  payload[6][9] = [null, null, 40.7, -74];
  assert.throws(() => parseGoogleMapsPage(preview(payload), pageUrl), /outside Indonesia/);
});

test('extracts explicit pin coordinates but never a viewport or route endpoint', () => {
  assert.deepEqual(parseGoogleMapsPage('', pageUrl), {});
  assert.deepEqual(parseGoogleMapsPage('', `${pageUrl}/data=!8m2!3d-7.6!4d110.4`), { latitude: -7.6, longitude: 110.4 });
  assert.deepEqual(parseGoogleMapsPage('', 'https://www.google.com/maps?q=-7.6,110.4'), { latitude: -7.6, longitude: 110.4 });
  assert.deepEqual(parseGoogleMapsPage('', 'https://www.google.com/maps/search/2.841175,+117.389610?coh=123'), { latitude: 2.841175, longitude: 117.38961 });
  assert.deepEqual(parseGoogleMapsPage('', 'https://www.google.com/maps/search/-7.6%2C%20110.4/'), { latitude: -7.6, longitude: 110.4 });
  assert.deepEqual(parseGoogleMapsPage('', 'https://www.google.com/maps/search/Example+Service+Center'), {});
  assert.deepEqual(parseGoogleMapsPage('', 'https://www.google.com/maps/search/%invalid'), {});
  assert.deepEqual(parseGoogleMapsPage('', 'https://www.google.com/maps/dir/data=!3d-7.6!4d110.4'), {});
  assert.throws(() => parseGoogleMapsPage('', 'https://www.google.com/maps?q=48.8,2.3'), /outside Indonesia/);
});

test('malformed or executable initialization and oversized responses return no fabricated details', () => {
  for (const source of ['APP_INITIALIZATION_STATE=[', 'APP_INITIALIZATION_STATE=[(()=>{throw 1})()]', 'APP_INITIALIZATION_STATE=' + '['.repeat(201), 'x'.repeat(3_000_001), '<title>Google Maps</title>']) {
    assert.deepEqual(parseGoogleMapsPage(source, pageUrl), {});
  }
  const payload = fixture();
  payload[6][178] = [['not a phone']];
  payload[6][183][1][3] = 'x'.repeat(121);
  const result = parseGoogleMapsPage(preview(payload), pageUrl);
  assert.equal(result.phone, undefined);
  assert.equal(result.city, undefined);
});

test('follows only declared same-origin Maps place preload or prefetch resources', () => {
  const markup = '<link href="/maps/preview/place?hl=en&amp;q=Example" as="fetch" rel="preload">';
  assert.equal(getGoogleMapsPreviewUrl(markup, pageUrl), 'https://www.google.com/maps/preview/place?hl=en&q=Example');
  assert.equal(getGoogleMapsPreviewUrl("<link rel='prefetch' href='/maps/preview/place?q=Example'>", pageUrl), 'https://www.google.com/maps/preview/place?q=Example');
  for (const href of ['https://evil.example/maps/preview/place', '//127.0.0.1/maps/preview/place', '/maps/preview/search', 'https://user@www.google.com/maps/preview/place']) {
    assert.equal(getGoogleMapsPreviewUrl(`<link href="${href}" rel="preload">`, pageUrl), undefined);
  }
  assert.equal(getGoogleMapsPreviewUrl('<link href="/maps/preview/place" rel="canonical">', pageUrl), undefined);
  assert.equal(getGoogleMapsPreviewUrl(markup, 'https://evil.example/maps'), undefined);
  assert.equal(getGoogleMapsPreviewUrl(markup, 'https://user@www.google.com/maps'), undefined);
  assert.equal(getGoogleMapsPreviewUrl(markup, 'https://www.google.com:444/maps'), undefined);
});
