import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDB, freshGroup } from '../database.js';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');

test('database defaults include music catalog and group warning settings', () => {
  const db = freshDB();
  const group = freshGroup();
  assert.deepEqual(db.musicTracks, []);
  assert.equal(group.warningSettings.limit, 3);
  assert.equal(group.warningSettings.duration, 10);
  assert.equal(group.warningSettings.enabled, false);
});

test('Arabic activation, help and welcome aliases are registered', () => {
  const source = read('../commands.js');
  assert.match(source, /تفعيل نغنوغ/);
  assert.match(source, /مساعدة\|المساعدة\|شرح البوت/);
  assert.match(source, /تغيير الترحيب/);
  assert.match(source, /setMyCommands/);
});

test('touch menu exposes decoration and a music library with copyable name results', () => {
  const source = read('../touches.js');
  assert.match(source, /زخرفة الأسماء/);
  assert.match(source, /مكتبة الأغاني/);
  assert.match(source, /copy_text: \{ text: result \}/);
  assert.match(source, /زخارف جديدة \(10\)/);
});

test('warning durations match requested 3, 5, 10, 15, 30 and 60 minutes', () => {
  const source = read('../commands/callbacks.js');
  assert.match(source, /const durations = \[3, 5, 10, 15, 30, 60\]/);
});

test('broadcast supports copied source messages and progress totals', () => {
  const source = read('../commands/callbacks.js');
  assert.match(source, /copyMessage\(Number\(userId\), sourceChatId, sourceMessageId\)/);
  assert.match(source, /استلموا الرسالة بنجاح/);
  assert.match(source, /نسبة النجاح/);
});
