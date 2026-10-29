import { InlineKeyboard } from 'grammy';
import { UI_TEXT_CATALOG } from '../uiTextCatalog.js';
import { replaceByRules } from '../globalTextOverrides.js';
import { handleActiveGameCallback } from '../games/callbacks.js';
import { helpKeyboard, warningsKeyboard, groupSettingsKeyboard, repliesKeyboard, customizationKeyboard, customizationDescriptionsKeyboard, customizationRepliesKeyboard, customizationUILabelsKeyboard } from '../keyboards.js';
import { makeNameBatch, touchesMenuKeyboard, touchesLanguageKeyboard, touchesBatchKeyboard, touchesBatchText } from '../touches.js';
import { ADHKAR_LABELS, randomDhikr } from '../adhkar.js';

export function registerCallbacks(bot, shared) {
  const textCatalog = UI_TEXT_CATALOG.map((item, index) => ({ ...item, index })).filter(item => item.kind === 'text');
  const textCategories = [...new Set(textCatalog.map(item => item.category))];
  const deleteObjectPath = (target, path) => {
    const parts = String(path).split('.').filter(Boolean);
    if (!parts.length) return;
    let current = target;
    for (const part of parts.slice(0, -1)) {
      if (!current || typeof current !== 'object') return;
      current = current[part];
    }
    if (current && typeof current === 'object') delete current[parts[parts.length - 1]];
  };
  const {
    db, isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor,
    selectedGroup, setSelected, getCustomization, applyGlobalCustomizationChange, customText, getHomeKeyboard,
    HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate,
    selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats,
    showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList, subscriptionsMenu,
    showProfileCard, handleViolation, showOwnerPanel, uiText, PROFILE_PHRASES,
    inferMenuBack, rememberMenuBack, menuBackTarget, normalizeAnswer,
    groupScores, leaderboardText, protectionBackTarget, protectionKeyboard,
    ensureReferralData, referralLinkFor, referralStatsFor, referralMenuKeyboard,
    referralLinkKeyboard, showReferralLink, publicCommandsKeyboard,
    QUESTIONS_DB, SHUAR_LIST, N_PHRASES
  } = shared;

  async function showChatSubscriptionMenu(ctx, refresh = false) {
    if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.');
    db.chatSubscriptions ||= {}; db.chatSubscriptionSelection ||= {}; db.chatSubscriptionAdminGroups ||= {};
    const ownerId = String(ctx.from.id);
    const selected = new Set((db.chatSubscriptionSelection[ownerId] || []).map(String));
    let groups = [];
    const cachedIds = db.chatSubscriptionAdminGroups[ownerId];
    if (!refresh && Array.isArray(cachedIds)) {
      groups = cachedIds.map(id => db.groups[String(id)]).filter(group => group && group.id && group.title);
    } else {
      const candidates = Object.values(db.groups || {}).filter(g => g && g.id && g.title);
      for (const candidate of candidates) {
        try {
          const identifier = /^-?\d+$/.test(String(candidate.id)) ? Number(candidate.id) : candidate.id;
          const member = await ctx.api.getChatMember(identifier, bot.botInfo.id);
          if (['administrator', 'creator'].includes(member.status)) groups.push(candidate);
        } catch {}
      }
      db.chatSubscriptionAdminGroups[ownerId] = groups.map(group => String(group.id));
    }
    if (!groups.length) return answer(ctx, 'ماكو مجموعات مسجّلة تأكد البوت من صلاحياته فيها. أضف نغنوغ للمجموعة واجعله مشرفاً ثم أرسل رسالة بالمجموعة حتى تُسجّل.', { reply_markup: new InlineKeyboard().text('↩️ الاشتراكات', 'subscriptionsmenu') });
    const kb = new InlineKeyboard();
    for (const group of groups.slice(0, 40)) {
      const sub = db.chatSubscriptions[String(group.id)] || {};
      kb.text(`${selected.has(String(group.id)) ? '☑️' : '⬜'} ${String(group.title).slice(0, 14)} ${sub.enabled ? '🟢' : '⚪'}`, `chatsubpick:${group.id}`).row();
    }
    kb.text('☑️ تحديد الكل', 'chatsubselectall').text('🧹 إلغاء التحديد', 'chatsubclear').row()
      .text('🔗 تعيين جهة للمحدد', 'chatsubsetselected').text('🗑️ حذف جهة المحدد', 'chatsubclear_target_selected').row()
      .text('🟢 تشغيل للمحدد', 'chatsubenable_selected').text('🔴 إيقاف للمحدد', 'chatsubdisable_selected').row()
      .text('↩️ الاشتراكات', 'subscriptionsmenu');
    const configured = groups.filter(group => db.chatSubscriptions?.[String(group.id)]?.requiredChatId).length;
    const details = groups.slice(0, 40).map(group => {
      const sub = db.chatSubscriptions?.[String(group.id)] || {};
      return `• ${group.title}: ${sub.enabled ? '🟢 مفعّل' : '⚪ متوقف'} — ${sub.title || 'لم تُحدّد جهة اشتراك'}${sub.url ? ` (${sub.url})` : ''}`;
    }).join('\n');
    return answer(ctx, `💬 اشتراك الدردشة\nاختَر مجموعة أو أكثر من الأزرار.\nتعرض القائمة المجموعات المسجّلة التي تأكد نغنوغ من كونه مشرفاً فيها.\nجهات اشتراك محفوظة: ${configured}\n\n${details}`.slice(0, 3900), { reply_markup: kb });
  }

  bot.on('callback_query:data', async ctx => {
    ensureUser(ctx);
    let data = ctx.callbackQuery.data;
    const callbackAliases = {
      public_games: 'gamesmenu',
      public_game_animal: 'game_an',
      public_game_general: 'game_ge',
      public_game_math: 'game_ma',
      public_game_choose: 'game_ch',
      publiccommands: 'publiccommands'
    };
    data = callbackAliases[data] || data;

    if (await handleActiveGameCallback(ctx, shared, data)) return;

    const gameHelpAlerts = {
      game_ch: '🧩 اكتب «اختيارات» واختر الإجابة الصحيحة. أول إجابة صحيحة تربح نقطة.',
      game_ma: '🔢 اكتب «رياضيات» وحل المعادلة. أول جواب صحيح يربح نقطة.',
      game_an: '🐾 اكتب «حيوان» وخمّن الحيوان من أول حرف.',
      game_ge: '💡 اضغط أسئلة ثم اكتب «س»؛ أول إجابة صحيحة تربح نقطة.',
      game_meanings: '🍎 اكتب «معاني» وخمّن الحيوان أو الفاكهة من السمايل.',
      game_opposite: '🔁 اكتب «عكس» واكتب ضدّ الكلمة.',
      game_decompose: '🔤 اكتب «تفكيك» ثم اكتب حروف الكلمة وبينها مسافات.',
    };
    if (Object.hasOwn(gameHelpAlerts, data)) {
      try { await ctx.answerCallbackQuery({ text: gameHelpAlerts[data], show_alert: true }); } catch {}
      return;
    }

    const ownerOnlyActions = ['ownerpanel', 'botstats', 'activatedgroups', 'botsettings', 'globalprotection', 'requiredmenu', 'requiredadd', 'requiredlist', 'subscriptionsmenu', 'chatsubmenu', 'chatsubsetselected', 'chatsubenable_selected', 'chatsubdisable_selected', 'broadcastmenu', 'broadcastsend', 'broadcastcancel'];
    if (ownerOnlyActions.includes(data) || data.startsWith('reqdel:') || (data.startsWith('chatsub') && !data.startsWith('chatsubverify:')) || data.startsWith('globaltext')) {
      if (!isOwner(ctx)) {
        await ctx.answerCallbackQuery({ text: '❌ الزر غير مخصص إلك', show_alert: true });
        return;
      }
    }

    const restrictedActions = [
      'protectionmenu', 'adminpanel', 'groupsettings', 'warningsmenu', 'badwordsmenu', 
      'togglelinks', 'togglemedia', 'togglebadwords', 'toggleaudio', 'toggleaudioclips', 
      'toggleforward', 'togglecontacts', 'enableallprotection', 'mygroups', 
      'groupstats', 'userreplies', 'repliesmenu', 'groupoverview',
      'welcomeedit', 'toggleflood', 'togglereplies',
      'warningslimit', 'warningsaction', 'warningsduration', 'warningslog', 'warningsclear'
    ];

    if (restrictedActions.includes(data) || data.startsWith('prot_') || data.startsWith('admin_') || data.startsWith('choosegroup:') || data.startsWith('warning') || data.startsWith('badword') || data.startsWith('reply')) {
      if (isGroup(ctx)) {
        const g = groupFor(ctx.chat);
        const isAdmin = (await userIsAdmin(ctx.chat.id, ctx.from.id)) || (g.admins || []).includes(String(ctx.from.id)) || isOwner(ctx);
        if (!isAdmin && !isOwner(ctx)) {
          await ctx.answerCallbackQuery({ text: '❌ الزر غير مخصص إلك', show_alert: true });
          return;
        }
      } else {
        const g = selectedGroup(ctx);
        if (g && !await userCanManage(ctx, g)) {
          await ctx.answerCallbackQuery({ text: '❌ الزر غير مخصص إلك', show_alert: true });
          return;
        }
      }
    }

    try { await ctx.answerCallbackQuery(); } catch {}

    const showHomeFunc = async (cCtx) => {
      if (isGroup(cCtx)) {
        await safeEdit(cCtx,
          '╭━━━〔 🐈‍⬛ مركز أوامر نغنوغ 〕━━━╮\n\nاختَر القسم المطلوب من الأزرار أدناه.\n🎮 الألعاب والأوامر التفاعلية متاحة للجميع.\n🛡️ الحماية وأوامر المشرفين تتطلب صلاحيات مناسبة.\n\n╰━━━━━━━━━━━━━━━━━━╯',
          publicCommandsKeyboard());
        return;
      }
      const c = getCustomization(cCtx);
      await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
    };

    if (data === 'home') return showHomeFunc(ctx);

    // لمسات: زخرفة أسماء بالعربية والإنجليزية، مع دفعات قابلة للنسخ.
    if (data === 'touchesmenu') {
      clearPending(ctx);
      db.touchSessions ||= {};
      delete db.touchSessions[userKey(ctx)];
      return answer(ctx, '* ( قسم لمسة نغنوغ ❤️‍🔥 )*\nمتوفر مجموعة من الأدوات اللي تسهّل عليك احتياجاتك وتضيف لمسة نغنوغ 🐈‍⬛ ✦\n\n𓆩 ✧ 𓆪 *زخرفة الأسماء*\n𓆩 🎧 𓆪 *فصل الصوت عن الموسيقى*\n𓆩 ⏰ 𓆪 *ذكّرني + أذكار*\n𓆩 🎬 𓆪 *تحميل الفيديوهات* بسهولة\n\n✦ *اختَر الخدمة اللي تحتاجها من الأزرار بالأسفل.⬇️*', { reply_markup: touchesMenuKeyboard(), parse_mode: 'Markdown' });
    }
    if (data === 'remindermenu') {
      clearPending(ctx);
      const kb = new InlineKeyboard()
        .text('⏰ ذكّرني بموعد', 'remindercreate').row()
        .text('📋 تذكيراتي الحالية', 'reminderlist').row()
        .text('🌙 أذكار المساء', 'adhkar:evening').text('🌅 أذكار الصباح', 'adhkar:morning').row()
        .text('😴 أذكار النوم', 'adhkar:sleep').text('📖 أذكار القرآن', 'adhkar:quran').row()
        .text('↩️ لمسات نغنوغ', 'touchesmenu').text('🏠 الرئيسية', 'home');
      return answer(ctx, '* ( قسـم ذكرني ⏰ )*\n✦ خلّي نغنوغ يذكّرك بالأشياء المهمة بوقتها، وخلّي الأذكار قريبة منك بكل يوم. 🤍\n\n📌 *تذكير خاص:* حدّد الموعد اللي تريده، ونغنوغ يتولّى تذكيرك بيه.\n⚠️ جميع المواعيد حالياً حسب توقيت بغداد 🇮🇶', { reply_markup: kb, parse_mode: 'Markdown' });
    }
    if (data === 'remindercreate') {
      if (!isPrivate(ctx)) return answer(ctx, 'ميزة التذكير تعمل بالخاص فقط حتى أگدر أراسلك بالموعد.');
      clearPending(ctx);
      pending(ctx, { action: 'reminder-text' });
      return answer(ctx, '⏰ شنو الشي اللي تريد نغنوغ يذكّرك بيه؟\n\nاكتب التذكير برسالة وحدة، وبعدها أسألك عن اليوم، وبعدين عن الساعة.\nللإلغاء اكتب /cancel.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'remindercancel').row().text('↩️ رجوع', 'remindermenu') });
    }
    if (data === 'remindercancel') {
      clearPending(ctx);
      return answer(ctx, 'تم إلغاء التذكير الحالي.', { reply_markup: new InlineKeyboard().text('⏰ قائمة ذكّرني', 'remindermenu').text('🏠 الرئيسية', 'home') });
    }
    if (data.startsWith('adhkar:') || data.startsWith('adhkarnext:')) {
      const type = data.split(':')[1];
      if (!Object.hasOwn(ADHKAR_LABELS, type)) return answer(ctx, 'قسم الأذكار غير موجود.');
      db.adhkarLast ||= {};
      db.adhkarLast[userKey(ctx)] ||= {};
      const previous = db.adhkarLast[userKey(ctx)][type] || '';
      const dhikr = randomDhikr(type, previous);
      db.adhkarLast[userKey(ctx)][type] = dhikr;
      save();
      const kb = new InlineKeyboard().text('🔄 ذكر آخر', `adhkarnext:${type}`).row()
        .text('↩️ رجوع للأذكار', 'remindermenu').text('🏠 الرئيسية', 'home');
      return answer(ctx, `╭━━━〔 ${ADHKAR_LABELS[type]} 〕━━━╮\n\n${dhikr}\n\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }
    if (data === 'touchesdecorate') {
      clearPending(ctx);
      return answer(ctx, '✨ زخرفة الأسماء\n\nاختَر لغة الاسم أولاً:', { reply_markup: touchesLanguageKeyboard() });
    }
    if (data === 'touchesvocal') {
      clearPending(ctx);
      return answer(ctx, '🎚️ فصل الصوت عن الموسيقى\n\n⚠️ الخدمة متوقفة حالياً.\n📩 للاستفسار، راسل المطور.', { reply_markup: new InlineKeyboard().text('↩️ لمسات نغنوغ', 'touchesmenu').text('🏠 الرئيسية', 'home') });
    }
    if (data === 'touchesdownload') {
      if (!isPrivate(ctx)) return answer(ctx, '📥 تحميل الفيديو متاح بالخاص فقط. افتح محادثة نغنوغ واضغط الزر من هناك.');
      clearPending(ctx);
      pending(ctx, { action: 'video-download-link' });
      const developer = new InlineKeyboard().text('❌ إلغاء', 'videodownloadcancel').row().text('↩️ لمسة نغنوغ', 'touchesmenu').row().url('👨🏻‍💻 المطوّر', 'https://t.me/llll6llll6');
      return answer(ctx, '*أهلاً بك في قسم تحميل الفيديوهات*\n🐾 المنصات المدعومة حالياً :\n\n:- ( أنــــستغرام - Instagram ) ✅\n:- ( تيــك تــوك - TikTok ) ❌\n:- ( فـيس بــوك - Facebook ) ❌\n:- ( يـــوتيـــوب - YouTube ) ❌\n:- ( بــــينترست - Pinterest ) ❌\n:- ( سناب شات - Snapchat ) ❌\n━━━━━━━━━━━━━━━━━━\n⚠️ لازم يكون الرابط متاحاً للعامة، الحد الأقصى للملف 45 ميغابايت.\n:- للاستفسار والتفاصيل: يُرجى التواصل مع المطوّر.\n:- قم بإرسال رابط الفيديو.', { reply_markup: developer, parse_mode: 'Markdown' });
    }
    if (data === 'videodownloadcancel') {
      clearPending(ctx);
      return answer(ctx, '❌ تم إلغاء طلب تحميل الفيديو.', { reply_markup: new InlineKeyboard().text('📥 تحميل فيديو', 'touchesdownload').row().text('↩️ لمسات نغنوغ', 'touchesmenu') });
    }
    if (data === 'reminderlist') {
      if (!isPrivate(ctx)) return answer(ctx, '📋 سجل التذكيرات متاح بالخاص فقط.');
      const items = (Array.isArray(db.reminders) ? db.reminders : []).filter(item => String(item.userId) === String(ctx.from.id) && item.status === 'pending').sort((a,b) => Number(a.dueAt)-Number(b.dueAt));
      const kb = new InlineKeyboard().text('➕ تذكير جديد', 'remindercreate').row().text('🔄 تحديث السجل', 'reminderlist').row().text('↩️ قائمة ذكّرني', 'remindermenu').text('🏠 الرئيسية', 'home');
      if (!items.length) return answer(ctx, '📋 تذكيراتي الحالية\n\nما عندك تذكيرات محفوظة حالياً. أي تذكير جديد راح يظهر هنا، وينحذف تلقائياً بعد ما يوصلك.', { reply_markup: kb });
      const rows = items.map((item, i) => { const date = new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(item.dueAt)); const time = new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(item.dueAt)); return `${i+1}. 📝 ${String(item.text || '').slice(0,160)}\n   📅 ${date} — ⏰ ${time}`; });
      return answer(ctx, `📋 تذكيراتي الحالية\n\n${rows.join('\n\n')}\n\n✦ يبقى كل تذكير هنا لحد ما يوصلك، وبعدها ينحذف تلقائياً.`, { reply_markup: kb });
    }
    if (data === 'touchescancel') {
      clearPending(ctx);
      db.touchSessions ||= {};
      delete db.touchSessions[userKey(ctx)];
      return answer(ctx, 'تم إلغاء طلب الزخرفة. إذا تحب ترجع، اختَر الزخرفة من القائمة.', { reply_markup: touchesMenuKeyboard() });
    }
    if (data === 'toucheslang:ar' || data === 'toucheslang:en') {
      const language = data.endsWith(':en') ? 'en' : 'ar';
      clearPending(ctx);
      pending(ctx, { action: 'touches-name', language });
      return answer(ctx, language === 'en'
        ? '🇬🇧 Send the English name you want to decorate.\n\nI will give you 10 different styles per batch.'
        : '🇮🇶 دزلي الاسم العربي اللي تريد تزخرفه.\n\nراح أطيك 10 زخارف مختلفة بكل دفعة.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'touchescancel').text('↩️ اختيار اللغة', 'touchesdecorate') });
    }
    if (data === 'touchesmore') {
      db.touchSessions ||= {};
      const session = db.touchSessions[userKey(ctx)];
      if (!session?.name || !['ar', 'en'].includes(session.language)) {
        return answer(ctx, 'حتى أجهزلك زخارف، اختَر اللغة ودزلي الاسم أولاً.', { reply_markup: touchesLanguageKeyboard() });
      }
      const results = makeNameBatch(session.name, session.language, session.used || []);
      session.used = [...(session.used || []), ...results].slice(-500);
      session.batchNumber = Number(session.batchNumber || 1) + 1;
      save();
      return answer(ctx, touchesBatchText(session.name, session.language, results, session.batchNumber), { reply_markup: touchesBatchKeyboard(results) });
    }
    if (data === 'publiccommands') {
      return answer(ctx, '╭━━━〔 🐈‍⬛ مركز أوامر نغنوغ 〕━━━╮\n\nاختَر القسم المطلوب من الأزرار أدناه.\n🎮 الألعاب والأوامر التفاعلية متاحة للجميع.\n🛡️ الحماية وأوامر المشرفين تتطلب صلاحيات مناسبة.\n\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: publicCommandsKeyboard() });
    }
    if (data === 'showpublichelp') {
      const kb = new InlineKeyboard().text('↩️ مركز الأوامر', 'publiccommands').text('🏠 الرئيسية', 'home');
      return answer(ctx, '╭━━━〔 📚 دليل أوامر المجموعة 〕━━━╮\n🎮 الألعاب: اختيارات، رياضيات، حيوان، أسئلة «س»، معاني، عكس، تفكيك.\n👤 «ا» بطاقة العضو\n🎯 «كت» سؤال شخصي\n📜 «ش» شعر عراقي\n🐈‍⬛ «ن» ردود نغنوغ\n🪪 «ب» بايو عشوائي\n\n✦ اكتب اسم اللعبة أو الرمز داخل المجموعة.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    if (data === 'managementmenu') {
      const kb = new InlineKeyboard()
        .text('🎮 الألعاب', 'gamesmenu')
        .text('💬 التفاعلية', 'interactive_menu').row()
        .text('👑 المشرفون', 'adminpanel').row();
      // تبقى إعدادات البوت العامة خاصة بالمالك وضمن القائمة نفسها.
      if (isOwner(ctx)) kb.text('⚙️ إعدادات البوت العامة', 'botsettings').row();
      kb.text('🏠 القائمة الرئيسية', 'home');
      const managementText = `╭━━━〔 ⚙️ قسم الإدارة | نغنوغ 🐈‍⬛ 〕━━━╮

-︰🎮 الألعاب : ❨ ألعاب وتحدّيات داخل المجموعة ❩
-︰💬 الأوامر التفاعلية : ❨ بطاقة العضو والردود والعبارات الشعرية ❩
-︰👑 أوامر المشرفين : ❨ أدوات الإدارة حسب الصلاحيات ❩

✦ إدارة المجموعات والتحذيرات تجدها من «مجموعاتي».
✦ اختَر القسم المطلوب من الأزرار أدناه.
╰━━━━━━━━━━━━━━━━━━━━╯`;
      return answer(ctx, uiText ? uiText(ctx, 'management', managementText) : managementText, { reply_markup: kb });
    }
    if (data === 'howto') return answer(ctx, '╭━━━〔 📖 طريقة استخدام نغنوغ 〕━━━╮\nاختَر الخدمة المطلوبة من القائمة أدناه.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').text('🏠 الرئيسية', 'home') });
    if (data === 'protection') return answer(ctx, '╭━━━〔 🛡️ ميزات الحماية 〕━━━╮\nتعرّف على أدوات حماية المجموعة والتحكم بها.', { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').text('🏠 الرئيسية', 'home') });
    if (data === 'interactive_menu') {
      const kb = new InlineKeyboard().text('👤 بطاقة العضو: ا', 'interactive_profile').row()
        .text('🎯 سؤال شخصي: كت', 'interactive_ket').text('📜 الشعر: ش', 'interactive_poem').row()
        .text('🐈‍⬛ نغنوغ: ن', 'interactive_n').text('🪪 بايو: ب', 'interactive_bio').row()
        .text('↩️ العودة إلى قائمة الأوامر', 'publiccommands');
      return answer(ctx, '╭━━━〔 💬 الأوامر التفاعلية 〕━━━╮\n👤 «ا» بطاقة العضو\n🎯 «كت» سؤال شخصي\n📜 «ش» شعر عراقي\n🐈‍⬛ «ن» ردود نغنوغ\n🪪 «ب» بايو عشوائي\n\nاضغط الزر لمعرفة طريقة الاستخدام باختصار.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    if (data === 'interactive_reminder') { const username = ctx.me?.username; const kb = new InlineKeyboard(); if (username) kb.url('⏰ فتح قسم ذكّرني', `https://t.me/${username}?start=reminder`).row(); return answer(ctx, '*⏰ أمر ذكرني*\n\nاكتب «ذكرني» داخل المجموعة حتى يرسل لك نغنوغ شرحاً وزر فتح القسم. لإنشاء تذكير واستلامه بوقته، افتح البوت بالخاص واضغط Start أولاً، ثم حدّد الشيء واليوم والساعة.', { reply_markup: kb.text('↩️ الأوامر التفاعلية', 'interactive_menu'), parse_mode: 'Markdown' }); }
    if (data === 'interactive_profile') { try { await ctx.answerCallbackQuery({ text: 'لعرض بطاقة عضو، اكتب «ا» داخل المجموعة أو ردّ به على رسالته.', show_alert: true }); } catch {} return; }
    if (data === 'interactive_ket') { try { await ctx.answerCallbackQuery({ text: 'لسؤال شخصي عشوائي، اكتب «كت» داخل المجموعة.', show_alert: true }); } catch {} return; }
    if (data === 'interactive_poem') { try { await ctx.answerCallbackQuery({ text: 'حتى يرسل نغنوغ شعر عراقي، اكتب «ش» داخل المجموعة.', show_alert: true }); } catch {} return; }
    if (data === 'interactive_n') { try { await ctx.answerCallbackQuery({ text: 'لردود نغنوغ العراقية، اكتب «ن» داخل المجموعة.', show_alert: true }); } catch {} return; }
    if (data === 'interactive_bio') { try { await ctx.answerCallbackQuery({ text: 'لبايو احترافي اكتب: ب', show_alert: true }); } catch {} return; }
    if (data === 'exclusive_services') { const username = ctx.me?.username; const kb = new InlineKeyboard(); if (username) kb.url('⏰ فتح قسم ذكّرني', `https://t.me/${username}?start=reminder`).row(); kb.text('↩️ العودة إلى الألعاب', 'gamesmenu'); return answer(ctx, '🎁 خدمات نغنوغ الحصرية\n\n⏰ ذكّرني: أنشئ تذكيراً خاصاً بموعد محدد حسب توقيت بغداد.\n\nافتح القسم من الزر بالأسفل، ولازم تكون بادئ البوت بالخاص حتى تصلك التذكيرات.', { reply_markup: kb }); }
        if (data === 'help') return answer(ctx, customText(ctx, 'helpText') || HELP_TEXT, { reply_markup: helpKeyboard(getCustomization(ctx)) });
    
    // الأزرار الأساسية والحساب[cite: 3, 4]
    if (data === 'accountinfo') {
      ensureReferralData();
      const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'غير متوفر';
      const username = ctx.from.username ? `@${ctx.from.username}` : 'ما عندك اسم مستخدم';
      const userId = String(ctx.from.id);
      const meta = db.userMeta[userId] || {};
      const joinedAt = meta.firstSeenAt
        ? new Date(Number(meta.firstSeenAt)).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'غير متاح للحسابات المسجلة قبل إضافة الميزة';
      const referralStats = referralStatsFor(userId);
      const text = `╭━━━〔 👤 بطاقة نغنوغ الشخصية 〕━━━╮\n\n-︰الاسم : ❨ ${name} ❩\n\n-︰معرّفك : ❨ ${username} ❩\n\n-︰ايديك : ❨ ${userId} ❩\n\n-︰تاريخ انضمامك : ❨ ${joinedAt} ❩\n\n-︰نقاط الجوائز : ❨ ${referralStats.rewardPoints} ❩\n\n-︰الأشخاص المنضمّون برابطك : ❨ ${referralStats.joinedCount} ❩\n\n╰━━━━━━━━━━━━━━━━━━━━╯`;
      return answer(ctx, text, { reply_markup: new InlineKeyboard().text('⭐ ستار', 'starmenu').row().text(getCustomization(ctx).labels?.home || '🔙 القائمة الرئيسية', 'home') });
    }

    if (data === 'starmenu') {
      const stats = referralStatsFor(String(ctx.from.id));
      return answer(ctx, `╭━━━〔 ⭐ ستار | نغنوغ 🐈‍⬛ 〕━━━╮\n\n-︰طريقة جمع الجوائز : ❨ ادعُ أشخاصاً جدد إلى نغنوغ عبر رابطك ❩\n\n-︰المنضمّون برابطك : ❨ ${stats.joinedCount} ❩\n-︰نقاط الجوائز : ❨ ${stats.rewardPoints} ❩\n\n✦ اضغط على «رابط مشاركة» حتى تحصل على رابطك الخاص وتتابع إحصائياتك.\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: referralMenuKeyboard() });
    }

    if (data === 'referrallink' || data === 'referralrefresh') {
      return showReferralLink(ctx);
    }
    
    if (data === 'userreplies') {
      return answer(ctx, `${customText(ctx, 'replies', 'replies')}\n${customText(ctx, 'descriptions', 'replies') || ''}`, { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').row().text('🔙 القائمة الرئيسية', 'home') });
    }

    if (data === 'mygroups') {
      if (!isPrivate(ctx)) return answer(ctx, 'إدارة المجموعات متاحة من الخاص فقط.');
      return showGroups(ctx);
    }

    if (data.startsWith('choosegroup:')) {
      const id = data.slice('choosegroup:'.length);
      const g = db.groups[id];
      if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة.');
      if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة هذه المجموعة متاحة للمشرفين فقط.');
      setSelected(ctx, id);
      return showSelectedGroupMenu(ctx, g);
    }

    async function showSelectedGroupMenu(ctx, g = selectedGroup(ctx)) {
      if (!g) return showGroups(ctx);
      const kb = new InlineKeyboard()
        .text('⚙️ الإعدادات', 'groupsettings')
        .text('⚠️ التحذيرات', 'warningsmenu').row()
        .text('🛡️ الحماية الموحدة', 'protectionmenu')
        .text('💬 الردود التلقائية', 'repliesmenu').row()
        .text('📊 إحصائيات المجموعة', 'groupstats')
        .text('👥 مجموعة أخرى', 'mygroups').row()
        .text('🏠 القائمة الرئيسية', 'home');
      return answer(ctx, `╭━━━〔 👥 بطاقة المجموعة 〕━━━╮\n\n-︰اسم المجموعة : ❨ ${g.title} ❩\n\n✦ اختَر الخدمة اللي تريد تديرها من الأزرار أدناه. 🐾\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }

    if (data === 'groupoverview') return showSelectedGroupMenu(ctx);

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

    // قوائم التخصيص[cite: 3, 4]
    if (data === 'custommenu') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      clearPending(ctx);
      return answer(ctx, uiText ? uiText(ctx, 'customMenu', '╭━━━〔 🎨 تخصيص نغنوغ 〕━━━╮\n\nمن هنا تكدر تخصّص النصوص وأسماء الأزرار اللي تظهر إلك بالخاص فقط.\n✦ تعديلاتك شخصية وما تغيّر واجهة بقية المستخدمين أو إعدادات المجموعات.\n\n╰━━━━━━━━━━━━━━━━━━╯') : '╭━━━〔 🎨 تخصيص نغنوغ 〕━━━╮\n\nمن هنا تكدر تخصّص النصوص وأسماء الأزرار اللي تظهر إلك بالخاص فقط.\n✦ تعديلاتك شخصية وما تغيّر واجهة بقية المستخدمين أو إعدادات المجموعات.\n\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: customizationKeyboard(getCustomization(ctx)) });
    }

    if (data === 'customuimenu') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      return answer(ctx, '🔘 اختَر اسم الزر الذي تريد تغييره. التغيير يظهر إلك وحدك في القائمة الرئيسية.', { reply_markup: customizationUILabelsKeyboard(getCustomization(ctx)) });
    }

    if (data.startsWith('customlabel:')) {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      const key = data.split(':')[1];
      const allowed = ['groups', 'addBot', 'management', 'profile', 'customize', 'help', 'back', 'home', 'cancel'];
      if (!allowed.includes(key)) return answer(ctx, 'اسم الزر غير معروف.');
      pending(ctx, { action: 'custom-label', key });
      return answer(ctx, `🔘 أرسل الاسم الجديد للزر.\n\nالاسم الحالي: ${getCustomization(ctx).labels?.[key] || 'الافتراضي'}\n\nأرسل نصاً قصيراً، بحد أقصى 50 حرفاً.`, { reply_markup: new InlineKeyboard().text(getCustomization(ctx).labels?.cancel || '❌ إلغاء', 'customuimenu') });
    }

    if (data === 'customhelp') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      pending(ctx, { action: 'custom-help' });
      return answer(ctx, `📖 أرسل نص قسم المساعدة الجديد.\n\nالنص الحالي:\n${customText(ctx, 'helpText') || HELP_TEXT}`, { reply_markup: new InlineKeyboard().text(getCustomization(ctx).labels?.cancel || '❌ إلغاء', 'custommenu') });
    }

    if (data === 'customdescmenu') {
      return answer(ctx, '╭─〔 📝 تخصيص شروحات الأزرار 〕─╮\nاختَر القسم الذي تريد تعديل شرحه.', { reply_markup: customizationDescriptionsKeyboard() });
    }

    if (data === 'customreplymenu') {
      return answer(ctx, '╭─〔 💬 تخصيص ردود نغنوغ 〕─╮\nاختَر الرد الذي تريد تعديله.', { reply_markup: customizationRepliesKeyboard() });
    }

    if (data.startsWith('customdesc:')) {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      const key = data.split(':')[1];
      pending(ctx, { action: 'custom-description', key });
      return answer(ctx, `📝 الشرح الحالي للقسم (${key}):\n${customText(ctx, 'descriptions', key) || 'غير محدد'}\n\nأرسل الشرح الجديد برسالة واحدة.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'customdescmenu') });
    }

    if (data.startsWith('customreply:')) {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      const key = data.split(':')[1];
      pending(ctx, { action: 'custom-reply', key });
      return answer(ctx, `💬 الرد الحالي للقسم (${key}):\n${customText(ctx, 'replies', key) || 'غير محدد'}\n\nأرسل الرد الجديد برسالة واحدة.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'customreplymenu') });
    }

    if (data === 'customstart') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      pending(ctx, { action: 'custom-start' });
      return answer(ctx, `👋 أرسل مقدمة /start الجديدة.\n\nالنص الحالي:\n${customText(ctx, 'startText')}`, { reply_markup: new InlineKeyboard().text(getCustomization(ctx).labels?.cancel || '❌ إلغاء', 'custommenu') });
    }

    if (data === 'customreset') {
      if (!isPrivate(ctx)) return answer(ctx, 'التخصيص متاح من الخاص فقط.');
      db.customizations ||= {};
      // استعادة المستخدم تمسح تخصيصه الشخصي فقط؛ تعديلات المالك العامة تبقى هي الافتراضي للجميع.
      delete db.customizations[userKey(ctx)];
      clearPending(ctx);
      save();
      return answer(ctx, '♻️ تمت استعادة تخصيصك الشخصي.\nرجعت واجهتك إلى النصوص الافتراضية المعتمدة من المالك، بما فيها تعديلات «تحرير نصوص القوائم» العامة. لم تتغير واجهات بقية المستخدمين.', { reply_markup: customizationKeyboard(getCustomization(ctx)) });
    }

    if (data === 'groupstats') return showGroupStats(ctx);

    // محرر كتالوج النصوص: تصفح هرمي مع زر تعديل مستقل لكل عنصر.
    if (data === 'globaltextcatalog') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      clearPending(ctx);
      const categories = textCategories;
      const kb = new InlineKeyboard();
      categories.forEach((category, index) => kb.text(category.slice(0, 40), `globaltextcategory:${index}:0`).row());
      kb.text('🔙 تحرير نصوص القوائم', 'globaltextmenu').text('👑 لوحة المالك', 'ownerpanel');
      return answer(ctx, `╭━━━〔 🗂️ فهرس نصوص نغنوغ 〕━━━╮

هذا الفهرس يجمع ${textCatalog.length} نصاً من قوائم ورسائل نغنوغ. اختَر القسم ثم النص الذي تريد تعديله.

✦ التغييرات عامة وتظهر لجميع المستخدمين.
✦ أسماء الأزرار ووظائفها لا تتغير من هذا القسم.
╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }

    if (data.startsWith('globaltextcategory:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      clearPending(ctx);
      const [, rawCategory, rawPage] = data.split(':');
      const categories = textCategories;
      const categoryIndex = Number(rawCategory);
      if (!Number.isInteger(categoryIndex) || !categories[categoryIndex]) return answer(ctx, 'القسم المطلوب غير موجود.', { reply_markup: new InlineKeyboard().text('🗂️ الفهرس', 'globaltextcatalog') });
      const category = categories[categoryIndex];
      const items = textCatalog.filter(item => item.category === category);
      const pageSize = 5;
      const pages = Math.max(1, Math.ceil(items.length / pageSize));
      const page = Math.min(pages - 1, Math.max(0, Number(rawPage) || 0));
      const shown = items.slice(page * pageSize, (page + 1) * pageSize);
      const currentValue = item => {
        const overrides = db.globalTextOverrides || {};
        if (item.kind === 'button' && item.callback && overrides.buttonCallbacks?.[item.callback]) return overrides.buttonCallbacks[item.callback].to;
        return replaceByRules(item.from, item.kind === 'button' ? (overrides.buttons || []) : (overrides.texts || []));
      };
      const short = value => [...String(value).replace(/\s+/g, ' ').trim()].slice(0, 14).join('');
      const safeButtonLabel = value => {
        let out = '';
        for (const char of String(value)) {
          if (Buffer.byteLength(out + char, 'utf8') > 60) break;
          out += char;
        }
        return out;
      };
      const kb = new InlineKeyboard();
      for (const item of shown) {
        const shownName = short(currentValue(item)) || '(فارغ)';
        const rowNo = page * pageSize + shown.indexOf(item) + 1;
        kb.text(safeButtonLabel(`📝 ${rowNo}. ${shownName}`), `globaltextview:${item.index}:${page}`).text('✏️ تعديل', `globaltextselect:${item.index}:${page}`).row();
      }
      if (page > 0) kb.text('⬅️ السابقة', `globaltextcategory:${categoryIndex}:${page - 1}`);
      if (page + 1 < pages) kb.text('📂 المزيد ➡️', `globaltextcategory:${categoryIndex}:${page + 1}`);
      kb.row().text('🗂️ الأقسام', 'globaltextcatalog').text('🔙 تحرير نصوص القوائم', 'globaltextmenu');
      const body = shown.map((item, i) => `${page * pageSize + i + 1}. 📝 ${short(currentValue(item)) || '(فارغ)'}\nالمصدر: ${item.source}`).join('\n\n');
      return answer(ctx, `╭━━━〔 ${category} 〕━━━╮\nالعناصر ${page * pageSize + 1}-${page * pageSize + shown.length} من ${items.length} | صفحة ${page + 1}/${pages}\n\n${body}\n\nاختَر النص ثم اضغط «✏️ تعديل». التغيير يُعتمد بعد المعاينة.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }

    if (data.startsWith('globaltextview:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const [, rawIndex, rawPage] = data.split(':');
      const index = Number(rawIndex);
      const item = UI_TEXT_CATALOG[index];
      if (!item || item.kind !== 'text') return answer(ctx, 'هذا المحرر مخصص لنصوص القوائم فقط.', { reply_markup: new InlineKeyboard().text('🗂️ الفهرس', 'globaltextcatalog') });
      const overrides = db.globalTextOverrides || {};
      const current = item.kind === 'button' && item.callback && overrides.buttonCallbacks?.[item.callback]
        ? overrides.buttonCallbacks[item.callback].to
        : replaceByRules(item.from, item.kind === 'button' ? (overrides.buttons || []) : (overrides.texts || []));
      const value = String(current ?? item.from);
      return answer(ctx, `╭━━━〔 👁️ تفاصيل العنصر 〕━━━╮\n\nالنوع: نص / وصف\nالقسم: ${item.category}\nالمصدر: ${item.source}\n\nالقيمة الحالية:\n${value.slice(0, 2200)}\n\nسيتم تطبيق النص الجديد على العبارة المطابقة في رسائل الواجهة لجميع المستخدمين.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('✏️ تعديل هذا العنصر', `globaltextselect:${index}:${Math.max(0, Number(rawPage) || 0)}`).row().text('🔙 رجوع للقائمة', `globaltextcategory:${textCategories.indexOf(item.category)}:${Math.floor(Math.max(0, Number(rawPage) || 0))}`).row().text('🗂️ الأقسام', 'globaltextcatalog') });
    }

    if (data.startsWith('globaltextselect:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const [, rawIndex, rawPage] = data.split(':');
      const index = Number(rawIndex);
      const item = UI_TEXT_CATALOG[index];
      if (!item || item.kind !== 'text') return answer(ctx, 'هذا المحرر مخصص لنصوص القوائم فقط.', { reply_markup: new InlineKeyboard().text('🗂️ الفهرس', 'globaltextcatalog') });
      clearPending(ctx);
      const overrides = db.globalTextOverrides || {};
      const current = item.kind === 'button' && item.callback && overrides.buttonCallbacks?.[item.callback]
        ? overrides.buttonCallbacks[item.callback].to
        : replaceByRules(item.from, item.kind === 'button' ? (overrides.buttons || []) : (overrides.texts || []));
      pending(ctx, { action: 'global-catalog-new', kind: item.kind, catalogIndex: index, catalogPage: Math.max(0, Number(rawPage) || 0), catalogCategory: item.category, catalogCallback: item.callback || null, catalogOriginal: item.from, from: String(current ?? item.from) });
      return answer(ctx, `📝 تعديل نص / وصف\n\nالقسم: ${item.category}\nالمصدر: ${item.source}\n\nالقيمة الحالية:\n${String(current ?? item.from).slice(0, 1500)}\n\nأرسل القيمة الجديدة. لن يُحفظ شيء قبل المعاينة والتأكيد.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'globaltextcancel').row().text('🔙 رجوع للقائمة', `globaltextcategory:${textCategories.indexOf(item.category)}:${Math.max(0, Number(rawPage) || 0)}`) });
    }

    // تحرير نصوص القوائم: تعديلات عامة على نصوص الواجهات وأسماء الأزرار لكل المستخدمين.
    if (data === 'globaltextmenu') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      clearPending(ctx);
      const kb = new InlineKeyboard()
        .text('🗂️ تحرير نصوص القوائم', 'globaltextcatalog').row()
        .text('📝 تعديل نص يدوياً', 'globaltextedit:text').row()
        .text('📋 التعديلات المحفوظة', 'globaltextlist:0')
        .text('♻️ استعادة النصوص الافتراضية', 'globaltextclear').row()
        .text('↩️ لوحة المالك', 'ownerpanel');
      return answer(ctx, '╭━━━〔 📝 تحرير نصوص نغنوغ 〕━━━╮\n\nمن هنا تغيّر نصوص القوائم والرسائل العامة، والتغيير ينطبق على جميع المستخدمين.\n\n١. اختَر «تحرير نصوص القوائم».\n٢. افتح القسم واختر النص.\n٣. أرسل النص الجديد، راجع المعاينة ثم اعتمده.\n\n✦ هذا القسم لا يغيّر أسماء الأزرار أو وظائفها.\n✦ النصوص المعتمدة تبقى محفوظة بعد إعادة تشغيل البوت.\n╰━━━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }

    if (data.startsWith('globaltextedit:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const kind = data.split(':')[1];
      if (kind !== 'text') return answer(ctx, 'هذا القسم مخصص لتحرير نصوص القوائم فقط، وليس أسماء الأزرار.');
      // نلغي أي خطوة معلّقة قديمة قبل بدء تحرير نصوص القوائم حتى لا يلتقطها معالج الإذاعة.
      clearPending(ctx);
      pending(ctx, { action: 'global-ui-old', kind });
      return answer(ctx, '📝 أرسل النص أو العبارة القديمة كما تظهر في القائمة، ثم أرسل النص الجديد عند الطلب. سيُطبّق التغيير على جميع المستخدمين.\n\nأرسل /cancel للإلغاء.',
        { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'globaltextcancel').row().text('🔙 رجوع', 'globaltextmenu') });
    }

    if (data === 'globaltextcancel') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      clearPending(ctx);
      return answer(ctx, 'تم إلغاء التعديل.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu').text('👑 لوحة المالك', 'ownerpanel') });
    }

    if (data === 'globaltextbacktonew') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const p = db.pending?.[userKey(ctx)];
      if (!p || p.action !== 'global-ui-confirm') return answer(ctx, 'انتهت جلسة التعديل. ابدأ من جديد من «تحرير نصوص القوائم».', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu') });
      if (p.kind === 'button') { clearPending(ctx); return answer(ctx, 'تم إيقاف تعديل أسماء الأزرار. محرر المالك مخصص لنصوص القوائم فقط.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu') }); }
      pending(ctx, { ...p, action: 'global-ui-new', kind: 'text', from: p.from });
      return answer(ctx, `✏️ أرسل النص الجديد مرة ثانية.\n\nالنص القديم:\n${String(p.from || '').slice(0, 1500)}\n\nراح أعرض لك معاينة جديدة قبل الحفظ.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'globaltextcancel') });
    }

    if (data === 'globaltextsave') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const p = db.pending?.[userKey(ctx)];
      if (!p || p.action !== 'global-ui-confirm') {
        clearPending(ctx);
        return answer(ctx, 'انتهت جلسة التعديل أو لم تعد موجودة. ابدأ من «تحرير نصوص القوائم» من جديد.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu').row().text('👑 لوحة المالك', 'ownerpanel') });
      }
      if (p.kind === 'button') { clearPending(ctx); return answer(ctx, 'تم إيقاف تعديل أسماء الأزرار. محرر المالك مخصص لنصوص القوائم فقط.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu') }); }
      const kind = 'text';
      const from = String(p.from || '').trim();
      const to = String(p.to || '').trim();
      if (!from || !to || from === to) {
        clearPending(ctx);
        return answer(ctx, 'لم يُحفظ التعديل لأن النص القديم والجديد فارغان أو متطابقان.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu') });
      }
      db.globalTextOverrides ||= { texts: [], buttons: [], buttonCallbacks: {} };
      db.globalTextOverrides.texts ||= [];
      db.globalTextOverrides.buttons ||= [];
      db.globalTextOverrides.buttonCallbacks ||= {};

      // عند اختيار عنصر من الفهرس نحدّث العنصر المحدد، مع تخصيص الزر بواسطة callback_data متى توفر.
      if (Number.isInteger(p.catalogIndex) && UI_TEXT_CATALOG[p.catalogIndex]) {
        const item = UI_TEXT_CATALOG[p.catalogIndex];
        const baseFrom = String(item.from || '');
        if (item.kind === 'button' && item.callback) {
          const existing = db.globalTextOverrides.buttonCallbacks[item.callback];
          db.globalTextOverrides.buttonCallbacks[item.callback] = {
            from: existing?.from || baseFrom,
            to,
            catalogIndex: p.catalogIndex,
            updatedAt: Date.now()
          };
        } else {
          const catalogRules = item.kind === 'button' ? db.globalTextOverrides.buttons : db.globalTextOverrides.texts;
          let existing = catalogRules.find(rule => rule.from === baseFrom);
          if (!existing && p.from !== baseFrom) existing = catalogRules.find(rule => rule.to === p.from);
          if (existing) { existing.to = to; existing.updatedAt = Date.now(); }
          else catalogRules.push({ from: baseFrom, to, catalogIndex: p.catalogIndex, createdAt: Date.now() });
        }
        // إذا كان للزر callback_data معروف، نغيّر هذا الزر فقط ولا نلمس تسميات أخرى متشابهة.
        const affectedDefaults = item.kind === 'button' && item.callback
          ? 0
          : applyGlobalCustomizationChange(item.kind, baseFrom, to);
        save();
        clearPending(ctx);
        const categoryIndex = textCategories.indexOf(item.category);
        const page = Math.max(0, Number(p.catalogPage) || 0);
        return answer(ctx, `✅ تم حفظ تعديل العنصر المحدد.\n\nالقسم: ${item.category}\nالنوع: نص / وصف\n\nقبل:\n${String(p.from || baseFrom).slice(0, 500)}\n\nبعد:\n${to.slice(0, 500)}\n\n🌍 التغيير محفوظ وسيظهر لجميع المستخدمين.\nعدد قيم التخصيص الافتراضية المتأثرة: ${affectedDefaults}`, { reply_markup: new InlineKeyboard().text('✏️ تعديل عنصر آخر', `globaltextcategory:${categoryIndex}:${page}`).row().text('🗂️ فهرس الأقسام', 'globaltextcatalog').text('🔙 تحرير نصوص القوائم', 'globaltextmenu') });
      }

      const rules = kind === 'button' ? db.globalTextOverrides.buttons : db.globalTextOverrides.texts;
      let updated = false;
      for (const rule of rules) {
        if (rule.from === from || rule.to === from) {
          rule.to = to;
          rule.updatedAt = Date.now();
          updated = true;
          break;
        }
      }
      if (!updated) {
        for (const rule of rules) {
          if (typeof rule.to === 'string' && rule.to.includes(from)) {
            rule.to = rule.to.split(from).join(to);
            rule.updatedAt = Date.now();
            updated = true;
          }
        }
      }
      if (!updated) {
        let reconstructedSource = from;
        const reverseRules = [...rules].filter(rule => rule && typeof rule.to === 'string' && rule.to && typeof rule.from === 'string')
          .sort((a, b) => b.to.length - a.to.length);
        for (const rule of reverseRules) {
          if (reconstructedSource.includes(rule.to)) reconstructedSource = reconstructedSource.split(rule.to).join(rule.from);
        }
        if (reconstructedSource !== from && reconstructedSource) {
          rules.push({ from: reconstructedSource, to, createdAt: Date.now() });
          updated = true;
        }
      }
      if (!updated) rules.push({ from, to, createdAt: Date.now() });
      // احفظ النص الجديد أيضاً كافتراضي عام؛ استعادة المستخدم سترجع إلى هذا النص.
      const affectedDefaults = applyGlobalCustomizationChange(kind, from, to);
      save();
      clearPending(ctx);
      return answer(ctx, `✅ تم اعتماد التعديل العام بنجاح.\n\nالقديم: ${from.slice(0, 500)}\n\nالجديد: ${to.slice(0, 500)}\n\n🌍 سيظهر التغيير لكل المستخدمين، وسيصبح هو الافتراضي حتى بعد ضغط أي مستخدم على «استعادة النصوص الافتراضية».\n📌 القيم الافتراضية التي تم تحديثها: ${affectedDefaults}`, { reply_markup: new InlineKeyboard().text('➕ تعديل آخر', `globaltextedit:${kind}`).row().text('📋 عرض التعديلات', 'globaltextlist:0').row().text('🔙 تحرير نصوص القوائم', 'globaltextmenu') });
    }

    if (data.startsWith('globaltextlist:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const textRules = db.globalTextOverrides?.texts || [];
      const allRules = textRules.map((rule, index) => ({ ...rule, kind: 'text', index }));
      if (!allRules.length) return answer(ctx, '📋 ماكو تعديلات عامة محفوظة حالياً.', { reply_markup: new InlineKeyboard().text('🔙 تحرير نصوص القوائم', 'globaltextmenu') });
      const pageSize = 6;
      const page = Math.max(0, Number(data.split(':')[1]) || 0);
      const pages = Math.max(1, Math.ceil(allRules.length / pageSize));
      const shown = allRules.slice(page * pageSize, (page + 1) * pageSize);
      const kb = new InlineKeyboard();
      const short = value => String(value).replace(/\s+/g, ' ').slice(0, 8);
      const safeButtonLabel = value => {
        let out = '';
        for (const char of String(value)) { if (Buffer.byteLength(out + char, 'utf8') > 60) break; out += char; }
        return out;
      };
      for (const rule of shown) {
        kb.text(safeButtonLabel(`🗑️ نص: ${short(rule.from)} ← ${short(rule.to)}`), `globaltextdel:${rule.index}:${page}`).row();
      }
      if (page > 0) kb.text('⬅️ السابق', `globaltextlist:${page - 1}`);
      if (page + 1 < pages) kb.text('التالي ➡️', `globaltextlist:${page + 1}`);
      kb.row().text('🔙 تحرير نصوص القوائم', 'globaltextmenu');
      const body = shown.map((rule, i) => `${page * pageSize + i + 1}. 📝 نص\nقديم: ${String(rule.from).slice(0, 90)}\nجديد: ${String(rule.to).slice(0, 90)}`).join('\n\n');
      return answer(ctx, `📋 التعديلات العامة (${page + 1}/${pages})\n\n${body}\n\nاضغط على أي تعديل لحذفه.`, { reply_markup: kb });
    }

    if (data.startsWith('globaltextdel:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const [, rawIndex, rawPage] = data.split(':');
      const index = Number(rawIndex);
      const textCount = (db.globalTextOverrides?.texts || []).length;
      if (!Number.isInteger(index) || index < 0 || index >= textCount) {
        return answer(ctx, 'التعديل المطلوب غير موجود أو تم حذفه مسبقاً.', { reply_markup: new InlineKeyboard().text('📋 عرض التعديلات', 'globaltextlist:0').row().text('🔙 تحرير نصوص القوائم', 'globaltextmenu') });
      }
      db.globalTextOverrides.texts.splice(index, 1);
      save();
      return answer(ctx, '🗑️ تم حذف التعديل المحدد.', { reply_markup: new InlineKeyboard().text('📋 بقية التعديلات', `globaltextlist:${Math.max(0, Number(rawPage) || 0)}`).row().text('🔙 تحرير نصوص القوائم', 'globaltextmenu') });
    }

    if (data === 'globaltextclear') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      return answer(ctx, '⚠️ هل تريد مسح تعديلات النصوص العامة؟ ستعود النصوص إلى الافتراضي للجميع.', { reply_markup: new InlineKeyboard().text('✅ نعم، امسحها', 'globaltextclearconfirm').row().text('❌ إلغاء', 'globaltextmenu') });
    }

    if (data === 'globaltextclearconfirm') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      db.globalTextOverrides ||= { texts: [], buttons: [], buttonCallbacks: {} };
      db.globalTextOverrides.texts = [];
      // امسح الافتراضات العامة الخاصة بالنصوص فقط، واحتفظ بأي تسميات أزرار قديمة كما هي.
      db.globalCustomizationDefaults ||= {};
      const textPaths = Object.keys(db.globalCustomizationDefaults).filter(path => !path.startsWith('labels.'));
      for (const customization of Object.values(db.customizations || {})) {
        for (const path of textPaths) deleteObjectPath(customization, path);
      }
      for (const path of textPaths) delete db.globalCustomizationDefaults[path];
      db.globalTextOverrides.buttons ||= [];
      db.globalTextOverrides.buttonCallbacks ||= {};
      save();
      return answer(ctx, '♻️ تمت استعادة نصوص القوائم إلى الافتراضي للجميع. لم تتغير أسماء الأزرار أو بيانات المستخدمين.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu').text('👑 لوحة المالك', 'ownerpanel') });
    }

    // لوحة المالك والاشتراك الإجباري[cite: 4, 5]
    if (data === 'ownerpanel') return showOwnerPanel(ctx);
    if (data === 'botstats') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'الإحصائيات متاحة للمالك من الخاص فقط.');
      const now = Date.now();
      const users = [...new Set((Array.isArray(db.users) ? db.users : []).map(String))];
      const totalUsers = users.length;
      const privateUsers = new Set((Array.isArray(db.privateUsers) ? db.privateUsers : []).map(String)).size;
      const meta = db.userMeta || {};
      const active24h = users.filter(id => now - Number(meta[id]?.lastSeenAt || 0) <= 24 * 60 * 60 * 1000 && Number(meta[id]?.lastSeenAt || 0) > 0).length;
      const active7d = users.filter(id => now - Number(meta[id]?.lastSeenAt || 0) <= 7 * 24 * 60 * 60 * 1000 && Number(meta[id]?.lastSeenAt || 0) > 0).length;
      const new24h = users.filter(id => now - Number(meta[id]?.firstSeenAt || 0) <= 24 * 60 * 60 * 1000 && Number(meta[id]?.firstSeenAt || 0) > 0).length;
      const groups = Object.values(db.groups || {});
      const activeGroups = groups.filter(g => g.activated).length;
      const totalReferrals = Object.values(db.referrals || {}).reduce((sum, item) => sum + Math.max(0, Number(item?.joinedCount) || 0), 0);
      const totalReferralRewards = Object.values(db.referrals || {}).reduce((sum, item) => sum + Math.max(0, Number(item?.rewardPoints) || 0), 0);
      const totalMessages = Math.max(0, Number(db.stats?.messages) || 0);
      const kb = new InlineKeyboard().text('🔄 تحديث الإحصائيات', 'botstats').row().text('👑 لوحة المالك', 'ownerpanel');
      return answer(ctx, `╭━━━〔 📊 إحصائيات نغنوغ 〕━━━╮\n\n👥 إجمالي المستخدمين: ${totalUsers}\n🟢 نشطون خلال 24 ساعة: ${active24h}\n📆 نشطون خلال 7 أيام: ${active7d}\n🆕 مستخدمون جدد خلال 24 ساعة: ${new24h}\n💬 مستخدمو الخاص: ${privateUsers}\n\n👥 المجموعات المسجّلة: ${groups.length}\n🟢 المجموعات المفعّلة: ${activeGroups}\n✉️ رسائل المجموعات المرصودة: ${totalMessages}\n\n🔗 إحالات ناجحة: ${totalReferrals}\n⭐ نقاط جوائز الإحالة: ${totalReferralRewards}\n\n✦ النشاط محسوب من آخر تفاعل سجّله البوت، وقد تكون بيانات النشاط القديم غير متوفرة للمستخدمين السابقين.\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }
    if (data === 'activatedgroups') {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
      const activeGroups = Object.values(db.groups || {}).filter(g => g.activated);
      const kb = new InlineKeyboard();
      for (const g of activeGroups) kb.text(`👥 ${String(g.title || g.id).slice(0, 45)}`, `activegroup:${g.id}`).row();
      kb.text('🔙 لوحة المالك', 'ownerpanel');
      const text = `╭━━━〔 👥 المجموعات النشطة 〕━━━╮\n\n-︰العدد الكلي : ❨ ${activeGroups.length} مجموعة ❩\n\n✦ اختَر مجموعة لعرض تفاصيلها وخيارات إدارتها.\n╰━━━━━━━━━━━━━━━━━━━━╯`;
      return answer(ctx, text, { reply_markup: kb });
    }
    if (data.startsWith('activegroup:')) {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
      const id = data.slice('activegroup:'.length);
      const g = db.groups[id];
      if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة حالياً.', { reply_markup: new InlineKeyboard().text('🔙 المجموعات النشطة', 'activatedgroups') });
      const kb = new InlineKeyboard()
        .text('⚙️ فتح خيارات المجموعة', `choosegroup:${g.id}`).row()
        .text('🔗 رابط المجموعة أو الدعوة', `activegroupinvite:${g.id}`).row()
        .text('🔙 المجموعات النشطة', 'activatedgroups');
      let members = 'غير متاح';
      try { members = String(await bot.api.getChatMemberCount(g.id)); } catch {}
      return answer(ctx, `╭━━━〔 👥 تفاصيل المجموعة 〕━━━╮\n\n-︰الاسم : ❨ ${g.title || 'بدون اسم'} ❩\n-︰المعرّف : ❨ ${g.id} ❩\n-︰عدد الأعضاء : ❨ ${members} ❩\n-︰الحالة : ❨ 🟢 مفعّلة ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }
    if (data.startsWith('activegroupinvite:')) {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
      const id = data.slice('activegroupinvite:'.length);
      const g = db.groups[id];
      if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة.');
      try {
        const chat = await bot.api.getChat(id);
        if (chat.username) {
          return answer(ctx, `🔗 رابط المجموعة: https://t.me/${chat.username}`, { reply_markup: new InlineKeyboard().url('فتح المجموعة', `https://t.me/${chat.username}`).row().text('🔙 تفاصيل المجموعة', `activegroup:${id}`) });
        }
        const me = await bot.api.getChatMember(id, bot.botInfo.id);
        if (['administrator', 'creator'].includes(me.status)) {
          const invite = await bot.api.createChatInviteLink(id);
          return answer(ctx, '🔗 أنشأت رابط دعوة للمجموعة. تگدر تفتحه أو تشاركه.', { reply_markup: new InlineKeyboard().url('فتح رابط الدعوة', invite.invite_link).row().text('🔙 تفاصيل المجموعة', `activegroup:${id}`) });
        }
      } catch (e) { console.warn('Could not create/open group invite link:', e?.description || e?.message || e); }
      return answer(ctx, 'ما كدرت أجيب رابط المجموعة. إذا كانت خاصة، لازم نغنوغ يكون مشرفاً ويملك صلاحية إنشاء روابط الدعوة.', { reply_markup: new InlineKeyboard().text('🔙 تفاصيل المجموعة', `activegroup:${id}`) });
    }
    if (data === 'botsettings') {
      if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
      const kb = new InlineKeyboard()
        .text('📊 إحصائيات نغنوغ', 'botstats').row()
        .text('👥 المجموعات النشطة', 'activatedgroups').row()
        .text('📢 إرسال إشعار عام', 'broadcastmenu').row()
        .text('💳 إدارة الاشتراكات', 'subscriptionsmenu').row()
        .text('🛡️ إعدادات حماية المجموعات', 'mygroups').row()
        .text('↩️ رجوع إلى قسم الإدارة', 'managementmenu').row()
        .text('🏠 القائمة الرئيسية', 'home');
      return answer(ctx, '╭━━━〔 ⚙️ إعدادات البوت العامة 〕━━━╮\n\nمن هنا توصل إلى إعدادات وإدارة البوت العامة: الإحصائيات، المجموعات، الإشعارات، والاشتراك الإجباري.\n\nأما حماية كل مجموعة فتدخل إلها من «مجموعاتي» ثم إعدادات المجموعة.\n╰━━━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    if (data === 'globalprotection') {
      const g = selectedGroup(ctx);
      if (!g) return answer(ctx, 'اختَر مجموعة من «مجموعاتي» أولاً، ثم افتح الحماية الموحدة من إعداداتها.', { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').row().text('🔙 لوحة المالك', 'ownerpanel') });
      if (!await userCanManage(ctx, g)) return answer(ctx, 'ما عندك صلاحية إدارة المجموعة المحددة.');
      db.protectionBack ||= {}; db.protectionBack[userKey(ctx)] = 'ownerpanel'; save();
      return answer(ctx, `╭━━━〔 🛡️ الحماية الموحدة 〕━━━╮\nالمجموعة: «${g.title}»\n\nهذه هي الإعدادات المشتركة نفسها المستخدمة من قوائم المجموعة.`, { reply_markup: protectionKeyboard(g, 'ownerpanel') });
    }
    if (data === 'subscriptionsmenu') return subscriptionsMenu(ctx);
    if (data === 'requiredmenu') return ownerRequiredMenu(ctx);
    if (data === 'chatsubmenu') return showChatSubscriptionMenu(ctx, true);
    if (data.startsWith('chatsubpick:')) {
      const id = String(data.slice('chatsubpick:'.length)); const ownerId = String(ctx.from.id);
      db.chatSubscriptionSelection ||= {}; const set = new Set((db.chatSubscriptionSelection[ownerId] || []).map(String));
      set.has(id) ? set.delete(id) : set.add(id); db.chatSubscriptionSelection[ownerId] = [...set]; save();
      return showChatSubscriptionMenu(ctx);
    }
    if (data === 'chatsubselectall' || data === 'chatsubclear') {
      const ownerId = String(ctx.from.id); db.chatSubscriptionSelection ||= {};
      db.chatSubscriptionSelection[ownerId] = data === 'chatsubclear' ? [] : [...(db.chatSubscriptionAdminGroups?.[ownerId] || [])];
      save(); return showChatSubscriptionMenu(ctx);
    }
    if (data === 'chatsubsetselected') { const ids=(db.chatSubscriptionSelection?.[String(ctx.from.id)]||[]).map(String); if(!ids.length) return answer(ctx,'حدد مجموعة واحدة على الأقل أولاً.',{reply_markup:new InlineKeyboard().text('↩️ المجموعات','chatsubmenu')}); pending(ctx,{action:'chat-sub-set',groupIds:ids}); return answer(ctx,'أرسل جهة الاشتراك العامة للمجموعات المحددة بصيغة @channel أو -1001234567890 | https://t.me/+invite. يجب أن يكون نغنوغ مشرفاً في جهة الاشتراك حتى يتحقق من العضوية.',{reply_markup:new InlineKeyboard().text('❌ إلغاء','chatsubmenu')}); }
    if (data === 'chatsubclear_target_selected') {
      const ids = (db.chatSubscriptionSelection?.[String(ctx.from.id)] || []).map(String);
      if (!ids.length) return answer(ctx, 'حدد مجموعة واحدة على الأقل أولاً.', { reply_markup: new InlineKeyboard().text('↩️ المجموعات', 'chatsubmenu') });
      for (const id of ids) { const setting = db.chatSubscriptions?.[id]; if (setting) { delete setting.requiredChatId; delete setting.title; delete setting.url; setting.enabled = false; } }
      save();
      return showChatSubscriptionMenu(ctx);
    }
    if (data === 'chatsubenable_selected' || data === 'chatsubdisable_selected') { const ids=(db.chatSubscriptionSelection?.[String(ctx.from.id)]||[]).map(String); if(!ids.length) return answer(ctx,'حدد مجموعة واحدة على الأقل أولاً.',{reply_markup:new InlineKeyboard().text('↩️ المجموعات','chatsubmenu')}); for(const id of ids){db.chatSubscriptions ||= {}; db.chatSubscriptions[id] ||= {}; db.chatSubscriptions[id].enabled=data==='chatsubenable_selected';} save(); return answer(ctx,`${data==='chatsubenable_selected'?'🟢 تم تشغيل':'🔴 تم إيقاف'} اشتراك الدردشة للمجموعات المحددة (${ids.length}).`,{reply_markup:new InlineKeyboard().text('↩️ إدارة المجموعات','chatsubmenu')}); }
    if (data.startsWith('chatsubset:')) { const id=data.slice('chatsubset:'.length); pending(ctx,{action:'chat-sub-set',groupIds:[String(id)]}); return answer(ctx,'أرسل جهة الاشتراك بصيغة @channel أو -1001234567890 | https://t.me/+invite للمجموعة الخاصة.',{reply_markup:new InlineKeyboard().text('❌ إلغاء','chatsubmenu')}); }
    if (data.startsWith('chatsubtoggle:')) { const id=String(data.slice('chatsubtoggle:'.length)); db.chatSubscriptions ||= {}; db.chatSubscriptions[id] ||= {}; db.chatSubscriptions[id].enabled=!db.chatSubscriptions[id].enabled; save(); return answer(ctx,`${db.chatSubscriptions[id].enabled?'🟢 تم تشغيل':'🔴 تم إيقاف'} اشتراك الدردشة لهذه المجموعة.`,{reply_markup:new InlineKeyboard().text('↩️ إدارة الاشتراك','chatsubmenu')}); }
    if (data === 'requiredlist') return showRequiredList(ctx);
    if (data === 'requiredadd') {
      pending(ctx, { action: 'add-required-chat' });
      return answer(ctx, '➕ أرسل الآن آيدي أو معرف القناة/المجموعة للاشتراك الإجباري (مثال: \`-100xxxxxxxxxx\` أو \`@channel\`).', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'requiredmenu') });
    }
    if (data.startsWith('reqdel:')) {
      const index = Number(data.split(':')[1]);
      if (db.requiredChats && db.requiredChats[index]) {
        db.requiredChats.splice(index, 1);
        save();
        return showRequiredList(ctx);
      }
    }
    if (data.startsWith('chatsubverify:')) {
      const chatId = String(data.slice('chatsubverify:'.length)); const setting = db.chatSubscriptions?.[chatId];
      if (!setting?.enabled || !setting.requiredChatId) return answer(ctx, 'هذا الاشتراك غير مفعّل حالياً.');
      try { const m = await ctx.api.getChatMember(/^-?\d+$/.test(String(setting.requiredChatId)) ? Number(setting.requiredChatId) : setting.requiredChatId, ctx.from.id); const joined = ['member','administrator','creator'].includes(m.status) || (m.status==='restricted' && m.is_member); if (joined) { try { await ctx.editMessageText('✅ تم التحقق من اشتراكك. تگدر هسه ترجع للمجموعة وتشارك.'); } catch {} return; } return answer(ctx, '❌ بعدك مو مشترك بالجهة المطلوبة. اشترك واضغط تحقق مرة ثانية.', { reply_markup: new InlineKeyboard().url('📣 اشترك الآن', setting.url).text('✅ تحقّق من الاشتراك', `chatsubverify:${chatId}`) }); } catch { return answer(ctx, 'تعذر التحقق حالياً. تأكد أن نغنوغ مشرف في القناة/المجموعة المطلوبة وأن الرابط صحيح.'); }
    }
    if (data === 'checksubscription') {
      return subscriptionGate(ctx);
    }

    // التحذيرات والعقوبات[cite: 3, 5]
    if (data === 'warningsmenu') {
      rememberMenuBack(ctx, 'warnings');
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g) { const { entries } = selectedGroupKeyboard(ctx); if (entries.length) return showGroups(ctx); return answer(ctx, 'ما عندك مجموعة مفعّلة بعد. أضف نغنوغ لمجموعتك وفعّله، وبعدها تگدر تدير التحذيرات والعقوبات.'); }
      if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة التحذيرات متاحة لمشرفي المجموعة فقط.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰المجموعة : ❨ ${g.title} ❩\n\n-︰التحذيرات :\n❨ 1 ❩، ❨ 2 ❩، ❨ 3 ❩، ❨ 4 ❩، ❨ 5 ❩،\n❨ 7 ❩، ❨ 10 ❩، ❨ 15 ❩، ❨ 20 ❩\n\n-︰مدد الكتم بالدقائق :\n❨ 5 ❩، ❨ 10 ❩، ❨ 15 ❩، ❨ 20 ❩، ❨ 30 ❩،\n❨ 45 ❩، ❨ 60 ❩، ❨ 90 ❩، ❨ 120 ❩،\n❨ 180 ❩، ❨ 360 ❩، ❨ 720 ❩، ❨ 1440 ❩\n\n-︰طريقة الاستخدام : ❨ اضغط على الأزرار لتغيير الخيارات بالتتابع ❩\n-︰التفعيل : ❨ فعّل النظام من الزر الأول ❩\n\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningstoggle') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      g.warningSettings.enabled = !g.warningSettings.enabled;
      save();
      const sourceText = String(ctx.callbackQuery?.message?.text || '');
      const fromProtection = sourceText.includes('الحماية الموحدة') || sourceText.includes('تخصيص الحمايات');
      const markup = fromProtection ? protectionKeyboard(g, protectionBackTarget(ctx)) : warningsKeyboard(g, menuBackTarget(ctx, 'warnings'));
      return answer(ctx, `⚠️ ${g.warningSettings.enabled ? '🟢 تم تفعيل' : '⚪ تم إيقاف'} نظام الإنذارات لهذه المجموعة.`, { reply_markup: markup });
    }

    if (data === 'warningslimit') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const limits = [1, 2, 3, 4, 5, 7, 10, 15, 20];
      const currentLimit = Number(g.warningSettings?.limit) || 3;
      const limitIndex = limits.indexOf(currentLimit);
      g.warningSettings.limit = limits[limitIndex < 0 ? 0 : (limitIndex + 1) % limits.length];
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰عدد التحذيرات : ❨ ${g.warningSettings.limit} ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningsaction') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const actions = ['mute', 'kick', 'ban', 'none'];
      const currentIndex = actions.indexOf(g.warningSettings.action);
      g.warningSettings.action = actions[(currentIndex + 1) % actions.length];
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰العقوبة : ❨ ${{ mute: 'كتم', kick: 'طرد', ban: 'حظر', none: 'بدون إجراء' }[g.warningSettings.action]} ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningsduration') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const durations = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 360, 720, 1440];
      const currentDuration = Number(g.warningSettings?.duration) || 10;
      const durationIndex = durations.indexOf(currentDuration);
      g.warningSettings.duration = durations[durationIndex < 0 ? 0 : (durationIndex + 1) % durations.length];
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰مدة الكتم : ❨ ${g.warningSettings.duration} دقيقة ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningslog') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const log = g.warningLog || [];
      const logText = log.slice(-10).map(l => `• ${l.name}: ${l.reason}`).join('\n') || 'لا توجد سجلات تحذير حتى الآن.';
      return answer(ctx, `╭━━━〔 📋 سجل التحذيرات الأخيرة 〕━━━╮\n\n${logText}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('🔙 رجوع للتحذيرات', 'warningsmenu') });
    }

    if (data === 'warningsclear') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warnings = {};
      save();
      return answer(ctx, `╭━━━〔 🧹 تصفير التحذيرات 〕━━━╮\n\n-︰النتيجة : ❨ تم تصفير تحذيرات أعضاء المجموعة بنجاح ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('🔙 رجوع للتحذيرات', 'warningsmenu') });
    }

    // إعدادات المجموعة المتقدمة[cite: 3, 5]
    if (data === 'welcomeedit') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      pending(ctx, { action: 'edit-welcome', groupId: g.id });
      return answer(ctx, `👋 أرسل رسالة الترحيب الجديدة.\n\nملاحظة: يمكنك استخدام \`{name}\` لاسم العضو و \`{title}\` لعنوان المجموعة.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'groupsettings') });
    }

    if (data === 'togglelinks' || data === 'toggleflood') {
      // توافق مع أزرار الإصدارات القديمة: أي ضغط قديم يغيّر نفس الإعداد الموحد.
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const field = data === 'togglelinks' ? 'linksLock' : 'flood';
      g[field] = !g[field];
      if (field === 'linksLock') g.links = g.linksLock;
      db.protectionBack ||= {}; db.protectionBack[userKey(ctx)] = 'groupsettings';
      save();
      const label = field === 'linksLock' ? 'حماية الروابط' : 'منع السبام';
      try { await ctx.api.sendMessage(g.id, `🛡️ تحديث الحماية — نغنوغ 🐈‍⬛\n\n${g[field] ? '🟢 تم تفعيل' : '⚪ تم إيقاف'} ${label}.\nالمجموعة: ${g.title}`); } catch {}
      return answer(ctx, `🛡️ ${g[field] ? '🟢 تم تفعيل' : '⚪ تم إيقاف'} ${label}.\n\nتم نقل خيارات الحماية إلى القائمة الموحدة.`, { reply_markup: protectionKeyboard(g, 'groupsettings') });
    }

    if (data === 'togglereplies') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.autoReply = !g.autoReply;
      save();
      return ctx.editMessageText(`╭━━━〔 ⚙️ إعدادات المجموعة 〕━━━╮\n\n-︰اسم المجموعة : ❨ ${g.title} ❩\n\n✦ اختَر الإعداد الذي تريد تغييره من الأزرار أدناه.\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: groupSettingsKeyboard(g) });
    }

    if (data === 'badwordsmenu') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.badWords ||= [];
      const kb = new InlineKeyboard();
      kb.text('➕ إضافة كلمة ممنوعة', 'badwordadd').row();
      g.badWords.forEach((word, index) => { kb.text(`🗑️ حذف: ${word}`, `badworddel:${index}`).row(); });
      kb.text('🔙 رجوع للتحذيرات', 'warningsmenu');
      const wordsList = g.badWords.length > 0 ? g.badWords.join(', ') : 'لا توجد كلمات ممنوعة مضافة حالياً.';
      return ctx.editMessageText(`╭━━━〔 🚫 إدارة الكلمات الممنوعة 〕━━━╮\nالمجموعة: «${g.title}»\n\n〔 الكلمات المسجّلة 〕\n${wordsList}`, { reply_markup: kb });
    }

    if (data === 'badwordadd') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      pending(ctx, { action: 'badwordadd', groupId: g.id });
      return answer(ctx, '➕ أرسل الآن الكلمة أو العبارة المخالفة.');
    }

    if (data.startsWith('badworddel:')) {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
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
      return ctx.editMessageText(`╭━━━〔 🚫 إدارة الكلمات الممنوعة 〕━━━╮\nالمجموعة: «${g.title}»\n\n〔 الكلمات المسجّلة 〕\n${wordsList}`, { reply_markup: kb });
    }

    if (data === 'repliesmenu') return answer(ctx, '╭─〔 💬 إدارة الردود التلقائية 〕─╮', { reply_markup: repliesKeyboard() });
    if (data === 'replyadd') { 
      const g = selectedGroup(ctx); 
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.'); 
      pending(ctx, { action: 'reply-trigger', groupId: g.id }); 
      return answer(ctx, '➕ أرسل العبارة التي تريد أن يلتقطها البوت:'); 
    }
    if (data === 'replylist') return showReplyList(ctx);
    if (data === 'replydelete') {
      const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      if (!g.replies || !g.replies.length) return answer(ctx, 'ماكو ردود.', { reply_markup: repliesKeyboard() });
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

    // لوحة الحماية[cite: 4]
    if (data === 'protectionmenu') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g) return answer(ctx, '⚠️ اختار مجموعة أولاً من «مجموعاتي».');
      if (!await userCanManage(ctx, g)) return answer(ctx, 'الأمر غير مخصص إلك');
      const sourceText = String(ctx.callbackQuery?.message?.text || '');
      let back = isGroup(ctx) ? 'publiccommands' : (selectedGroup(ctx) ? 'groupoverview' : 'managementmenu');
      if (sourceText.includes('إعدادات مجموعة')) back = 'groupsettings';
      else if (sourceText.includes('لوحة مالك')) back = 'ownerpanel';
      db.protectionBack ||= {};
      db.protectionBack[userKey(ctx)] = back;
      save();
      return answer(ctx, `╭━━━〔 🛡️ إعدادات الحماية الموحدة 〕━━━╮\nالمجموعة: «${g.title}»\n\nكل زر يغيّر الحالة المحفوظة نفسها، وتظهر الحالة ذاتها في كل مكان.`, { reply_markup: protectionKeyboard(g, back) });
    }

    if (data === 'prot_custom') { const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'الأمر غير مخصص إلك'); return answer(ctx, '🎛️ تخصيص الحمايات\nاختَر من الأزرار الحماية اللي تريدها فقط؛ كل زر يبدّل حماية واحدة بدون تشغيل باقي الحمايات. نظام الإنذارات موجود هنا أيضاً.', { reply_markup: protectionKeyboard(g, protectionBackTarget(ctx)) }); }

    if (data.startsWith('prot_')) {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'الأمر غير مخصص إلك');
      const type = data.slice(5);
      const fieldByType = { links: 'linksLock', flood: 'flood', media: 'mediaLock', badwords: 'badWordsLock', audio: 'audioLock', forward: 'forwardLock', contacts: 'contactsLock' };
      if (type === 'all') {
        for (const field of Object.values(fieldByType)) g[field] = true;
        g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 }; g.warningSettings.enabled = true;
        g.links = g.linksLock = true;
        g.audioClipsLock = true;
      } else if (type === 'none') {
        for (const field of Object.values(fieldByType)) g[field] = false;
        g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 }; g.warningSettings.enabled = false;
        g.links = g.linksLock = false;
        g.audioClipsLock = false;
      } else if (type === 'chat') {
        const nextClosed = !g.closedMessages;
        try {
          await ctx.api.setChatPermissions(g.id, nextClosed
            ? { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false }
            : { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true });
          g.closedMessages = nextClosed;
        } catch { return answer(ctx, '❌ ما كدرت أغيّر صلاحيات الدردشة. تأكد أن نغنوغ مشرف وعنده صلاحية تقييد الأعضاء.', { reply_markup: protectionKeyboard(g, protectionBackTarget(ctx)) }); }
      } else if (fieldByType[type]) {
        g[fieldByType[type]] = !g[fieldByType[type]];
        if (type === 'links') g.links = g.linksLock;
        if (type === 'audio') g.audioClipsLock = g.audioLock;
      } else return answer(ctx, 'خيار حماية غير معروف.');
      save();
      const status = type === 'all' ? '🟢 تم تفعيل جميع الحمايات والإنذارات.' : type === 'none' ? '⚪ تم إيقاف جميع الحمايات والإنذارات.' : type === 'chat' ? `تم ${g.closedMessages ? 'قفل' : 'فتح'} دردشة المجموعة.` : `تم ${g[fieldByType[type]] ? 'تفعيل' : 'إيقاف'} ${({ links: 'حماية الروابط', flood: 'منع السبام', media: 'حماية الوسائط والملفات', badwords: 'حماية كلمات الفشار', audio: 'حماية الصوتيات', forward: 'منع توجيه الرسائل', contacts: 'منع المعرفات والأرقام' })[type] || 'الميزة'} ${g[fieldByType[type]] ? '🟢' : '⚪'}`;
      const announcement = `🛡️ تحديث الحماية — نغنوغ 🐈‍⬛\n\n${status}\n\n${g.title ? `المجموعة: ${g.title}` : ''}`.trim();
      // لا نكتفي بتعديل نص اللوحة: أرسل إشعاراً مستقلاً داخل المجموعة أيضاً.
      try { await ctx.api.sendMessage(g.id || ctx.chat.id, announcement); }
      catch (err) { console.warn('[protection-announcement] Could not send group status:', err?.description || err?.message || err); }
      return answer(ctx, `╭━━━〔 🛡️ تحديث الحماية 〕━━━╮\n\n${status}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: protectionKeyboard(g, protectionBackTarget(ctx)) });
    }

    // لوحة المشرفين[cite: 4]
    if (data === 'adminpanel') {
      const adminText = `👑 أوامر المشرفين — نغنوغ

🔇 كتم عضو: ردّ على رسالته واكتب «كتم 10».
🔊 فك الكتم: «فتح الكتم» أو «افتح كتم» بالرد على العضو.
🚪 طرد: ردّ على رسالة العضو واكتب «طرد».
🔒 قفل: «قفل المجموعة» أو «اقفل المجموعه».
🔓 فتح: «افتح المجموعة» أو «فتح المجموعة».
🗑️ مسح: «امسح 10» أو «احذف جميع الرسائل».
📌 تثبيت: «تثبيت» أو «فك التثبيت» بالرد على رسالة.

🛡️ الحمايات — اكتب تشغيل أو ايقاف ثم اسم الحماية:
• الروابط — السبام — الوسائط — الفشار (الكلمات الممنوعة)
• الصوتيات — توجيه الرسائل — المعرفات
• الإنذارات: «تشغيل الانذارات» / «ايقاف الانذارات»
• الكل: «تفعيل الحماية» / «ايقاف الحماية»

🎛️ من زر «الحماية» تگدر تختار كل حماية وحدها وتضبط الإنذارات.
✦ الصيغ العربية المتقاربة مقبولة، والأوامر الإدارية للمشرفين فقط.`;
      return answer(ctx, adminText, { reply_markup: new InlineKeyboard().text('🛡️ إعدادات الحماية', 'protectionmenu').row().text('↩️ العودة للقائمة السابقة', isGroup(ctx) ? 'publiccommands' : 'managementmenu') });
    }

    // قائمة الألعاب والتحديات[cite: 4]
    if (data === 'gamesmenu' || data === 'games_list') {
      rememberMenuBack(ctx, 'games');
      const gamesText = `╭━━━〔 🎮 ألعاب نغنوغ وتحدّياته 〕━━━╮\n\n` +
        `✦ اكتب اسم اللعبة داخل المجموعة لبدء سؤال جديد.\n` +
        `🧩 «اختيارات» ➜ اختر الجواب الصحيح من الأزرار.\n` +
        `🔢 «رياضيات» ➜ أكمل المعادلة الرياضية.\n` +
        `🐾 «حيوان» ➜ خمّن الحيوان من الحرف الأول.\n` +
        `💡 «س» ➜ أسئلة عامة وثقافية.\n` +
        `🍎 «معاني» ➜ اكتب معنى سمايل الحيوان أو الفاكهة.\n` +
        `🔁 «عكس» ➜ اكتب عكس الكلمة.\n` +
        `🔤 «تفكيك» ➜ اكتب حروف الكلمة وبينها مسافات.\n` +
        `🏆 كل إجابة صحيحة بالألعاب التنافسية = نقطة، وتابع أعلى 3 بكتابة «توب».\n` +
        `🔄 إذا كتبت اسم لعبة ثانية، ينتهي السؤال السابق ويبدأ سؤال جديد مباشرة.\n╰━━━━━━━━━━━━━━━━━━╯`;
      
      const gamesKb = new InlineKeyboard()
        .text('🧩 الاختيارات', 'game_ch').text('🔢 رياضيات', 'game_ma').row()
        .text('🐾 حيوان', 'game_an').text('💡 أسئلة', 'game_ge').row()
        .text('🍎 معاني', 'game_meanings').text('🔁 عكس', 'game_opposite').row()
        .text('🔤 تفكيك', 'game_decompose').row()
        .text('💬 الأوامر التفاعلية', 'interactive_menu').text('🎁 خدمات حصرية', 'exclusive_services').row()
        .text(menuBackTarget(ctx, 'games') === 'managementmenu' ? '↩️ الإدارة' : menuBackTarget(ctx, 'games') === 'ownerpanel' ? '↩️ لوحة المالك' : menuBackTarget(ctx, 'games') === 'groupsettings' ? '↩️ إعدادات المجموعة' : '📚 مركز الأوامر', menuBackTarget(ctx, 'games'));

      if (ctx.callbackQuery) {
        try { await ctx.editMessageText(gamesText, { reply_markup: gamesKb }); }
        catch { await ctx.reply(gamesText, { reply_markup: gamesKb }); }
        return;
      }
      return answer(ctx, gamesText, { reply_markup: gamesKb });
    }

    if (data === 'game_top') {
      const chatId = String(isGroup(ctx) ? ctx.chat.id : (selectedGroup(ctx)?.id || ctx.chat?.id || ''));
      return answer(ctx, leaderboardText(chatId), { reply_markup: new InlineKeyboard().text('↩️ العودة إلى الألعاب', 'gamesmenu').row().text('📚 مركز الأوامر', 'publiccommands') });
    }

    if (data === 'clearall_confirm') {
      const chatId = String(ctx.chat?.id || '');
      const g = db.groups[chatId];
      const job = db.pending?.[`clearall:${chatId}`];
      if (!g || !job || Date.now() - job.createdAt > 60000 || !await userCanManage(ctx, g)) {
        try { await ctx.answerCallbackQuery({ text: 'انتهت صلاحية التأكيد أو الأمر غير مخصص إلك.', show_alert: true }); } catch {}
        return;
      }
      delete db.pending[`clearall:${chatId}`]; save();
      let deleted = 0, failed = 0;
      const messageIds = Array.isArray(job.messageIds) ? job.messageIds : [];
      for (const mid of [...messageIds].reverse()) {
        try { await ctx.api.deleteMessage(ctx.chat.id, Number(mid)); deleted++; } catch { failed++; }
      }
      const removed = new Set(messageIds.map(Number));
      g.recentMessages = (g.recentMessages || []).filter(entry => !removed.has(Number(entry.message_id)));
      save();
      try { await ctx.reply(`🧹 انتهت محاولة المسح. حذف: ${deleted}، تعذر حذف: ${failed}. جرى الاعتماد على الرسائل التي رصدها البوت، لأن تيليگرام لا يتيح له جلب سجل المجموعة كاملاً.`); } catch {}
      return;
    }
    if (data === 'clearall_cancel') {
      const chatId = String(ctx.chat?.id || '');
      delete db.pending?.[`clearall:${chatId}`]; save();
      return answer(ctx, 'تم إلغاء عملية الحذف.', { reply_markup: new InlineKeyboard().text('🏠 القائمة الرئيسية', 'home') });
    }

    if (data === 'statsmenu' || data === 'stats_points') {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g && !isGroup(ctx)) return showGroups(ctx);
      const chatId = String(g?.id || ctx.chat?.id || '');
      const scores = groupScores(chatId);
      const mine = Number(scores[userKey(ctx)] || 0);
      const total = Object.values(scores).reduce((sum, n) => sum + Number(n || 0), 0);
      const kb = new InlineKeyboard().text('🏆 أفضل 3 أعضاء', 'stats_top')
        .text('⭐ نقاطي', 'stats_mine').row()
        .text('🎮 تعليمات الألعاب', 'gamesmenu')
        .text('🏠 الرئيسية', 'home');
      return answer(ctx, `╭━━━〔 📊 النقاط والإحصائيات 〕━━━╮${g ? `\nالمجموعة: «${g.title}»` : ''}\n\n👥 الأعضاء الذين لديهم نقاط: ${Object.keys(scores).length}\n⭐ مجموع النقاط الممنوحة: ${total}\n🌟 رصيدك من النقاط: ${mine}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }
    if (data === 'stats_top') {
      const chatId = String(isGroup(ctx) ? ctx.chat.id : (selectedGroup(ctx)?.id || ctx.chat?.id || ''));
      return answer(ctx, leaderboardText(chatId), { reply_markup: new InlineKeyboard().text('🔙 النقاط والإحصائيات', 'statsmenu').row().text('🏠 القائمة الرئيسية', 'home') });
    }
    if (data === 'stats_mine') {
      const chatId = String(isGroup(ctx) ? ctx.chat.id : (selectedGroup(ctx)?.id || ctx.chat?.id || ''));
      return answer(ctx, `╭─〔 ⭐ رصيدك من النقاط 〕─╮\nرصيدك في هذه المجموعة: ${Number(groupScores(chatId)[userKey(ctx)] || 0)} نقطة.`, { reply_markup: new InlineKeyboard().text('🔙 النقاط والإحصائيات', 'statsmenu').row().text('🏠 القائمة الرئيسية', 'home') });
    }

    if (data === 'broadcastmenu') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'الإذاعة متاحة للمالك من الخاص فقط.');
      clearPending(ctx);
      pending(ctx, { action: 'broadcast-message' });
      return answer(ctx, '╭━━━〔 📢 الإذاعة العامة 〕━━━╮\n\nأرسل الآن النص أو الرسالة التي تريد إيصالها إلى المستخدمين المسجّلين.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'ownerpanel') });
    }
    if (data === 'broadcastcancel') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'الإذاعة متاحة للمالك من الخاص فقط.');
      clearPending(ctx);
      return answer(ctx, '❌ تم إلغاء الإذاعة. لم يتم إرسال أي رسالة.', { reply_markup: new InlineKeyboard().text('📢 إرسال إشعار عام', 'broadcastmenu').row().text('👑 لوحة المالك', 'ownerpanel') });
    }
    if (data === 'broadcastsend') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'الإذاعة متاحة للمالك من الخاص فقط.');
      const p = db.pending?.[userKey(ctx)];
      if (!p || p.action !== 'broadcast-confirm' || !String(p.text || '').trim()) {
        clearPending(ctx);
        return answer(ctx, 'ماكو إذاعة بانتظار التأكيد. افتح الإذاعة من لوحة المالك وابدأ من جديد.', { reply_markup: new InlineKeyboard().text('📢 إرسال إشعار عام', 'broadcastmenu').row().text('👑 لوحة المالك', 'ownerpanel') });
      }
      const draft = String(p.text).trim();
      clearPending(ctx);
      const users = [...new Set((db.privateUsers || []).map(String).filter(id => /^\d+$/.test(id)))];
      let successCount = 0, failCount = 0;
      const status = await answer(ctx, `📢 جاري إرسال الإذاعة المؤكدة إلى ${users.length} مستخدم…`);
      for (const userId of users) {
        try {
          await bot.api.sendMessage(Number(userId), `📢 إشعار من الإدارة:\n\n${draft}`);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 45));
        } catch { failCount++; }
      }
      return answer(ctx, `✅ انتهت الإذاعة المؤكدة.\n\n📤 تم الإرسال: ${successCount}\n❌ تعذّر الإرسال: ${failCount}`, { reply_markup: new InlineKeyboard().text('📢 إذاعة أخرى', 'broadcastmenu').row().text('👑 لوحة المالك', 'ownerpanel') });
    }

    return answer(ctx, '⚠️ 〔 خيار غير معروف 〕\nجرّب الرجوع إلى القائمة السابقة واختيار أحد الأزرار المتاحة.');
  });
}
