import { InlineKeyboard } from 'grammy';

// التعامل مع الإجابات وأزرار إنهاء السؤال النشط فقط.
export async function handleActiveGameCallback(ctx, shared, data) {
  const { db, isOwner, userIsAdmin, save, normalizeAnswer, groupScores } = shared;
    if (data.startsWith('gans:')) {
      const [, roundId, rawIndex] = data.split(':');
      const chatId = String(ctx.chat?.id || '');
      const round = db.activeGames?.[chatId];
      if (!round?.active || round.roundId !== roundId || round.type !== 'choose') {
        try { await ctx.answerCallbackQuery({ text: 'انتهى هذا السؤال أو تمت الإجابة عنه.' }); } catch {}
        return true;
      }
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || !Array.isArray(round.options) || index < 0 || index >= round.options.length) {
        try { await ctx.answerCallbackQuery({ text: 'اختيار غير صالح.' }); } catch {}
        return true;
      }
      if (normalizeAnswer(round.options[index]) !== normalizeAnswer(round.answer)) {
        try { await ctx.answerCallbackQuery({ text: 'إجابة غير صحيحة، حاولوا!' }); } catch {}
        return true;
      }
      db.activeGames[chatId] = null;
      const uid = String(ctx.from.id);
      const scores = groupScores(chatId);
      scores[uid] = Number(scores[uid] || 0) + 1;
      db.points ||= {}; db.points[uid] = Number(db.points[uid] || 0) + 1;
      db.pointNames ||= {}; db.pointNames[uid] = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || `عضو ${uid}`;
      save();
      try { await ctx.answerCallbackQuery({ text: 'إجابة صحيحة! ربحت نقطة 🎉' }); } catch {}
      try { await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() }); } catch {}
      try { await ctx.reply(`🎉 مبروك ${ctx.from.first_name || 'بطل'}! فزت بالسؤال وربحت نقطة 🏆\nرصيدك بهذه المجموعة: ${scores[uid]}`); } catch {}
      return true;
    }

    if (data === 'game_stop') {
      const chatId = String(ctx.chat?.id || '');
      const round = db.activeGames?.[chatId];
      if (!round?.active) { try { await ctx.answerCallbackQuery({ text: 'ماكو سؤال نشط.' }); } catch {} return true; }
      const allowed = String(round.starterId) === String(ctx.from.id) || isOwner(ctx) || await userIsAdmin(chatId, ctx.from.id);
      if (!allowed) { try { await ctx.answerCallbackQuery({ text: 'الأمر غير مخصص إلك', show_alert: true }); } catch {} return true; }
      db.activeGames[chatId] = null; save();
      try { await ctx.answerCallbackQuery({ text: 'تم إنهاء السؤال.' }); } catch {}
      try { await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() }); } catch {}
      try { await ctx.reply(`🛑 انتهى السؤال. الإجابة الصحيحة كانت: ${round.answer}`); } catch {}
      return true;
    }
  return false;
}
