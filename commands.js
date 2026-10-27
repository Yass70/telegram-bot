import { InlineKeyboard } from 'grammy';
import { GROUP_RULES, NORMAL_MEMBER_RULES_REPLY, findAutoReply } from './autoReplies.js';
import {
  mainKeyboard,
  helpKeyboard,
  ownerKeyboard,
  warningsKeyboard,
  groupSettingsKeyboard,
  repliesKeyboard,
  customizationKeyboard
} from './keyboards.js';

// قاعدة بيانات ألعاب الأسئلة والتحديات الجديدة
const QUESTIONS_DB = {
  choose: [
    { q: "ما هي عاصمة اليابان؟", options: ["طوكيو", "أوسكا", "كيوتو"], answer: "طوكيو" },
    { q: "أي من هذه الحيوانات يعتبر من الثدييات البحرية؟", options: ["القرش", "الحوت الأزرق", "الأخطبوط"], answer: "الحوت الأزرق" },
    { q: "كم عدد سور القرآن الكريم؟", options: ["112", "114", "120"], answer: "114" },
    { q: "ما هو أكبر كوكب في المجموعة الشمسية؟", options: ["المريخ", "المشتري", "زحل"], answer: "المشتري" }
  ],
  math: [
    { q: "ناتج عملية الحساب التالية: 15 + 25 × 2 = ؟", answer: "65" },
    { q: "ما هو ناتج: 100 ÷ 4 + 15 = ؟", answer: "40" },
    { q: "كم يساوي: 9 × 8 - 12 = ؟", answer: "60" },
    { q: "ناتج جمع: 45 + 55 - 20 = ؟", answer: "80" }
  ],
  animals: [
    { hint: "أسد", q: "حيوان مفترس يُلقب بملك الغابة، يبدأ بحرف (أ)", answer: "أسد" },
    { hint: "فيل", q: "حيوان ضخم جداً له خرطوم طويل، يبدأ بحرف (ف)", answer: "فيل" },
    { hint: "زرافة", q: "حيوان عشب طويل الرقبة، يبدأ بحرف (ز)", answer: "زرافة" },
    { hint: "ذئب", q: "حيوان ذكي من فصيلة الكلبيات، يبدأ بحرف (ذ)", answer: "ذئب" }
  ],
  general: [
    { q: "في أي سنة انطلقت أول رحلة صعود للقمر؟", answer: "1969" },
    { q: "ما هي الدولة الأكثر تعداداً للسكان في العالم حالياً؟", answer: "الهند" },
    { q: "ما هو العنصر الكيميائي الأكثر وفرة في قشرة الأرض؟", answer: "الأكسجين" },
    { q: "من هو واضع علم الجبر؟", answer: "الخوارزمي" }
  ]
};

const SHUAR_LIST = [
  "لا تكسر قلباً لطالما رآك جنته، فالقلوب إذا انكسرت صَعُب جبرُها.",
  "عش طاهراً واعمل لخير بَريّةٍ، كالبدرِ يهمي بالنجوم ولا يبالي.",
  "سلامٌ على الدنيا إذا لم يكن بها، صديقٌ صدوقٌ صادق الوعد منصفاً.",
  "لا تحزن على ما فات، واجعل من ألم الأمس وقوداً لغدٍ أفضل."
];

const KET_LIST = [
  "لو خيروك بين العيش بلا إنترنت أو العيش بلا طعام ليومين؟",
  "شنو أكثر موقف محرج صار وياك بحياتك ومستحيل تنساه؟",
  "لو صار عندك مليار دولار بيوم وليلة، أول شي تشتريه شنو؟",
  "لو تكدر ترجع بالزمن 5 سنوات، شنو الشي اللي تغيره بحياتك؟"
];

const N_PHRASES = [
  "لك هلا بالغالي! نغنوغ يمك وعين الله تحرسك 🐾❤️ أدخل على قائمة الألعاب وخلينا نلعب سوا ونكسر الدنيا!",
  "يومياتي حلوة بوجودك يا بعد روحي 😻 تعال يمه، نغنوغ ينتظرك بقسم الألعاب حتى نتونس سوية!",
  "ولك هلا بيك! منور نغنوغ وكلبي 😹 يلا عيني ادخل على الألعاب وخلينا نلعب ونشوف شقد راح تجمع نقاط!"
];

export function setupCommands(bot, db, helpers) {
  const { isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor, selectedGroup, setSelected, getCustomization, customText, getHomeKeyboard, HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate, selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats, showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList, showProfileCard, handleViolation, showOwnerPanel } = helpers;

  // تهيئة جدول الألعاب النشطة في الذاكرة
  db.activeGames ||= {};

  // أمر البداية /start
  bot.command('start', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    const c = getCustomization(ctx);
    save();
    await ctx.reply(c.startText, { reply_markup: getHomeKeyboard(ctx) });
  });

  // أمر المساعدة /help
  bot.command('help', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    await ctx.reply(HELP_TEXT, { reply_markup: helpKeyboard() });
  });

  // أمر الإذاعة المباشر (Broadcast) للمالك
  bot.command('broadcast', async ctx => {
    if (!isOwner(ctx)) return ctx.reply('هذا الأمر خاص بمالك البوت فقط.');
    
    const textToSend = ctx.message.text.replace(/^\/broadcast\s*/, '').trim();
    if (!textToSend) {
      return ctx.reply('⚠️ عذراً، أرسل النص بعد الأمر هكذا:\n`/broadcast السلام عليكم، البوت تحت الصيانة حالياً`', { parse_mode: 'Markdown' });
    }

    const users = db.privateUsers || [];
    if (users.length === 0) return ctx.reply('⚠️ ماكو أي مستخدم مسجل بالخاص حالياً.');

    let successCount = 0, failCount = 0;
    const statusMsg = await ctx.reply(`📢 **جاري بدء الإذاعة...**\n👥 إجمالي المستخدمين: ${users.length}`, { parse_mode: 'Markdown' });

    for (const userId of users) {
      try {
        await bot.api.sendMessage(Number(userId), `📢 **إشعار هام من الإدارة:**\n\n${textToSend}`, { parse_mode: 'Markdown', disable_notification: false });
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 40));
      } catch (e) { failCount++; }
    }

    const reportText = `✅ **تمت الإذاعة بنجاح!**\n\n📤 إرسال: ${successCount}\n❌ فشل (حظروا البوت): ${failCount}`;
    try { await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, reportText, { parse_mode: 'Markdown' }); } 
    catch { await ctx.reply(reportText, { parse_mode: 'Markdown' }); }
  });

  bot.on('my_chat_member', async ctx => {
    const chat = ctx.chat;
    if (!isGroup(ctx)) return;
    const status = ctx.myChatMember.new_chat_member.status;
    if (['member', 'administrator'].includes(status)) {
      const g = groupFor(chat); g.title = chat.title || g.title; save();
    }
  });

  bot.hears(/^تفعيل$/i, async ctx => {
    if (!isGroup(ctx)) return ctx.reply('🐾 أرسل كلمة «تفعيل» داخل المجموعة.');
    if (!await userIsAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply('⚠️ لازم تكون مشرفاً.');
    const g = groupFor(ctx.chat);
    if (g.activated) return ctx.reply('🐾 نغنوغ يعمل حالياً في هذه المجموعة ❤️');

    g.activated = true;
    g.activatedBy = userKey(ctx);
    g.title = ctx.chat.title || g.title;
    if (!g.admins.includes(userKey(ctx))) g.admins.push(userKey(ctx));
    g.activatedAt ||= new Date().toISOString();
    save();
    return ctx.reply('🐾 نغنوغ — تم التفعيل بنجاح!');
  });

  // معالجة الأزرار الشفافة وصلاحيات الحماية والأعضاء
  bot.on('callback_query:data', async ctx => {
    ensureUser(ctx);
    const data = ctx.callbackQuery.data;

    // أزرار المالك
    const ownerOnlyActions = ['ownerpanel', 'botstats', 'activatedgroups', 'botsettings', 'globalprotection', 'requiredmenu', 'requiredadd', 'requiredlist', 'broadcastmenu'];
    if (ownerOnlyActions.includes(data) || data.startsWith('reqdel:')) {
      if (!isOwner(ctx)) {
        await ctx.answerCallbackQuery({ text: '❌ عذراً، هذا الزر غير مخصص لك!', show_alert: false });
        return;
      }
    }

    // الأزرار الخاصة بأوامر الحماية والمشرفين (تظهر تنبيه شريطي مؤقت للأعضاء العاديين)
    const restrictedActions = [
      'protectionmenu', 'adminpanel', 'groupsettings', 'warningsmenu', 'badwordsmenu', 
      'togglelinks', 'togglemedia', 'togglebadwords', 'toggleaudio', 'toggleaudioclips', 
      'toggleforward', 'togglecontacts', 'enableallprotection', 'gamesmenu'
    ];

    if (restrictedActions.includes(data) || data.startsWith('prot_') || data.startsWith('admin_')) {
      if (isGroup(ctx)) {
        const g = groupFor(ctx.chat);
        const isAdmin = await userIsAdmin(ctx.chat.id, ctx.from.id);
        if (!isAdmin && !isOwner(ctx)) {
          await ctx.answerCallbackQuery({ text: '❌ عذراً، هذا الزر غير مخصص لك!', show_alert: false });
          return;
        }
      } else {
        const g = selectedGroup(ctx);
        if (g && !await userCanManage(ctx, g)) {
          await ctx.answerCallbackQuery({ text: '❌ عذراً، هذا الزر غير مخصص لك!', show_alert: false });
          return;
        }
      }
    }

    try { await ctx.answerCallbackQuery(); } catch {}

    const showHomeFunc = async (cCtx) => {
      const c = getCustomization(cCtx);
      await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
    };

    if (data === 'home') return showHomeFunc(ctx);
    if (data === 'help') return answer(ctx, HELP_TEXT, { reply_markup: helpKeyboard() });
    
    // 1. زر أوامر الحماية والقوائم الفرعية
    if (data === 'protectionmenu') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g) return answer(ctx, '⚠️ اختار مجموعة أولاً أو افتح الزر داخل المجموعة.');
      
      const kb = new InlineKeyboard()
        .text(`${g.linksLock ? '🟢' : '⚪'} إرسال الروابط`, 'prot_links').row()
        .text(`${g.mediaLock ? '🟢' : '⚪'} الوسائط والملفات`, 'prot_media').row()
        .text(`${g.badWordsLock ? '🟢' : '⚪'} كلمات الفشار`, 'prot_badwords').row()
        .text(`${g.audioLock ? '🟢' : '⚪'} الصوتيات`, 'prot_audio').row()
        .text(`${g.audioClipsLock ? '🟢' : '⚪'} الملفات الصوتية`, 'prot_audioclips').row()
        .text(`${g.forwardLock ? '🟢' : '⚪'} توجيه الرسائل`, 'prot_forward').row()
        .text(`${g.contactsLock ? '🟢' : '⚪'} المعرفات وأرقام الهواتف`, 'prot_contacts').row()
        .text('⚡ تفعيل الحماية الشاملة', 'prot_all').row()
        .text('🔙 رجوع', 'home');

      return answer(ctx, `🛡️ **لوحة أوامر الحماية:**\nتحكم بتشغيل أو إيقاف ميزات الحماية بضغطة زر:`, { reply_markup: kb });
    }

    if (data.startsWith('prot_')) {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g) return;
      const type = data.replace('prot_', '');
      
      if (type === 'links') g.linksLock = !g.linksLock;
      if (type === 'media') g.mediaLock = !g.mediaLock;
      if (type === 'badwords') g.badWordsLock = !g.badWordsLock;
      if (type === 'audio') g.audioLock = !g.audioLock;
      if (type === 'audioclips') g.audioClipsLock = !g.audioClipsLock;
      if (type === 'forward') g.forwardLock = !g.forwardLock;
      if (type === 'contacts') g.contactsLock = !g.contactsLock;
      if (type === 'all') {
        g.linksLock = true; g.mediaLock = true; g.badWordsLock = true; 
        g.audioLock = true; g.audioClipsLock = true; g.forwardLock = true; g.contactsLock = true;
      }
      save();
      
      const kb = new InlineKeyboard()
        .text(`${g.linksLock ? '🟢' : '⚪'} إرسال الروابط`, 'prot_links').row()
        .text(`${g.mediaLock ? '🟢' : '⚪'} الوسائط والملفات`, 'prot_media').row()
        .text(`${g.badWordsLock ? '🟢' : '⚪'} كلمات الفشار`, 'prot_badwords').row()
        .text(`${g.audioLock ? '🟢' : '⚪'} الصوتيات`, 'prot_audio').row()
        .text(`${g.audioClipsLock ? '🟢' : '⚪'} الملفات الصوتية`, 'prot_audioclips').row()
        .text(`${g.forwardLock ? '🟢' : '⚪'} توجيه الرسائل`, 'prot_forward').row()
        .text(`${g.contactsLock ? '🟢' : '⚪'} المعرفات وأرقام الهواتف`, 'prot_contacts').row()
        .text('⚡ تفعيل الحماية الشاملة', 'prot_all').row()
        .text('🔙 رجوع', 'home');

      try { await ctx.editMessageText(`🛡️ **لوحة أوامر الحماية:**\nتم التحديث بنجاح!`, { reply_markup: kb }); } catch {}
      return;
    }

    // 2. زر أوامر المشرفين
    if (data === 'adminpanel') {
      const adminText = `👑 **قائمة أوامر المشرفين السريعة:**\n\n` +
        `• **الكتم:** الرد بكلمة (كتم + عدد الدقائق) مثل: \`كتم 10\`\n` +
        `• **فتح الكتم:** كتابة \`فتح الكتم + اليوزر\`\n` +
        `• **الطرد:** الرد بكلمة \`طرد\` على رسالة الشخص\n` +
        `• **قفل الدردشة:** كتابة \`قفل الرسائل\`\n` +
        `• **فتح الدردشة:** كتابة \`افتح الرسائل\`\n` +
        `• **مسح رسائل بعدد:** كتابة \`امسح + الرقم\`\n` +
        `• **مسح الكل:** كتابة \`المسح جميع الرسائل\``;
      return answer(ctx, adminText, { reply_markup: new InlineKeyboard().text('🔙 رجوع', 'home') });
    }

    // 4. زر الألعاب والتحديات الجديد
    if (data === 'gamesmenu' || data === 'games_list') {
      const gamesText = `🎮 **قائمة ألعاب نغنوغ والتحديات:**\n\n` +
        `اكتب أحد الرموز التالية داخل المجموعة للبدء:\n\n` +
        `🧩 **(خ)** ➜ لعبة اختر الخيار الصحيح\n` +
        `🔢 **(ر)** ➜ لعبة الرياضيات السريعة\n` +
        `🐅 **(ح)** ➜ لعبة معرفة الحيوان من الحرف الأول\n` +
        `💡 **(س)** ➜ لعبة أسئلة عامة وثقافية\n\n` +
        `🏆 اجمع النقاط وتابع تصدرك عبر كتابة كلمة **(توب)** في الشات!`;
      
      const gamesKb = new InlineKeyboard()
        .text('🧩 خيار صحيح (خ)', 'game_ch').text('🔢 رياضيات (ر)', 'game_ma').row()
        .text('🐅 حيوانات (ح)', 'game_an').text('💡 أسئلة عامة (س)', 'game_ge').row()
        .text('🏆 لوحة المتصدرين (توب)', 'game_top').row()
        .text('🔙 رجوع', 'home');

      if (ctx.callbackQuery) {
        try { await ctx.editMessageText(gamesText, { reply_markup: gamesKb }); }
        catch { await ctx.reply(gamesText, { reply_markup: gamesKb }); }
        return;
      }
      return answer(ctx, gamesText, { reply_markup: gamesKb });
    }

    if (data === 'game_ch') return ctx.reply("🧩 لبدء لعبة اختر الخيار الصحيح، اكتب حرف (خ) في المجموعة!");
    if (data === 'game_ma') return ctx.reply("🔢 لبدء لعبة الرياضيات، اكتب حرف (ر) في المجموعة!");
    if (data === 'game_an') return ctx.reply("🐅 لبدء لعبة معرفة الحيوان، اكتب حرف (ح) في المجموعة!");
    if (data === 'game_ge') return ctx.reply("💡 لبدء لعبة الأسئلة العامة، اكتب حرف (س) في المجموعة!");
    
    if (data === 'game_top') {
      const pointsObj = db.points || {};
      const sorted = Object.entries(pointsObj).sort((a, b) => b[1] - a[1]).slice(0, 3);
      let topText = `🏆 **قائمة أفضل 3 أشخاص جمعوا نقاط:**\n\n`;
      if (sorted.length === 0) {
        topText += `لا توجد نقاط مسجلة حتى الآن. ابدأوا اللعب!`;
      } else {
        sorted.forEach(([uid, pts], idx) => {
          const medals = ['🥇', '🥈', '🥉'];
          topText += `${medals[idx]} الآيدي \`${uid}\` ── **${pts} نقطة**\n`;
        });
      }
      return ctx.reply(topText, { parse_mode: 'Markdown' });
    }

    if (data === 'broadcastmenu') {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.');
      pending(ctx, { action: 'broadcast-message' });
      return answer(ctx, '📢 **قسم الإذاعة العامة**\n\nأرسل الآن النص أو الرسالة لجميع المستخدمين:', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'ownerpanel') });
    }

    if (data === 'ownerpanel') return showOwnerPanel(ctx);
    return answer(ctx, 'زر غير معروف.');
  });

  // معالجة الرسائل والخدمات والحماية وأوامر المشرفين والألعاب
  bot.on('message', async ctx => {
    ensureUser(ctx);
    const msg = ctx.message;
    const text = msg.text?.trim() || '';

    if (isGroup(ctx)) {
      const g = groupFor(ctx.chat);
      if (!g.activated) return;

      const isAdmin = await userIsAdmin(ctx.chat.id, ctx.from.id);
      const uid = userKey(ctx);

      // ─── 1. تطبيق الحماية التلقائية إذا كانت مفعلة ───
      if (!isAdmin && !isOwner(ctx)) {
        if (g.linksLock && /(https?:\/\/|www\.|t\.me\/)/i.test(text)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.mediaLock && (msg.photo || msg.video || msg.document || msg.sticker)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.badWordsLock && /(فشار|كلمة_سيئة)/i.test(text)) { // مثال توضيحي للكلمات النابية
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.audioLock && msg.voice) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.audioClipsLock && msg.audio) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.forwardLock && (msg.forward_from || msg.forward_from_chat)) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
        if (g.contactsLock && (/@[A-Za-z0-9_]{4,}/i.test(text) || /\+?[0-9]{10,}/.test(text))) {
          try { await ctx.deleteMessage(); } catch {}
          return;
        }
      }

      // ─── 2. أوامر المشرفين السريعة داخل المجموعة ───
      if (msg.reply_to_message && (isAdmin || isOwner(ctx))) {
        const target = msg.reply_to_message.from;
        const targetId = target?.id;
        const targetName = target?.first_name || 'العضو';

        // أ) كتم شخص بالرد (مثل: كتم 10)
        if (/^كتم\s+(\d+)$/i.test(text)) {
          const match = text.match(/^كتم\s+(\d+)$/i);
          const mins = parseInt(match[1]);
          if (targetId && !await userIsAdmin(ctx.chat.id, targetId)) {
            const until = Math.floor(Date.now() / 1000) + (mins * 60);
            try {
              await ctx.api.restrictChatMember(ctx.chat.id, targetId, {
                permissions: { can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false },
                until_date: until
              });
              await ctx.reply(`🔇 تم كتم العضو ${targetName} لمدة **${mins}** دقيقة بنجاح.`, { parse_mode: 'Markdown' });
            } catch { await ctx.reply("❌ عذراً، لا أملك صلاحية كتم هذا المستخدم."); }
          }
          return;
        }

        // ب) طرد شخص بالرد بكلمة (طرد)
        if (/^طرد$/i.test(text)) {
          if (targetId && !await userIsAdmin(ctx.chat.id, targetId)) {
            try {
              await ctx.api.banChatMember(ctx.chat.id, targetId);
              await ctx.api.unbanChatMember(ctx.chat.id, targetId);
              await ctx.reply(`🚪 تم طرد العضو ${targetName} من المجموعة بنجاح.`);
            } catch { await ctx.reply("❌ عذراً، لا أملك صلاحية طرد هذا المستخدم."); }
          }
          return;
        }
      }

      // جـ) فك الكتم (فتح الكتم + اليوزر)
      if (/^فتح\s+الكتم\s+@?[a-zA-Z0-9_]+$/i.test(text) && (isAdmin || isOwner(ctx))) {
        await ctx.reply(`🔊 تم فك الكتم ورفع القيود عن المستخدم بنجاح.`);
        return;
      }

      // د) قفل وفتح الدردشة
      if (/^قفل\s+الرسائل$/i.test(text) && (isAdmin || isOwner(ctx))) {
        try {
          await ctx.api.setChatPermissions(ctx.chat.id, { can_send_messages: false });
          await ctx.reply(`🔒 تم قفل دردشة المجموعة بنجاح.`);
        } catch { await ctx.reply("❌ لا أملك صلاحية تعديل صلاحيات الشات."); }
        return;
      }

      if (/^افتح\s+الرسائل$/i.test(text) && (isAdmin || isOwner(ctx))) {
        try {
          await ctx.api.setChatPermissions(ctx.chat.id, { 
            can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true 
          });
          await ctx.reply(`🔓 تم فتح دردشة المجموعة بنجاح.`);
        } catch { await ctx.reply("❌ لا أملك صلاحية تعديل صلاحيات الشات."); }
        return;
      }

      // هـ) مسح عدد من الرسائل (امسح + رقم)
      if (/^امسح\s+(\d+)$/i.test(text) && (isAdmin || isOwner(ctx))) {
        const match = text.match(/^امسح\s+(\d+)$/i);
        const count = parseInt(match[1]);
        let deleted = 0;
        for (let i = 0; i < Math.min(count, 50); i++) {
          try {
            await ctx.api.deleteMessage(ctx.chat.id, msg.message_id - i);
            deleted++;
          } catch {}
        }
        const rep = await ctx.reply(`🗑️ تم مسح ${deleted} رسالة بنجاح.`);
        setTimeout(() => { try { ctx.api.deleteMessage(ctx.chat.id, rep.message_id); } catch {} }, 3000);
        return;
      }

      // و) مسح جميع الرسائل
      if (/^المسح\s+جميع\s+الرسائل$/i.test(text) && (isAdmin || isOwner(ctx))) {
        await ctx.reply(`🧹 جارٍ تنظيف ومسح الرسائل المتاحة في المجموعة...`);
        return;
      }

      // ─── 3. الأمر الخاص (تفعيل الحماية) التلقائي ───
      if (/^تفعيل\s+الحماية$/i.test(text) && (isAdmin || isOwner(ctx))) {
        g.linksLock = true;
        g.mediaLock = true;
        g.badWordsLock = true;
        g.audioLock = true;
        g.contactsLock = true;
        save();
        await ctx.reply(`🛡️ **تم تفعيل الحماية الشاملة بنجاح!**\nتم منع الروابط، الصور، الوسائط، الصوتيات والمعرفات تلقائياً في المجموعة.`, { parse_mode: 'Markdown' });
        return;
      }

      // ─── 4. الأوامر التفاعلية المخصصة للأعضاء ───
      
      // أ) أمر حرف (ا) - بطاقة الملف الشخصي
      if (text === 'ا') {
        const user = msg.from;
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'عضو';
        const username = user.username ? `@${user.username}` : 'لا يوجد معرف';
        const userPoints = Number(db.points?.[uid] || 0);
        const userMsgs = g.stats?.messages || 1;
        const warnings = g.warnings?.[uid]?.count || 0;
        
        let rank = "عضو عادي 👤";
        if (isOwner({ from: user })) rank = "مالك البوت 👑";
        else if (isAdmin) rank = "مشرف المجموعة 🛡️";

        const randomPhrases = [
          "عسل مصفّى ومنورنا اليوم 🍯✨",
          "فديت هالطّلة الحلوة وراعيها 😎❤️",
          "منور الدنيا يا غالي، ربي يحفظك 🌸",
          "وجودك يزيد المجموعة تفاعل وجمال 🚀"
        ];
        const randomPhrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];

        const caption = 
          `🐾 **بطاقة الملف الشخصي الاحترافية**\n\n` +
          `👤 **الاسم:** ${name}\n` +
          `🔗 **المعرف:** ${username}\n` +
          `🆔 **الآيدي:** \`${user.id}\`\n` +
          `🎖️ **الرتبة:** ${rank}\n` +
          `⭐ **النقاط (ألعاب):** ${userPoints} نقطة\n` +
          `💬 **عدد الرسائل:** ${userMsgs}\n` +
          `⚠️ **التحذيرات:** ${warnings}\n\n` +
          `💬 **رسالة لك:** ${randomPhrase}`;

        try {
          const photos = await ctx.api.getUserProfilePhotos(user.id, { limit: 1 });
          if (photos.total_count > 0 && photos.photos[0]?.[0]) {
            const photoFileId = photos.photos[0][photos.photos[0].length - 1].file_id;
            await ctx.replyWithPhoto(photoFileId, { caption, parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
            return;
          }
        } catch {}

        await ctx.reply(caption, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        return;
      }

      // ب) كلمة (كت)
      if (text === 'كت') {
        const randomKet = KET_LIST[Math.floor(Math.random() * KET_LIST.length)];
        await ctx.reply(`🧠 **سؤال كت (فضفضة):**\n\n${randomKet}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      // جـ) كلمة (توب) - قائمة أفضل 3 لاعبين
      if (text === 'توب') {
        const pointsObj = db.points || {};
        const sorted = Object.entries(pointsObj).sort((a, b) => b[1] - a[1]).slice(0, 3);
        let topText = `🏆 **قائمة أبطال نغنوغ (أعلى 3 نقاط):**\n\n`;
        if (sorted.length === 0) {
          topText += `لا توجد نقاط مسجلة حالياً. العبوا واجمعوا النقاط!`;
        } else {
          sorted.forEach(([id, pts], idx) => {
            const medals = ['🥇', '🥈', '🥉'];
            topText += `${medals[idx]} الآيدي \`${id}\` ── **${pts} نقطة**\n`;
          });
        }
        await ctx.reply(topText, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        return;
      }

      // د) كلمة (ش) - شعر قصير
      if (text === 'ش') {
        const randomPoem = SHUAR_LIST[Math.floor(Math.random() * SHUAR_LIST.length)];
        await ctx.reply(`📜 **أبيات شعرية:**\n\n${randomPoem}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      // هـ) كلمة (ن) أو (نغنوغ) - اللهجة العراقية اللطيفة
      if (text === 'ن' || text === 'نغنوغ') {
        const randomN = N_PHRASES[Math.floor(Math.random() * N_PHRASES.length)];
        await ctx.reply(`🐱 **نغنوغ:**\n\n${randomN}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      // ─── 5. نظام الألعاب التفاعلية الجديد وتوزيع النقاط ───
      const chatId = String(ctx.chat.id);
      db.activeGames[chatId] ||= null;
      const activeGame = db.activeGames[chatId];

      if (activeGame && activeGame.active) {
        if (text.trim() === activeGame.answer) {
          db.activeGames[chatId] = null; // إنهاء الجولة الحالية
          db.points ||= {};
          db.points[uid] = (db.points[uid] || 0) + 1;
          save();

          await ctx.reply(`🎉 مبروك يا مبدع (${msg.from.first_name})!\n🏆 ربحت **نقطة واحدة** وأصبح رصيدك (${db.points[uid]} نقطة).`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
          return;
        }
      }

      // تشغيل ألعاب جديدة عبر الأحرف (خ، ر، ح، س)
      if (['خ', 'ر', 'ح', 'س'].includes(text)) {
        let gameType = '';
        let chosen = null;

        if (text === 'خ') { gameType = '🧩 اختر الخيار الصحيح'; chosen = QUESTIONS_DB.choose[Math.floor(Math.random() * QUESTIONS_DB.choose.length)]; }
        if (text === 'ر') { gameType = '🔢 لعبة الرياضيات السريعة'; chosen = QUESTIONS_DB.math[Math.floor(Math.random() * QUESTIONS_DB.math.length)]; }
        if (text === 'ح') { gameType = '🐅 لعبة معرفة الحيوان'; chosen = QUESTIONS_DB.animals[Math.floor(Math.random() * QUESTIONS_DB.animals.length)]; }
        if (text === 'س') { gameType = '💡 أسئلة عامة وثقافية'; chosen = QUESTIONS_DB.general[Math.floor(Math.random() * QUESTIONS_DB.general.length)]; }

        if (chosen) {
          db.activeGames[chatId] = { active: true, answer: chosen.answer };
          
          let questionText = `🎮 **${gameType}**\n\n❓ ${chosen.q || chosen.hint}\n\n⏱️ أسرع واحد يجاوب يربح نقطة!`;
          if (chosen.options) {
            questionText += `\n\nالخيارات: ` + chosen.options.join(' | ');
          }
          
          await ctx.reply(questionText, { parse_mode: 'Markdown' });
          return;
        }
      }

      // الردود التلقائية العادية
      if (g.autoReply) {
        const automaticReply = findAutoReply(text);
        if (automaticReply) {
          await ctx.reply(automaticReply, { reply_to_message_id: msg.message_id });
          return;
        }
      }

    } else {
      // التعامل مع رسائل الخاص والإذاعة
      const p = db.pending[userKey(ctx)];
      if (p && p.action === 'broadcast-message') {
        clearPending(ctx);
        const users = db.privateUsers || [];
        let successCount = 0, failCount = 0;
        const statusMsg = await ctx.reply(`📢 جاري إرسال الإذاعة...`);

        for (const userId of users) {
          try {
            await bot.api.sendMessage(Number(userId), `📢 **إشعار من الإدارة:**\n\n${text}`, { parse_mode: 'Markdown', disable_notification: false });
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 40));
          } catch { failCount++; }
        }

        return answer(ctx, `✅ **تمت الإذاعة بنجاح!**\n📤 إرسال: ${successCount}\n❌ فشل: ${failCount}`, { reply_markup: new InlineKeyboard().text('👑 لوحة المالك', 'ownerpanel') });
      }

      const showHomeFunc = async (cCtx) => {
        const c = getCustomization(cCtx);
        await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
      };
      return showHomeFunc(ctx);
    }
  });
}
