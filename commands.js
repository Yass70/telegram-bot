import { InlineKeyboard } from 'grammy';
import { helpKeyboard } from './keyboards.js';

// قاعدة بيانات ألعاب الأسئلة والتحديات (40 سؤالاً لكل فئة بإجمالي 160 عنصراً)[cite: 4]
import { QUESTIONS_DB, SHUAR_LIST, PERSONAL_QUESTIONS_LIST, N_PHRASES } from './games/data.js';
import { registerCallbacks } from './commands/callbacks.js';
import { registerMessages } from './commands/messages.js';
import { registerChannelManager } from './channelManager.js';
import { registerQrLikeCallbacks } from './qrLikes.js';
import { ensureEarnings, earningsBalance, awardReferral, redeemReward, setRedemptionStatus } from './earnings.js';

export function setupCommands(bot, db, helpers) {
  const { isOwner, isPrivate, isGroup, userKey, save, ensureUser, registerPrivateStart, groupFor, selectedGroup, setSelected, getCustomization, customText, getHomeKeyboard, HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate, chatSubscriptionGate, selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats, showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList, showProfileCard, handleViolation, showOwnerPanel, uiText } = helpers;

  db.activeGames ||= {};
  db.groupPoints ||= {};
  db.customizations ||= {};
  db.menuBack ||= {};
  ensureEarnings(db);

  // بوابة موحّدة تسبق كل الأوامر والرسائل والأزرار، حتى لا يمكن تجاوز الاشتراك الإجباري.
  bot.use(async (ctx, next) => {
    const isCallback = Boolean(ctx.callbackQuery);
    const callbackData = String(ctx.callbackQuery?.data || '');
    const isMessage = Boolean(ctx.message);
    if (!isCallback && !isMessage) return next();
    if (isPrivate(ctx) && !isOwner(ctx) && callbackData !== 'checksubscription') {
      if (!await subscriptionGate(ctx)) return;
    }
    if (isGroup(ctx)) {
      const isVerify = callbackData.startsWith('chatsubverify:');
      if (!isVerify && !await chatSubscriptionGate(ctx, { callback: isCallback })) return;
    }
    return next();
  });

  registerChannelManager(bot, { db, save, isOwner });
  registerQrLikeCallbacks(bot, { db, save, archiveChannel: process.env.QR_IMAGE_CHANNEL || '@QRiii5i' });

  // نحفظ القائمة التي دخل المستخدم منها إلى الألعاب أو التحذيرات، حتى يعود إليها فعلاً.
  const inferMenuBack = (ctx, kind) => {
    const text = String(ctx.callbackQuery?.message?.text || '');
    const keyboard = ctx.callbackQuery?.message?.reply_markup?.inline_keyboard || [];
    const callbacks = keyboard.flat().map(button => button.callback_data).filter(Boolean);
    const previous = db.menuBack?.[userKey(ctx)]?.[kind];
    if (kind === 'games' && (text.includes('الاختيارات الصحيحة') || text.includes('الرياضيات') || text.includes('معرفة الحيوان') || text.includes('معاني') || text.includes('عكس الكلمة') || text.includes('تفكيك الكلمة') || text.includes('الأسئلة العامة') || text.includes('أبطال نغنوغ'))) {
      return previous || (isGroup(ctx) ? 'publiccommands' : 'managementmenu');
    }
    if (kind === 'warnings' && (text.includes('التحذيرات والعقوبات') || text.includes('سجل التحذيرات') || text.includes('إدارة الكلمات الممنوعة'))) {
      return previous || (isGroup(ctx) ? 'publiccommands' : 'groupoverview');
    }
    if (kind === 'warnings' && callbacks.includes('groupoverview')) return 'groupoverview';
    if (text.includes('لوحة مالك')) return 'ownerpanel';
    if (text.includes('قسم الإدارة') || (callbacks.includes('gamesmenu') && callbacks.includes('adminpanel'))) return 'managementmenu';
    if (text.includes('إعدادات مجموعة') || (callbacks.includes('groupstats') && callbacks.includes('groupoverview'))) return 'groupsettings';
    if (text.includes('مركز أوامر نغنوغ') || callbacks.includes('showpublichelp')) return 'publiccommands';
    if (text.includes('تفاصيل المجموعة') || text.includes('نظرة عامة على المجموعة')) return 'groupoverview';
    return isGroup(ctx) ? 'publiccommands' : (kind === 'warnings' && selectedGroup(ctx) ? 'groupsettings' : 'managementmenu');
  };
  const rememberMenuBack = (ctx, kind) => {
    db.menuBack ||= {};
  ensureEarnings(db);
    db.menuBack[userKey(ctx)] ||= {};
    db.menuBack[userKey(ctx)][kind] = inferMenuBack(ctx, kind);
    save();
  };
  const menuBackTarget = (ctx, kind) => db.menuBack?.[userKey(ctx)]?.[kind] || (isGroup(ctx) ? 'publiccommands' : (kind === 'warnings' ? 'groupsettings' : 'managementmenu'));

  const normalizeAnswer = value => String(value ?? '').trim().toLocaleLowerCase('ar')
    .replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه').replace(/\s+/g, ' ');
  const groupScores = chatId => {
    db.groupPoints ||= {};
    db.groupPoints[String(chatId)] ||= {};
    return db.groupPoints[String(chatId)];
  };
  const leaderboardText = chatId => {
    const scores = groupScores(chatId);
    const sorted = Object.entries(scores).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3);
    if (!sorted.length) return '🏆 ماكو نقاط مسجلة بهذه المجموعة لحد الآن. ابدؤوا اللعب!';
    const medals = ['🥇', '🥈', '🥉'];
    return '🏆 **أبطال نغنوغ — أعلى 3 بهذه المجموعة**\n\n' +
      sorted.map(([id, pts], i) => `${medals[i]} ${db.pointNames?.[id] || `عضو ${id}`} — **${pts} نقطة**`).join('\n');
  };
  const protectionBackTarget = ctx => db.protectionBack?.[userKey(ctx)] || (isGroup(ctx) ? 'publiccommands' : 'managementmenu');
  const protectionKeyboard = (g, back = 'managementmenu') => new InlineKeyboard()
    .text(`${g.closedMessages ? '🔒' : '🔓'} ${g.closedMessages ? 'الدردشة مقفلة' : 'الدردشة مفتوحة'}`, 'prot_chat').row()
    .text(`${g.linksLock ? '🟢' : '⚪'} الروابط`, 'prot_links')
    .text(`${g.flood ? '🟢' : '⚪'} منع السبام`, 'prot_flood').row()
    .text(`${g.mediaLock ? '🟢' : '⚪'} الوسائط والملفات`, 'prot_media')
    .text(`${g.badWordsLock ? '🟢' : '⚪'} الكلمات الممنوعة`, 'prot_badwords').row()
    .text(`${g.audioLock || g.audioClipsLock ? '🟢' : '⚪'} الصوتيات`, 'prot_audio')
    .text(`${g.forwardLock ? '🟢' : '⚪'} توجيه الرسائل`, 'prot_forward').row()
    .text(`${g.contactsLock ? '🟢' : '⚪'} المعرفات والأرقام`, 'prot_contacts').row()
    .text('⚡ تفعيل الكل', 'prot_all')
    .text('🛑 إيقاف الكل', 'prot_none').row()
    .text('🎛️ تفعيل حمايات محددة', 'prot_custom').row()
    .text(`${g.warningSettings?.enabled ? '🟢' : '⚪'} الإنذارات`, 'warningstoggle')
    .text('⚙️ إعدادات الإنذارات', 'warningsmenu').row()
    .text('↩️ رجوع', back);

  // أمر البداية /start[cite: 4]
  const ensureReferralData = () => {
    db.userMeta ||= {};
    db.referrals ||= {};
    db.referralByUser ||= {};
  };
  const referralLinkFor = userId => {
    const username = String(bot.botInfo?.username || 'iii5iii55bot').replace(/^@/, '');
    return `https://t.me/${username}?start=ref_${encodeURIComponent(String(userId))}`;
  };
  const referralStatsFor = userId => {
    ensureReferralData();
    const stats = db.referrals[String(userId)] || {};
    return {
      joinedCount: Math.max(0, Number(stats.joinedCount) || 0),
      rewardPoints: Math.max(0, Number(stats.rewardPoints) || 0)
    };
  };
  const referralMenuKeyboard = () => new InlineKeyboard()
    .text('🔗 رابط مشاركة', 'referrallink')
    .row()
    .text('↩️ رجوع', 'home');
  const referralLinkKeyboard = userId => {
    const link = referralLinkFor(userId);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🐈‍⬛ تعال جرّب بوت نغنوغ ❤️')}`;
    return new InlineKeyboard()
      .add({ text: '📋 نسخ رابط المشاركة', copy_text: { text: link } }).row()
      .url('📤 مشاركة الرابط', shareUrl).row()
      .text('🔄 تحديث الإحصائيات', 'referralrefresh').row()
      .text('↩️ أرباحي', 'earningsmenu')
      .text('🏠 الرئيسية', 'home');
  };
  const showReferralLink = async ctx => {
    const uid = String(ctx.from.id);
    const stats = referralStatsFor(uid);
    const link = referralLinkFor(uid);
    const text = `╭━━━〔 🔗 رابط المشاركة 〕━━━╮

-︰رابطك الخاص :
${link}

-︰الأشخاص المنضمّون برابطك : ❨ ${stats.joinedCount} ❩
-︰نقاط الأرباح : ❨ ${earningsBalance(db, uid)} ❩

✦ تُحتسب الدعوة مرة واحدة بعد أول /start لمستخدم جديد عبر رابطك.
╰━━━━━━━━━━━━━━━━━━━━╯`;
    return answer(ctx, text, { reply_markup: referralLinkKeyboard(uid) });
  };

  bot.command('start', async ctx => {
    ensureReferralData();
    const uid = String(ctx.from?.id || '');
    const alreadyPrivate = (db.privateUsers || []).map(String).includes(uid);
    const payload = String(ctx.match || '').trim();
    const match = payload.match(/^ref_(\d+)$/);
    // تُسجّل الإحالة مرة واحدة فقط عند أول /start لحساب جديد، مع إبقاء رصيد ستار التاريخي دون تعديل.
    if (uid && !alreadyPrivate && match) {
      const referrerId = String(match[1]);
      if (referrerId !== uid && (db.users || []).includes(referrerId)) {
        const result = awardReferral(db, referrerId, uid);
        if (result.ok) save();
      }
    }
    ensureUser(ctx);
    registerPrivateStart(ctx);
    if (!await subscriptionGate(ctx)) return;
    save();
    if (payload === 'reminder') {
      const kb = new InlineKeyboard()
        .text('⏰ ذكّرني بموعد', 'remindercreate').row()
        .text('📋 تذكيراتي الحالية', 'reminderlist').row()
        .text('🌙 أذكار المساء', 'adhkar:evening').text('🌅 أذكار الصباح', 'adhkar:morning').row()
        .text('😴 أذكار النوم', 'adhkar:sleep').text('📖 أذكار القرآن', 'adhkar:quran').row()
        .text('↩️ لمسة نغنوغ', 'touchesmenu').text('🏠 الرئيسية', 'home');
      return ctx.reply('✦ ( قسـم ذكرني ⏰ )\n✦ خلّي نغنوغ يذكّرك بالأشياء المهمة بوقتها، وخلّي الأذكار قريبة منك بكل يوم. 🤍\n\n📌 تذكير خاص: حدّد الموعد اللي تريده، ونغنوغ يتولّى تذكيرك بيه.\n⚠️ جميع المواعيد حالياً حسب توقيت بغداد 🇮🇶', { reply_markup: kb });
    }
    const c = getCustomization(ctx);
    await ctx.reply(c.startText, { reply_markup: getHomeKeyboard(ctx) });
  });

  // أمر المساعدة /help[cite: 4]
  bot.command('help', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    await ctx.reply(customText(ctx, 'helpText') || HELP_TEXT, { reply_markup: helpKeyboard(getCustomization(ctx)) });
  });

  bot.command('id', async ctx => {
    const target = ctx.message.reply_to_message?.from || ctx.from;
    const lines = [`🆔 Chat ID: ${ctx.chat.id}`, `👤 User ID: ${target?.id ?? 'غير متاح'}`];
    if (target?.username) lines.push(`🔗 Username: @${target.username}`);
    await ctx.reply(lines.join('\n'), { reply_to_message_id: ctx.message.message_id });
  });

  bot.command('panel', async ctx => {
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    const c = getCustomization(ctx);
    await ctx.reply(c.startText, { reply_markup: getHomeKeyboard(ctx) });
  });

  bot.command('setwelcome', async ctx => {
    if (!isGroup(ctx)) return ctx.reply('استخدم /setwelcome داخل المجموعة.');
    if (!await userIsAdmin(ctx.chat.id, ctx.from.id) && !isOwner(ctx)) return ctx.reply('الأمر غير مخصص إلك');
    const g = groupFor(ctx.chat);
    const value = ctx.message.text.replace(/^\/setwelcome(?:@\w+)?\s*/i, '').trim();
    if (!value) return ctx.reply('أرسل نص الترحيب بعد الأمر. المتغيرات المتاحة: {name} و{title}.\nمثال: /setwelcome أهلاً {name} في {title}');
    g.welcomeText = value;
    g.welcomeEnabled = true;
    save();
    return ctx.reply('✅ تم حفظ رسالة الترحيب وتفعيلها.');
  });

  const RANDOM_WELCOME_MESSAGES = [
    '🐈‍⬛ هلااا بـ{name}، نورتنا ونوّرت المجموعة كلها ❤️ #نورتنا_{tag}',
    '🎀 وصل الحلو {name}! نغنوغ يرحّب بيك ويگول لا تستحي من أهلنا 🐾 #أهلاً_{tag}',
    '💌 يا مية هلا بـ{name}، خلي سوالفك الحلوة تملأ المكان 🌹 #ضيفنا_{tag}',
    '😻 المجموعة صارت أحلى من دخل {name}! نورت يا ورد ❤️ #نورتنا_{tag}',
    '🐾 نغنوغ يعلن وصول {name} رسمياً… استقبلوه بالقلوب مو بالتحقيق 😂 #هلا_{tag}',
    '🌷 أهلاً وسهلاً بـ{name}، نتمنى لك أيام حلوة وضحكات أكثر 🫶🏻 #أهلاً_{tag}',
    '🌚 منو وصل؟ {name} وصل! يلا ورّونا الترحيب العراقي الأصيل 😂❤️ #وصل_{tag}',
    '🖤🐈‍⬛ هلا بالوجه الجديد {name}، نورت المكان يا طيب #نغنوغ_يرحب_{tag}',
    '✨ يا هلا بـ{name}، اعتبر نفسك بين أهلك وناسك 🤍 #أهلنا_{tag}',
    '😼 نغنوغ استقبل {name} بابتسامة وشوارب مرتبة… نورت يا حلو 🎀 #نورتنا_{tag}',
    '❤️ أهلاً بـ{name}! خلي الاحترام والمحبة عنوان وجودك ويانه 🐾 #ضيفنا_{tag}',
    '🎉 وصل {name}، زيدوا الوناسة وخلو الترحيب يليق بيه 🌹 #هلا_{tag}',
    '🥹 نورتنا {name}، نغنوغ يتمنى تشوف هنا سوالف تفرّح گلبك ❤️ #نورتنا_{tag}',
    '🐈‍⬛ تنبيه لطيف: انضم {name} إلى عائلتنا، لا أحد يبخل عليه بالترحيب 😻 #أهلاً_{tag}',
    '💗 هلا بـ{name}، جيت بوقت حلو لأن نغنوغ موجود 😂🐾 #هلا_{tag}',
    '🌙 أهلاً وسهلاً بـ{name}، نتمنى لك راحة ووناسة بيناتنا 🤍 #ضيفنا_{tag}',
    '😹 نغنوغ فتح الباب ودخل {name}… هسه منو يقدّم الشاي؟ ☕ #نورتنا_{tag}',
    '🫶🏻 يا مرحبا بـ{name}، وجودك إضافة حلوة للمجموعة ❤️ #أهلنا_{tag}',
    '💐 استقبلوا {name} بالورد والكلام الطيب، نورتنا يا غالي 🐾 #هلا_{tag}',
    '🐾 آخر الأخبار: {name} صار واحد من جماعتنا! هلا بيك ونورت ❤️ #نورتنا_{tag}'
  ];
  const makeMemberTag = (name, id) => {
    const clean = String(name || `عضو${id}`).trim().replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    return clean || `عضو${id}`;
  };

  bot.on('message:new_chat_members', async ctx => {
    if (!isGroup(ctx)) return;
    const g = groupFor(ctx.chat);
    g.knownMembers ||= {};
    if (!g.activated || !g.welcomeEnabled) { save(); return; }
    for (const member of ctx.message.new_chat_members || []) {
      if (member.is_bot) continue;
      const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'صديقنا';
      const memberId = String(member.id);
      g.knownMembers[memberId] = { id: member.id, name, username: member.username || '', seenAt: Date.now() };
      const username = member.username ? `@${member.username}` : 'ما عنده يوزر';
      const groupRole = 'عضو';
      const messages = Number(g.userStats?.[memberId]?.messages || 0);
      const points = Number(db.groupPoints?.[String(ctx.chat.id)]?.[memberId] ?? db.points?.[memberId] ?? 0);
      const sakhakat = Number(g.userStats?.[memberId]?.sakhakat || 0);
      const caption = `🐾 بطاقة نغنوغ\n-︰أسمك : ❨ ${name} ❩\n-︰معرفك : ❨ ${username} ❩\n-︰ايديك : ❨ ${member.id} ❩\n-︰رتبتك : ❨ ${groupRole} ❩\n-︰رسائلك : ❨ ${messages} ❩\n-︰نقاطك : ❨ ${points} ❩\n-︰سحكاتك : ❨ ${sakhakat} ❩`;
      const welcomeLine = String(g.welcomeText || 'أهلاً بيك {name} ❤️ نورت مجموعة {title}، نتمنى لك وقتاً ممتعاً ويانه!')
        .replaceAll('{name}', name).replaceAll('{title}', ctx.chat.title || 'المجموعة');
      const randomWelcome = RANDOM_WELCOME_MESSAGES[Math.floor(Math.random() * RANDOM_WELCOME_MESSAGES.length)]
        .replaceAll('{name}', name)
        .replaceAll('{tag}', makeMemberTag(name, member.id));
      try {
        const photos = await ctx.api.getUserProfilePhotos(member.id, { limit: 1 });
        const photoId = photos.photos?.[0]?.at(-1)?.file_id;
        if (photoId) await ctx.replyWithPhoto(photoId, { caption, has_spoiler: true });
        else await ctx.reply(caption);
      } catch (err) {
        console.warn('[welcome-card] Could not send blurred profile photo:', err?.description || err?.message || err);
        try { await ctx.reply(caption); } catch {}
      }
      try {
        await ctx.reply(`${randomWelcome}\n\n💌 ${welcomeLine}`);
        g.stats.welcomed = Number(g.stats.welcomed || 0) + 1;
      } catch (err) {
        console.warn('[welcome-message] Could not send second welcome message:', err?.description || err?.message || err);
      }
    }
    save();
  });

  // لوحة الأوامر التفاعلية: تظهر كأزرار داخل المجموعة وتُحدّث الرسالة نفسها عند الاختيار.
  const publicCommandsKeyboard = () => new InlineKeyboard()
    .text('🎮 الألعاب', 'gameshub')
    .text('💬 التفاعلية', 'interactive_menu').row()
    .text('🛡️ الحماية', 'protectionmenu')
    .text('👑 المشرفون', 'adminpanel').row()
    .text('🏆 المتصدرون والنقاط', 'statsmenu').row()
    .url('👨🏻‍💻 المطوّر', 'https://t.me/llll6llll6');
  const sendPublicCommands = async ctx => {
    if (!isGroup(ctx)) return ctx.reply('🐾 〔 تنبيه 〕 افتح «الأوامر» داخل المجموعة حتى تظهر لك لوحة نغنوغ التفاعلية.');
    return ctx.reply('╭━━━〔 🐈‍⬛ مركز أوامر نغنوغ 〕━━━╮\n\nاختَر القسم المطلوب من الأزرار أدناه.\n🎮 الألعاب والأوامر التفاعلية متاحة للجميع.\n🛡️ الحماية وأوامر المشرفين مخصّصة للمخوّلين فقط.\n\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: publicCommandsKeyboard() });
  };
  bot.command('commands', sendPublicCommands);
  // قائمة الترفيه المستقلة: الألعاب، التفاعلية، والخدمات الحصرية.
  const sendGamesHub = async ctx => {
    if (!isGroup(ctx)) return ctx.reply('🐾 افتح «العاب» داخل المجموعة حتى تظهر لك أقسام الترفيه.');
    const kb = new InlineKeyboard()
      .text('🎮 الألعاب', 'gamesmenu').row()
      .text('💬 تفاعلية', 'interactive_menu').row()
      .text('🎁 خدمات حصرية', 'exclusive_services');
    return ctx.reply('╭━━━〔 🐈‍⬛ عالم نغنوغ 〕━━━╮\n\nاختَر شنو تحب تسوي ويانه:\n🎮 ألعاب وتحدّيات.\n💬 أوامر تفاعلية.\n🎁 خدمات حصرية.\n\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
  };
  bot.hears(/^(?:العاب|ألعاب|الالعاب|الألعاب)$/i, sendGamesHub);
  // يقبل الصيغ الشائعة لعرض الأوامر داخل المجموعة.
  bot.hears(/^(?:الأوامر|الاوامر|أمر|امر)$/i, sendPublicCommands);

  // أمر الإذاعة للمالك[cite: 4]
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

  // معالجة كافة الأزرار واللوحات بشمولية تامة لتجنب أي أخطاء أو أزرار لا تستجيب[cite: 3, 4, 5]
  const commandShared = {
    ...helpers, bot, db, InlineKeyboard,
    inferMenuBack, rememberMenuBack, menuBackTarget, normalizeAnswer,
    groupScores, leaderboardText, protectionBackTarget, protectionKeyboard,
    ensureReferralData, referralLinkFor, referralStatsFor, referralMenuKeyboard,
    ensureEarnings, earningsBalance, redeemReward, setRedemptionStatus,
    referralLinkKeyboard, showReferralLink, publicCommandsKeyboard,
    QUESTIONS_DB, SHUAR_LIST, PERSONAL_QUESTIONS_LIST, N_PHRASES
  };
  registerCallbacks(bot, commandShared);
  registerMessages(bot, commandShared);
}
