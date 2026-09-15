import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashCarePassword, verifyCarePassword, hashCareToken, createCareToken, createCareTemporaryPassword, validCarePassword, validCareUsername, normalizeCareUsername } from './password.ts';

test('password hashes use independent salts and verify only the original password', async () => {
  const password = 'A long member password';
  const first = await hashCarePassword(password);
  const second = await hashCarePassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyCarePassword(password, first), true);
  assert.equal(await verifyCarePassword('A wrong member password', first), false);
  assert.equal(await verifyCarePassword(password, first.replace('$32768$', '$1$')), false);
  assert.equal(await verifyCarePassword(password, 'malformed'), false);
});
test('opaque tokens and temporary credentials carry fresh randomness', () => {
  const token = createCareToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, createCareToken());
  assert.match(hashCareToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(hashCareToken(token), hashCareToken(createCareToken()));
  const password = createCareTemporaryPassword();
  assert.equal(validCarePassword(password), true);
  assert.notEqual(password, createCareTemporaryPassword());
});
test('credential input boundaries normalize usernames without relaxing allowed characters', () => {
  assert.equal(normalizeCareUsername('  Member.ONE '), 'member.one');
  for (const username of ['ab', 'Auser', 'a@b', 'x'.repeat(33)]) assert.equal(validCareUsername(username), false);
  assert.equal(validCareUsername('member_01-test'), true);
  assert.equal(validCarePassword('x'.repeat(7)), false);
  assert.equal(validCarePassword('x'.repeat(8)), true);
  assert.equal(validCarePassword('x'.repeat(128)), true);
  assert.equal(validCarePassword('x'.repeat(129)), false);
});
