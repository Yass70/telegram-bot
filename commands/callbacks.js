import { InlineKeyboard } from 'grammy';
import { UI_TEXT_CATALOG } from '../uiTextCatalog.js';
import { replaceByRules } from '../globalTextOverrides.js';
import { handleActiveGameCallback } from '../games/callbacks.js';
import { helpKeyboard, warningsKeyboard, groupSettingsKeyboard, repliesKeyboard, customizationKeyboard, customizationDescriptionsKeyboard, customizationRepliesKeyboard, customizationUILabelsKeyboard } from '../keyboards.js';
import { makeNameBatch, touchesMenuKeyboard, touchesLanguageKeyboard, touchesBatchKeyboard, touchesBatchText } from '../touches.js';
import { ADHKAR_LABELS, randomDhikr } from '../adhkar.js';
import { QR_TYPE_LABELS } from '../qrPayload.js';

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
    HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate, checkChatSubscription, ensureGroupSubscriptionPermissions, restoreChatSubscriptionRestriction, notifySubscriptionProblem,
    selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats,
    showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList, subscriptionsMenu,
    showProfileCard, handleViolation, showOwnerPanel, uiText, PROFILE_PHRASES,
    inferMenuBack, rememberMenuBack, menuBackTarget, normalizeAnswer,
    groupScores, leaderboardText, protectionBackTarget, protectionKeyboard,
    ensureReferralData, referralLinkFor, referralStatsFor, referralMenuKeyboard,
    ensureEarnings, earningsBalance, redeemReward, setRedemptionStatus,
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
      const safeTitle = Array.from(String(group.title || '').replace(/[\uD800-\uDFFF]/g, '�')).slice(0, 14).join('');
      kb.text(`${selected.has(String(group.id)) ? '☑️' : '⬜'} ${safeTitle} ${sub.enabled ? '🟢' : '⚪'}`, `chatsubpick:${group.id}`).row();
      const targetList = Array.isArray(sub.requiredChats) && sub.requiredChats.length ? sub.requiredChats : (sub.requiredChatId ? [{ id: String(sub.requiredChatId), title: sub.title }] : []);
      for (const target of targetList.slice(0, 8)) {
        kb.text(`🗑️ ${String(target.title || target.id || 'جهة اشتراك').slice(0, 28)}`, `chatsubtargetdel:${group.id}:${target.id}`).row();
      }
    }
    kb.text('☑️ تحديد الكل', 'chatsubselectall').text('🧹 إلغاء التحديد', 'chatsubclear').row()
      .text('🔗 تعيين جهة للمحدد', 'chatsubsetselected').text('🗑️ حذف جهة المحدد', 'chatsubclear_target_selected').row()
      .text('🟢 تشغيل للمحدد', 'chatsubenable_selected').text('🔴 إيقاف للمحدد', 'chatsubdisable_selected').row()
      .text('↩️ الاشتراكات', 'subscriptionsmenu');
    const configured = groups.filter(group => { const sub = db.chatSubscriptions?.[String(group.id)]; return (Array.isArray(sub?.requiredChats) && sub.requiredChats.length) || sub?.requiredChatId; }).length;
    const details = groups.slice(0, 40).map(group => {
      const sub = db.chatSubscriptions?.[String(group.id)] || {};
      const targets = Array.isArray(sub.requiredChats) && sub.requiredChats.length ? sub.requiredChats : (sub.requiredChatId ? [{ title: sub.title, url: sub.url }] : []);
      return `• ${group.title}: ${sub.enabled ? '🟢 مفعّل' : '⚪ متوقف'} — ${targets.length ? targets.map(t => t.title || t.id).join('، ') : 'لم تُحدّد جهة اشتراك'}`;
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

    const ownerOnlyActions = ['earningsadmin', 'earningsadminstats', 'earningssettings', 'earningsrewardsadmin', 'earningsrewardadd', 'earningsusers', 'earningsusersearch', 'earningsrankadmin', 'earningsrateprompt', 'earningsenabledtoggle', 'earningscancel', 'earningsredemptions', 'ownerpanel', 'botstats', 'botusers', 'botgroups', 'botnew24h', 'activatedgroups', 'botsettings', 'globalprotection', 'requiredmenu', 'requiredadd', 'requiredlist', 'subscriptionsmenu', 'chatsubmenu', 'chatsubsetselected', 'chatsubenable_selected', 'chatsubdisable_selected', 'broadcastmenu', 'broadcastsend', 'broadcastcancel'];
    if (ownerOnlyActions.includes(data) || data.startsWith('botuserspage:') || data.startsWith('botgroupspage:') || data.startsWith('botnew24hpage:') || data.startsWith('botuser:') || data.startsWith('reqdel:') || data.startsWith('reqtoggle:') || data.startsWith('reqedit:') || (data.startsWith('chatsub') && !data.startsWith('chatsubverify:')) || data.startsWith('globaltext') || data.startsWith('activegroup:') || data.startsWith('activegroupinvite:') || data.startsWith('earningsrewardedit:') || data.startsWith('earningsrewardtoggle:') || data.startsWith('earningsrewarddelete:') || data.startsWith('earningsrewarddelivery:') || data.startsWith('earningsmanual:') || data.startsWith('redemption:') || data.startsWith('earningsredemptionsfilter:') || data.startsWith('earningsredemptiondetail:')) {
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
      return answer(ctx, '* ( قسم لمسة نغنوغ ❤️‍🔥 )*\nمتوفر مجموعة من الأدوات اللي تسهّل عليك احتياجاتك وتضيف لمسة نغنوغ 🐈‍⬛ ✦\n\n𓆩 ✧ 𓆪 *زخرفة الأسماء*\n𓆩 🎧 𓆪 *فصل الصوت عن الموسيقى*\n𓆩 ⏰ 𓆪 *ذكّرني + أذكار*\n𓆩 🎬 𓆪 *تحميل الفيديوهات* بسهولة\n𓆩 ▦ 𓆪 *إنشاء باركود* للروابط والنصوص والصور وغيرها\n\n✦ *اختَر الخدمة اللي تحتاجها من الأزرار بالأسفل.⬇️*', { reply_markup: touchesMenuKeyboard(), parse_mode: 'Markdown' });
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
    if (data === 'qrmenu') {
      if (!isPrivate(ctx)) return answer(ctx, '▦ إنشاء الباركود متاح بالخاص فقط.');
      clearPending(ctx);
      const kb = new InlineKeyboard()
        .text('🔗 رابط', 'qrtype:url').text('📝 نص', 'qrtype:text').row()
        .text('📶 Wi-Fi', 'qrtype:wifi').text('📞 هاتف', 'qrtype:phone').row()
        .text('✉️ بريد', 'qrtype:email').text('📍 موقع', 'qrtype:location').row()
        .text('👤 جهة اتصال', 'qrtype:contact').text('🖼️ صورة', 'qrtype:image').row()
        .text('↩️ لمسة نغنوغ', 'touchesmenu').text('🏠 الرئيسية', 'home');
      return answer(ctx, '▦ *إنشاء الباركود — نغنوغ*\n\nاختَر نوع الباركود اللي تريد تنشئه. راح أجهزه إلك كصورة PNG قابلة للمسح بكاميرا الهاتف.\n\n🖼️ خيار الصورة ينشرها في قناة @QRiii5i ثم ينشئ باركود يفتح منشورها.', { reply_markup: kb, parse_mode: 'Markdown' });
    }
    if (data.startsWith('qrtype:')) {
      if (!isPrivate(ctx)) return answer(ctx, 'إنشاء الباركود متاح بالخاص فقط.');
      const type = data.slice(7);
      if (!Object.hasOwn(QR_TYPE_LABELS, type)) return answer(ctx, 'نوع الباركود غير معروف.');
      if (type === 'image') {
        pending(ctx, { action: 'qr-image' });
        return answer(ctx, '🖼️ أرسل الصورة اللي تريد تحويلها إلى باركود.\n\nراح أنشرها في قناة @QRiii5i، وبعدها أرسل لك باركود يفتح منشور الصورة.\nللإلغاء اضغط الزر أدناه.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'qrcancel').row().text('↩️ أنواع الباركود', 'qrmenu') });
      }
      pending(ctx, { action: 'qr-input', type });
      const prompts = {
        url: '🔗 أرسل الرابط كاملاً ويبدأ بـ https:// أو http://.',
        text: '📝 أرسل النص اللي تريد تخزّنه داخل الباركود.',
        wifi: '📶 أرسل البيانات بهذا الترتيب:\nاسم الشبكة | كلمة المرور | WPA\nللشبكة المفتوحة استخدم nopass بدل نوع الحماية.',
        phone: '📞 أرسل رقم الهاتف مع رمز الدولة إن أمكن، مثال: +9647XXXXXXXXX.',
        email: '✉️ أرسل البيانات بهذا الترتيب:\nالبريد الإلكتروني | الموضوع | نص الرسالة',
        location: '📍 أرسل رابط الموقع من خرائط Google ويبدأ بـ https://.',
        contact: '👤 أرسل بيانات جهة الاتصال بهذا الترتيب:\nالاسم | رقم الهاتف | البريد الإلكتروني'
      };
      return answer(ctx, `${QR_TYPE_LABELS[type]}\n\n${prompts[type]}\n\nتگدر تلغي العملية بأي وقت.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'qrcancel').row().text('↩️ أنواع الباركود', 'qrmenu') });
    }
    if (data === 'qrcancel') {
      clearPending(ctx);
      return answer(ctx, '❌ تم إلغاء إنشاء الباركود.', { reply_markup: new InlineKeyboard().text('▦ أنواع الباركود', 'qrmenu').row().text('↩️ لمسة نغنوغ', 'touchesmenu') });
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
    if (data === 'gameshub') {
      const kb = new InlineKeyboard()
        .text('🎮 الألعاب', 'gamesmenu').row()
        .text('💬 تفاعلية', 'interactive_menu').row()
        .text('🎁 خدمات حصرية', 'exclusive_services');
      return answer(ctx, '╭━━━〔 🐈‍⬛ عالم نغنوغ 〕━━━╮\n\nاختَر القسم اللي يناسب مزاجك:\n🎮 ألعاب وتحدّيات.\n💬 أوامر تفاعلية.\n🎁 خدمات حصرية.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    if (data === 'interactive_menu') {
      const kb = new InlineKeyboard().text('👤 بطاقة العضو: ا', 'interactive_profile').row()
        .text('🎯 سؤال شخصي: كت', 'interactive_ket').text('📜 الشعر: ش', 'interactive_poem').row()
        .text('🐈‍⬛ نغنوغ: ن', 'interactive_n').text('🪪 بايو: ب', 'interactive_bio').row()
        .text('↩️ عالم نغنوغ', 'gameshub');
      return answer(ctx, '╭━━━〔 💬 الأوامر التفاعلية 〕━━━╮\n👤 «ا» بطاقة العضو\n🎯 «كت» سؤال شخصي\n📜 «ش» شعر عراقي\n🐈‍⬛ «ن» ردود نغنوغ\n🪪 «ب» بايو عشوائي\n\nاضغط الزر لمعرفة طريقة الاستخدام باختصار.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    if (data === 'interactive_reminder') { const username = ctx.me?.username; const kb = new InlineKeyboard(); if (username) kb.url('⏰ فتح قسم ذكّرني', `https://t.me/${username}?start=reminder`).row(); return answer(ctx, '*⏰ أمر ذكرني*\n\nاكتب «ذكرني» داخل المجموعة حتى يرسل لك نغنوغ شرحاً وزر فتح القسم. لإنشاء تذكير واستلامه بوقته، افتح البوت بالخاص واضغط Start أولاً، ثم حدّد الشيء واليوم والساعة.', { reply_markup: kb.text('↩️ عالم نغنوغ', 'gameshub'), parse_mode: 'Markdown' }); }
    if (data === 'interactive_profile') { try { await ctx.answerCallbackQuery({ text: 'لعرض بطاقة عضو، اكتب «ا» داخل المجموعة أو ردّ به على رسالته.', show_alert: true }); } catch {} return; }
    if (data === 'interactive_ket') { try { await ctx.answerCallbackQuery({ text: 'لسؤال شخصي عشوائي، اكتب «كت» داخل المجموعة.', show_alert: true }); } catch {} return; }
    if (data === 'interactive_poem') { try { await ctx.answerCallbackQuery({ text: 'حتى يرسل نغنوغ شعر عراقي، اكتب «ش» داخل المجموعة.', show_alert: true }); } catch {} return; }
    if (data === 'interactive_n') { try { await ctx.answerCallbackQuery({ text: 'لردود نغنوغ العراقية، اكتب «ن» داخل المجموعة.', show_alert: true }); } catch {} return; }
    if (data === 'interactive_bio') { try { await ctx.answerCallbackQuery({ text: 'لبايو احترافي اكتب: ب', show_alert: true }); } catch {} return; }
    if (data === 'exclusive_services') { const username = ctx.me?.username; const kb = new InlineKeyboard(); if (username) kb.url('⏰ فتح قسم ذكّرني', `https://t.me/${username}?start=reminder`).row(); kb.text('↩️ عالم نغنوغ', 'gameshub'); return answer(ctx, '🎁 خدمات نغنوغ الحصرية\n\n⏰ ذكّرني: أنشئ تذكيراً خاصاً بموعد محدد حسب توقيت بغداد.\n\nافتح القسم من الزر بالأسفل، ولازم تكون بادئ البوت بالخاص حتى تصلك التذكيرات.', { reply_markup: kb }); }
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
      const text = `╭━━━〔 👤 بطاقة نغنوغ الشخصية 〕━━━╮\n\n-︰الاسم : ❨ ${name} ❩\n\n-︰معرّفك : ❨ ${username} ❩\n\n-︰ايديك : ❨ ${userId} ❩\n\n-︰تاريخ انضمامك : ❨ ${joinedAt} ❩\n\n-︰رصيد ستار السابق : ❨ ${referralStats.rewardPoints} ❩\n-︰نقاط الأرباح : ❨ ${earningsBalance(db, userId)} ❩\n-︰دعواتك الناجحة : ❨ ${referralStats.joinedCount} ❩\n\n╰━━━━━━━━━━━━━━━━━━━━╯`;
      return answer(ctx, text, { reply_markup: new InlineKeyboard().text('💰 أرباحي', 'earningsmenu').row().text(getCustomization(ctx).labels?.home || '🔙 القائمة الرئيسية', 'home') });
    }

    if (data === 'starmenu' || data === 'earningsmenu') {
      ensureEarnings(db);
      const uid = String(ctx.from.id);
      const stats = referralStatsFor(uid);
      const balance = earningsBalance(db, uid);
      const wallet = db.earnings.wallets[uid] || {};
      const link = referralLinkFor(uid);
      const kb = new InlineKeyboard().text('🔗 رابط الدعوة', 'earningslink').row()
        .text('🎁 متجر المكافآت', 'earningsstore').text('📜 سجل العمليات', 'earningshistory').row()
        .text('🏆 الأكثر دعوةً', 'earningsrank').row()
        .text('🔙 الرئيسية', 'home');
      return answer(ctx, `╭━━━〔 💰 أرباحي | نغنوغ 〕━━━╮\n\n💰 رصيد الأرباح: ${balance} نقطة\n👥 الدعوات الناجحة: ${stats.joinedCount}\n\n🔗 رابطك الشخصي:\n${link}\n\n✦ تحصل على نقاط عند تسجيل مستخدم جديد لأول مرة عبر رابطك.\n✦ نقاط الألعاب ورصيد ستار السابق منفصلان تماماً.
✦ هذه نقاط داخلية للاستبدال بالمكافآت، وليست أموالاً قابلة للسحب.\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }

    if (data === 'earningslink' || data === 'referrallink' || data === 'referralrefresh') {
      const uid = String(ctx.from.id), link = referralLinkFor(uid);
      ensureEarnings(db); db.earnings.linkUsers[uid] = true; save();
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🐈‍⬛ تعال جرّب بوت نغنوغ ❤️')}`;
      const kb = new InlineKeyboard().add({ text: '📋 نسخ الرابط', copy_text: { text: link } }).row()
        .url('📤 مشاركة الرابط', shareUrl).row().text('🔄 تحديث', 'earningsmenu').text('↩️ أرباحي', 'earningsmenu');
      return answer(ctx, `🔗 رابط دعوتك الخاص\n\n${link}\n\nالدعوة تُحتسب بعد أن يضغط الشخص Start لأول مرة عبر رابطك، ولا تُحتسب الحسابات القديمة أو الدعوات المكررة.`, { reply_markup: kb });
    }

    if (data === 'earningsstore') {
      ensureEarnings(db);
      const rewards = Object.values(db.earnings.rewards).filter(r => r && r.active);
      const kb = new InlineKeyboard();
      for (const reward of rewards.slice(0, 30)) kb.text(`${String(reward.name).slice(0, 30)} — ${reward.price} نقطة`, `earningreward:${reward.id}`).row();
      kb.text('↩️ أرباحي', 'earningsmenu');
      return answer(ctx, rewards.length ? `🎁 متجر مكافآت نغنوغ\n\nرصيدك الحالي: ${earningsBalance(db, ctx.from.id)} نقطة\nاختَر المكافأة حتى تشوف تفاصيلها.` : '🎁 متجر المكافآت\n\nحالياً ماكو مكافآت متاحة. تابع القسم لاحقاً.', { reply_markup: kb });
    }

    if (data.startsWith('earningreward:')) {
      ensureEarnings(db);
      const id = data.slice('earningreward:'.length), reward = db.earnings.rewards[id];
      if (!reward || !reward.active) return answer(ctx, 'هذه المكافأة غير متاحة حالياً.', { reply_markup: new InlineKeyboard().text('🎁 المتجر', 'earningsstore') });
      const balance = earningsBalance(db, ctx.from.id), price = Number(reward.price);
      const kb = new InlineKeyboard();
      if (balance >= price) {
        const requestId = `${ctx.from.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        db.earnings.redemptionRequests[requestId] = { userId: String(ctx.from.id), rewardId: id, status: 'pending', createdAt: Date.now() };
        save(); kb.text('✅ تأكيد الاستبدال', `earningconfirm:${requestId}`).row();
      } else kb.text(`تحتاج ${price - balance} نقطة إضافية`, 'earningsmenu').row();
      kb.text('↩️ المتجر', 'earningsstore');
      return answer(ctx, `🎁 ${reward.name}\n\n${reward.description || 'لا يوجد وصف إضافي.'}\n\nالسعر: ${price} نقطة\nرصيدك: ${balance} نقطة${balance < price ? `\n\nرصيدك غير كافٍ؛ تحتاج ${price - balance} نقطة إضافية.` : '\n\nهل تريد تأكيد الاستبدال؟'}`, { reply_markup: kb });
    }

    if (data.startsWith('earningconfirm:')) {
      ensureEarnings(db);
      const requestId = data.slice('earningconfirm:'.length);
      const req = db.earnings.redemptionRequests[requestId];
      if (!req || req.userId !== String(ctx.from.id) || req.status !== 'pending') return answer(ctx, '⚠️ هذا الطلب استُخدم أو انتهت صلاحيته، افتح المتجر وابدأ طلباً جديداً.');
      const ownerId = String(process.env.BOT_OWNER_ID || '').trim();
      if (!ownerId || !/^\d+$/.test(ownerId)) return answer(ctx, '⚠️ لا يمكن إتمام الاستبدال حالياً لأن إعداد إشعارات المالك غير مكتمل. لم يتم خصم أي نقاط. أبلغ الإدارة.');
      const result = redeemReward(db, ctx.from.id, requestId);
      if (!result.ok) return answer(ctx, result.reason === 'insufficient' ? `رصيدك غير كافٍ. تحتاج ${result.needed} نقطة إضافية.` : result.reason === 'no_delivery' ? 'هذه الجائزة غير جاهزة للتسليم حالياً. لم يتم خصم أي نقاط؛ أبلغ الإدارة.' : result.reason === 'out_of_stock' ? 'نفد مخزون هذه الجائزة. لم يتم خصم أي نقاط.' : 'المكافأة غير متاحة أو أن الطلب استُخدم. لم يتم الخصم.');
      save();
      const r = result.request, reward = result.reward;
      const userName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'غير متوفر';
      const userTag = ctx.from.username ? `@${ctx.from.username}` : 'بدون username';
      const date = new Date(r.redeemedAt).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' });
      const ownerText = `🎁 طلب استبدال جائزة جديد\n\nالمستخدم: ${userName} (${userTag})\nTelegram ID: ${ctx.from.id}\nالجائزة: ${reward.name}\nالنقاط المخصومة: ${r.price}\nالرصيد المتبقي: ${result.balance}\nالتاريخ: ${date}\nرقم العملية: ${r.operationId}\nالحالة: ${r.status === 'awaiting_delivery' ? '🟡 بانتظار التسليم' : '🔵 جارٍ التسليم'}`;
      if (r.deliveryType === 'manual') {
        const ownerKb = new InlineKeyboard().text('🔵 جارٍ التجهيز', `redemption:preparing:${requestId}`).row().text('✅ تأكيد التسليم', `redemption:delivered:${requestId}`).text('❌ تعذّر التسليم', `redemption:failed:${requestId}`);
        try {
          await bot.api.sendMessage(Number(ownerId), ownerText, { reply_markup: ownerKb });
          r.ownerNotifiedAt = Date.now(); save();
        } catch (err) {
          r.ownerNotifyError = String(err?.description || err?.message || err).slice(0,250);
          setRedemptionStatus(db, requestId, 'failed', 'system', 'تعذر إرسال إشعار الطلب إلى المالك'); save();
          try { await ctx.api.sendMessage(ctx.from.id, `تعذر إرسال طلبك إلى الإدارة، لذلك ألغينا الاستبدال وأعدنا ${r.price} نقطة إلى رصيدك.`); } catch {}
          return answer(ctx, 'تعذّر إرسال الطلب إلى الإدارة؛ تمت إعادة نقاطك ولم يُحتسب الاستبدال.');
        }
        await answer(ctx, `✅ تم تسجيل طلبك بنجاح.\nرقم الطلب: ${r.operationId}\nالحالة: 🟡 بانتظار التسليم\nتم إشعار الإدارة، وسيتم إبلاغك عند تحديث حالة الجائزة.`, { reply_markup: new InlineKeyboard().text('💰 أرباحي','earningsmenu') });
        return;
      }
      try {
        let deliveryText = r.deliveryPayload;
        if (r.deliveryType === 'link') deliveryText = `🔗 رابط جائزتك:\n${r.deliveryPayload}`;
        else if (r.deliveryType === 'code') deliveryText = `🎟️ كود جائزتك:\n\`${r.deliveryPayload}\``;
        else if (r.deliveryType === 'feature') {
          db.earnings.entitlements ||= {}; db.earnings.entitlements[String(ctx.from.id)] ||= {};
          db.earnings.entitlements[String(ctx.from.id)][r.featureKey] = { active: true, requestId, grantedAt: Date.now() };
          deliveryText = `✨ تم تفعيل الميزة «${r.featureKey}» لحسابك.`;
        }
        if (r.deliveryType !== 'feature') await ctx.api.sendMessage(ctx.from.id, `🎁 تم تسليم جائزتك بنجاح!\n${deliveryText}\n\nرقم العملية: ${r.operationId}`);
        setRedemptionStatus(db, requestId, 'delivered', 'system'); save();
        if (ownerId && /^\d+$/.test(ownerId)) { try { await bot.api.sendMessage(Number(ownerId), ownerText + '\nالحالة: 🟢 تم التسليم تلقائياً'); } catch {} }
        return answer(ctx, `🎉 تم تسليم جائزتك بنجاح!\nرقم العملية: ${r.operationId}\nرصيدك المتبقي: ${result.balance} نقطة.`, { reply_markup: new InlineKeyboard().text('💰 أرباحي','earningsmenu') });
      } catch (error) {
        const refunded = setRedemptionStatus(db, requestId, 'failed', 'system', String(error?.description || error?.message || 'فشل إرسال الجائزة'));
        save();
        if (ownerId && /^\d+$/.test(ownerId)) { try { await bot.api.sendMessage(Number(ownerId), ownerText + `\n🔴 تعذّر التسليم وتمت إعادة ${r.price} نقطة للمستخدم.`); } catch {} }
        return answer(ctx, `تعذّر تسليم الجائزة، لذلك أعدنا ${r.price} نقطة إلى رصيدك.\nرقم العملية: ${r.operationId}`, { reply_markup: new InlineKeyboard().text('💰 أرباحي','earningsmenu') });
      }
    }

    if (data.startsWith('redemption:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا الإجراء خاص بالمالك.');
      const [, status, requestId] = data.split(':');
      const req = db.earnings?.redemptionRequests?.[requestId];
      if (!req) return answer(ctx, 'الطلب غير موجود.');
      if (status === 'preparing') {
        const result = setRedemptionStatus(db, requestId, 'preparing', ctx.from.id);
        if (!result.ok) return answer(ctx, 'هذا الطلب مغلق أو غير متاح.');
        save();
        try { await bot.api.sendMessage(Number(req.userId), `🔵 جارٍ تجهيز جائزتك «${req.rewardName}».\nرقم العملية: ${req.operationId}`); } catch {}
        return answer(ctx, 'تم تحديث الحالة إلى جارٍ التجهيز.', { reply_markup: new InlineKeyboard().text('✅ تأكيد التسليم', `redemption:delivered:${requestId}`).row().text('❌ تعذّر التسليم', `redemption:failed:${requestId}`) });
      }
      const result = setRedemptionStatus(db, requestId, status, ctx.from.id, status === 'failed' ? 'تعذّر التسليم من الإدارة' : 'تم التسليم من الإدارة');
      if (!result.ok) return answer(ctx, 'هذا الطلب مغلق مسبقاً ولا يمكن تغيير حالته.');
      save();
      try {
        const msg = status === 'delivered' ? `🟢 تم تسليم جائزتك «${req.rewardName}» بنجاح.\nرقم العملية: ${req.operationId}` : `🔴 تعذّر تسليم جائزتك «${req.rewardName}». أعدنا ${req.price} نقطة إلى رصيدك.\nرصيدك الحالي: ${result.balance} نقطة\nرقم العملية: ${req.operationId}`;
        await bot.api.sendMessage(Number(req.userId), msg);
      } catch {}
      return answer(ctx, status === 'delivered' ? 'تم تأكيد التسليم وإشعار المستخدم.' : 'تم إغلاق الطلب وإعادة النقاط وإشعار المستخدم.');
    }

    if (data === 'earningsredemptions') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.');
      const all = Object.entries(db.earnings?.redemptionRequests || {}).sort((a,b)=>(Number(b[1]?.redeemedAt||b[1]?.createdAt)||0)-(Number(a[1]?.redeemedAt||a[1]?.createdAt)||0));
      const groups = [['🟡 بانتظار التسليم', ['awaiting_delivery']], ['🔵 جارٍ التجهيز', ['preparing','delivering']], ['🟢 مكتملة', ['delivered']], ['🔴 متعثرة', ['failed']]];
      const kb = new InlineKeyboard();
      for (const [label, statuses] of groups) { const count = all.filter(([,r])=>statuses.includes(r.status)).length; kb.text(`${label} (${count})`, `earningsredemptionsfilter:${statuses[0]}`).row(); }
      kb.text('📋 كل الطلبات', 'earningsredemptionsfilter:all').row().text('↩️ إدارة الأرباح','earningsadmin');
      return answer(ctx, `📦 طلبات الاستبدال\nإجمالي الطلبات: ${all.length}\n\nاختَر حالة الطلبات لعرضها.`, { reply_markup: kb });
    }
    if (data.startsWith('earningsredemptionsfilter:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'غير مسموح.');
      const filter = data.slice('earningsredemptionsfilter:'.length);
      const all = Object.entries(db.earnings?.redemptionRequests || {}).filter(([,r])=>filter==='all'||r.status===filter||(filter==='preparing'&&r.status==='delivering')).sort((a,b)=>(Number(b[1].redeemedAt||b[1].createdAt)||0)-(Number(a[1].redeemedAt||a[1].createdAt)||0)).slice(0,25);
      const kb = new InlineKeyboard();
      for (const [id,r] of all) kb.text(`${r.status==='delivered'?'🟢':r.status==='failed'?'🔴':r.status==='preparing'?'🔵':'🟡'} ${String(r.rewardName||db.earnings.rewards?.[r.rewardId]?.name||'جائزة').slice(0,20)} — ${r.operationId||id}`, `earningsredemptiondetail:${id}`).row();
      kb.text('↩️ طلبات الاستبدال','earningsredemptions').row().text('💰 إدارة الأرباح','earningsadmin');
      return answer(ctx, all.length ? `📦 الطلبات (${all.length})` : 'لا توجد طلبات بهذه الحالة.', { reply_markup: kb });
    }
    if (data.startsWith('earningsredemptiondetail:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'غير مسموح.');
      const id=data.slice('earningsredemptiondetail:'.length), r=db.earnings?.redemptionRequests?.[id];
      if (!r) return answer(ctx,'الطلب غير موجود.');
      const meta=db.userMeta?.[r.userId]||{};
      const kb=new InlineKeyboard();
      if (!['delivered','failed'].includes(r.status)) kb.text('🔵 جارٍ التجهيز',`redemption:preparing:${id}`).row().text('✅ تم التسليم',`redemption:delivered:${id}`).text('❌ تعذّر التسليم',`redemption:failed:${id}`).row();
      kb.text('↩️ قائمة الطلبات','earningsredemptions');
      return answer(ctx, `📦 تفاصيل طلب الاستبدال\n\nرقم العملية: ${r.operationId||id}\nالمستخدم: ${meta.firstName||'مستخدم'} (@${meta.username||'بدون'})\nTelegram ID: ${r.userId}\nالجائزة: ${r.rewardName||db.earnings.rewards?.[r.rewardId]?.name||'محذوفة'}\nالنقاط: ${r.price||'?'}\nالحالة: ${r.status}\nالتاريخ: ${new Date(r.redeemedAt||r.createdAt).toLocaleString('ar-IQ',{timeZone:'Asia/Baghdad'})}\n${r.statusReason||''}`, { reply_markup: kb });
    }

    if (data === 'earningshistory') {
      ensureEarnings(db);
      const rows = db.earnings.ledger.filter(x => String(x.userId) === String(ctx.from.id)).slice(-15).reverse();
      const lines = rows.map(x => `${new Date(x.createdAt).toLocaleString('ar-IQ')} — ${x.amount > 0 ? '+' : ''}${x.amount} نقطة — ${x.type === 'referral' ? 'دعوة ناجحة' : x.type === 'manual_add' ? 'إضافة يدوية' : x.type === 'manual_deduct' ? 'خصم يدوي' : 'استبدال مكافأة'}${x.details?.rewardName ? ` (${x.details.rewardName})` : ''}${x.details?.reason ? ` — ${x.details.reason}` : ''}`);
      return answer(ctx, `📜 سجل عمليات الأرباح\n\n${lines.length ? lines.join('\n') : 'ما عندك عمليات مسجلة لحد الآن.'}`, { reply_markup: new InlineKeyboard().text('↩️ أرباحي', 'earningsmenu') });
    }

    if (data === 'earningsrank') {
      ensureEarnings(db);
      const rows = Object.entries(db.referrals || {}).map(([id, legacy]) => [id, Math.max(Number(legacy?.joinedCount)||0, Number(db.earnings.wallets[id]?.successfulReferrals)||0)]).filter(([,count])=>count>0).sort((a,b)=>b[1]-a[1]).slice(0,10);
      const lines = rows.map(([id,count],i) => `${['🥇','🥈','🥉'][i] || `${i+1}.`} ${db.userMeta?.[id]?.firstName || `مستخدم ${id}`} — ${count} دعوة`);
      return answer(ctx, `🏆 أكثر المستخدمين دعوةً\n\n${lines.length ? lines.join('\n') : 'لا توجد إحالات جديدة مسجلة بعد.'}`, { reply_markup: new InlineKeyboard().text('↩️ أرباحي', 'earningsmenu') });
    }

    if (data === 'earningscancel') { clearPending(ctx); return answer(ctx, 'تم إلغاء العملية.', { reply_markup: new InlineKeyboard().text('💰 إدارة الأرباح','earningsadmin') }); }

    if (data === 'earningsadmin') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت من الخاص فقط.');
      ensureEarnings(db);
      const e = db.earnings;
      const totalRef = Object.values(db.referrals || {}).reduce((n,r)=>n+(Number(r?.joinedCount)||0),0);
      const totalAwarded = e.ledger.filter(x => x.type === 'referral').reduce((n,x)=>n+Number(x.amount||0),0);
      const kb = new InlineKeyboard().text('⚙️ إعدادات الأرباح', 'earningssettings').row()
        .text('🎁 إدارة المكافآت', 'earningsrewardsadmin').row()
        .text('📊 الإحصائيات', 'earningsadminstats').row()
        .text('👤 إدارة أرصدة المستخدمين', 'earningsusers').row()
        .text('📦 طلبات الاستبدال', 'earningsredemptions').row()
        .text('🔙 لوحة المالك', 'ownerpanel');
      return answer(ctx, `💰 إدارة الأرباح والمكافآت\n\nالحالة: ${e.settings.enabled ? '🟢 تعمل' : '🔴 متوقفة'}\nالنقاط لكل دعوة: ${e.settings.pointsPerReferral}\nالإحالات الجديدة المسجلة: ${totalRef}\nنقاط الإحالات الممنوحة: ${totalAwarded}`, { reply_markup: kb });
    }

    if (data === 'earningssettings') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.');
      ensureEarnings(db);
      return answer(ctx, `⚙️ إعدادات الأرباح\n\nالنظام: ${db.earnings.settings.enabled ? '🟢 مفعّل' : '🔴 متوقف'}\nقيمة الدعوة الناجحة: ${db.earnings.settings.pointsPerReferral} نقطة`, { reply_markup: new InlineKeyboard().text(db.earnings.settings.enabled ? '🔴 إيقاف النظام' : '🟢 تشغيل النظام', 'earningsenabledtoggle').row().text('✏️ تحديد نقاط كل دعوة', 'earningsrateprompt').row().text('❌ إلغاء العملية', 'earningscancel').row().text('↩️ إدارة الأرباح', 'earningsadmin') });
    }
    if (data === 'earningsenabledtoggle') { if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'غير مسموح.'); db.earnings.settings.enabled = !db.earnings.settings.enabled; save(); return answer(ctx, `تم ${db.earnings.settings.enabled ? 'تشغيل' : 'إيقاف'} نظام الأرباح.`, { reply_markup: new InlineKeyboard().text('↩️ الإعدادات', 'earningssettings') }); }
    if (data === 'earningsrateprompt') { if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'غير مسموح.'); pending(ctx, { action: 'earnings-rate' }); return answer(ctx, 'أرسل عدد النقاط الصحيحة لكل دعوة ناجحة (رقم أكبر من صفر). اكتب /cancel للإلغاء.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'earningscancel') }); }
    if (data === 'earningsadminstats') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'غير مسموح.'); ensureEarnings(db);
      const e=db.earnings, users=Object.values(e.wallets), refs=Object.values(db.referrals||{}).reduce((n,r)=>n+(Number(r?.joinedCount)||0),0), red=e.ledger.filter(x=>x.type==='redemption').length;
      const top=Object.entries(db.referrals||{}).sort((a,b)=>(Number(b[1]?.joinedCount)||0)-(Number(a[1]?.joinedCount)||0)).slice(0,5).map(([id,w],i)=>`${i+1}. ${db.userMeta?.[id]?.firstName || id}: ${Number(w.joinedCount)||0}`).join('\n');
      return answer(ctx, `📊 إحصائيات الأرباح\n\nمستخدمون فتحوا رابطهم الخاص: ${Object.keys(e.linkUsers || {}).length}\nإجمالي الإحالات المسجلة: ${refs}\nنقاط الإحالات الموزعة: ${e.ledger.filter(x=>x.type==='referral').reduce((n,x)=>n+Number(x.amount||0),0)}\nعمليات الاستبدال: ${red}\n\n🏆 الأكثر دعوةً\n${top || 'لا توجد بيانات بعد.'}`, { reply_markup: new InlineKeyboard().text('↩️ إدارة الأرباح', 'earningsadmin') });
    }
    if (data === 'earningsrewardsadmin') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'غير مسموح.'); ensureEarnings(db);
      const kb=new InlineKeyboard().text('➕ إضافة مكافأة', 'earningsrewardadd').row();
      for (const r of Object.values(db.earnings.rewards)) kb.text(`${r.active?'🟢':'⚪'} ${String(r.name).slice(0,24)} (${r.price})`, `earningsrewardedit:${r.id}`).row();
      kb.text('↩️ إدارة الأرباح','earningsadmin');
      return answer(ctx, '🎁 إدارة المكافآت\nاختَر مكافأة لتعديلها أو إيقافها أو حذفها.', { reply_markup: kb });
    }
    if (data === 'earningsrewardadd') { if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'غير مسموح.'); pending(ctx,{action:'earnings-reward-name'}); return answer(ctx,'أرسل اسم المكافأة الجديدة. /cancel للإلغاء.'); }
    if (data.startsWith('earningsrewardedit:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx,'غير مسموح.'); const id=data.slice('earningsrewardedit:'.length), r=db.earnings?.rewards?.[id]; if(!r) return answer(ctx,'المكافأة غير موجودة.');
      return answer(ctx, `🎁 ${r.name}\nالوصف: ${r.description}\nالسعر: ${r.price}\nالحالة: ${r.active?'متاحة':'متوقفة'}`, {reply_markup:new InlineKeyboard().text(r.active?'🔴 إيقاف':'🟢 تفعيل',`earningsrewardtoggle:${id}`).text('🗑️ حذف',`earningsrewarddelete:${id}`).row().text('✏️ تعديل الاسم والوصف والسعر','earningsrewardeditprompt:'+id).row().text('🚚 إعداد التسليم','earningsrewarddelivery:'+id).row().text('↩️ المكافآت','earningsrewardsadmin')});
    }
    if (data.startsWith('earningsrewarddelivery:')) { if(!isOwner(ctx)||!isPrivate(ctx))return answer(ctx,'غير مسموح.'); const id=data.slice('earningsrewarddelivery:'.length), r=db.earnings?.rewards?.[id]; if(!r)return answer(ctx,'المكافأة غير موجودة.'); pending(ctx,{action:'earnings-reward-delivery',rewardId:id}); return answer(ctx,`🚚 إعداد تسليم «${r.name}»\n\nأرسل أحد الخيارات التالية برسالة واحدة:\nmanual = تسليم يدوي من المالك\ntext:النص = إرسال محتوى للمستخدم\nlink:الرابط = إرسال رابط\ncode:الكود = إرسال كود\nfeature:اسم_الميزة = تسجيل استحقاق ميزة داخلية\n\nمثال: code:ABCD-1234`); }
    if (data.startsWith('earningsrewardeditprompt:')) { if(!isOwner(ctx)||!isPrivate(ctx))return answer(ctx,'غير مسموح.'); const id=data.slice('earningsrewardeditprompt:'.length); if(!db.earnings?.rewards?.[id])return answer(ctx,'المكافأة غير موجودة.'); pending(ctx,{action:'earnings-reward-edit-name',rewardId:id}); return answer(ctx,'أرسل الاسم الجديد للمكافأة.'); }
    if (data.startsWith('earningsrewardtoggle:')) { if(!isOwner(ctx)||!isPrivate(ctx))return answer(ctx,'غير مسموح.'); const r=db.earnings?.rewards?.[data.slice('earningsrewardtoggle:'.length)]; if(!r)return answer(ctx,'غير موجودة.'); r.active=!r.active; save(); return answer(ctx,`تم ${r.active?'تفعيل':'إيقاف'} المكافأة.`,{reply_markup:new InlineKeyboard().text('↩️ المكافآت','earningsrewardsadmin')}); }
    if (data.startsWith('earningsrewarddelete:')) { if(!isOwner(ctx)||!isPrivate(ctx))return answer(ctx,'غير مسموح.'); const id=data.slice('earningsrewarddelete:'.length); if(db.earnings?.rewards?.[id]) delete db.earnings.rewards[id]; save(); return answer(ctx,'تم حذف المكافأة من المتجر. السجلات السابقة محفوظة.',{reply_markup:new InlineKeyboard().text('↩️ المكافآت','earningsrewardsadmin')}); }
    if (data === 'earningsusers' || data === 'earningsusersearch') { if(!isOwner(ctx)||!isPrivate(ctx))return answer(ctx,'غير مسموح.'); pending(ctx,{action:'earnings-user-search'}); return answer(ctx,'أرسل آيدي المستخدم أو @username للبحث عن رصيده.'); }
    if (data.startsWith('earningsmanual:') || data.startsWith('redemption:') || data.startsWith('earningsredemptionsfilter:') || data.startsWith('earningsredemptiondetail:')) { if(!isOwner(ctx)||!isPrivate(ctx))return answer(ctx,'غير مسموح.'); const [_,kind,id]=data.split(':'); pending(ctx,{action:'earnings-manual-amount',targetId:id,kind}); return answer(ctx,`أرسل عدد النقاط المراد ${kind==='add'?'إضافتها':'خصمها'} للمستخدم ${id}.`); }

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
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, '🐾 إحصائيات نغنوغ متاحة للمالك من الخاص فقط.');
      const now = Date.now();
      const privateUsers = [...new Set((Array.isArray(db.privateUsers) ? db.privateUsers : []).map(String).filter(id => /^\d+$/.test(id)))];
      const new24h = privateUsers.filter(id => {
        const firstStart = Number(db.userMeta?.[id]?.privateStartAt || 0);
        return firstStart > 0 && now - firstStart >= 0 && now - firstStart < 24 * 60 * 60 * 1000;
      }).length;
      const groups = Object.values(db.groups || {}).filter(g => g && g.id);
      const kb = new InlineKeyboard()
        .text('📊 الإحصائيات العامة', 'botstats').row()
        .text('👤 قائمة مستخدمي الخاص', 'botusers').row()
        .text('👥 المجموعات المسجّلة', 'botgroups').row()
        .text('🆕 المنضمون آخر 24 ساعة', 'botnew24h').row()
        .text('🔄 تحديث الإحصائيات', 'botstats').row()
        .text('🔙 رجوع', 'ownerpanel');
      return answer(ctx, `╭━━━〔 📊 إحصائيات نغنوغ 〕━━━╮

👤 إجمالي مستخدمي الخاص: ${privateUsers.length}
👥 المجموعات المسجّلة: ${groups.length}
🆕 المنضمون خلال آخر 24 ساعة: ${new24h}

✦ تُحتسب الحسابات من تسجيل /start، وتُحسب المجموعات من قاعدة البيانات المحفوظة.
╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }
    if (data === 'botusers' || data.startsWith('botuserspage:') || data === 'botnew24h' || data.startsWith('botnew24hpage:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, '🐾 قائمة المستخدمين خاصة بمالك نغنوغ ومن الخاص فقط.');
      const now = Date.now();
      const all = [...new Set((Array.isArray(db.privateUsers) ? db.privateUsers : []).map(String).filter(id => /^\d+$/.test(id)))];
      const recentOnly = data === 'botnew24h' || data.startsWith('botnew24hpage:');
      const filtered = recentOnly ? all.filter(id => { const t = Number(db.userMeta?.[id]?.privateStartAt || 0); return t > 0 && now - t >= 0 && now - t < 86400000; }) : all;
      const pageSize = 8;
      const page = Math.max(0, Number(data.split(':')[1]) || 0);
      const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
      const safePage = Math.min(page, pageCount - 1);
      const shown = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);
      const kb = new InlineKeyboard();
      for (const id of shown) {
        const meta = db.userMeta?.[id] || {};
        const name = [meta.firstName, meta.lastName].filter(Boolean).join(' ') || 'مستخدم بدون اسم محفوظ';
        kb.text(`👤 ${Array.from(name).slice(0, 18).join('')} · ${id}`, `botuser:${id}`).row();
      }
      const pageCallback = recentOnly ? 'botnew24hpage:' : 'botuserspage:';
      if (safePage > 0) kb.text('⬅️ السابقة', `${pageCallback}${safePage - 1}`);
      if (safePage + 1 < pageCount) kb.text('➡️ التالية', `${pageCallback}${safePage + 1}`);
      if (safePage > 0 || safePage + 1 < pageCount) kb.row();
      kb.text('🔄 تحديث القائمة', `${pageCallback}${safePage}`).row()
        .text('↩️ الإحصائيات', 'botstats');
      const body = shown.length ? shown.map((id, i) => {
        const meta = db.userMeta?.[id] || {};
        const name = [meta.firstName, meta.lastName].filter(Boolean).join(' ') || 'اسم غير متوفر';
        const username = meta.username ? `@${String(meta.username).replace(/^@/, '')}` : 'غير متوفر';
        return `${safePage * pageSize + i + 1}. ${name}\n   ID: ${id}\n   المعرف: ${username}`;
      }).join('\n\n') : (recentOnly ? 'ماكو مستخدمون جدد مسجّلون خلال آخر 24 ساعة.' : 'ماكو مستخدمين بدأوا البوت بالخاص لحد الآن.');
      const title = recentOnly ? '🆕 المنضمون خلال آخر 24 ساعة' : '👤 قائمة مستخدمي الخاص';
      return answer(ctx, `${title}\n\n${body}\n\n✦ العدد: ${filtered.length}\nالصفحة ${safePage + 1} من ${pageCount}`, { reply_markup: kb });
    }
    if (data === 'botgroups' || data.startsWith('botgroupspage:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, '🐾 قائمة المجموعات خاصة بمالك نغنوغ ومن الخاص فقط.');
      const all = Object.values(db.groups || {}).filter(g => g && g.id);
      const pageSize = 8;
      const page = Math.max(0, Number(data.split(':')[1]) || 0);
      const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
      const safePage = Math.min(page, pageCount - 1);
      const shown = all.slice(safePage * pageSize, (safePage + 1) * pageSize);
      const kb = new InlineKeyboard();
      for (const group of shown) kb.text(`👥 ${Array.from(String(group.title || group.id)).slice(0, 28).join('')}`, `activegroup:${group.id}`).row();
      if (safePage > 0) kb.text('⬅️ السابقة', `botgroupspage:${safePage - 1}`);
      if (safePage + 1 < pageCount) kb.text('➡️ التالية', `botgroupspage:${safePage + 1}`);
      if (safePage > 0 || safePage + 1 < pageCount) kb.row();
      kb.text('🔄 تحديث القائمة', `botgroupspage:${safePage}`).row().text('↩️ الإحصائيات', 'botstats');
      const details = shown.map((g, i) => `${safePage * pageSize + i + 1}. ${g.title || 'مجموعة بدون اسم'}\n   ID: ${g.id}\n   الحالة: ${g.activated ? '🟢 مفعّلة' : '⚪ غير مفعّلة'}`).join('\n\n') || 'ماكو مجموعات مسجّلة.';
      return answer(ctx, `👥 المجموعات المسجّلة\n\n${details}\n\n✦ العدد الكلي: ${all.length}\nالصفحة ${safePage + 1} من ${pageCount}`, { reply_markup: kb });
    }
    if (data.startsWith('botuser:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, '🐾 تفاصيل المستخدمين خاصة بالمالك.');
      const id = data.slice('botuser:'.length);
      if (!/^\d+$/.test(id) || !(db.users || []).map(String).includes(id)) return answer(ctx, 'هذا الحساب غير موجود ضمن قائمة مستخدمي نغنوغ.', { reply_markup: new InlineKeyboard().text('↩️ قائمة المستخدمين', 'botusers') });
      const meta = db.userMeta?.[id] || {};
      const name = [meta.firstName, meta.lastName].filter(Boolean).join(' ') || 'اسم غير متوفر';
      const username = String(meta.username || '').replace(/^@/, '');
      const hasPrivateChat = (db.privateUsers || []).map(String).includes(id);
      const kb = new InlineKeyboard().add({ text: '📋 نسخ ID', copy_text: { text: id } }).row();
      if (username) kb.url('🔗 فتح حساب تيليغرام', `https://t.me/${encodeURIComponent(username)}`).row();
      kb.text('↩️ قائمة المستخدمين', 'botusers');
      return answer(ctx, `🐈‍⬛ بطاقة مستخدم\n\nالاسم: ${name}\nالمعرّف الرقمي (ID): ${id}\nاسم المستخدم: ${username ? '@' + username : 'غير متوفر'}\nمحادثة الخاص: ${hasPrivateChat ? '🟢 مسجّلة' : '⚪ غير مسجّلة'}\n\n✦ ${hasPrivateChat ? 'يمكن محاولة مراسلته من البوت ما لم يكن قد حظره.' : 'لا يستطيع البوت بدء محادثة خاصة معه؛ عليه فتح البوت والضغط على Start أولاً.'}`, { reply_markup: kb });
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
    if (data.startsWith('activegroupinvite:') || data.startsWith('earningsrewardedit:') || data.startsWith('earningsrewardtoggle:') || data.startsWith('earningsrewarddelete:') || data.startsWith('earningsrewarddelivery:') || data.startsWith('earningsmanual:') || data.startsWith('redemption:') || data.startsWith('earningsredemptionsfilter:') || data.startsWith('earningsredemptiondetail:')) {
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
    if (data.startsWith('chatsubtargetdel:')) {
      const [, groupId, targetId] = data.split(':');
      const setting = db.chatSubscriptions?.[String(groupId)];
      if (!setting) return answer(ctx, 'إعداد اشتراك هذه المجموعة غير موجود.');
      const targets = Array.isArray(setting.requiredChats) ? setting.requiredChats : (setting.requiredChatId ? [{ id: String(setting.requiredChatId), title: setting.title, username: setting.username, url: setting.url }] : []);
      setting.requiredChats = targets.filter(item => String(item.id) !== String(targetId));
      if (setting.requiredChats.length) {
        const first = setting.requiredChats[0];
        setting.requiredChatId = first.id; setting.title = first.title; setting.username = first.username || ''; setting.url = first.url || '';
      } else {
        delete setting.requiredChats; delete setting.requiredChatId; delete setting.title; delete setting.username; delete setting.url; setting.enabled = false;
      }
      save();
      return showChatSubscriptionMenu(ctx);
    }
    if (data === 'chatsubclear_target_selected') {
      const ids = (db.chatSubscriptionSelection?.[String(ctx.from.id)] || []).map(String);
      if (!ids.length) return answer(ctx, 'حدد مجموعة واحدة على الأقل أولاً.', { reply_markup: new InlineKeyboard().text('↩️ المجموعات', 'chatsubmenu') });
      for (const id of ids) {
        const setting = db.chatSubscriptions?.[id];
        if (setting) { delete setting.requiredChatId; delete setting.requiredChats; delete setting.title; delete setting.username; delete setting.url; setting.enabled = false; }
        for (const key of Object.keys(db.chatSubRestricted || {})) if (key.startsWith(`${id}:`)) {
          const userId = key.slice(String(id).length + 1);
          try { await restoreChatSubscriptionRestriction(id, userId); } catch {}
        }
      }
      save();
      return showChatSubscriptionMenu(ctx);
    }
    if (data === 'chatsubenable_selected' || data === 'chatsubdisable_selected') {
      const ids = (db.chatSubscriptionSelection?.[String(ctx.from.id)] || []).map(String);
      if (!ids.length) return answer(ctx, 'حدد مجموعة واحدة على الأقل أولاً.', { reply_markup: new InlineKeyboard().text('↩️ المجموعات', 'chatsubmenu') });
      if (data === 'chatsubenable_selected') {
        const missing = ids.filter(id => {
          const sub = db.chatSubscriptions?.[id];
          return !(Array.isArray(sub?.requiredChats) && sub.requiredChats.length) && !sub?.requiredChatId;
        });
        if (missing.length) return answer(ctx, `❌ عيّن جهة اشتراك أولاً لهذه المجموعات: ${missing.map(id => db.groups?.[id]?.title || id).join('، ')}.`, { reply_markup: new InlineKeyboard().text('🔗 تعيين جهة للمحدد', 'chatsubsetselected').row().text('↩️ رجوع', 'chatsubmenu') });
        for (const id of ids) {
          try { await ensureGroupSubscriptionPermissions(ctx, id); }
          catch (error) { return answer(ctx, `❌ لم يتم تشغيل اشتراك الدردشة.
المجموعة: ${db.groups?.[id]?.title || id}
السبب: ${error.message}`, { reply_markup: new InlineKeyboard().text('↩️ إدارة المجموعات', 'chatsubmenu') }); }
        }
      }
      for (const id of ids) {
        db.chatSubscriptions ||= {}; db.chatSubscriptions[id] ||= {};
        db.chatSubscriptions[id].enabled = data === 'chatsubenable_selected';
        if (data === 'chatsubdisable_selected') {
          for (const key of Object.keys(db.chatSubRestricted || {})) if (key.startsWith(`${id}:`)) {
            const userId = key.slice(String(id).length + 1);
            try { await restoreChatSubscriptionRestriction(id, userId); } catch {}
          }
        }
      }
      save();
      return answer(ctx, `${data === 'chatsubenable_selected' ? '🟢 تم تشغيل' : '🔴 تم إيقاف'} اشتراك الدردشة للمجموعات المحددة (${ids.length}).`, { reply_markup: new InlineKeyboard().text('↩️ إدارة المجموعات', 'chatsubmenu') });
    }
    if (data.startsWith('chatsubset:')) { const id=data.slice('chatsubset:'.length); pending(ctx,{action:'chat-sub-set',groupIds:[String(id)]}); return answer(ctx,'أرسل جهة الاشتراك بصيغة @channel أو -1001234567890 | https://t.me/+invite للمجموعة الخاصة.',{reply_markup:new InlineKeyboard().text('❌ إلغاء','chatsubmenu')}); }
    if (data.startsWith('chatsubtoggle:')) {
      const id = String(data.slice('chatsubtoggle:'.length));
      db.chatSubscriptions ||= {}; db.chatSubscriptions[id] ||= {};
      const nextEnabled = !db.chatSubscriptions[id].enabled;
      const setting = db.chatSubscriptions[id];
      if (nextEnabled && !(Array.isArray(setting.requiredChats) && setting.requiredChats.length) && !setting.requiredChatId) return answer(ctx, '❌ أضف جهة اشتراك أولاً.', { reply_markup: new InlineKeyboard().text('🔗 تعيين جهة', 'chatsubset:' + id).row().text('↩️ إدارة الاشتراك', 'chatsubmenu') });
      if (nextEnabled) {
        try { await ensureGroupSubscriptionPermissions(ctx, id); }
        catch (error) { return answer(ctx, `❌ تعذّر تشغيل اشتراك الدردشة.\nالسبب: ${error.message}`, { reply_markup: new InlineKeyboard().text('↩️ إدارة الاشتراك', 'chatsubmenu') }); }
      } else {
        for (const key of Object.keys(db.chatSubRestricted || {})) if (key.startsWith(`${id}:`)) {
          const restrictedUserId = key.slice(String(id).length + 1);
          try { await restoreChatSubscriptionRestriction(id, restrictedUserId); } catch {}
        }
      }
      setting.enabled = nextEnabled; save();
      return answer(ctx, `${setting.enabled ? '🟢 تم تشغيل' : '🔴 تم إيقاف'} اشتراك الدردشة لهذه المجموعة.`, { reply_markup: new InlineKeyboard().text('↩️ إدارة الاشتراك', 'chatsubmenu') });
    }
    if (data === 'requiredlist') return showRequiredList(ctx);
    if (data === 'requiredadd') {
      pending(ctx, { action: 'add-required-chat' });
      return answer(ctx, '➕ أرسل معرف القناة/المجموعة مثل @channel أو -1001234567890. وللجهة الخاصة أرسل الآيدي ثم | ثم رابط الدعوة: -1001234567890 | https://t.me/+xxxx. يجب أن يكون نغنوغ مشرفاً في الجهة.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'requiredmenu') });
    }
    if (data.startsWith('reqtoggle:')) {
      const index = Number(data.split(':')[1]);
      const target = db.requiredChats?.[index];
      if (!target) return answer(ctx, 'الجهة غير موجودة.');
      target.enabled = target.enabled === false;
      save();
      return showRequiredList(ctx);
    }
    if (data.startsWith('reqedit:')) {
      const index = Number(data.split(':')[1]);
      if (!db.requiredChats?.[index]) return answer(ctx, 'الجهة غير موجودة.');
      pending(ctx, { action: 'edit-required-chat', index });
      return answer(ctx, 'أرسل بيانات الجهة الجديدة: @username أو رابط عام، أو آيدي الجهة الخاصة ثم | ثم رابط الدعوة. سيتم فحصها قبل حفظ التعديل.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'requiredlist') });
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
      const chatId = String(data.slice('chatsubverify:'.length));
      const result = await checkChatSubscription(chatId, ctx.from.id);
      if (!result.required) return answer(ctx, 'هذا الاشتراك غير مفعّل حالياً.');
      if (result.technicalError) return answer(ctx, '⚠️ تعذّر التحقق بسبب مشكلة تقنية أو نقص صلاحيات نغنوغ. تم تنبيه المالك، حاول بعد قليل.');
      if (result.ok) {
        try { await restoreChatSubscriptionRestriction(chatId, ctx.from.id); }
        catch { return answer(ctx, '✅ اشتراكك مكتمل، لكن تعذّر رفع التقييد تلقائياً. نبهنا المالك؛ اطلب من مشرف المجموعة رفع التقييد.'); }
        try { await ctx.editMessageText('✅ تم التحقق من اشتراكك في جميع الجهات المطلوبة. رُفع تقييد نغنوغ عنك، وتگدر هسه تراسل وتستخدم الأزرار.'); } catch { return answer(ctx, '✅ تم التحقق من اشتراكك ورفع التقييد. تگدر هسه تراسل وتستخدم الأزرار.'); }
        return;
      }
      const kb = new InlineKeyboard();
      for (const target of (result.missing || [])) if (target.url) kb.url(`📣 اشترك في ${String(target.title || 'الجهة').slice(0, 28)}`, target.url).row();
      kb.text('✅ تحقّق من الاشتراك', `chatsubverify:${chatId}`);
      const names = (result.missing || []).map(item => item.title || item.id).join('، ');
      return answer(ctx, `❌ بعدك مو مشترك بالجهات التالية: ${names || 'الجهة المطلوبة'}. اشترك بها ثم أعد التحقق.`, { reply_markup: kb });
    }
    if (data === 'checksubscription') {
      const allowed = await subscriptionGate(ctx);
      if (!allowed) return;
      const customization = getCustomization(ctx);
      return answer(ctx, `✅ تم التحقق من اشتراكك بنجاح. هسه صار بإمكانك استخدام نغنوغ بكل وظائفه.\n\n${customization.startText || 'أهلاً بيك بنغنوغ 🐈‍⬛🐾'}`, { reply_markup: getHomeKeyboard(ctx) });
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
        .text('↩️ عالم نغنوغ', 'gameshub');

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
