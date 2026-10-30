// Persistent, per-image QR archive likes.
// A single Node.js process handles updates synchronously before the first await;
// this queue also serializes Telegram markup edits for each archived message.
const editQueues = new Map();

export function qrLikeKey(chatId, messageId) {
  return `${String(chatId)}:${String(messageId)}`;
}

export function ensureQrLikes(db) {
  db.qrLikes ||= { images: {} };
  db.qrLikes.images ||= {};
  return db.qrLikes.images;
}

export function toggleQrLike(db, chatId, messageId, userId) {
  const images = ensureQrLikes(db);
  const key = qrLikeKey(chatId, messageId);
  const record = images[key];
  if (!record) return { ok: false, liked: false, count: 0, key };
  if (!Array.isArray(record.users)) record.users = [];
  const uid = String(userId);
  const index = record.users.indexOf(uid);
  let liked;
  if (index >= 0) {
    record.users.splice(index, 1);
    liked = false;
  } else {
    record.users.push(uid);
    liked = true;
  }
  record.count = record.users.length;
  record.updatedAt = new Date().toISOString();
  return { ok: true, liked, count: record.count, key };
}

export function qrLikeKeyboard(messageId, count = 0) {
  return { inline_keyboard: [[{ text: `❤️ ${Math.max(0, Number(count) || 0)}`, callback_data: `qrlike:${messageId}` }]] };
}

function serialize(key, task) {
  const previous = editQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  editQueues.set(key, current);
  return current.finally(() => {
    if (editQueues.get(key) === current) editQueues.delete(key);
  });
}

export function registerQrLikeCallbacks(bot, { db, save, archiveChannel }) {
  bot.on('callback_query:data', async (ctx, next) => {
    const data = String(ctx.callbackQuery?.data || '');
    if (!data.startsWith('qrlike:')) return next();

    const message = ctx.callbackQuery?.message;
    const messageId = Number(data.slice('qrlike:'.length));
    const chatId = message?.chat?.id;
    const userId = ctx.from?.id;
    if (!message || !Number.isSafeInteger(messageId) || messageId <= 0 ||
        !Number.isSafeInteger(Number(chatId)) || !Number.isSafeInteger(Number(userId))) {
      try { await ctx.answerCallbackQuery({ text: 'تعذّر التعرّف على صورة الباركود.' }); } catch {}
      return;
    }
    if (String(message.message_id) !== String(messageId)) {
      try { await ctx.answerCallbackQuery({ text: 'هذا الزر غير صالح لهذه الصورة.' }); } catch {}
      return;
    }

    const key = qrLikeKey(chatId, messageId);
    await serialize(key, async () => {
      const result = toggleQrLike(db, chatId, messageId, userId);
      if (!result.ok) {
        try { await ctx.answerCallbackQuery({ text: 'سجل إعجابات هذه الصورة غير متوفر.' }); } catch {}
        return;
      }
      // Persist the actual unique user list before editing the visible counter.
      save();
      try {
        await ctx.api.editMessageReplyMarkup(chatId, messageId, {
          reply_markup: qrLikeKeyboard(messageId, result.count)
        });
        await ctx.answerCallbackQuery({ text: result.liked ? '❤️ تم تسجيل إعجابك' : 'تم إلغاء إعجابك' });
      } catch (error) {
        // The DB remains authoritative; a later click can refresh the markup.
        const description = String(error?.description || error?.message || 'تعذّر تحديث الزر');
        try { await ctx.answerCallbackQuery({ text: `تم حفظ التغيير، لكن تعذّر تحديث العدد: ${description.slice(0, 120)}` }); } catch {}
      }
    });
  });
}
