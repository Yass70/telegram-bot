import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalGroupCommand } from '../commands/moderation.js';

test('group lock/unlock commands accept Arabic spelling and punctuation variants', () => {
  for (const value of ['قفل المجموعة', 'قفل المجموعه', 'اقفل المجموعه', 'اقفل المجموعة.', 'قفل الرسائل', 'اغلق الدردشه']) {
    assert.equal(canonicalGroupCommand(value), 'قفل المجموعة', value);
  }
  for (const value of ['فتح المجموعة', 'فتح المجموعه', 'افتح المجموعه', 'افتح المجموعة.', 'فتح الرسائل', 'افتح الدردشه']) {
    assert.equal(canonicalGroupCommand(value), 'افتح المجموعة', value);
  }
});

test('mute and unmute commands accept common variants and Arabic-Indic digits', () => {
  for (const value of ['كتم 10', 'كتم ١٠', 'اسكت 10']) assert.equal(canonicalGroupCommand(value), 'كتم 10');
  for (const value of ['فتح الكتم', 'فتح كتم', 'افتح كتم', 'فك الكتم', 'الغاء الكتم']) assert.equal(canonicalGroupCommand(value), 'فتح الكتم');
  assert.equal(canonicalGroupCommand('افتح كتم @member_name'), 'فتح الكتم @member_name');
});

test('protection and warning aliases resolve to canonical commands', () => {
  assert.equal(canonicalGroupCommand('تشغيل الحماية'), 'تفعيل الحماية');
  assert.equal(canonicalGroupCommand('إيقاف الحماية الشاملة'), 'ايقاف الحماية');
  assert.equal(canonicalGroupCommand('منع الروابط'), 'تشغيل الروابط');
  assert.equal(canonicalGroupCommand('السماح بالروابط'), 'ايقاف الروابط');
  assert.equal(canonicalGroupCommand('تشغيل الصور'), 'تشغيل الوسائط');
  assert.equal(canonicalGroupCommand('تفعيل الانذارات'), 'تشغيل الانذارات');
  assert.equal(canonicalGroupCommand('تعطيل الانذارات'), 'ايقاف الانذارات');
  assert.equal(canonicalGroupCommand('رسالة عادية.'), 'رسالة عادية.');
});
