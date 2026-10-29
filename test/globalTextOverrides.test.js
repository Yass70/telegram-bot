import test from 'node:test';
import assert from 'node:assert/strict';
import { installGlobalTextOverrides } from '../globalTextOverrides.js';

function fakeBot() {
  const calls = [];
  const api = {};
  const methods = ['sendMessage', 'answerCallbackQuery', 'editMessageText', 'sendPhoto', 'sendDocument', 'sendVideo', 'sendAudio', 'sendAnimation', 'sendVoice', 'editMessageCaption', 'editMessageReplyMarkup', 'sendMediaGroup', 'sendPoll'];
  for (const name of methods) api[name] = async (...args) => { calls.push({ name, args }); return { ok: true }; };
  return { api, calls };
}

test('global text and button rules transform visible values but preserve callback_data', async () => {
  const bot = fakeBot();
  const db = { globalTextOverrides: { texts: [{ from: 'رسالة قديمة', to: 'رسالة جديدة' }], buttons: [{ from: 'زر قديم', to: 'زر جديد' }] } };
  installGlobalTextOverrides(bot, db);
  await bot.api.sendMessage(123, 'هذه رسالة قديمة', { reply_markup: { inline_keyboard: [[{ text: 'زر قديم', callback_data: 'action:keep' }]] } });
  assert.equal(bot.calls[0].args[1], 'هذه رسالة جديدة');
  assert.equal(bot.calls[0].args[2].reply_markup.inline_keyboard[0][0].text, 'زر جديد');
  assert.equal(bot.calls[0].args[2].reply_markup.inline_keyboard[0][0].callback_data, 'action:keep');
});

test('callback alert text is transformed', async () => {
  const bot = fakeBot();
  const db = { globalTextOverrides: { texts: [{ from: 'قديم', to: 'جديد' }], buttons: [] } };
  installGlobalTextOverrides(bot, db);
  await bot.api.answerCallbackQuery('query-id', { text: 'تنبيه قديم' });
  assert.equal(bot.calls[0].args[1].text, 'تنبيه جديد');
});

test('media captions and direct API text edits receive overrides', async () => {
  const bot = fakeBot();
  const db = { globalTextOverrides: { texts: [{ from: 'وصف قديم', to: 'وصف جديد' }], buttons: [] } };
  installGlobalTextOverrides(bot, db);
  await bot.api.sendPhoto(123, 'file-id', { caption: 'وصف قديم' });
  await bot.api.editMessageText(123, 44, 'وصف قديم');
  await bot.api.editMessageCaption(123, 44, { caption: 'وصف قديم' });
  assert.equal(bot.calls[0].args[2].caption, 'وصف جديد');
  assert.equal(bot.calls[1].args[2], 'وصف جديد');
  assert.equal(bot.calls[2].args[2].caption, 'وصف جديد');
});

test('inline edit overload and media groups keep their argument positions', async () => {
  const bot = fakeBot();
  const db = { globalTextOverrides: { texts: [{ from: 'قديم', to: 'جديد' }], buttons: [{ from: 'زر', to: 'زر جديد' }] } };
  installGlobalTextOverrides(bot, db);
  await bot.api.editMessageText('inline-id', 'قديم', { reply_markup: { inline_keyboard: [[{ text: 'زر', callback_data: 'keep' }]] } });
  await bot.api.editMessageReplyMarkup('inline-id', { reply_markup: { inline_keyboard: [[{ text: 'زر', callback_data: 'keep' }]] } });
  await bot.api.sendMediaGroup(123, [{ type: 'photo', media: 'file', caption: 'قديم' }]);
  assert.equal(bot.calls[0].args[1], 'جديد');
  assert.equal(bot.calls[0].args[2].reply_markup.inline_keyboard[0][0].text, 'زر جديد');
  assert.equal(bot.calls[1].args[1].reply_markup.inline_keyboard[0][0].text, 'زر جديد');
  assert.equal(bot.calls[2].args[1][0].caption, 'جديد');
});

test('callback-specific button rules only change the matching callback', async () => {
  const bot = fakeBot();
  const db = { globalTextOverrides: { texts: [], buttons: [], buttonCallbacks: { 'specific:one': { from: 'زر مشترك', to: 'زر خاص' } } } };
  installGlobalTextOverrides(bot, db);
  await bot.api.sendMessage(123, 'اختر', { reply_markup: { inline_keyboard: [[
    { text: 'زر مشترك', callback_data: 'specific:one' },
    { text: 'زر مشترك', callback_data: 'specific:two' }
  ]] } });
  const row = bot.calls[0].args[2].reply_markup.inline_keyboard[0];
  assert.equal(row[0].text, 'زر خاص');
  assert.equal(row[1].text, 'زر مشترك');
  assert.equal(row[0].callback_data, 'specific:one');
});

test('Telegram limits are respected and installation is idempotent', async () => {
  const bot = fakeBot();
  const db = { globalTextOverrides: { texts: [{ from: 'قصير', to: 'طويل'.repeat(1200) }], buttons: [{ from: 'زر', to: 'اسم'.repeat(40) }] } };
  installGlobalTextOverrides(bot, db);
  installGlobalTextOverrides(bot, db);
  await bot.api.sendMessage(123, 'قصير');
  await bot.api.sendMessage(123, 'زر', { reply_markup: { inline_keyboard: [[{ text: 'زر', callback_data: 'go' }]] } });
  assert.equal(bot.calls.length, 2);
  assert.equal(bot.calls[0].args[1], 'قصير');
  assert.equal(bot.calls[1].args[2].reply_markup.inline_keyboard[0][0].text, 'زر');
});

test('poll labels and inline captions are transformed without moving parameters', async () => {
  const bot = fakeBot();
  const db = { globalTextOverrides: { texts: [{ from: 'قديم', to: 'جديد' }], buttons: [] } };
  installGlobalTextOverrides(bot, db);
  await bot.api.sendPoll(123, 'سؤال قديم', ['قديم', 'خيار آخر']);
  await bot.api.editMessageCaption('inline-id', { caption: 'قديم' });
  assert.equal(bot.calls[0].args[1], 'سؤال جديد');
  assert.equal(bot.calls[0].args[2][0], 'جديد');
  assert.equal(bot.calls[1].args[1].caption, 'جديد');
});
