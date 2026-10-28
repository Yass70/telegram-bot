import test from 'node:test';
import assert from 'node:assert/strict';
import { isLink, isFlood } from '../src/moderation.js';

test('detects common Telegram and web links', () => {
  assert.equal(isLink('تابع https://example.com'), true);
  assert.equal(isLink('رابط القناة t.me/example'), true);
  assert.equal(isLink('هلا بيكم يا جماعة'), false);
});

test('detects flood after five messages in a short window', () => {
  const id = `test-${Date.now()}`;
  const now = 100000;
  assert.equal(isFlood(id, '1', now), false);
  assert.equal(isFlood(id, '1', now + 200), false);
  assert.equal(isFlood(id, '1', now + 400), false);
  assert.equal(isFlood(id, '1', now + 600), false);
  assert.equal(isFlood(id, '1', now + 800), true);
});
