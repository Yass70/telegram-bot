import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBaghdadDateTime } from '../reminders.js';
import { ADHKAR, ADHKAR_LABELS, randomDhikr } from '../adhkar.js';
import { replaceByRules } from '../globalTextOverrides.js';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('reminder date parser uses Baghdad UTC+3 and validates the future', () => {
  const now = Date.UTC(2026, 9, 1, 0, 0);
  const parsed = parseBaghdadDateTime('30/10/2026 18:45', now);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.timestamp, Date.UTC(2026, 9, 30, 15, 45));
  assert.equal(parseBaghdadDateTime('31/02/2026 18:45', now).ok, false);
  assert.equal(parseBaghdadDateTime('bad date', now).ok, false);
  assert.equal(parseBaghdadDateTime('30/09/2026 18:45', now).ok, false);
});

test('adhkar menu has all requested categories and can return a random alternative', () => {
  assert.deepEqual(Object.keys(ADHKAR_LABELS), ['evening', 'morning', 'sleep', 'quran']);
  for (const key of Object.keys(ADHKAR_LABELS)) {
    assert.ok(ADHKAR[key].length >= 3);
    assert.notEqual(randomDhikr(key, ADHKAR[key][0]), ADHKAR[key][0]);
  }
});

test('owner global text rules replace matching text for all outbound messages', () => {
  const db = { globalTextOverrides: { texts: [{ from: 'نص القائمة الأصلي', to: 'النص المعدل للجميع' }] } };
  const original = 'قبل نص القائمة الأصلي وبعده';
  assert.equal(replaceByRules(original, db.globalTextOverrides.texts), 'قبل النص المعدل للجميع وبعده');
  const callbacks = read('../commands/callbacks.js');
  assert.match(callbacks, /db\.globalTextOverrides\.texts/);
  assert.match(callbacks, /سيظهر لجميع المستخدمين/);
  const apiWrapper = read('../globalTextOverrides.js');
  assert.match(apiWrapper, /case 'sendMessage'/);
  assert.match(apiWrapper, /case 'editMessageText'/);
});

test('management menu no longer contains warnings while group overview keeps them', () => {
  const callbacks = read('../commands/callbacks.js');
  const management = callbacks.split("if (data === 'managementmenu')")[1].split("if (data === 'howto')")[0];
  assert.doesNotMatch(management, /warningsmenu/);
  const groupOverview = callbacks.split('async function showSelectedGroupMenu')[1].split("if (data === 'groupoverview')")[0];
  assert.match(groupOverview, /warningsmenu/);
});

test('reminder feature is connected to touches menu and persistent storage', () => {
  const touches = read('../touches.js');
  const database = read('../database.js');
  const messages = read('../commands/messages.js');
  const index = read('../index.js');
  assert.match(touches, /'⏰ ذكّرني', 'remindermenu'/);
  assert.match(database, /reminders: \[\]/);
  assert.match(messages, /action === 'reminder-text'/);
  assert.match(messages, /action === 'reminder-date'/);
  assert.match(index, /Reminder scheduler error/);
});
