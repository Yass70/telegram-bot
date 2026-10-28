import { InlineKeyboard } from 'grammy';
import { UI_TEXT_CATALOG } from '../uiTextCatalog.js';
import { replaceByRules } from '../globalTextOverrides.js';
import { handleActiveGameCallback } from '../games/callbacks.js';
import { helpKeyboard, warningsKeyboard, groupSettingsKeyboard, repliesKeyboard, customizationKeyboard, customizationDescriptionsKeyboard, customizationRepliesKeyboard, customizationUILabelsKeyboard } from '../keyboards.js';
import { makeNameBatch, touchesMenuKeyboard, touchesLanguageKeyboard, touchesBatchKeyboard, touchesBatchText } from '../touches.js';

export function registerCallbacks(bot, shared) {
  const {
    db, isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor,
    selectedGroup, setSelected, getCustomization, applyGlobalCustomizationChange, customText, getHomeKeyboard,
    HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate,
    selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats,
    showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList,
    showProfileCard, handleViolation, showOwnerPanel, uiText, PROFILE_PHRASES,
    inferMenuBack, rememberMenuBack, menuBackTarget, normalizeAnswer,
    groupScores, leaderboardText, protectionBackTarget, protectionKeyboard,
    ensureReferralData, referralLinkFor, referralStatsFor, referralMenuKeyboard,
    referralLinkKeyboard, showReferralLink, publicCommandsKeyboard,
    QUESTIONS_DB, SHUAR_LIST, KET_LIST, N_PHRASES
  } = shared;

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

    const ownerOnlyActions = ['ownerpanel', 'botstats', 'activatedgroups', 'botsettings', 'globalprotection', 'requiredmenu', 'requiredadd', 'requiredlist', 'broadcastmenu', 'broadcastsend', 'broadcastcancel'];
    if (ownerOnlyActions.includes(data) || data.startsWith('reqdel:') || data.startsWith('globaltext')) {
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
      return answer(ctx, '╭━━━〔 🔥🐈‍⬛ لمسات نغنوغ 〕━━━╮\n\nاختَر اللمسة اللي تريدها من هنا. ❤️‍🔥\n\n✦ زخرفة عربية تغيّر مظهر الحروف، وزخرفة إنجليزية، والنسخ بلمسة على الاسم نفسه.\n╰━━━━━━━━━━━━━━━━━━━━╯', { reply_markup: touchesMenuKeyboard() });
    }
    if (data === 'touchesdecorate') {
      clearPending(ctx);
      return answer(ctx, '✨ زخرفة الأسماء\n\nاختَر لغة الاسم أولاً:', { reply_markup: touchesLanguageKeyboard() });
    }
    if (data === 'touchesvocal') {
      clearPending(ctx);
      return answer(ctx, '🎚️ فصل الصوت عن الموسيقى\n\n⚠️ الخدمة متوقفة حالياً.\n📩 للاستفسار، راسل المطور.', { reply_markup: new InlineKeyboard().text('↩️ لمسات نغنوغ', 'touchesmenu').text('🏠 الرئيسية', 'home') });
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
      return answer(ctx, '╭━━━〔 📚 دليل أوامر المجموعة 〕━━━╮\n\n🎮 〔 الألعاب 〕 اختيارات — رياضيات — حيوان — س — معاني — عكس — تفكيك\n🧠 〔 اسئلني 〕 سؤال عشوائي للنقاش.\n🏆 〔 توب 〕 عرض أعلى 3 أعضاء بالنقاط.\n👤 〔 ا 〕 بطاقة العضو؛ ويمكن الرد بالرمز على رسالة العضو.\n🎯 〔 كت 〕 سؤال شخصي يجاوب عليه العضو.\n📜 〔 ش 〕 أبيات وعبارات شعرية.\n🐈‍⬛ 〔 ن 〕 ردود نغنوغ العراقية.\n\n✦ تعمل الألعاب داخل المجموعات المفعّلة.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    if (data === 'managementmenu') {
      const kb = new InlineKeyboard()
        .text('🎮 الألعاب', 'gamesmenu')
        .text('💬 التفاعلية', 'interactive_menu').row()
        .text('👑 المشرفون', 'adminpanel')
        .text('⚠️ التحذيرات', 'warningsmenu').row();
      // تبقى إعدادات البوت العامة خاصة بالمالك وضمن القائمة نفسها.
      if (isOwner(ctx)) kb.text('⚙️ إعدادات البوت العامة', 'botsettings').row();
      kb.text('🏠 القائمة الرئيسية', 'home');
      const managementText = `╭━━━〔 ⚙️ قسم الإدارة | نغنوغ 🐈‍⬛ 〕━━━╮

-︰🎮 الألعاب : ❨ ألعاب وتحدّيات داخل المجموعة ❩
-︰💬 الأوامر التفاعلية : ❨ بطاقة العضو والردود والعبارات الشعرية ❩
-︰👑 أوامر المشرفين : ❨ أدوات الإدارة حسب الصلاحيات ❩
-︰⚠️ التحذيرات والعقوبات : ❨ إعدادات التعامل مع المخالفات ❩

✦ اختَر القسم المطلوب من الأزرار أدناه.
╰━━━━━━━━━━━━━━━━━━━━╯`;
      return answer(ctx, uiText ? uiText(ctx, 'management', managementText) : managementText, { reply_markup: kb });
    }
    if (data === 'howto') return answer(ctx, '╭━━━〔 📖 طريقة استخدام نغنوغ 〕━━━╮\nاختَر الخدمة المطلوبة من القائمة أدناه.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').text('🏠 الرئيسية', 'home') });
    if (data === 'protection') return answer(ctx, '╭━━━〔 🛡️ ميزات الحماية 〕━━━╮\nتعرّف على أدوات حماية المجموعة والتحكم بها.', { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').text('🏠 الرئيسية', 'home') });
    if (data === 'interactive_menu') {
      const kb = new InlineKeyboard().text('👤 بطاقة العضو: ا', 'interactive_profile').row()
        .text('🎯 سؤال شخصي: كت', 'interactive_ket').text('📜 الشعر: ش', 'interactive_poem').row()
        .text('🐈‍⬛ نغنوغ: ن', 'interactive_n').text('🏆 المتصدرون: توب', 'game_top').row()
        .text('↩️ العودة إلى قائمة الأوامر', 'publiccommands');
      return answer(ctx, '╭━━━〔 💬 الأوامر التفاعلية 〕━━━╮\n\n👤 〔 ا 〕 بطاقة العضو — أرسل الرمز أو ردّ به على رسالة العضو.\n🎯 〔 كت 〕 سؤال شخصي عشوائي يجاوب عليه العضو.\n🧠 〔 اسئلني 〕 سؤال أو موقف عشوائي للنقاش.\n📜 〔 ش 〕 أبيات وعبارات شعرية.\n🐈‍⬛ 〔 ن 〕 تفاعل باللهجة العراقية من نغنوغ.\n🏆 〔 توب 〕 قائمة الأعضاء المتصدرين بالنقاط.\n\n✦ هذه الأوامر متاحة لجميع الأعضاء.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }
    const interactiveDetailKeyboard = () => new InlineKeyboard()
      .text('↩️ الأوامر التفاعلية', 'interactive_menu')
      .text('📚 مركز الأوامر', 'publiccommands');
    if (data === 'interactive_profile') return answer(ctx, `╭━━━〔 👤 بطاقة العضو 〕━━━╮\n\nاكتب «ا» داخل المجموعة، أو ردّ بالرمز على رسالة العضو لعرض المعلومات المتاحة عنه.\n\n✦ ستظهر البيانات التي يتيحها تيليگرام فقط.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: interactiveDetailKeyboard() });
    if (data === 'interactive_ket') return answer(ctx, `╭━━━〔 🎯 سؤال كت الشخصي 〕━━━╮\n\nاكتب «كت» داخل المجموعة حتى يرسل نغنوغ سؤالاً شخصياً عشوائياً، وتگدر تجاوب عليه حتى يشاركك الأعضاء.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: interactiveDetailKeyboard() });
    if (data === 'interactive_poem') return answer(ctx, `╭━━━〔 📜 قسم الشعر 〕━━━╮\n\nاكتب «ش» داخل المجموعة حتى يشاركك نغنوغ بيتاً أو عبارة شعرية.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: interactiveDetailKeyboard() });
    if (data === 'interactive_n') return answer(ctx, `╭━━━〔 🐈‍⬛ تفاعل مع نغنوغ 〕━━━╮\n\nاكتب «ن» داخل المجموعة حتى يردّ عليك نغنوغ باللهجة العراقية.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: interactiveDetailKeyboard() });
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
      return answer(ctx, '♻️ تمت استعادة تخصيصك الشخصي.\nرجعت واجهتك إلى النصوص الافتراضية المعتمدة من المالك، بما فيها تعديلات «توحيد النصوص» العامة. لم تتغير واجهات بقية المستخدمين.', { reply_markup: customizationKeyboard(getCustomization(ctx)) });
    }

    if (data === 'groupstats') return showGroupStats(ctx);

    // محرر كتالوج النصوص: تصفح هرمي مع زر تعديل مستقل لكل عنصر.
    if (data === 'globaltextcatalog') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      clearPending(ctx);
      const categories = [...new Set(UI_TEXT_CATALOG.map(item => item.category))];
      const kb = new InlineKeyboard();
      categories.forEach((category, index) => kb.text(category.slice(0, 40), `globaltextcategory:${index}:0`).row());
      kb.text('🔙 توحيد النصوص', 'globaltextmenu').text('👑 لوحة المالك', 'ownerpanel');
      return answer(ctx, `╭━━━〔 🗂️ فهرس نصوص نغنوغ 〕━━━╮

هذا الفهرس يجمع ${UI_TEXT_CATALOG.length} عنصراً قابلاً للتحرير من ملفات النسخة الحالية. اختَر القسم، وبعدها يظهر كل عنصر وبجانبه زر «✏️ تعديل».

✦ أسماء الأزرار تتغير من دون تغيير callback_data.
✦ التعديل على نص متكرر حرفياً قد ينعكس على كل مكان يستخدم النص نفسه.
╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }

    if (data.startsWith('globaltextcategory:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      clearPending(ctx);
      const [, rawCategory, rawPage] = data.split(':');
      const categories = [...new Set(UI_TEXT_CATALOG.map(item => item.category))];
      const categoryIndex = Number(rawCategory);
      if (!Number.isInteger(categoryIndex) || !categories[categoryIndex]) return answer(ctx, 'القسم المطلوب غير موجود.', { reply_markup: new InlineKeyboard().text('🗂️ الفهرس', 'globaltextcatalog') });
      const category = categories[categoryIndex];
      const items = UI_TEXT_CATALOG.map((item, index) => ({ ...item, index })).filter(item => item.category === category);
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
        kb.text(safeButtonLabel(`${item.kind === 'button' ? '🔘' : '📝'} ${rowNo}. ${shownName}`), `globaltextview:${item.index}:${page}`).text('✏️ تعديل', `globaltextselect:${item.index}:${page}`).row();
      }
      if (page > 0) kb.text('⬅️ السابقة', `globaltextcategory:${categoryIndex}:${page - 1}`);
      if (page + 1 < pages) kb.text('📂 المزيد ➡️', `globaltextcategory:${categoryIndex}:${page + 1}`);
      kb.row().text('🗂️ الأقسام', 'globaltextcatalog').text('🔙 توحيد النصوص', 'globaltextmenu');
      const body = shown.map((item, i) => `${page * pageSize + i + 1}. ${item.kind === 'button' ? '🔘 زر' : '📝 نص'} — ${short(currentValue(item)) || '(فارغ)'}\nالمصدر: ${item.source}`).join('\n\n');
      return answer(ctx, `╭━━━〔 ${category} 〕━━━╮\nالعناصر ${page * pageSize + 1}-${page * pageSize + shown.length} من ${items.length} | صفحة ${page + 1}/${pages}\n\n${body}\n\nاضغط زر العنصر للعرض، أو «✏️ تعديل» لتغييره مباشرة.\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: kb });
    }

    if (data.startsWith('globaltextview:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const [, rawIndex, rawPage] = data.split(':');
      const index = Number(rawIndex);
      const item = UI_TEXT_CATALOG[index];
      if (!item) return answer(ctx, 'العنصر غير موجود.', { reply_markup: new InlineKeyboard().text('🗂️ الفهرس', 'globaltextcatalog') });
      const overrides = db.globalTextOverrides || {};
      const current = item.kind === 'button' && item.callback && overrides.buttonCallbacks?.[item.callback]
        ? overrides.buttonCallbacks[item.callback].to
        : replaceByRules(item.from, item.kind === 'button' ? (overrides.buttons || []) : (overrides.texts || []));
      const value = String(current ?? item.from);
      return answer(ctx, `╭━━━〔 👁️ تفاصيل العنصر 〕━━━╮\n\nالنوع: ${item.kind === 'button' ? 'زر' : 'نص / وصف'}\nالقسم: ${item.category}\nالمصدر: ${item.source}\n\nالقيمة الحالية:\n${value.slice(0, 2200)}\n\n${item.kind === 'button' ? 'تغيير الاسم لا يغيّر وظيفة الزر الداخلية.' : 'سيتم تطبيق النص الجديد على العبارة المطابقة في رسائل الواجهة.'}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('✏️ تعديل هذا العنصر', `globaltextselect:${index}:${Math.max(0, Number(rawPage) || 0)}`).row().text('🔙 رجوع للقائمة', `globaltextcategory:${[...new Set(UI_TEXT_CATALOG.map(x => x.category))].indexOf(item.category)}:${Math.floor(Math.max(0, Number(rawPage) || 0))}`).row().text('🗂️ الأقسام', 'globaltextcatalog') });
    }

    if (data.startsWith('globaltextselect:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const [, rawIndex, rawPage] = data.split(':');
      const index = Number(rawIndex);
      const item = UI_TEXT_CATALOG[index];
      if (!item) return answer(ctx, 'العنصر غير موجود.', { reply_markup: new InlineKeyboard().text('🗂️ الفهرس', 'globaltextcatalog') });
      clearPending(ctx);
      const overrides = db.globalTextOverrides || {};
      const current = item.kind === 'button' && item.callback && overrides.buttonCallbacks?.[item.callback]
        ? overrides.buttonCallbacks[item.callback].to
        : replaceByRules(item.from, item.kind === 'button' ? (overrides.buttons || []) : (overrides.texts || []));
      pending(ctx, { action: 'global-catalog-new', kind: item.kind, catalogIndex: index, catalogPage: Math.max(0, Number(rawPage) || 0), catalogCategory: item.category, catalogCallback: item.callback || null, catalogOriginal: item.from, from: String(current ?? item.from) });
      return answer(ctx, `${item.kind === 'button' ? '🔘 تعديل اسم زر' : '📝 تعديل نص / وصف'}\n\nالقسم: ${item.category}\nالمصدر: ${item.source}\n\nالقيمة الحالية:\n${String(current ?? item.from).slice(0, 1500)}\n\nأرسل القيمة الجديدة. لن يُحفظ شيء قبل المعاينة والتأكيد.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'globaltextcancel').row().text('🔙 رجوع للقائمة', `globaltextcategory:${[...new Set(UI_TEXT_CATALOG.map(x => x.category))].indexOf(item.category)}:${Math.max(0, Number(rawPage) || 0)}`) });
    }

    // توحيد النصوص: تعديلات عامة على نصوص الواجهات وأسماء الأزرار لكل المستخدمين.
    if (data === 'globaltextmenu') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      // لا نسمح لبقايا خطوة سابقة (خصوصاً الإذاعة) بالتقاط النص الذي سيُرسل في هذا القسم.
      clearPending(ctx);
      const kb = new InlineKeyboard()
        .text('🗂️ تصفح كل نصوص وأزرار البوت', 'globaltextcatalog').row()
        .text('📝 تعديل عبارة يدوياً', 'globaltextedit:text')
        .text('🔘 تعديل اسم زر يدوياً', 'globaltextedit:button').row()
        .text('📋 عرض التعديلات', 'globaltextlist:0')
        .text('♻️ مسح تعديلات التوحيد', 'globaltextclear').row()
        .text('↩️ لوحة المالك', 'ownerpanel');
      return answer(ctx, '╭━━━〔 📝 توحيد النصوص | نغنوغ 〕━━━╮\n\nمن هنا تكدر تتصفح فهرس النصوص والأزرار المستخرجة من ملفات البوت وتعدّل كل عنصر من مكانه، أو تستخدم التعديل اليدوي للعبارات غير المدرجة.\n\n١. افتح «تصفح كل نصوص وأزرار البوت».\n٢. اختَر القسم، ثم العنصر، واضغط «✏️ تعديل».\n٣. راجع المعاينة واعتمد التغيير حتى يظهر للجميع.\n\n✦ معرفات الأزرار الداخلية تبقى نفسها، لذلك تظل الأزرار تعمل بعد تغيير أسمائها.\n✦ استعادة التخصيص الشخصي ترجع واجهة المستخدم إلى الافتراضات العامة، ولا تمسح تعديلات المالك المحفوظة.\n╰━━━━━━━━━━━━━━━━━━━━╯', { reply_markup: kb });
    }

    if (data.startsWith('globaltextedit:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const kind = data.split(':')[1];
      if (!['text', 'button'].includes(kind)) return answer(ctx, 'نوع التعديل غير معروف.');
      // نلغي أي خطوة معلّقة قديمة قبل بدء توحيد النصوص حتى لا يلتقطها معالج الإذاعة.
      clearPending(ctx);
      pending(ctx, { action: 'global-ui-old', kind });
      return answer(ctx, kind === 'button'
        ? '🔘 أرسل اسم الزر القديم كما يظهر في أي قائمة. سيُطبّق الاسم الجديد على كل زر يحمل العبارة نفسها، مع بقاء وظيفة الزر كما هي.\n\nأرسل /cancel للإلغاء.'
        : '📝 أرسل النص القديم أو جزءاً منه كما يظهر في القوائم أو الأوصاف. سيُستبدل في كل رسالة واجهة تحتوي على العبارة نفسها.\n\nأرسل /cancel للإلغاء.',
        { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'globaltextcancel').row().text('🔙 رجوع', 'globaltextmenu') });
    }

    if (data === 'globaltextcancel') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      clearPending(ctx);
      return answer(ctx, 'تم إلغاء التعديل.', { reply_markup: new InlineKeyboard().text('📝 توحيد النصوص', 'globaltextmenu').text('👑 لوحة المالك', 'ownerpanel') });
    }

    if (data === 'globaltextbacktonew') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const p = db.pending?.[userKey(ctx)];
      if (!p || p.action !== 'global-ui-confirm') return answer(ctx, 'انتهت جلسة التعديل. ابدأ من جديد من «توحيد النصوص».', { reply_markup: new InlineKeyboard().text('📝 توحيد النصوص', 'globaltextmenu') });
      pending(ctx, { ...p, action: 'global-ui-new', kind: p.kind === 'button' ? 'button' : 'text', from: p.from });
      return answer(ctx, `✏️ أرسل النص الجديد مرة ثانية.\n\nالنص القديم:\n${String(p.from || '').slice(0, 1500)}\n\nراح أعرض لك معاينة جديدة قبل الحفظ.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'globaltextcancel') });
    }

    if (data === 'globaltextsave') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const p = db.pending?.[userKey(ctx)];
      if (!p || p.action !== 'global-ui-confirm') {
        clearPending(ctx);
        return answer(ctx, 'انتهت جلسة التعديل أو لم تعد موجودة. ابدأ من «توحيد النصوص» من جديد.', { reply_markup: new InlineKeyboard().text('📝 توحيد النصوص', 'globaltextmenu').row().text('👑 لوحة المالك', 'ownerpanel') });
      }
      const kind = p.kind === 'button' ? 'button' : 'text';
      const from = String(p.from || '').trim();
      const to = String(p.to || '').trim();
      if (!from || !to || from === to) {
        clearPending(ctx);
        return answer(ctx, 'لم يُحفظ التعديل لأن النص القديم والجديد فارغان أو متطابقان.', { reply_markup: new InlineKeyboard().text('📝 توحيد النصوص', 'globaltextmenu') });
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
        const categoryIndex = [...new Set(UI_TEXT_CATALOG.map(x => x.category))].indexOf(item.category);
        const page = Math.max(0, Number(p.catalogPage) || 0);
        return answer(ctx, `✅ تم حفظ تعديل العنصر المحدد.\n\nالقسم: ${item.category}\nالنوع: ${item.kind === 'button' ? 'زر' : 'نص / وصف'}\n\nقبل:\n${String(p.from || baseFrom).slice(0, 500)}\n\nبعد:\n${to.slice(0, 500)}\n\n🔒 بقيت وظائف الأزرار كما هي، والتغيير محفوظ في قاعدة البيانات.\nعدد قيم التخصيص الافتراضية المتأثرة: ${affectedDefaults}`, { reply_markup: new InlineKeyboard().text('✏️ تعديل عنصر آخر', `globaltextcategory:${categoryIndex}:${page}`).row().text('🗂️ فهرس الأقسام', 'globaltextcatalog').text('🔙 توحيد النصوص', 'globaltextmenu') });
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
      return answer(ctx, `✅ تم اعتماد التعديل العام بنجاح.\n\nالقديم: ${from.slice(0, 500)}\n\nالجديد: ${to.slice(0, 500)}\n\n🌍 سيظهر التغيير لكل المستخدمين، وسيصبح هو الافتراضي حتى بعد ضغط أي مستخدم على «استعادة النصوص الافتراضية».\n📌 القيم الافتراضية التي تم تحديثها: ${affectedDefaults}`, { reply_markup: new InlineKeyboard().text('➕ تعديل آخر', `globaltextedit:${kind}`).row().text('📋 عرض التعديلات', 'globaltextlist:0').row().text('🔙 توحيد النصوص', 'globaltextmenu') });
    }

    if (data.startsWith('globaltextlist:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const textRules = db.globalTextOverrides?.texts || [];
      const buttonRules = db.globalTextOverrides?.buttons || [];
      const callbackRules = Object.entries(db.globalTextOverrides?.buttonCallbacks || {}).map(([callback, rule]) => ({ ...rule, callback }));
      const allRules = [
        ...textRules.map((rule, index) => ({ ...rule, kind: 'text', index })),
        ...buttonRules.map((rule, index) => ({ ...rule, kind: 'button', index: textRules.length + index })),
        ...callbackRules.map((rule, index) => ({ ...rule, kind: 'callback', index: textRules.length + buttonRules.length + index }))
      ];
      if (!allRules.length) return answer(ctx, '📋 ماكو تعديلات عامة محفوظة حالياً.', { reply_markup: new InlineKeyboard().text('🔙 توحيد النصوص', 'globaltextmenu') });
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
        kb.text(safeButtonLabel(`🗑️ ${rule.kind === 'text' ? 'نص' : rule.kind === 'callback' ? 'زر خاص' : 'زر'}: ${short(rule.from)} ← ${short(rule.to)}`), `globaltextdel:${rule.index}:${page}`).row();
      }
      if (page > 0) kb.text('⬅️ السابق', `globaltextlist:${page - 1}`);
      if (page + 1 < pages) kb.text('التالي ➡️', `globaltextlist:${page + 1}`);
      kb.row().text('🔙 توحيد النصوص', 'globaltextmenu');
      const body = shown.map((rule, i) => `${page * pageSize + i + 1}. ${rule.kind === 'text' ? '📝 نص' : '🔘 زر'}\nقديم: ${String(rule.from).slice(0, 90)}\nجديد: ${String(rule.to).slice(0, 90)}`).join('\n\n');
      return answer(ctx, `📋 التعديلات العامة (${page + 1}/${pages})\n\n${body}\n\nاضغط على أي تعديل لحذفه.`, { reply_markup: kb });
    }

    if (data.startsWith('globaltextdel:')) {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      const [, rawIndex, rawPage] = data.split(':');
      const index = Number(rawIndex);
      const textCount = (db.globalTextOverrides?.texts || []).length;
      const buttonCount = (db.globalTextOverrides?.buttons || []).length;
      const callbackEntries = Object.keys(db.globalTextOverrides?.buttonCallbacks || {});
      if (!Number.isInteger(index) || index < 0 || index >= textCount + buttonCount + callbackEntries.length) {
        return answer(ctx, 'التعديل المطلوب غير موجود أو تم حذفه مسبقاً.', { reply_markup: new InlineKeyboard().text('📋 عرض التعديلات', 'globaltextlist:0').row().text('🔙 توحيد النصوص', 'globaltextmenu') });
      }
      if (index < textCount) db.globalTextOverrides.texts.splice(index, 1);
      else if (index < textCount + buttonCount) db.globalTextOverrides.buttons.splice(index - textCount, 1);
      else delete db.globalTextOverrides.buttonCallbacks[callbackEntries[index - textCount - buttonCount]];
      save();
      return answer(ctx, '🗑️ تم حذف التعديل المحدد.', { reply_markup: new InlineKeyboard().text('📋 بقية التعديلات', `globaltextlist:${Math.max(0, Number(rawPage) || 0)}`).row().text('🔙 توحيد النصوص', 'globaltextmenu') });
    }

    if (data === 'globaltextclear') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      return answer(ctx, '⚠️ هل تريد مسح جميع تعديلات توحيد النصوص؟ سيعود البوت إلى النصوص والأزرار الافتراضية للجميع.', { reply_markup: new InlineKeyboard().text('✅ نعم، امسحها', 'globaltextclearconfirm').row().text('❌ إلغاء', 'globaltextmenu') });
    }

    if (data === 'globaltextclearconfirm') {
      if (!isOwner(ctx) || !isPrivate(ctx)) return answer(ctx, 'هذا القسم متاح لمالك البوت من الخاص فقط.');
      db.globalTextOverrides = { texts: [], buttons: [], buttonCallbacks: {} };
      save();
      return answer(ctx, '♻️ تمت استعادة النصوص والأزرار الافتراضية للجميع.', { reply_markup: new InlineKeyboard().text('📝 توحيد النصوص', 'globaltextmenu').text('👑 لوحة المالك', 'ownerpanel') });
    }

    // لوحة المالك والاشتراك الإجباري[cite: 4, 5]
    if (data === 'ownerpanel') return showOwnerPanel(ctx);
    if (data === 'botstats') {
      const totalUsers = db.users?.length || 0;
      const privateUsers = db.privateUsers?.length || 0;
      const groupsCount = Object.keys(db.groups || {}).length;
      return answer(ctx, `╭━━━〔 📊 إحصائيات نغنوغ 〕━━━╮\n\n-︰إجمالي المستخدمين : ❨ ${totalUsers} ❩\n-︰مستخدمو الخاص : ❨ ${privateUsers} ❩\n-︰المجموعات المسجّلة : ❨ ${groupsCount} ❩\n\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('🔙 لوحة المالك', 'ownerpanel') });
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
        .text('🔐 إدارة الاشتراك الإجباري', 'requiredmenu').row()
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
    if (data === 'requiredmenu') return ownerRequiredMenu(ctx);
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
    if (data === 'checksubscription') {
      return subscriptionGate(ctx);
    }

    // التحذيرات والعقوبات[cite: 3, 5]
    if (data === 'warningsmenu') {
      rememberMenuBack(ctx, 'warnings');
      const g = selectedGroup(ctx);
      if (!g) { const { entries } = selectedGroupKeyboard(ctx); if (entries.length) return showGroups(ctx); return answer(ctx, 'ما عندك مجموعة مفعّلة بعد. أضف نغنوغ لمجموعتك وفعّله، وبعدها تگدر تدير التحذيرات والعقوبات.'); }
      if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة التحذيرات متاحة لمشرفي المجموعة فقط.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰المجموعة : ❨ ${g.title} ❩\n\n-︰التحذيرات :\n❨ 1 ❩، ❨ 2 ❩، ❨ 3 ❩، ❨ 4 ❩، ❨ 5 ❩،\n❨ 7 ❩، ❨ 10 ❩، ❨ 15 ❩، ❨ 20 ❩\n\n-︰مدد الكتم بالدقائق :\n❨ 5 ❩، ❨ 10 ❩، ❨ 15 ❩، ❨ 20 ❩، ❨ 30 ❩،\n❨ 45 ❩، ❨ 60 ❩، ❨ 90 ❩، ❨ 120 ❩،\n❨ 180 ❩، ❨ 360 ❩، ❨ 720 ❩، ❨ 1440 ❩\n\n-︰طريقة الاستخدام : ❨ اضغط على الأزرار لتغيير الخيارات بالتتابع ❩\n-︰التفعيل : ❨ فعّل النظام من الزر الأول ❩\n\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningstoggle') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
      g.warningSettings.enabled = !g.warningSettings.enabled;
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰الحالة : ❨ ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'} ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningslimit') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const limits = [1, 2, 3, 4, 5, 7, 10, 15, 20];
      const currentLimit = Number(g.warningSettings?.limit) || 3;
      const limitIndex = limits.indexOf(currentLimit);
      g.warningSettings.limit = limits[limitIndex < 0 ? 0 : (limitIndex + 1) % limits.length];
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰عدد التحذيرات : ❨ ${g.warningSettings.limit} ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningsaction') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const actions = ['mute', 'kick', 'ban', 'none'];
      const currentIndex = actions.indexOf(g.warningSettings.action);
      g.warningSettings.action = actions[(currentIndex + 1) % actions.length];
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰العقوبة : ❨ ${{ mute: 'كتم', kick: 'طرد', ban: 'حظر', none: 'بدون إجراء' }[g.warningSettings.action]} ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningsduration') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const durations = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 360, 720, 1440];
      const currentDuration = Number(g.warningSettings?.duration) || 10;
      const durationIndex = durations.indexOf(currentDuration);
      g.warningSettings.duration = durations[durationIndex < 0 ? 0 : (durationIndex + 1) % durations.length];
      save();
      return answer(ctx, `╭━━━〔 🛡️ التحذيرات والعقوبات 〕━━━╮\n\n-︰مدة الكتم : ❨ ${g.warningSettings.duration} دقيقة ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: warningsKeyboard(g, menuBackTarget(ctx, 'warnings')) });
    }

    if (data === 'warningslog') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      const log = g.warningLog || [];
      const logText = log.slice(-10).map(l => `• ${l.name}: ${l.reason}`).join('\n') || 'لا توجد سجلات تحذير حتى الآن.';
      return answer(ctx, `╭━━━〔 📋 سجل التحذيرات الأخيرة 〕━━━╮\n\n${logText}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('🔙 رجوع للتحذيرات', 'warningsmenu') });
    }

    if (data === 'warningsclear') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.warnings = {};
      save();
      return answer(ctx, `╭━━━〔 🧹 تصفير التحذيرات 〕━━━╮\n\n-︰النتيجة : ❨ تم تصفير تحذيرات أعضاء المجموعة بنجاح ❩\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: new InlineKeyboard().text('🔙 رجوع للتحذيرات', 'warningsmenu') });
    }

    // إعدادات المجموعة المتقدمة[cite: 3, 5]
    if (data === 'welcomeedit') {
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      pending(ctx, { action: 'edit-welcome', groupId: g.id });
      return answer(ctx, `👋 أرسل رسالة الترحيب الجديدة.\n\nملاحظة: يمكنك استخدام \`{name}\` لاسم العضو و \`{title}\` لعنوان المجموعة.`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'groupsettings') });
    }

    if (data === 'togglelinks' || data === 'toggleflood') {
      // توافق مع أزرار الإصدارات القديمة: أي ضغط قديم يغيّر نفس الإعداد الموحد.
      const g = selectedGroup(ctx);
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
      const g = selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة.');
      g.autoReply = !g.autoReply;
      save();
      return ctx.editMessageText(`╭━━━〔 ⚙️ إعدادات المجموعة 〕━━━╮\n\n-︰اسم المجموعة : ❨ ${g.title} ❩\n\n✦ اختَر الإعداد الذي تريد تغييره من الأزرار أدناه.\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: groupSettingsKeyboard(g) });
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
      return ctx.editMessageText(`╭━━━〔 🚫 إدارة الكلمات الممنوعة 〕━━━╮\nالمجموعة: «${g.title}»\n\n〔 الكلمات المسجّلة 〕\n${wordsList}`, { reply_markup: kb });
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

    if (data.startsWith('prot_')) {
      const g = isGroup(ctx) ? groupFor(ctx.chat) : selectedGroup(ctx);
      if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'الأمر غير مخصص إلك');
      const type = data.slice(5);
      const fieldByType = { links: 'linksLock', flood: 'flood', media: 'mediaLock', badwords: 'badWordsLock', audio: 'audioLock', forward: 'forwardLock', contacts: 'contactsLock' };
      if (type === 'all') {
        for (const field of Object.values(fieldByType)) g[field] = true;
        g.links = g.linksLock = true;
        g.audioClipsLock = true;
      } else if (type === 'none') {
        for (const field of Object.values(fieldByType)) g[field] = false;
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
      const status = type === 'all' ? '🟢 تم تفعيل جميع خيارات الحماية.' : type === 'none' ? '⚪ تم إيقاف جميع خيارات الحماية.' : type === 'chat' ? `تم ${g.closedMessages ? 'قفل' : 'فتح'} دردشة المجموعة.` : `تم ${g[fieldByType[type]] ? 'تفعيل' : 'إيقاف'} ${({ links: 'حماية الروابط', flood: 'منع السبام', media: 'حماية الوسائط والملفات', badwords: 'حماية كلمات الفشار', audio: 'حماية الصوتيات', forward: 'منع توجيه الرسائل', contacts: 'منع المعرفات والأرقام' })[type] || 'الميزة'} ${g[fieldByType[type]] ? '🟢' : '⚪'}`;
      const announcement = `🛡️ تحديث الحماية — نغنوغ 🐈‍⬛\n\n${status}\n\n${g.title ? `المجموعة: ${g.title}` : ''}`.trim();
      // لا نكتفي بتعديل نص اللوحة: أرسل إشعاراً مستقلاً داخل المجموعة أيضاً.
      try { await ctx.api.sendMessage(g.id || ctx.chat.id, announcement); }
      catch (err) { console.warn('[protection-announcement] Could not send group status:', err?.description || err?.message || err); }
      return answer(ctx, `╭━━━〔 🛡️ تحديث الحماية 〕━━━╮\n\n${status}\n╰━━━━━━━━━━━━━━━━━━╯`, { reply_markup: protectionKeyboard(g, protectionBackTarget(ctx)) });
    }

    // لوحة المشرفين[cite: 4]
    if (data === 'adminpanel') {
      const adminText = `╭━━━〔 👑 أوامر المشرفين — نغنوغ 〕━━━╮

` +
        `🔇 كتم عضو
ردّ على رسالة العضو واكتب «كتم 10» لكتمه 10 دقائق.
━━━━━━━━━━━━━━━━━━
` +
        `🔊 فك الكتم
ردّ على رسالته واكتب «فتح الكتم»، أو «فتح الكتم @username».
━━━━━━━━━━━━━━━━━━
` +
        `🚪 طرد عضو
ردّ على رسالته واكتب «طرد»، أو استخدم «طرد @username».
━━━━━━━━━━━━━━━━━━
` +
        `🔒 قفل المجموعة
اكتب «قفل المجموعة» أو «قفل الرسائل».
━━━━━━━━━━━━━━━━━━
` +
        `🔓 فتح المجموعة
اكتب «افتح المجموعة» أو «افتح الرسائل».
━━━━━━━━━━━━━━━━━━
` +
        `🗑️ حذف عدد من الرسائل
اكتب «امسح 10» لحذف آخر 10 رسائل مرصودة قبل الأمر.
━━━━━━━━━━━━━━━━━━
` +
        `🧹 حذف الرسائل المرصودة
اكتب «احذف جميع الرسائل» ثم أكّد الحذف؛ الحد الأقصى 100 رسالة مرصودة.
━━━━━━━━━━━━━━━━━━
` +
        `⭐ إضافة نقاط
ردّ على عضو واكتب «اضف 5»، أو «اضف 5 @username».
━━━━━━━━━━━━━━━━━━
` +
        `⚙️ ترقية عضو إلى مشرف
اكتب «اضف مشرفا @username» لعضو رصده البوت؛ يلزم أن يملك البوت صلاحية ترقية الأعضاء.
━━━━━━━━━━━━━━━━━━
` +
        `👤 معلومات عضو
ردّ على رسالته واكتب «معلومات»، أو استخدم «معلومات @username» لعضو رصده البوت.
━━━━━━━━━━━━━━━━━━
` +
        `🏘️ معلومات المجموعة
اكتب «مجموعتي» لعرض بيانات المجموعة والصورة إن أتاحها تيليگرام.
━━━━━━━━━━━━━━━━━━
` +
        `🛡️ الحماية
اكتب «تفعيل الحماية» أو «ايقاف الحماية»، أو افتح قائمة الحماية لإعداد كل ميزة.`;
      return answer(ctx, adminText + '\n\n✦ الأوامر الإدارية تتطلب صلاحيات مناسبة، ويجب أن يمتلك نغنوغ الصلاحيات المطلوبة أيضاً.\n╰━━━━━━━━━━━━━━━━━━╯', { reply_markup: new InlineKeyboard().text('↩️ العودة للقائمة السابقة', isGroup(ctx) ? 'publiccommands' : 'managementmenu') });
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
        `🧠 «اسئلني» ➜ سؤال للنقاش؛ أول مشاركة خلال 60 ثانية تربح نقطة.\n\n` +
        `🏆 كل إجابة صحيحة بالألعاب التنافسية = نقطة، وتابع أعلى 3 بكتابة «توب».\n` +
        `🔄 إذا كتبت اسم لعبة ثانية، ينتهي السؤال السابق ويبدأ سؤال جديد مباشرة.\n╰━━━━━━━━━━━━━━━━━━╯`;
      
      const gamesKb = new InlineKeyboard()
        .text('🧩 الاختيارات', 'game_ch').text('🔢 رياضيات', 'game_ma').row()
        .text('🐾 حيوان', 'game_an').text('💡 أسئلة عامة: س', 'game_ge').row()
        .text('🍎 معاني', 'game_meanings').text('🔁 عكس', 'game_opposite').row()
        .text('🔤 تفكيك', 'game_decompose').text('🧠 اسئلني', 'game_askme').row()
        .text('🏆 المتصدرون: توب', 'game_top').row()
        .text(menuBackTarget(ctx, 'games') === 'managementmenu' ? '↩️ الإدارة' : menuBackTarget(ctx, 'games') === 'ownerpanel' ? '↩️ لوحة المالك' : menuBackTarget(ctx, 'games') === 'groupsettings' ? '↩️ إعدادات المجموعة' : '📚 مركز الأوامر', menuBackTarget(ctx, 'games'));

      if (ctx.callbackQuery) {
        try { await ctx.editMessageText(gamesText, { reply_markup: gamesKb }); }
        catch { await ctx.reply(gamesText, { reply_markup: gamesKb }); }
        return;
      }
      return answer(ctx, gamesText, { reply_markup: gamesKb });
    }

    if (['game_ch', 'game_ma', 'game_an', 'game_ge', 'game_meanings', 'game_opposite', 'game_decompose', 'game_askme'].includes(data)) {
      const details = {
        game_ch: '╭━━━〔 🧩 لعبة الاختيارات 〕━━━╮\n\nاكتب «اختيارات» داخل المجموعة، ثم اختَر الجواب الصحيح من الأزرار.\n🏆 أول إجابة صحيحة تربح نقطة.\n╰━━━━━━━━━━━━━━━━━━━━╯',
        game_ma: '╭━━━〔 🔢 لعبة الرياضيات 〕━━━╮\n\nاكتب «رياضيات» حتى يظهر سؤال على شكل معادلة، وأرسل الناتج بالأرقام.\n🏆 أول إجابة صحيحة تربح نقطة.\n╰━━━━━━━━━━━━━━━━━━━━╯',
        game_an: '╭━━━〔 🐾 لعبة الحيوان 〕━━━╮\n\nاكتب «حيوان» وخمّن اسم الحيوان من الحرف الأول.\n🏆 أول إجابة صحيحة تربح نقطة.\n╰━━━━━━━━━━━━━━━━━━━━╯',
        game_ge: '╭━━━〔 💡 الأسئلة العامة 〕━━━╮\n\nاكتب «س» وأجب عن السؤال الثقافي.\n🏆 أول إجابة صحيحة تربح نقطة.\n╰━━━━━━━━━━━━━━━━━━━━╯',
        game_meanings: '╭━━━〔 🍎 لعبة معاني السمايلات 〕━━━╮\n\nاكتب «معاني»، وسيعرض البوت سمايل حيوان أو فاكهة. اكتب اسمه.\n🏆 أول إجابة صحيحة تربح نقطة.\n╰━━━━━━━━━━━━━━━━━━━━╯',
        game_opposite: '╭━━━〔 🔁 لعبة عكس الكلمة 〕━━━╮\n\nاكتب «عكس»، وسيعرض البوت كلمة؛ اكتب ضدّها، مثل «حلو» وجوابها «مر».\n🏆 أول إجابة صحيحة تربح نقطة.\n╰━━━━━━━━━━━━━━━━━━━━╯',
        game_decompose: '╭━━━〔 🔤 لعبة تفكيك الكلمة 〕━━━╮\n\nاكتب «تفكيك»، ثم اكتب حروف الكلمة وبين كل حرف والثاني مسافة، مثل: ا س د.\n🏆 أول إجابة صحيحة تربح نقطة.\n╰━━━━━━━━━━━━━━━━━━━━╯',
        game_askme: '╭━━━〔 🧠 اسئلني 〕━━━╮\n\nاكتب «اسئلني» حتى يرسل سؤالاً مفتوحاً للنقاش. أول عضو يشارك برد خلال 60 ثانية يحصل على نقطة.\n╰━━━━━━━━━━━━━━━━━━━━╯'
      };
      return answer(ctx, details[data], { reply_markup: new InlineKeyboard().text('↩️ العودة إلى الألعاب', 'gamesmenu').row().text('📚 مركز الأوامر', 'publiccommands') });
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
