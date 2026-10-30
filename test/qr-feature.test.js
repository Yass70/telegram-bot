import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQrPayload } from '../qrPayload.js';

test('QR URL accepts a long HTTPS URL unchanged apart from URL normalization', () => {
  const url = `https://example.com/${'a'.repeat(900)}?q=${'ع'.repeat(100)}`;
  assert.equal(buildQrPayload('url', url), new URL(url).toString());
});

test('QR text preserves Arabic content', () => {
  assert.equal(buildQrPayload('text', 'أهلاً بيك من نغنوغ 🐈‍⬛'), 'أهلاً بيك من نغنوغ 🐈‍⬛');
});

test('QR Wi-Fi encodes WPA and open networks', () => {
  assert.equal(buildQrPayload('wifi', 'My WiFi | pass1234 | WPA'), 'WIFI:T:WPA;S:My WiFi;P:pass1234;;');
  assert.equal(buildQrPayload('wifi', 'Cafe | | nopass'), 'WIFI:T:NOPASS;S:Cafe;P:;;');
});

test('QR phone and email use standard URI schemes', () => {
  assert.equal(buildQrPayload('phone', '+964 770 123 4567'), 'tel:+9647701234567');
  assert.match(buildQrPayload('email', 'a@example.com | Hello | مرحباً'), /^mailto:a@example\.com\?/);
});

test('QR location accepts HTTPS map links', () => {
  assert.equal(buildQrPayload('location', 'https://maps.app.goo.gl/example'), 'https://maps.app.goo.gl/example');
});

test('QR contact creates a vCard', () => {
  assert.match(buildQrPayload('contact', 'ياسر | +9647701234567 | y@example.com'), /BEGIN:VCARD[\s\S]*FN:ياسر[\s\S]*END:VCARD/);
});

test('QR rejects invalid URL, phone, and oversized payloads', () => {
  assert.throws(() => buildQrPayload('url', 'not a URL'), /الرابط غير صحيح/);
  assert.throws(() => buildQrPayload('phone', 'abc'), /رقم الهاتف غير صحيح/);
});
