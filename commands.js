import { InlineKeyboard } from 'grammy';
import { helpKeyboard } from './keyboards.js';

// قاعدة بيانات ألعاب الأسئلة والتحديات (40 سؤالاً لكل فئة بإجمالي 160 عنصراً)[cite: 4]
import { QUESTIONS_DB, SHUAR_LIST, KET_LIST, N_PHRASES } from './games/data.js';
import { registerCallbacks } from './commands/callbacks.js';
import { registerMessages } from './commands/messages.js';

export function setupCommands(bot, db, helpers) {
  const { isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor, selectedGroup, setSelected, getCustomization, customText, getHomeKeyboard, HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate, selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats, showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList, showProfileCard, handleViolation, showOwnerPanel, uiText } = helpers;

  db.activeGames ||= {};
  db.groupPoints ||= {};
  db.customizations ||= {};
  db.menuBack ||= {};

  // نحفظ القائمة التي دخل المستخدم منها إلى الألعاب أو التحذيرات، حتى يعود إليها فعلاً.
  const inferMenuBack = (ctx, kind) => {
    const text = String(ctx.callbackQuery?.message?.text || '');
    const keyboard = ctx.callbackQuery?.message?.reply_markup?.inline_keyboard || [];
    const callbacks = keyboard.flat().map(button => button.callback_data).filter(Boolean);
    const previous = db.menuBack?.[userKey(ctx)]?.[kind];
    if (kind === 'games' && (text.includes('لعبة الخيار') || text.includes('لعبة الرياضيات') || text.includes('لعبة الحيوان') || text.includes('الأسئلة العامة') || text.includes('أبطال نغنوغ'))) {
      return previous || (isGroup(ctx) ? 'publiccommands' : 'managementmenu');
    }
    if (kind === 'warnings' && (text.includes('التحذيرات والعقوبات') || text.includes('سجل التحذيرات') || text.includes('إدارة الكلمات الممنوعة'))) {
      return previous || (isGroup(ctx) ? 'publiccommands' : 'groupsettings');
    }
    if (text.includes('لوحة مالك')) return 'ownerpanel';
    if (text.includes('قسم الإدارة') || (callbacks.includes('gamesmenu') && callbacks.includes('adminpanel'))) return 'managementmenu';
    if (text.includes('إعدادات مجموعة') || (callbacks.includes('groupstats') && callbacks.includes('groupoverview'))) return 'groupsettings';
    if (text.includes('مركز أوامر نغنوغ') || callbacks.includes('showpublichelp')) return 'publiccommands';
    if (text.includes('تفاصيل المجموعة') || text.includes('نظرة عامة على المجموعة')) return 'groupoverview';
    return isGroup(ctx) ? 'publiccommands' : (kind === 'warnings' && selectedGroup(ctx) ? 'groupsettings' : 'managementmenu');
  };
  const rememberMenuBack = (ctx, kind) => {
    db.menuBack ||= {};
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
    .text(`${g.closedMessages ? '🔒 الدردشة مقفلة' : '🔓 الدردشة مفتوحة'}`, 'prot_chat').row()
    .text(`${g.linksLock ? '🟢' : '⚪'} الروابط`, 'prot_links')
    .text(`${g.flood ? '🟢' : '⚪'} منع السبام`, 'prot_flood').row()
    .text(`${g.mediaLock ? '🟢' : '⚪'} الوسائط والملفات`, 'prot_media')
    .text(`${g.badWordsLock ? '🟢' : '⚪'} كلمات الفشار`, 'prot_badwords').row()
    .text(`${g.audioLock || g.audioClipsLock ? '🟢' : '⚪'} الصوتيات`, 'prot_audio')
    .text(`${g.forwardLock ? '🟢' : '⚪'} توجيه الرسائل`, 'prot_forward').row()
    .text(`${g.contactsLock ? '🟢' : '⚪'} المعرفات والأرقام`, 'prot_contacts').row()
    .text('⚡ تفعيل الحماية الشاملة', 'prot_all')
    .text('🛑 إيقاف الحماية الشاملة', 'prot_none').row()
    .text('🔙 رجوع للقائمة السابقة', back);

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
      .add({ text: '📋 نسخ رابط المشاركة', copy_text: { text: link } })
      .row()
      .url('📤 مشاركة الرابط', shareUrl)
      .row()
      .text('🔄 تحديث الإحصائيات', 'referralrefresh')
      .row()
      .text('↩️ رجوع إلى ستار', 'starmenu')
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
-︰نقاط الجوائز : ❨ ${stats.rewardPoints} ❩

✦ يُحتسب المستخدم الجديد مرة واحدة فقط عند بدء البوت عبر رابطك.
╰━━━━━━━━━━━━━━━━━━━━╯`;
    return answer(ctx, text, { reply_markup: referralLinkKeyboard(uid) });
  };

  bot.command('start', async ctx => {
    ensureReferralData();
    const uid = String(ctx.from?.id || '');
    const alreadyKnown = (db.users || []).includes(uid);
    const payload = String(ctx.match || '').trim();
    const match = payload.match(/^ref_(\d+)$/);
    // تكافأ الإحالة فقط إذا كان هذا أول تسجيل للمستخدم، ولا يُسمح بإحالة النفس أو تكرارها.
    if (uid && !alreadyKnown && !db.userMeta[uid] && match) {
      const referrerId = String(match[1]);
      if (referrerId !== uid && (db.users || []).includes(referrerId)) {
        db.referrals[referrerId] ||= { joinedCount: 0, rewardPoints: 0 };
        if (!db.referralByUser[uid]) {
          db.referralByUser[uid] = referrerId;
          db.referrals[referrerId].joinedCount = Math.max(0, Number(db.referrals[referrerId].joinedCount) || 0) + 1;
          db.referrals[referrerId].rewardPoints = Math.max(0, Number(db.referrals[referrerId].rewardPoints) || 0) + 1;
          save();
        }
      }
    }
    ensureUser(ctx);
    if (!await subscriptionGate(ctx)) return;
    const c = getCustomization(ctx);
    save();
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

  bot.on('message:new_chat_members', async ctx => {
    if (!isGroup(ctx)) return;
    const g = groupFor(ctx.chat);
    g.knownMembers ||= {};
    if (!g.activated || !g.welcomeEnabled) { save(); return; }
    for (const member of ctx.message.new_chat_members || []) {
      if (member.is_bot) continue;
      const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'صديقنا';
      g.knownMembers[String(member.id)] = { id: member.id, name, username: member.username || '', seenAt: Date.now() };
      const username = member.username ? `@${member.username}` : 'ما عنده يوزر';
      const welcomeLine = String(g.welcomeText || 'ولك هلا بيك يا {name}، نورت مجموعة {title} ❤️🐾')
        .replaceAll('{name}', name).replaceAll('{title}', ctx.chat.title || 'المجموعة');
      const caption = `🐈‍⬛ هلا وغلا بنجمنا الجديد! 🐾\n\n👤 الاسم: ${name}\n🔗 المعرف: ${username}\n🆔 الآيدي: ${member.id}\n📝 البايو: غير متاح عبر تيليگرام بوت API\n\n💌 ${welcomeLine}\n\n❤️ نورتنا، خلي وجودك حلو مثل قلبك!`;
      try {
        const photos = await ctx.api.getUserProfilePhotos(member.id, { limit: 1 });
        const photoId = photos.photos?.[0]?.at(-1)?.file_id;
        if (photoId) await ctx.replyWithPhoto(photoId, { caption });
        else await ctx.reply(caption);
        g.stats.welcomed = Number(g.stats.welcomed || 0) + 1;
      } catch {
        try { await ctx.reply(caption); } catch {}
      }
    }
    save();
  });

  // لوحة الأوامر التفاعلية: تظهر كأزرار داخل المجموعة وتُحدّث الرسالة نفسها عند الاختيار.
  const publicCommandsKeyboard = () => new InlineKeyboard()
    .text('🎮  الألعاب ', 'gamesmenu').row()
    .text('💬 الأوامر التفاعلية', 'interactive_menu').row()
    .text('🛡️ أوامر الحماية', 'protectionmenu').row()
    .text('👑 أوامر المشرفين', 'adminpanel').row()
    .text('🏆 المتصدرون والنقاط', 'statsmenu').row()
    .url('👨🏻‍💻  المطوّر ', 'https://t.me/llll6llll6');
  const sendPublicCommands = async ctx => {
    if (!isGroup(ctx)) return ctx.reply('🐾 〔 تنبيه 〕 افتح «الأوامر» داخل المجموعة حتى تظهر لك لوحة نغنوغ التفاعلية.');
    return ctx.reply('╭━━━〔 🐈‍⬛ مركز أوامر نغنوغ 〕━━━╮\n\nاختَر القسم المطلوب من الأزرار أدناه.\n🎮 الألعاب والأوامر التفاعلية متاحة للجميع.\n🛡️ الحماية وأوامر المشرفين مخصّصة للمخوّلين فقط.\n\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: publicCommandsKeyboard() });
  };
  bot.command('commands', sendPublicCommands);
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
    referralLinkKeyboard, showReferralLink, publicCommandsKeyboard,
    QUESTIONS_DB, SHUAR_LIST, KET_LIST, N_PHRASES
  };
  registerCallbacks(bot, commandShared);
  registerMessages(bot, commandShared);
}
