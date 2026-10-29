import { InlineKeyboard } from 'grammy';
import {
  mainKeyboard,
  ownerKeyboard,
  warningsKeyboard,
  groupSettingsKeyboard,
  repliesKeyboard,
  customizationKeyboard
} from './keyboards.js';
import { cloneValue, getCustomizationDefaults, applyGlobalCustomizationChange, applyGlobalDefaultsToCustomization } from './globalCustomizationDefaults.js';

// تجميع الخدمات المشتركة في مكان واحد حتى تبقى ملفات التشغيل والأوامر واضحة.
export function createHelpers({ bot, db, save, freshGroup, OWNER_ID }) {
const isOwner = (ctx) => !!ctx.from && String(ctx.from.id) === OWNER_ID;
const isPrivate = (ctx) => ctx.chat?.type === 'private';
const isGroup = (ctx) => ['group', 'supergroup'].includes(ctx.chat?.type);
const userKey = (ctx) => String(ctx.from?.id || '');

function ensureUser(ctx) {
  const id = userKey(ctx);
  if (!id) return;
  let changed = false;

  // حماية إضافية إذا دخلت بيانات قديمة/غير متوقعة إلى الذاكرة أثناء التشغيل.
  // نحافظ على معرّفات المستخدمين الموجودة ولا نلمس إعدادات المجموعات أو القنوات.
  const normalizeIds = (value) => {
    if (Array.isArray(value)) return [...new Set(value.map(String).filter(Boolean))];
    if (value && typeof value === 'object') {
      return [...new Set(Object.keys(value)
        .filter((key) => value[key] !== false && value[key] != null)
        .map(String)
        .filter(Boolean))];
    }
    return [];
  };
  if (!Array.isArray(db.users)) {
    db.users = normalizeIds(db.users);
    changed = true;
  }
  if (!Array.isArray(db.privateUsers)) {
    db.privateUsers = normalizeIds(db.privateUsers);
    changed = true;
  }

  db.userMeta ||= {};
  const now = Date.now();
  if (!db.users.includes(id)) {
    db.users.push(id);
    db.userMeta[id] ||= { firstSeenAt: now, lastSeenAt: now };
    changed = true;
  } else if (!db.userMeta[id]) {
    db.userMeta[id] = { firstSeenAt: now, lastSeenAt: now };
    changed = true;
  }
  const meta = db.userMeta[id];
  if (!Number(meta.firstSeenAt)) { meta.firstSeenAt = now; changed = true; }
  // تحديث آخر نشاط كل 10 دقائق كحد أقصى، مع الاحتفاظ بالتاريخ في bot_data.json.
  if (!Number(meta.lastSeenAt) || now - Number(meta.lastSeenAt) >= 10 * 60 * 1000) {
    meta.lastSeenAt = now;
    changed = true;
  }
  if (isPrivate(ctx) && !db.privateUsers.includes(id)) {
    db.privateUsers.push(id);
    changed = true;
  }
  if (changed) save();
}

function groupFor(chat) {
  const id = String(chat.id);
  if (!db.groups[id]) db.groups[id] = { ...freshGroup(), id, title: chat.title || id };
  db.groups[id].title = chat.title || db.groups[id].title || id;
  return db.groups[id];
}

function selectedGroup(ctx) {
  const id = db.selected[userKey(ctx)];
  return id ? db.groups[id] : null;
}

function setSelected(ctx, id) { db.selected[userKey(ctx)] = String(id); save(); }

const DEFAULT_CUSTOMIZATION = {
  labels: { groups: '👥 مجموعاتي', addBot: '➕ أضفني للمجموعة', management: '⚙️ الإدارة', profile: '👤 ملفي الشخصي', customize: '🎨 تخصيص نغنوغ', help: '📖 المساعدة', back: '↩️ رجوع', home: '🏠 الرئيسية', cancel: '❌ إلغاء' },
  helpText: '',
  uiTexts: { management: '╭━━━〔 ⚙️ قسم الإدارة | نغنوغ 🐈‍⬛ 〕━━━╮\n\n-︰🎮 الألعاب : ❨ ألعاب وتحدّيات داخل المجموعة ❩\n-︰💬 الأوامر التفاعلية : ❨ بطاقة العضو والردود والعبارات الشعرية ❩\n-︰👑 أوامر المشرفين : ❨ أدوات الإدارة حسب الصلاحيات ❩\n-︰⚠️ التحذيرات والعقوبات : ❨ إعدادات التعامل مع المخالفات ❩\n\n✦ اختَر القسم المطلوب من الأزرار أدناه.\n╰━━━━━━━━━━━━━━━━━━━━╯', groups: '╭━━━〔 👥 مجموعاتي | نغنوغ 🐈‍⬛ 〕━━━╮\n\n✦ هنا تظهر المجموعات المفعّلة المرتبطة بحسابك.\n\n-︰اختَر المجموعة : ❨ لعرض التفاصيل وإدارة الإعدادات المتاحة ❩\n\n👇🏻 اضغط على اسم المجموعة من الأزرار أدناه.\n╰━━━━━━━━━━━━━━━━━━━━╯', customMenu: '╭━━━〔 🎨 تخصيص نغنوغ 〕━━━╮\n\nمن هنا تكدر تخصّص النصوص وأسماء الأزرار اللي تظهر إلك بالخاص فقط.\n✦ تعديلاتك شخصية وما تغيّر واجهة بقية المستخدمين أو إعدادات المجموعات.\n\n╰━━━━━━━━━━━━━━━━━━╯' },
  startText: '╭━━━〔 🐈‍⬛ أهلاً بيك بنغنوغ 🐾 〕━━━╮\n\n-︰🛡️ الحماية : ❨ أدوات للحد من السبام والمخالفات ❩\n-︰⚙️ الإدارة : ❨ خيارات حسب الصلاحيات المتاحة ❩\n-︰🎮 الترفيه : ❨ ألعاب وتحدّيات للأعضاء ❩\n-︰🏆 النقاط : ❨ إحصائيات ونقاط للأنشطة المدعومة ❩\n-︰💬 التفاعل : ❨ ردود تلقائية ومخصّصة ❩\n\n✦ اختَر القسم اللي تحتاجه من الأزرار أدناه.\n\n🎁 نغنوغ هدية من المطوّر إلكم ❤️\n╰━━━━━━━━━━━━━━━━━━━━╯',
  descriptions: {
    settings: 'اختَر الإعداد الذي تريد تغييره من الأزرار أدناه.',
    groups: '╭━━━〔 👥 مجموعاتي | نغنوغ 🐈‍⬛ 〕━━━╮\n\n✦ هنا تظهر المجموعات المفعّلة المرتبطة بحسابك.\n\n-︰اختَر المجموعة : ❨ لعرض التفاصيل وإدارة الإعدادات المتاحة ❩\n\n👇🏻 اضغط على اسم المجموعة من الأزرار أدناه.\n╰━━━━━━━━━━━━━━━━━━━━╯',
    account: '👤 〔 ملفّي الشخصي 〕\nعرض معلومات حسابك والبيانات المتاحة عنك.',
    replies: '💬 〔 الردود التلقائية 〕\nإدارة الردود التي يتفاعل بها نغنوغ مع رسائل المجموعة.'
  },
  replies: {
    account: '╭─〔 👤 ملفّك الشخصي 〕─╮',
    replies: '╭─〔 💬 الردود التلقائية 〕─╮',
    nogroups: '╭─〔 👥 مجموعاتك 〕─╮\nماكو مجموعة مفعّلة مرتبطة بحسابك حالياً. أضف نغنوغ إلى مجموعتك وفعّله حتى تظهر هنا.'
  }
};


function getCustomization(ctx) {
  const id = userKey(ctx);
  db.customizations ||= {};
  db.globalCustomizationDefaults ||= {};
  const defaults = getCustomizationDefaults(db, DEFAULT_CUSTOMIZATION);
  if (!db.customizations[id]) {
    db.customizations[id] = cloneValue(defaults);
  } else {
    const saved = db.customizations[id];
    saved.descriptions ||= {};
    saved.replies ||= {};
    saved.labels ||= {};
    saved.uiTexts ||= {};
    if (typeof saved.helpText !== 'string') saved.helpText = defaults.helpText;
    saved.labels = { ...defaults.labels, ...saved.labels };
    saved.uiTexts = { ...defaults.uiTexts, ...saved.uiTexts };
    saved.descriptions = { ...defaults.descriptions, ...saved.descriptions };
    saved.replies = { ...defaults.replies, ...saved.replies };
    if (typeof saved.startText !== 'string') saved.startText = defaults.startText;

    // التعديلات العامة التي يعتمدها المالك هي المرجع الافتراضي؛ لا يجوز أن تلغيها
    // تخصيصات قديمة محفوظة لحساب المستخدم.
    applyGlobalDefaultsToCustomization(saved, db);
  }
  return db.customizations[id];
}


function customText(ctx, section, key) {
  const c = getCustomization(ctx);
  if (section === 'startText') return c.startText;
  if (section === 'helpText') return c.helpText || HELP_TEXT;
  if (section === 'labels' || section === 'uiTexts') return c[section]?.[key];
  return c[section]?.[key];
}
function uiText(ctx, key, fallback) { const value = getCustomization(ctx).uiTexts?.[key]; if (key === 'management' && value === '⚙️ قسم الإدارة 🐈‍⬛\n\nهنا تكدر تتعرّف على أوامر نغنوغ، والألعاب المتوفرة، والردود التفاعلية، وطريقة استخدامها داخل المجموعة. ❤️') return fallback; return typeof value === 'string' && value.trim() ? value : fallback; }

function getHomeKeyboard(ctx) {
  const kb = mainKeyboard(ctx, bot, getCustomization(ctx));
  const hasCustomizationButton = (kb.inline_keyboard || []).some(row =>
    row.some(button => button.callback_data === 'custommenu')
  );
  if (!hasCustomizationButton) kb.row().text('🎨 تخصيص البوت', 'custommenu');
  if (isOwner(ctx)) {
    kb.row().text('🔒 الاشتراك الإجباري', 'requiredmenu').text('👑 لوحة المالك', 'ownerpanel');
  }
  return kb;
}

const HELP_TEXT = `🐈‍⬛📖 قسم المساعدة | نغنوغ 🐈‍⬛❤️\n\nبوت نغنوغ مو مجرد بوت عادي، إنما رفيق مجموعتك بالإدارة والحماية والترفيه! ❤️‍🔥\n\n━━━━━━━━━━━━━━━━━━\n\n🛡️ أولاً | الحماية والأمان\n🔹 إعدادات حماية قابلة للتخصيص حسب احتياج المجموعة.\n\n━━━━━━━━━━━━━━━━━━\n\n⚙️ ثانياً | إدارة المجموعة\n🔹 إدارة المجموعة ضمن الصلاحيات الممنوحة للبوت.\n\n━━━━━━━━━━━━━━━━━━\n\n🎮 ثالثاً | الألعاب والترفيه\n🔹 مجموعة من الألعاب الممتعة والمميزة.\n\n━━━━━━━━━━━━━━━━━━\n\n🏆 رابعاً | نظام النقاط والإحصائيات\n🔹 نظام نقاط وإحصائيات خاص بالأعضاء حسب الأنشطة المدعومة.\n\n━━━━━━━━━━━━━━━━━━\n\n⚠️ خامساً | نظام التحذيرات والعقوبات\n🔹 نظام تحذيرات وعقوبات مخصص للمخالفين.\n\n━━━━━━━━━━━━━━━━━━\n\n💬 سادساً | الردود التلقائية والمخصصة\n🔹 إمكانية تخصيص الردود بما يناسب أجواء مجموعتك.\n\n━━━━━━━━━━━━━━━━━━\n\n🎨 سابعاً | سهولة الاستخدام والتخصيص\n🔹 تخصيص الإعدادات والردود حسب الخيارات المتاحة.\n\n━━━━━━━━━━━━━━━━━━\n\n🎁 نغنوغ هدية من المطوّر إلكم ❤️\n\n━━━━━━━━━━━━━━━━━━\n\n📩 عندك استفسار؟ أو عندك فكرة لميزة جديدة؟\n💡 تگدر تراسل المطوّر مباشرة من خلال الزر الموجود بالأسفل 👇🏻\n\n🐈‍⬛ نغنوغ وياكم! 🐾❤️`;

async function safeEdit(ctx, text, reply_markup, parse_mode) {
  const options = { reply_markup, ...(parse_mode ? { parse_mode } : {}) };
  try { await ctx.editMessageText(text, options); }
  catch { await ctx.reply(text, options); }
}

async function showOwnerPanel(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
  await safeEdit(ctx, '╭━━━〔 👑 لوحة مالك نغنوغ 〕━━━╮\n\nأهلاً بك في مركز إدارة البوت.', ownerKeyboard());
}

async function answer(ctx, text, extra = {}) {
  if (ctx.callbackQuery) {
    try { await ctx.answerCallbackQuery(); } catch {}
    if (extra.reply_markup) return safeEdit(ctx, text, extra.reply_markup, extra.parse_mode);
    return safeEdit(ctx, text, new InlineKeyboard().text('🔙 رجوع', 'home'), extra.parse_mode);
  }
  return ctx.reply(text, extra);
}

async function userIsAdmin(chatId, userId) {
  try {
    const m = await bot.api.getChatMember(chatId, userId);
    return ['administrator', 'creator'].includes(m.status);
  } catch { return false; }
}

async function userCanManage(ctx, g) {
  if (isOwner(ctx)) return true;
  if (String(g.activatedBy) === userKey(ctx) || (g.admins || []).includes(userKey(ctx))) return true;
  return await userIsAdmin(g.id, ctx.from.id);
}

async function checkSubscription(userId) {
  const missingChannels = [];
  for (const ch of db.requiredChats) {
    try {
      const m = await bot.api.getChatMember(ch.id, Number(userId));
      const ok = ['member', 'administrator', 'creator'].includes(m.status) || (m.status === 'restricted' && m.is_member);
      if (!ok) missingChannels.push(ch);
    } catch (e) {
      missingChannels.push(ch);
    }
  }
  return { ok: missingChannels.length === 0, missingChannels };
}

async function subscriptionGate(ctx) {
  if (isOwner(ctx) || !isPrivate(ctx) || db.requiredChats.length === 0) return true;
  const result = await checkSubscription(ctx.from.id);
  if (result.ok) return true;
  const kb = new InlineKeyboard();
  for (const ch of result.missingChannels) {
    if (ch?.url) kb.url(`🔗 اشترك في: ${ch.title || 'قناة'}`, ch.url).row();
  }
  kb.text('✅ تحققت من الاشتراكات', 'checksubscription');
  const text = `🔒 عذراً، لاستخدام بوت (نغنوغ)، يجب عليك الاشتراك في القنوات والمجموعات المطلوبة أولاً:`;
  if (ctx.callbackQuery) await safeEdit(ctx, text, kb);
  else await ctx.reply(text, { reply_markup: kb });
  return false;
}

function selectedGroupKeyboard(ctx) {
  const kb = new InlineKeyboard();
  const entries = Object.values(db.groups).filter(g => g.activated && (isOwner(ctx) || String(g.activatedBy) === userKey(ctx) || (g.admins || []).includes(userKey(ctx))));
  for (const g of entries) kb.text(`👥 ${g.title}`, `choosegroup:${g.id}`).row();
  kb.text('🔙 رجوع', 'home');
  return { kb, entries };
}

async function showGroups(ctx) {
  const { kb, entries } = selectedGroupKeyboard(ctx);
  if (!entries.length) return answer(ctx, customText(ctx, 'replies', 'nogroups'));
  return answer(ctx, uiText(ctx, 'groups', '👥 قسم مجموعاتي | 🐈‍⬛\n\nمن هنا تكدر تستعرض مجموعاتك المفعّلة ويا نغنوغ، وتختار المجموعة اللي تريد تشوف تفاصيلها وتتحكم بالخيارات المتاحة إلها. ❤️\n\n━━━━━━━━━━━━━━━━━━\n\n👇🏻 اختار المجموعة من الأسفل. 🐾'), { reply_markup: kb });
}

async function showGroupSettings(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار مجموعتك أولاً.');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة هذه المجموعة متاحة لمشرفيها فقط.');
  setSelected(ctx, g.id);
  return answer(ctx, `╭━━━〔 ⚙️ إعدادات المجموعة 〕━━━╮\n\n-︰اسم المجموعة : ❨ ${g.title} ❩\n\n${customText(ctx, 'descriptions', 'settings') || 'اختَر الإعداد الذي تريد تغييره من الأزرار أدناه.'}\n\n╰━━━━━━━━━━━━━━━━━━━━╯`, { reply_markup: groupSettingsKeyboard(g) });
}

async function showGroupStats(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار المجموعة أولاً.');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'الإحصائيات متاحة لمشرفيها فقط.');
  let members = 'غير متاح';
  try { members = String(await bot.api.getChatMemberCount(g.id)); } catch {}
  const s = g.stats;
  const text = `╭━━━〔 📊 إحصائيات المجموعة 〕━━━╮\n\n-︰اسم المجموعة : ❨ ${g.title} ❩\n-︰عدد الأعضاء : ❨ ${members} ❩\n-︰عدد الرسائل : ❨ ${s.messages} ❩\n\n╰━━━━━━━━━━━━━━━━━━━━╯`;
  return answer(ctx, text, { reply_markup: new InlineKeyboard().text('🔄 تحديث', 'groupstats').text('⚙️ إعدادات المجموعة', 'groupsettings') });
}

async function showReplyList(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار مجموعة أولاً.');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'ما عندك صلاحية.');
  if (!g.replies.length) return answer(ctx, '📋 ماكو ردود تلقائية مضافة.', { reply_markup: repliesKeyboard() });
  const body = g.replies.map((r, i) => `${i + 1}. «${r.trigger}» ➜ ${r.response}`).join('\n\n');
  return answer(ctx, `💬 الردود التلقائية:\n\n${body}`, { reply_markup: repliesKeyboard() });
}

function pending(ctx, value) { db.pending[userKey(ctx)] = value; save(); }
function clearPending(ctx) { delete db.pending[userKey(ctx)]; save(); }

async function ownerRequiredMenu(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.');
  const kb = new InlineKeyboard().text('➕ إضافة قناة/مجموعة', 'requiredadd').text('📋 عرض المضاف', 'requiredlist').row().text('↩️ لوحة المالك', 'ownerpanel');
  return answer(ctx, `📢 إدارة الاشتراك الإجباري\n\nالقنوات والمجموعات المضافة: ${db.requiredChats.length}`, { reply_markup: kb });
}

async function showRequiredList(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.');
  if (!db.requiredChats.length) return answer(ctx, 'ماكو قنوات أو مجموعات مضافة.', { reply_markup: new InlineKeyboard().text('➕ إضافة قناة', 'requiredadd').text('↩️ رجوع', 'requiredmenu') });
  const kb = new InlineKeyboard();
  db.requiredChats.forEach((ch, i) => kb.text(`🗑️ حذف ${ch.title || ch.username || ch.id}`, `reqdel:${i}`).row());
  kb.text('➕ إضافة قناة أخرى', 'requiredadd').row().text('🔙 رجوع', 'requiredmenu');
  return answer(ctx, `📋 قنوات ومجموعات الاشتراك الإجباري`, { reply_markup: kb });
}

const PROFILE_PHRASES = [
  'الحلو مالتنا وصل 😻❤️', 'يا بعد عيون نغنوغ إنت 🐾💕', 'ولك شهلطلة هاي، منوّر الدنيا 😂❤️',
  'نغنوغ يشهد إنك من الناس اللي ترفع الراس 😼✨', 'وجودك وحده يخلّي المجموعة أحلى ❤️🐾',
  'يا زين الطلّة ويا حلو الحضور 🌟', 'إذا الحلاوة تنحسب نقاط، إنت متصدر التوب 😂🏆',
  'أهل الذوق وصلوا، نورت يا غالي 💎', 'وجه الخير هذا، الله يديم ضحكتك 🫶🏻',
  'نغنوغ اختارك من قائمة المميزين اليوم 😻👑'
];

async function showProfileCard(ctx, g, targetUser = null) {
  const user = targetUser || ctx.message?.reply_to_message?.from || ctx.from;
  if (!user || user.is_bot) return ctx.reply('ما أگدر أطلع بطاقة لهذا الحساب.');
  const id = String(user.id);
  const chatId = String(g?.id || ctx.chat?.id || '');
  const scores = db.groupPoints?.[chatId] || {};
  const points = Number(scores[id] ?? db.points?.[id] ?? 0);
  const messages = Number(g?.userStats?.[id]?.messages || 0);
  const sakhakat = Number(g?.userStats?.[id]?.sakhakat || 0);

  let groupRole = 'عضو';
  try {
    if (g?.id || ctx.chat?.id) {
      const memberInfo = await ctx.api.getChatMember(g?.id || ctx.chat.id, Number(id));
      if (memberInfo.status === 'creator') groupRole = 'مالك المجموعة 👑';
      else if (memberInfo.status === 'administrator') groupRole = 'مشرف 🛡️';
      else if (g?.admins?.includes(id)) groupRole = 'مشرف نغنوغ ⚙️';
      else if (memberInfo.status === 'restricted') groupRole = 'عضو مقيّد 🔇';
      else if (memberInfo.status === 'left' || memberInfo.status === 'kicked') groupRole = 'ليس عضواً حالياً 🚪';
    }
  } catch {
    if (g?.admins?.includes(id)) groupRole = 'مشرف نغنوغ ⚙️';
  }

  const username = user.username ? `@${user.username}` : 'لا يوجد';
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'غير متاح';
  const caption = `🐾 بطاقة نغنوغ\n-︰أسمك : ❨ ${displayName} ❩\n-︰معرفك : ❨ ${username} ❩\n-︰ايديك : ❨ ${id} ❩\n-︰رتبتك : ❨ ${groupRole} ❩\n-︰رسائلك : ❨ ${messages} ❩\n-︰نقاطك : ❨ ${points} ❩\n-︰سحكاتك : ❨ ${sakhakat} ❩`;
  // زر ثابت يفتح حساب صاحب البوت من بطاقة العضو.
  const profileLinkKeyboard = new InlineKeyboard().url('𓆩♡ مـشـمـشہ 𓆪', 'https://t.me/llll6llll6');

  try {
    const photos = await ctx.api.getUserProfilePhotos(Number(id), { limit: 1 });
    const fileId = photos.photos?.[0]?.at(-1)?.file_id;
    if (fileId) {
      await ctx.replyWithPhoto(fileId, {
        caption,
        has_spoiler: true,
        reply_markup: profileLinkKeyboard,
        ...(ctx.message?.message_id ? { reply_to_message_id: ctx.message.message_id } : {})
      });
      return;
    }
  } catch (err) {
    console.warn('[profile-card] Could not send blurred profile photo:', err?.description || err?.message || err);
  }
  return ctx.reply(caption, { reply_markup: profileLinkKeyboard, ...(ctx.message?.message_id ? { reply_to_message_id: ctx.message.message_id } : {}) });
}

async function handleViolation(ctx, g, reason) {
  const userId = userKey(ctx);
  const name = ctx.from?.first_name || 'عضو';
  const settings = g.warningSettings || (g.warningSettings = { enabled: false, limit: 3, action: 'mute', duration: 10 });
  if (!settings.enabled || !userId || String(userId) === String(bot.botInfo?.id)) return;
  g.warnings ||= {};
  g.warnings[userId] ||= { count: 0, name };
  g.warnings[userId].count = Number(g.warnings[userId].count || 0) + 1;
  g.warnings[userId].name = name;
  g.warningLog ||= [];
  g.warningLog.push({ userId, name, reason, count: g.warnings[userId].count, date: new Date().toISOString() });
  if (g.warningLog.length > 200) g.warningLog = g.warningLog.slice(-200);
  const count = g.warnings[userId].count;
  const limit = Math.max(1, Number(settings.limit) || 3);
  save();
  try { await ctx.reply(`⚠️ تحذير للعضو ${name} (${count}/${limit})\nالسبب: ${reason}`); } catch {}
  if (count < limit || settings.action === 'none') return;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, Number(userId));
    if (['administrator', 'creator'].includes(member.status) || ctx.from?.is_bot) return;
    if (settings.action === 'mute') {
      const mins = Math.max(1, Number(settings.duration) || 10);
      const until = Math.floor(Date.now() / 1000) + mins * 60;
      await ctx.api.restrictChatMember(ctx.chat.id, Number(userId), {
        can_send_messages: false, can_send_audios: false, can_send_documents: false,
        can_send_photos: false, can_send_videos: false, can_send_video_notes: false,
        can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false,
        can_add_web_page_previews: false
      }, { until_date: until });
      await ctx.reply(`🔇 تم كتم ${name} لمدة ${mins} دقيقة بعد بلوغه حد التحذيرات.`);
    } else if (settings.action === 'kick') {
      await ctx.api.banChatMember(ctx.chat.id, Number(userId));
      await ctx.api.unbanChatMember(ctx.chat.id, Number(userId));
      await ctx.reply(`🚪 تم طرد ${name} بعد بلوغه حد التحذيرات.`);
    } else if (settings.action === 'ban') {
      await ctx.api.banChatMember(ctx.chat.id, Number(userId));
      await ctx.reply(`⛔ تم حظر ${name} بعد بلوغه حد التحذيرات.`);
    }
    g.warnings[userId].count = 0;
    save();
  } catch (error) {
    console.warn('Warning punishment failed:', error?.description || error?.message || error);
    try { await ctx.reply('⚠️ وصل العضو إلى حد التحذيرات، لكن تعذر تنفيذ العقوبة. تأكد أن نغنوغ مشرف ويملك صلاحية تقييد الأعضاء.'); } catch {}
  }
}

  return {
    isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor,
    selectedGroup, setSelected, getCustomization, applyGlobalCustomizationChange: (kind, from, to) => applyGlobalCustomizationChange(db, DEFAULT_CUSTOMIZATION, kind, from, to), customText, getHomeKeyboard,
    HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate,
    selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats,
    showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList,
    showProfileCard, handleViolation, showOwnerPanel, PROFILE_PHRASES, uiText
  };
}
