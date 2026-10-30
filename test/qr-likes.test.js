import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureQrLikes, qrLikeKeyboard, toggleQrLike } from '../qrLikes.js';

function makeDb() {
  const db = {};
  const images = ensureQrLikes(db);
  images['-100123:77'] = { chatId: '-100123', messageId: 77, users: [], count: 0 };
  images['-100123:78'] = { chatId: '-100123', messageId: 78, users: [], count: 0 };
  return db;
}

test('first like adds the user and increments the real count; second tap removes it', () => {
  const db = makeDb();
  assert.deepEqual(toggleQrLike(db, '-100123', 77, 501), { ok: true, liked: true, count: 1, key: '-100123:77' });
  assert.deepEqual(toggleQrLike(db, '-100123', 77, 501), { ok: true, liked: false, count: 0, key: '-100123:77' });
  assert.deepEqual(db.qrLikes.images['-100123:77'].users, []);
});

test('each user and each image has an independent like record', () => {
  const db = makeDb();
  toggleQrLike(db, '-100123', 77, 501);
  toggleQrLike(db, '-100123', 77, 502);
  toggleQrLike(db, '-100123', 78, 501);
  assert.equal(db.qrLikes.images['-100123:77'].count, 2);
  assert.equal(db.qrLikes.images['-100123:78'].count, 1);
  assert.deepEqual(db.qrLikes.images['-100123:77'].users, ['501', '502']);
});

test('repeated toggles by one user never create duplicate user IDs', () => {
  const db = makeDb();
  for (let i = 0; i < 101; i++) toggleQrLike(db, '-100123', 77, 501);
  assert.equal(db.qrLikes.images['-100123:77'].users.filter(id => id === '501').length, 1);
  assert.equal(db.qrLikes.images['-100123:77'].count, 1);
});

test('like state survives JSON database restart', () => {
  const db = makeDb();
  toggleQrLike(db, '-100123', 77, 501);
  toggleQrLike(db, '-100123', 77, 502);
  const restarted = JSON.parse(JSON.stringify(db));
  assert.equal(restarted.qrLikes.images['-100123:77'].count, 2);
  assert.deepEqual(restarted.qrLikes.images['-100123:77'].users, ['501', '502']);
  assert.equal(toggleQrLike(restarted, '-100123', 77, 501).count, 1);
});

test('inline keyboard displays the persisted count', () => {
  assert.deepEqual(qrLikeKeyboard(77, 12), { inline_keyboard: [[{ text: '❤️ 12', callback_data: 'qrlike:77' }]] });
});

test('unknown image records cannot receive artificial likes', () => {
  const db = makeDb();
  assert.equal(toggleQrLike(db, '-100123', 999, 501).ok, false);
});

test('callback handler serializes simultaneous users and edits the live counter without sending channel messages', async () => {
  const { registerQrLikeCallbacks } = await import('../qrLikes.js');
  let handler;
  const edits = [];
  const sentMessages = [];
  const bot = { on: (_filter, fn) => { handler = fn; } };
  const db = makeDb();
  const saveCalls = { count: 0 };
  registerQrLikeCallbacks(bot, { db, save: () => { saveCalls.count++; }, archiveChannel: '@archive' });
  const invoke = userId => {
    const answers = [];
    const ctx = {
      callbackQuery: { data: 'qrlike:77', message: { message_id: 77, chat: { id: -100123 } } },
      from: { id: userId },
      api: { editMessageReplyMarkup: async (chatId, messageId, options) => { edits.push({ chatId, messageId, count: options.reply_markup.inline_keyboard[0][0].text }); } },
      answerCallbackQuery: async options => { answers.push(options || {}); }
    };
    return handler(ctx, async () => { sentMessages.push('unexpected'); }).then(() => answers);
  };
  const results = await Promise.all([invoke(501), invoke(502)]);
  assert.equal(db.qrLikes.images['-100123:77'].count, 2);
  assert.deepEqual(db.qrLikes.images['-100123:77'].users, ['501', '502']);
  assert.deepEqual(edits.map(x => x.count), ['❤️ 1', '❤️ 2']);
  assert.equal(saveCalls.count, 2);
  assert.equal(sentMessages.length, 0);
  assert.equal(results.flat().length, 2);
});
