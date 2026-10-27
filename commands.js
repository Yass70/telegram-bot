import { InlineKeyboard } from 'grammy';
import { GROUP_RULES, NORMAL_MEMBER_RULES_REPLY, findAutoReply } from './autoReplies.js';
import { startNewGame, handleGameMessage, normalizeGameAnswer } from './game.js';
import {
  mainKeyboard,
  helpKeyboard,
  ownerKeyboard,
  warningsKeyboard,
  groupSettingsKeyboard,
  repliesKeyboard,
  customizationKeyboard
} from './keyboards.js';

export function setupCommands(bot, db, helpers) {
  const { isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor, selectedGroup, setSelected, getCustomization, customText, getHomeKeyboard, HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate, selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats, showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList, showProfileCard, handleViolation, showOwnerPanel, PROFILE_PHRASES } = helpers;

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

  // أمر الإذاعة (Broadcast) للمالك
  bot.command('broadcast', async ctx => {
    if (!isOwner(ctx)) return ctx.reply('هذا الأمر خاص بمالك البوت فقط.');
    
    const textToSend = ctx.message.text.replace(/^\/broadcast\s*/, '').trim();
    if (!textToSend) {
      return ctx.reply('⚠️ عذراً، أرسل النص بعد الأمر هكذا:\n`/broadcast السلام عليكم، البوت تحت الصيانة حالياً`', { parse_mode: 'Markdown' });
    }

    const users = db.privateUsers || [];
    if (users.length === 0) {
      return ctx.reply('⚠️ ماكو أي مستخدم مسجل بالخاص حالياً.');
    }

    let successCount = 0;
    let failCount = 0;

    await ctx.reply(`📢 جاري إرسال الرسالة إلى ${users.length} مستخدم... انتظر قليلاً.`);

    for (const userId of users) {
      try {
        await bot.api.sendMessage(Number(userId), `📢 **إشعار من الإدارة:**\n\n${textToSend}`, { parse_mode: 'Markdown' });
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        failCount++;
      }
    }

    await ctx.reply(`✅ **تمت الإذاعة بنجاح!**\n\n📤 تم الإرسال إلى: ${successCount}\n❌ فشل الإرسال (حظروا البوت): ${failCount}`, { parse_mode: 'Markdown' });
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

  bot.on('message:new_chat_members', async ctx => {
    const g = db.groups[String(ctx.chat.id)];
    if (!g?.activated || !g.welcomeEnabled) return;
    for (const member of ctx.message.new_chat_members) {
      if (member.is_bot && member.id === bot.botInfo?.id) continue;
      const name = member.first_name || 'صديقنا';
      const text = g.welcomeText.replaceAll('{name}', name).replaceAll('{title}', ctx.chat.title || g.title || 'المجموعة');
      try { await ctx.reply(text); g.stats.welcomed++; db.stats.welcomed++; } catch {}
    }
    save();
  });

  // معالجة الأزرار الشفافة (Callback Queries)
  bot.on('callback_query:data', async ctx => {
    ensureUser(ctx);
    const data = ctx.callbackQuery.data;

    if (!isPrivate(ctx)) {
      await ctx.answerCallbackQuery({ text: '⚙️ إدارة نغنوغ متاحة من الخاص فقط ❤️' });
      return;
    }
    if (data === 'checksubscription') {
      const result = await checkSubscription(ctx.from.id);
      if (result.ok) {
        await ctx.answerCallbackQuery({ text: 'تم التحقق بنجاح ❤️' });
        return showHome(ctx);
      }
      await ctx.answerCallbackQuery({ text: 'بعدك مو مشترك في بعض القنوات المطلوبة.' });
      return subscriptionGate(ctx);
    }
    if (!await subscriptionGate(ctx)) { try { await ctx.answerCallbackQuery(); } catch {} return; }
    try { await ctx.answerCallbackQuery(); } catch {}

    const showHomeFunc = async (cCtx) => {
      const c = getCustomization(cCtx);
      await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
    };

    if (data === 'home') return showHomeFunc(ctx);
    if (data === 'howto') return answer(ctx, '📖 طريقة الاستخدام — نغنوغ 🐾', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
    if (data === 'protection') return answer(ctx, '🛡️ ميزات الحماية', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
    if (data === 'help') return answer(ctx, HELP_TEXT, { reply_markup: helpKeyboard() });
    
    if (data === 'custommenu') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      clearPending(ctx);
      return answer(ctx, '🎨 تخصيص نغنوغ\n\nهنا تگدر تغيّر النصوص اللي تظهر إلك أنت فقط. تخصيصك ما يأثر على باقي المستخدمين أو رسائل المجموعات.', { reply_markup: customizationKeyboard() });
    }
    if (data === 'customstart') {
      pending(ctx, { action: 'custom-start' });
      return answer(ctx, `👋 أرسل مقدمة /start الجديدة.\n\nالنص الحالي:\n${customText(ctx, 'startText')}\n\nتگدر تستخدم الإيموجي والأسطر الجديدة.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'custommenu') });
    }
    if (data === 'customreset') {
      db.customizations ||= {};
      db.customizations[userKey(ctx)] = JSON.parse(JSON.stringify(db.customizations[userKey(ctx)])); // or default
      clearPending(ctx);
      save();
      return answer(ctx, '♻️ رجّعت كل نصوص التخصيص إلى حالتها الأصلية.', { reply_markup: customizationKeyboard() });
    }

    if (data === 'accountinfo') {
      const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'غير متوفر';
      const username = ctx.from.username ? `@${ctx.from.username}` : 'ما عندك اسم مستخدم';
      const userId = ctx.from.id;
      return answer(ctx, `${customText(ctx, 'replies', 'account')}\n\n📝 الاسم: ${name}\n🔗 المستخدم: ${username}\n🆔 الآيدي: ${userId}`, { reply_markup: new InlineKeyboard().text('🔙 القائمة الرئيسية', 'home') });
    }
    if (data === 'userreplies') return answer(ctx, customText(ctx, 'replies', 'replies'), { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').row().text('🔙 القائمة الرئيسية', 'home') });
    if (data === 'ownerpanel') return showOwnerPanel(ctx);
    if (data === 'mygroups') { if (!isPrivate(ctx)) return answer(ctx, 'إدارة المجموعات متاحة من الخاص فقط.'); return showGroups(ctx); }
    if (data.startsWith('choosegroup:')) {
      const id = data.slice('choosegroup:'.length); const g = db.groups[id];
      if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة.');
      if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة هذه المجموعة متاحة للمشرفين فقط.');
      setSelected(ctx, id); return showGroupSettings(ctx, g);
    }
    
    if (data === 'groupsettings') {
      const { entries } = selectedGroupKeyboard(ctx);
      if (!selectedGroup(ctx)) {
        if (entries.length) return showGroups(ctx);
        return answer(
          ctx,
          '⚙️ إعدادات نغنوغ 🐾\n\nمن هذا القسم تگدر تتحكم بميزات البوت داخل مجموعتك.',
          { reply_markup: new InlineKeyboard().url('➕ أضف نغنوغ لمجموعتك', `https://t.me/${bot.botInfo?.username || 'YZ_VIDbot'}?startgroup=true`).row().text('🔙 القائمة الرئيسية', 'home') }
        );
      }
      return showGroupSettings(ctx);
    }

    if (data === 'warningsmenu') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nالمجموعة: ${g.title}`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'badwordsmenu') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.badWords ||= [];
      const kb = new InlineKeyboard();
      kb.text('➕ إضافة كلمة ممنوعة', 'badwordadd').row();
      g.badWords.forEach((word, index) => { kb.text(`🗑️ حذف: ${word}`, `badworddel:${index}`).row(); });
      kb.text('🔙 رجوع للتحذيرات', 'warningsmenu');
      const wordsList = g.badWords.length > 0 ? g.badWords.join(', ') : 'لا توجد كلمات ممنوعة مضافة حالياً.';
      return ctx.editMessageText(`🚫 إدارة الكلمات الممنوعة\n\nالمجموعة: ${g.title}\nالكلمات:\n${wordsList}`, { reply_markup: kb });
    }

    if (data === 'badwordadd') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      pending(ctx, { action: 'badwordadd', groupId: g.id });
      return answer(ctx, '➕ أرسل الآن الكلمة أو العبارة المخالفة.');
    }

    if (data.startsWith('badworddel:')) {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const index = Number(data.split(':')[1]);
      g.badWords ||= [];
      if (g.badWords[index]) {
        const removed = g.badWords.splice(index, 1)[0];
        save();
        await answer(ctx, `✅ تم حذف الكلمة "${removed}".`);
      }
      const kb = new InlineKeyboard();
      kb.text('➕ إضافة كلمة ممنوعة', 'badwordadd').row();
      g.badWords.forEach((word, idx) => { kb.text(`🗑️ حذف: ${word}`, `badworddel:${idx}`).row(); });
      kb.text('🔙 رجوع للتحذيرات', 'warningsmenu');
      const wordsList = g.badWords.length > 0 ? g.badWords.join(', ') : 'لا توجد كلمات ممنوعة مضافة حالياً.';
      return ctx.editMessageText(`🚫 إدارة الكلمات الممنوعة\n\nالمجموعة: ${g.title}\nالكلمات:\n${wordsList}`, { reply_markup: kb });
    }

    if (data === 'warningstoggle') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      g.warningSettings.enabled = !g.warningSettings.enabled;
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nالحالة: ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'}`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningslimit') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const limits = [2, 3, 5, 10];
      const index = limits.indexOf(Number(g.warningSettings.limit));
      g.warningSettings.limit = limits[(index + 1) % limits.length];
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nعدد التحذيرات: ${g.warningSettings.limit}`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningsaction') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const actions = ['mute', 'kick', 'ban'];
      const index = actions.indexOf(g.warningSettings.action);
      g.warningSettings.action = actions[(index + 1) % actions.length];
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nالعقوبة: ${g.warningSettings.action}`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningsduration') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const durations = [5, 10, 30, 60, 120];
      const index = durations.indexOf(Number(g.warningSettings.duration));
      g.warningSettings.duration = durations[(index + 1) % durations.length];
      save();
      return ctx.editMessageText(`🛡️ التحذيرات والعقوبات\n\nمدة الكتم: ${g.warningSettings.duration} دقيقة`, { reply_markup: warningsKeyboard(g) });
    }

    if (data === 'warningslog') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const logs = (g.warningLog || []).slice(-15).reverse();
      if (!logs.length) return answer(ctx, '📋 ماكو تحذيرات مسجّلة.', { reply_markup: new InlineKeyboard().text('🔙 رجوع', 'warningsmenu') });
      const text = logs.map((item, i) => `${i + 1}. 👤 ${item.name}\n⚠️ السبب: ${item.reason}`).join('\n\n');
      return answer(ctx, `📋 سجل التحذيرات:\n\n${text}`, { reply_markup: new InlineKeyboard().text('🔙 رجوع', 'warningsmenu') });
    }

    if (data === 'warningsclear') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const members = Object.entries(g.warnings || {}).filter(([_, v]) => Number(v?.count || 0) > 0);
      if (!members.length) return answer(ctx, '🧹 ماكو أعضاء عندهم تحذيرات.', { reply_markup: new InlineKeyboard().text('🔙 رجوع', 'warningsmenu') });
      const kb = new InlineKeyboard();
      members.slice(0, 30).forEach(([userId, v]) => { kb.text(`🧹 ${String(v.name || userId).slice(0, 25)} (${v.count})`, `warningclear:${userId}`).row(); });
      kb.text('🔙 رجوع', 'warningsmenu');
      return answer(ctx, 'اختر العضو لتصفير تحذيراته:', { reply_markup: kb });
    }

    if (data.startsWith('warningclear:')) {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const userId = data.slice('warningclear:'.length);
      delete g.warnings[userId];
      save();
      return answer(ctx, '✅ تم تصفير تحذيرات العضو.', { reply_markup: new InlineKeyboard().text('🔙 رجوع', 'warningsmenu') });
    }

    if (data === 'welcomeedit') { const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.'); pending(ctx, { action: 'welcome', groupId: g.id }); return answer(ctx, `👋 أرسل رسالة الترحيب الجديدة.`); }
    if (data === 'togglelinks' || data === 'toggleflood' || data === 'togglereplies') {
      const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      if (data === 'togglelinks') g.links = !g.links;
      if (data === 'toggleflood') g.flood = !g.flood;
      if (data === 'togglereplies') g.autoReply = !g.autoReply;
      save(); return showGroupSettings(ctx, g);
    }
    if (data === 'repliesmenu') return answer(ctx, '💬 إدارة الردود التلقائية', { reply_markup: repliesKeyboard() });
    if (data === 'replyadd') { const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.'); pending(ctx, { action: 'reply-trigger', groupId: g.id }); return answer(ctx, '➕ أرسل العبارة التي تريد أن يلتقطها البوت:'); }
    if (data === 'replylist') return showReplyList(ctx);
    if (data === 'replydelete') {
      const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      if (!g.replies.length) return answer(ctx, 'ماكو ردود.', { reply_markup: repliesKeyboard() });
      const kb = new InlineKeyboard();
      g.replies.forEach((r, i) => kb.text(`🗑️ ${i + 1}. ${r.trigger.slice(0, 25)}`, `replydel:${i}`).row());
      kb.text('🔙 رجوع', 'repliesmenu');
      return answer(ctx, 'اختر الرد للحذف:', { reply_markup: kb });
    }
    if (data.startsWith('replydel:')) {
      const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'خطأ صلاحيات.');
      const i = Number(data.split(':')[1]);
      g.replies.splice(i, 1);
      save();
      return answer(ctx, '🗑️ تم حذف الرد بنجاح.', { reply_markup: repliesKeyboard() });
    }
    if (data === 'groupstats') return showGroupStats(ctx);
    if (data === 'ownerpanel') return showOwnerPanel(ctx);
    if (data === 'botstats') {
      if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.');
      return answer(ctx, `📊 إحصائيات البوت\n\n👤 المستخدمين: ${(db.privateUsers || []).length}`, { reply_markup: ownerKeyboard() });
    }
    if (data === 'activatedgroups') {
      if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.');
      const gs = Object.values(db.groups).filter(g => g.activated);
      return answer(ctx, gs.length ? `👥 المجموعات المفعّلة:\n\n${gs.map((g, i) => `${i + 1}. ${g.title}`).join('\n')}` : 'ماكو مجموعات.', { reply_markup: ownerKeyboard() });
    }
    if (data === 'botsettings') { if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.'); return answer(ctx, '⚙️ إعدادات البوت تعمل بنجاح.', { reply_markup: ownerKeyboard() }); }
    if (data === 'globalprotection') { if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.'); return answer(ctx, '🛡️ الحماية العامة.', { reply_markup: ownerKeyboard() }); }
    if (data === 'requiredmenu') return ownerRequiredMenu(ctx);
    if (data === 'requiredadd') { if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.'); pending(ctx, { action: 'required-add' }); return answer(ctx, 'أرسل معرف القناة أو المجموعة @username أو الرابط'); }
    if (data === 'requiredlist') return showRequiredList(ctx);
    if (data.startsWith('reqdel:')) {
      if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.');
      const i = Number(data.split(':')[1]);
      db.requiredChats.splice(i, 1);
      save();
      return answer(ctx, '✅ تم الحذف.', { reply_markup: new InlineKeyboard().text('📋 عرض', 'requiredlist').row().text('🔙 رجوع', 'requiredmenu') });
    }
    return answer(ctx, 'زر غير معروف.');
  });

  // معالجة رسائل النص (المجموعات والخاص)
  bot.on('message:text', async ctx => {
    ensureUser(ctx);
    const text = ctx.message.text.trim();
    if (isGroup(ctx)) {
      const g = db.groups[String(ctx.chat.id)];
      if (!g?.activated || text.startsWith('/')) return;

      if (text === 'ا') {
        await showProfileCard(ctx, g);
        return;
      }

      g.title = ctx.chat.title || g.title;
      g.stats.messages++;
      db.stats.messages++;

      // 1. الكلمات الممنوعة
      if (g.badWords && g.badWords.length > 0 && !await userIsAdmin(ctx.chat.id, ctx.from.id)) {
        const lowerText = text.toLowerCase();
        const matchedWord = g.badWords.find(word => lowerText.includes(word.toLowerCase()));
        if (matchedWord) {
          try {
            await ctx.deleteMessage();
            await handleViolation(ctx, g, `استخدام كلمة ممنوعة (${matchedWord})`);
          } catch (e) {}
          save();
          return;
        }
      }

      // 2. منع الروابط
      if (g.links && /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|@[A-Za-z0-9_]{5,})/i.test(text) && !await userIsAdmin(ctx.chat.id, ctx.from.id)) {
        try { 
          await ctx.deleteMessage(); 
          g.stats.deletedLinks++; 
          db.stats.deletedLinks++; 
          await handleViolation(ctx, g, 'إرسال رابط ممنوع');
        } catch (e) {}
        save(); 
        return;
      }

      // 3. منع السبام
      if (g.flood && !await userIsAdmin(ctx.chat.id, ctx.from.id)) {
        const now = Date.now(); const uid = userKey(ctx); const times = (g.floodUsers[uid] || []).filter(t => now - t < 5000); times.push(now); g.floodUsers[uid] = times;
        if (times.length >= 5) {
          try { 
            await ctx.deleteMessage(); 
            g.stats.floodEvents++; 
            db.stats.floodEvents++; 
            await handleViolation(ctx, g, 'إرسال رسائل متكررة (سبام)');
          } catch {}
          save(); 
          return;
        }
      }

      const normalizedText = normalizeGameAnswer(text);

      // 4. القوانين
      if (['القوانين', 'قوانين'].includes(normalizedText)) {
        const canManage = await userCanManage(ctx, g);
        await ctx.reply(canManage ? GROUP_RULES : NORMAL_MEMBER_RULES_REPLY, { reply_to_message_id: ctx.message.message_id });
        return;
      }

      // 5. أوامر ومعلومات المجموعة
      if (['الاوامر', 'أوامر', 'اوامر', 'المعلومات', 'معلومات'].includes(normalizedText)) {
        const commandsList = 
          `🐈‍⬛ قائمة أوامر وميزات نغنوغ داخل المجموعة 🐾\n\n` +
          `⚙️ الأوامر العادية:\n` +
          `• اكتب «تفعيل» ➜ لتفعيل البوت (للمشرفين فقط).\n` +
          `• اكتب «ا» ➜ لعرض بطاقة معلوماتك ونقاطك وتحذيراتك.\n` +
          `• اكتب «القوانين» ➜ لعرض قوانين المجموعة.\n` +
          `• اكتب «ألعاب» ➜ لبدء تحدي الأسئلة والمسابقات.\n\n` +
          `📌 للتحكم الكامل بالإعدادات والتحذيرات، افتح البوت بالخاص! ❤️`;

        await ctx.reply(commandsList, { reply_to_message_id: ctx.message.message_id });
        return;
      }

      // 6. الردود التلقائية
      if (g.autoReply && !['العاب', 'لعبه', 'لعبة', 'لعبة جديدة'].includes(normalizedText)) {
        const automaticReply = findAutoReply(text);
        if (automaticReply) {
          await ctx.reply(automaticReply, { reply_to_message_id: ctx.message.message_id });
          save();
          return;
        }

        const customReply = (g.replies || []).find(reply => normalizeGameAnswer(reply.trigger) === normalizedText);
        if (customReply) {
          await ctx.reply(customReply.response, { reply_to_message_id: ctx.message.message_id });
          save();
          return;
        }
      }

      // 7. تشغيل أو تفاعل مع اللعبة
      if (['العاب', 'لعبه', 'لعبة', 'لعبة جديدة'].includes(normalizedText)) {
        await startNewGame(ctx, g, save);
        return;
      }

      if (g.game?.active) {
        const handled = await handleGameMessage(ctx, text, g, db, save, userKey);
        if (handled) return;
      }

    } else {
      // المحادثات الخاصة (الخاص)
      const p = db.pending[userKey(ctx)];
      if (p) {
        if (['custom-start', 'custom-description', 'custom-reply'].includes(p.action)) {
          if (!text) return ctx.reply('❌ النص فارغ. أرسل نصاً يحتوي على أحرف.');
          if (text.length > 2500) return ctx.reply('❌ النص طويل جداً. الحد الأقصى 2500 حرف.');
          const c = getCustomization(ctx);
          if (p.action === 'custom-start') c.startText = text;
          save();
          clearPending(ctx);
          return ctx.reply('✅ تم حفظ النص الخاص بيك بنجاح ❤️', {
            reply_markup: new InlineKeyboard().text('🎨 قائمة التخصيص', 'custommenu').row().text('🏠 القائمة الرئيسية', 'home')
          });
        }
        if (p.action === 'welcome') {
          const g = db.groups[p.groupId];
          if (g && await userCanManage(ctx, g)) {
            g.welcomeText = text;
            save();
            clearPending(ctx);
            return answer(ctx, `✅ تم تحديث رسالة الترحيب بنجاح!`, { reply_markup: new InlineKeyboard().text('⚙️ إعدادات المجموعة', 'groupsettings') });
          }
        }
        if (p.action === 'badwordadd') {
          const g = db.groups[p.groupId];
          if (g && await userCanManage(ctx, g)) {
            g.badWords ||= [];
            g.badWords.push(text);
            save();
            clearPending(ctx);
            return answer(ctx, `✅ تم إضافة الكلمة "${text}" إلى قائمة الممنوعات بنجاح!`, { reply_markup: new InlineKeyboard().text('🚫 إدارة الكلمات الممنوعة', 'badwordsmenu') });
          }
        }
        if (p.action === 'required-add') {
          clearPending(ctx);
          let username = text.trim();
          if (username.startsWith('https://t.me/')) username = '@' + username.split('https://t.me/')[1].split('/')[0];
          if (!username.startsWith('@')) username = '@' + username;
          try {
            const chat = await bot.api.getChat(username);
            const exists = db.requiredChats.some(c => c.id === chat.id);
            if (exists) {
              return answer(ctx, `⚠️ هذه القناة أو المجموعة مضافة مسبقاً في القائمة!`, { reply_markup: new InlineKeyboard().text('📢 إدارة الاشتراك الإجباري', 'requiredmenu') });
            }
            db.requiredChats.push({ 
              id: chat.id, 
              username: chat.username || username, 
              title: chat.title || username, 
              url: chat.username ? `https://t.me/${chat.username}` : undefined 
            });
            save();
            return answer(ctx, `✅ تم إضافة (${chat.title || username}) بنجاح إلى الاشتراك الإجباري.`, { reply_markup: new InlineKeyboard().text('📢 إدارة الاشتراك الإجباري', 'requiredmenu') });
          } catch (e) {
            return answer(ctx, `❌ خطأ في الوصول للقناة أو المجموعة: ${e.message}`, { reply_markup: new InlineKeyboard().text('📢 إدارة الاشتراك الإجباري', 'requiredmenu') });
          }
        }
      }
      const showHomeFunc = async (cCtx) => {
        const c = getCustomization(cCtx);
        await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
      };
      return showHomeFunc(ctx);
    }
  });
}
