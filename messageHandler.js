import { InlineKeyboard } from 'grammy';

const MEANING_QUESTIONS = [
  // حيوانات (25)
  { emoji: '🦁', answer: 'أسد', acceptedAnswers: ['أسد', 'الأسد'] },
  { emoji: '🐘', answer: 'فيل', acceptedAnswers: ['فيل', 'الفيل'] },
  { emoji: '🐪', answer: 'جمل', acceptedAnswers: ['جمل', 'الجمل'] },
  { emoji: '🐢', answer: 'سلحفاة', acceptedAnswers: ['سلحفاة', 'السلحفاة'] },
  { emoji: '🐝', answer: 'نحلة', acceptedAnswers: ['نحلة', 'النحلة'] },
  { emoji: '🐬', answer: 'دولفين', acceptedAnswers: ['دولفين', 'الدولفين'] },
  { emoji: '🦊', answer: 'ثعلب', acceptedAnswers: ['ثعلب', 'الثعلب'] },
  { emoji: '🐧', answer: 'بطريق', acceptedAnswers: ['بطريق', 'البطريق'] },
  { emoji: '🐱', answer: 'قط', acceptedAnswers: ['قط', 'قطة', 'القط'] },
  { emoji: '🐶', answer: 'كلب', acceptedAnswers: ['كلب', 'الكلب'] },
  { emoji: '🐰', answer: 'أرنب', acceptedAnswers: ['أرنب', 'ارنب', 'الأرنب'] },
  { emoji: '🐼', answer: 'باندا', acceptedAnswers: ['باندا', 'الباندا'] },
  { emoji: '🐻', answer: 'دب', acceptedAnswers: ['دب', 'الدب'] },
  { emoji: '🐯', answer: 'نمر', acceptedAnswers: ['نمر', 'النمر'] },
  { emoji: '🐸', answer: 'ضفدع', acceptedAnswers: ['ضفدع', 'الضفدع'] },
  { emoji: '🐵', answer: 'قرد', acceptedAnswers: ['قرد', 'القرد'] },
  { emoji: '🦒', answer: 'زرافة', acceptedAnswers: ['زرافة', 'الزرافة'] },
  { emoji: '🦓', answer: 'حمار وحشي', acceptedAnswers: ['حمار وحشي', 'حماروحشي'] },
  { emoji: '🦜', answer: 'ببغاء', acceptedAnswers: ['ببغاء', 'الببغاء'] },
  { emoji: '🦉', answer: 'بومة', acceptedAnswers: ['بومة', 'البومة'] },
  { emoji: '🐍', answer: 'ثعبان', acceptedAnswers: ['ثعبان', 'أفعى', 'افعى'] },
  { emoji: '🐊', answer: 'تمساح', acceptedAnswers: ['تمساح', 'التمساح'] },
  { emoji: '🦋', answer: 'فراشة', acceptedAnswers: ['فراشة', 'الفراشة'] },
  { emoji: '🐌', answer: 'حلزون', acceptedAnswers: ['حلزون', 'الحلزون'] },
  { emoji: '🐙', answer: 'أخطبوط', acceptedAnswers: ['أخطبوط', 'اخطبوط'] },
  // فواكه وأطعمة (25)
  { emoji: '🍎', answer: 'تفاح', acceptedAnswers: ['تفاح', 'تفاحة', 'التفاح'] },
  { emoji: '🍌', answer: 'موز', acceptedAnswers: ['موز', 'موزة'] },
  { emoji: '🍇', answer: 'عنب', acceptedAnswers: ['عنب', 'العنب'] },
  { emoji: '🍉', answer: 'بطيخ', acceptedAnswers: ['بطيخ', 'رقي', 'جح'] },
  { emoji: '🍓', answer: 'فراولة', acceptedAnswers: ['فراولة', 'فريز'] },
  { emoji: '🍍', answer: 'أناناس', acceptedAnswers: ['أناناس', 'اناناس'] },
  { emoji: '🍊', answer: 'برتقال', acceptedAnswers: ['برتقال', 'برتقالة', 'البرتقال'] },
  { emoji: '🍒', answer: 'كرز', acceptedAnswers: ['كرز', 'الكرز'] },
  { emoji: '🍐', answer: 'كمثرى', acceptedAnswers: ['كمثرى', 'اجاص', 'إجاص'] },
  { emoji: '🥭', answer: 'مانجو', acceptedAnswers: ['مانجو', 'المانجو'] },
  { emoji: '🥝', answer: 'كيوي', acceptedAnswers: ['كيوي', 'الكيوي'] },
  { emoji: '🍑', answer: 'خوخ', acceptedAnswers: ['خوخ', 'الخوخ'] },
  { emoji: '🍋', answer: 'ليمون', acceptedAnswers: ['ليمون', 'ليمونة'] },
  { emoji: '🫐', answer: 'توت أزرق', acceptedAnswers: ['توت أزرق', 'توت ازرق', 'توت'] },
  { emoji: '🍈', answer: 'شمام', acceptedAnswers: ['شمام', 'الشمام'] },
  { emoji: '🥥', answer: 'جوز الهند', acceptedAnswers: ['جوز الهند', 'جوزالهند'] },
  { emoji: '🥑', answer: 'أفوكادو', acceptedAnswers: ['أفوكادو', 'افوكادو'] },
  { emoji: '🍅', answer: 'طماطم', acceptedAnswers: ['طماطم', 'طماطة', 'بندورة'] },
  { emoji: '🫒', answer: 'زيتون', acceptedAnswers: ['زيتون', 'الزيتون'] },
  { emoji: '🌽', answer: 'ذرة', acceptedAnswers: ['ذرة', 'ذره', 'الذرة'] },
  { emoji: '🥕', answer: 'جزر', acceptedAnswers: ['جزر', 'الجزر'] },
  { emoji: '🥔', answer: 'بطاطا', acceptedAnswers: ['بطاطا', 'بطاطس', 'بطاطه'] },
  { emoji: '🥦', answer: 'بروكلي', acceptedAnswers: ['بروكلي', 'بروكولي'] },
  { emoji: '🍆', answer: 'باذنجان', acceptedAnswers: ['باذنجان', 'بادنجان'] },
  { emoji: '🫑', answer: 'فلفل', acceptedAnswers: ['فلفل', 'فلفلة', 'فلفل حلو'] }
];
const OPPOSITE_QUESTIONS = [
  { word: 'حلو', answer: 'مر', acceptedAnswers: ['مر', 'مُر'] },
  { word: 'ليل', answer: 'نهار', acceptedAnswers: ['نهار', 'النهار'] },
  { word: 'فوق', answer: 'تحت', acceptedAnswers: ['تحت'] },
  { word: 'طويل', answer: 'قصير', acceptedAnswers: ['قصير'] },
  { word: 'سريع', answer: 'بطيء', acceptedAnswers: ['بطيء', 'بطيئ', 'بطي'] },
  { word: 'قديم', answer: 'جديد', acceptedAnswers: ['جديد'] },
  { word: 'قريب', answer: 'بعيد', acceptedAnswers: ['بعيد'] },
  { word: 'قوي', answer: 'ضعيف', acceptedAnswers: ['ضعيف'] },
  { word: 'فرحان', answer: 'حزين', acceptedAnswers: ['حزين', 'زعلان'] },
  { word: 'مفتوح', answer: 'مغلق', acceptedAnswers: ['مغلق', 'مسدود'] },
  { word: 'نظيف', answer: 'وسخ', acceptedAnswers: ['وسخ', 'متسخ'] },
  { word: 'صعب', answer: 'سهل', acceptedAnswers: ['سهل'] },
  { word: 'غني', answer: 'فقير', acceptedAnswers: ['فقير'] },
  { word: 'كبير', answer: 'صغير', acceptedAnswers: ['صغير'] },
  { word: 'يمين', answer: 'يسار', acceptedAnswers: ['يسار'] },
  { word: 'نجاح', answer: 'فشل', acceptedAnswers: ['فشل', 'رسوب'] },
  { word: 'صباح', answer: 'مساء', acceptedAnswers: ['مساء'] },
  { word: 'ثقيل', answer: 'خفيف', acceptedAnswers: ['خفيف'] },
  { word: 'ناشف', answer: 'رطب', acceptedAnswers: ['رطب', 'مبلل'] },
  { word: 'شجاع', answer: 'جبان', acceptedAnswers: ['جبان'] }
];

const DECOMPOSE_WORDS = [
  // 20 كلمة من 3 أحرف
  'قلم', 'جبل', 'رزق', 'برد', 'صبح', 'شوق', 'عين', 'فجر', 'ثوب', 'صخر',
  'سيف', 'وقت', 'حبر', 'نجم', 'ليل', 'غيم', 'ملح', 'برق', 'فوز', 'عطر',
  // 15 كلمة من 4 أحرف
  'وردة', 'لعبة', 'سحاب', 'رمان', 'كوكب', 'نجمة', 'قهوة', 'كرسي', 'زهرة',
  'قارب', 'حمام', 'حليب', 'مطبخ', 'شارع', 'دفتر',
  // 15 كلمة من 5 أحرف
  'مدرسة', 'سيارة', 'نافذة', 'ليمون', 'حديقة', 'مكتبة', 'صديقة', 'حقيبة',
  'فراشة', 'طاولة', 'عصفور', 'تمساح', 'زرافة', 'مصباح', 'جزيرة'
];

const DECOMPOSE_QUESTIONS = DECOMPOSE_WORDS.map(word => ({ word, answer: Array.from(word).join(' ') }));

const pick = list => list[Math.floor(Math.random() * list.length)];

function acceptedAnswersFor(question) {
  return [...new Set((question.acceptedAnswers || [question.answer]).map(String))];
}

function formatMathEquation(question) {
  return String(question || '')
    .replace(/^(?:ناتج عملية الحساب التالية|ما هو ناتج|كم يساوي|ناتج جمع|احسب ناتج|ناتج قسمة|احسب)\s*:?\s*/u, '')
    .trim();
}

async function clearQuestionKeyboard(bot, chatId, round) {
  if (!round?.messageId) return;
  try {
    await bot.api.editMessageReplyMarkup(Number(chatId), Number(round.messageId), {
      reply_markup: new InlineKeyboard()
    });
  } catch {
    // قد تكون الرسالة حُذفت أو انتهت صلاحية تعديلها؛ لا نوقف اللعبة بسبب ذلك.
  }
}

// منطق الألعاب النصية داخل المجموعات. كل أمر لعبة جديد يستبدل السؤال الحالي فوراً.
export async function handleGroupGameMessage(ctx, shared, state) {
  const { db, save, bot, userKey, isOwner, normalizeAnswer, groupScores, QUESTIONS_DB, KET_LIST } = shared;
  const { isAdmin, uid, msg, text } = state;
  const chatId = String(ctx.chat.id);
  db.activeGames ||= {};
  let activeGame = db.activeGames[chatId];
  const command = normalizeAnswer(text);

  const gameAliases = {
    'اختيارات': { key: 'choose', title: '🧩 الاختيارات الصحيحة', pool: QUESTIONS_DB.choose },
    'رياضيات': { key: 'math', title: '🔢 الرياضيات', pool: QUESTIONS_DB.math },
    'حيوان': { key: 'animals', title: '🐾 معرفة الحيوان', pool: QUESTIONS_DB.animals },
    'س': { key: 'general', title: '💡 أسئلة عامة', pool: QUESTIONS_DB.general },
    'معاني': { key: 'meanings', title: '🐾🍎 معاني السمايلات', pool: MEANING_QUESTIONS },
    'عكس': { key: 'opposite', title: '🔁 لعبة عكس الكلمة', pool: OPPOSITE_QUESTIONS },
    'تفكيك': { key: 'decompose', title: '🔤 لعبة تفكيك الكلمة', pool: DECOMPOSE_QUESTIONS },
    'اسئلني': { key: 'askme', title: '🧠 اسئلني', pool: KET_LIST || [] },
    'اسالني': { key: 'askme', title: '🧠 اسئلني', pool: KET_LIST || [] }
  };

  if (command === 'انهاء اللعبه' || command === 'انهاء اللعبة') {
    if (activeGame?.active && (String(activeGame.starterId) === uid || isAdmin || isOwner(ctx))) {
      await clearQuestionKeyboard(bot, chatId, activeGame);
      db.activeGames[chatId] = null;
      save();
      await ctx.reply('🛑 تم إنهاء السؤال الحالي.');
    } else if (activeGame?.active) {
      await ctx.reply('⚠️ إنهاء السؤال متاح لصاحب السؤال أو للمشرفين.');
    }
    return true;
  }

  if (activeGame?.active && activeGame.expiresAt && Date.now() > activeGame.expiresAt) {
    await clearQuestionKeyboard(bot, chatId, activeGame);
    db.activeGames[chatId] = null;
    save();
    await ctx.reply(`⏰ انتهى وقت السؤال. الإجابة الصحيحة: ${activeGame.answer}`);
    activeGame = null;
  }

  // افحص أمر اللعبة قبل الإجابة: كتابة لعبة جديدة تلغي السؤال السابق وتبدأ سؤالاً جديداً.
  const game = gameAliases[command];
  if (game) {
    const pool = Array.isArray(game.pool) ? game.pool : [];
    if (!pool.length) {
      await ctx.reply('⚠️ ماكو أسئلة متوفرة لهذه اللعبة حالياً.');
      return true;
    }

    // أي أمر لعبة جديد يلغي واجهة السؤال السابق أيضاً، حتى لا تبقى أزرار قديمة مربكة.
    if (activeGame?.active) await clearQuestionKeyboard(bot, chatId, activeGame);

    const rawChosen = pick(pool);
    const chosen = typeof rawChosen === 'string' ? { q: rawChosen, answer: rawChosen } : rawChosen;
    const answerText = String(chosen.answer ?? chosen.q ?? '');
    const roundId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const round = {
      active: true,
      roundId,
      type: game.key,
      starterId: uid,
      answer: answerText,
      acceptedAnswers: acceptedAnswersFor(chosen),
      acceptAnyAnswer: game.key === 'askme',
      expiresAt: Date.now() + 60000
    };

    let questionText;
    if (game.key === 'choose') {
      questionText = `🧩 أكمل السؤال واختر الجواب الصحيح:

❓ ${chosen.q}`;
      round.options = (chosen.options || []).slice(0, 8);
    } else if (game.key === 'math') {
      questionText = `🔢 أكمل المعادلة الرياضية:

${formatMathEquation(chosen.q)}

⚡ أسرع إجابة صحيحة تربح نقطة!`;
    } else if (game.key === 'animals') {
      questionText = `🐾 خمن اسم الحيوان الذي يبدأ بهذا الحرف:

🔤 الحرف: ${Array.from(answerText)[0]}

⚡ أسرع إجابة صحيحة تربح نقطة!`;
    } else if (game.key === 'general') {
      questionText = `💡 سؤال عام:

${chosen.q}

⚡ أسرع إجابة صحيحة تربح نقطة!`;
    } else if (game.key === 'meanings') {
      questionText = `🐾🍎 شنو معنى هذا السمايل؟

${chosen.emoji}

اكتب اسم الحيوان أو الفاكهة. أسرع إجابة صحيحة تربح نقطة!`;
    } else if (game.key === 'opposite') {
      questionText = `🔁 عكس كلمة «${chosen.word}» شنو؟

⚡ أسرع إجابة صحيحة تربح نقطة!`;
    } else {
      questionText = `🔤 أسرع شخص يفكّك الكلمة:

كلمة: «${chosen.word}»

اكتب حروفها وبين كل حرف والثاني مسافة، مثل: ا س د. أول إجابة صحيحة تربح نقطة!`;
    }

    // الكتابة فوق حالة المجموعة تبطل السؤال السابق وأزراره مباشرة.
    db.activeGames[chatId] = round;
    save();

    setTimeout(async () => {
      const current = db.activeGames?.[chatId];
      if (current?.active && current.roundId === roundId) {
        await clearQuestionKeyboard(bot, chatId, current);
        db.activeGames[chatId] = null;
        save();
        try { await bot.api.sendMessage(Number(chatId), current.type === 'askme' ? '⏰ انتهى وقت سؤال اسئلني بدون مشاركة فائزة.' : `⏰ انتهى وقت السؤال. الإجابة الصحيحة: ${answerText}`); } catch {}
      }
    }, 60000).unref?.();

    let sentQuestion;
    if (game.key === 'choose' && round.options.length) {
      const kb = new InlineKeyboard();
      round.options.forEach((option, index) => {
        if (index) kb.row();
        kb.text(option, `gans:${roundId}:${index}`);
      });
      kb.row().text('🛑 إنهاء السؤال', `game_stop:${roundId}`);
      sentQuestion = await ctx.reply(`${questionText}

اختار الإجابة من الأزرار:`, { reply_markup: kb });
    } else {
      sentQuestion = await ctx.reply(questionText, { reply_markup: new InlineKeyboard().text('🛑 إنهاء السؤال', `game_stop:${roundId}`) });
    }
    if (db.activeGames[chatId]?.roundId === roundId && sentQuestion?.message_id) {
      db.activeGames[chatId].messageId = sentQuestion.message_id;
      save();
    }
    return true;
  }

  // الإجابة تُحتسب مرة واحدة فقط؛ أي أمر لعبة جديد أعلاه يستبدل السؤال قبل الوصول هنا.
  if (activeGame?.active && text) {
    const normalized = normalizeAnswer(text);
    const accepted = activeGame.acceptAnyAnswer || (activeGame.acceptedAnswers || [activeGame.answer])
      .some(answer => normalizeAnswer(answer) === normalized);
    if (accepted) {
      await clearQuestionKeyboard(bot, chatId, activeGame);
      db.activeGames[chatId] = null;
      const scores = groupScores(chatId);
      scores[uid] = Number(scores[uid] || 0) + 1;
      db.points ||= {};
      db.points[uid] = Number(db.points[uid] || 0) + 1;
      db.pointNames ||= {};
      db.pointNames[uid] = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || `عضو ${uid}`;
      save();
      await ctx.reply(`🎉 مبروك ${msg.from.first_name || 'بطل'}! فزت بلعبة «${activeGame.type}» وربحت نقطة 🏆
رصيدك بهذه المجموعة: ${scores[uid]} نقطة.`, { reply_to_message_id: msg.message_id });
      return true;
    }
  }

  return false;
}
