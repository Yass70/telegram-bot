import { InlineKeyboard } from 'grammy';

// منطق الألعاب النصية داخل المجموعات: سؤال واحد نشط لكل مجموعة، ومكافأة واحدة للإجابة الصحيحة.
export async function handleGroupGameMessage(ctx, shared, state) {
  const { db, save, bot, userKey, isOwner, normalizeAnswer, groupScores, QUESTIONS_DB } = shared;
  const { g, isAdmin, uid, msg, text } = state;
      // الألعاب الأربع — سؤال واحد نشط لكل مجموعة.
      const chatId = String(ctx.chat.id);
      db.activeGames ||= {};
      let activeGame = db.activeGames[chatId];
      const gameAliases = {
        'خ': { key: 'choose', title: '🧩 اختر الخيار الصحيح', pool: QUESTIONS_DB.choose },
        'ر': { key: 'math', title: '🔢 الرياضيات السريعة', pool: QUESTIONS_DB.math },
        'ح': { key: 'animals', title: '🐾 معرفة الحيوان من أول حرف', pool: QUESTIONS_DB.animals },
        'س': { key: 'general', title: '💡 أسئلة عامة', pool: QUESTIONS_DB.general }
      };

      if (text === 'انهاء اللعبة' || text === 'إنهاء اللعبة') {
        if (activeGame && (String(activeGame.starterId) === uid || isAdmin || isOwner(ctx))) {
          db.activeGames[chatId] = null; save();
          await ctx.reply('🛑 تم إنهاء اللعبة الحالية.');
        } else if (activeGame) await ctx.reply('الأمر غير مخصص إلك');
        return true;
      }

      if (activeGame?.active && activeGame.expiresAt && Date.now() > activeGame.expiresAt) {
        db.activeGames[chatId] = null; save();
        await ctx.reply(`⏰ انتهى وقت السؤال. الإجابة الصحيحة: ${activeGame.answer}`);
        activeGame = null;
      }

      if (activeGame?.active && !['خ', 'ر', 'ح', 'س'].includes(text)) {
        const normalized = normalizeAnswer(text);
        const accepted = (activeGame.acceptedAnswers || [activeGame.answer]).some(a => normalizeAnswer(a) === normalized);
        if (accepted) {
          // تبديل حالة السؤال قبل أي إرسال يمنع احتساب أكثر من فائز.
          db.activeGames[chatId] = null;
          const scores = groupScores(chatId);
          scores[uid] = Number(scores[uid] || 0) + 1;
          db.points ||= {};
          db.points[uid] = Number(db.points[uid] || 0) + 1; // توافق مع بيانات النقاط القديمة
          db.pointNames ||= {};
          db.pointNames[uid] = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || `عضو ${uid}`;
          save();
          await ctx.reply(`🎉 مبروك ${msg.from.first_name || 'بطل'}! ربحت نقطة واحدة 🏆\nرصيدك في هذه المجموعة: ${scores[uid]} نقطة.`, { reply_to_message_id: msg.message_id });
          return true;
        }
      }

      if (gameAliases[text]) {
        if (activeGame?.active) {
          await ctx.reply('🎮 أكو سؤال شغال حالياً بهذه المجموعة. جاوبوا عليه أولاً أو اكتبوا «انهاء اللعبة».');
          return true;
        }
        const game = gameAliases[text];
        const chosen = game.pool[Math.floor(Math.random() * game.pool.length)];
        const answerText = chosen.answer;
        const roundId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        const round = {
          active: true, roundId, type: game.key, starterId: uid,
          answer: answerText, acceptedAnswers: [answerText],
          expiresAt: Date.now() + 60000
        };
        db.activeGames[chatId] = round;
        save();
        setTimeout(async () => {
          const current = db.activeGames?.[chatId];
          if (current?.active && current.roundId === roundId) {
            db.activeGames[chatId] = null;
            save();
            try { await bot.api.sendMessage(Number(chatId), `⏰ انتهى وقت السؤال. الإجابة الصحيحة: ${answerText}`); } catch {}
          }
        }, 60000).unref?.();

        const stopKb = new InlineKeyboard().text('🛑 إنهاء السؤال', 'game_stop');
        let questionText = `🎮 ${game.title}\n\n❓ ${chosen.q || `حيوان يبدأ بحرف (${String(answerText).trim()[0] || '?'})` }\n\n⏱️ أول إجابة صحيحة خلال 60 ثانية تحصل على نقطة!`;
        if (game.key === 'animals') {
          questionText = `🐾 خمن اسم الحيوان الذي يبدأ بهذا الحرف:\n\n🔤 الحرف: ${Array.from(answerText)[0]}\n⏱️ أول إجابة صحيحة خلال 60 ثانية تربح نقطة!`;
        }
        if (game.key === 'choose' && Array.isArray(chosen.options)) {
          const options = chosen.options.slice(0, 8);
          const kb = new InlineKeyboard();
          options.forEach((option, i) => {
            if (i) kb.row();
            kb.text(option, `gans:${roundId}:${i}`);
          });
          kb.row().text('🛑 إنهاء السؤال', 'game_stop');
          round.options = options;
          db.activeGames[chatId] = round; save();
          await ctx.reply(questionText + '\n\nاختار الإجابة من الأزرار:', { reply_markup: kb });
        } else {
          await ctx.reply(questionText, { reply_markup: stopKb });
        }
        return true;
      }
  return false;
}
