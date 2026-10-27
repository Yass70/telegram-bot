import fs from 'node:fs';
import { Bot, InlineKeyboard } from 'grammy';
import { setupCommands } from './commands.js';

import {
  mainKeyboard,
  helpKeyboard,
  ownerKeyboard,
  warningsKeyboard,
  groupSettingsKeyboard,
  repliesKeyboard,
  customizationKeyboard
} from './keyboards.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = String(process.env.BOT_OWNER_ID || '').trim();
const DATA_FILE = './bot_data.json';
if (!TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
if (!OWNER_ID) console.warn('Warning: BOT_OWNER_ID is not set; owner-only features will be unavailable.');

const bot = new Bot(TOKEN);

bot.catch((err) => {
  console.error(`Error happened in bot catch:`, err);
});

const freshGroup = () => ({
  id: '', title: '', activated: false, activatedBy: '', admins: [], activatedAt: null,
  links: false, flood: false, welcomeEnabled: true, autoReply: true,
  linksLock: false, mediaLock: false, badWordsLock: false, audioLock: false, audioClipsLock: false, forwardLock: false, contactsLock: false,
  closedMessages: false,
  welcomeText: '╭━━━〔 🐈‍⬛ نغنوغ يرحّب بيك 〕━━━╮\nأهلاً وسهلاً بـ {name} ❤️\nنورت مجموعة «{title}» بوجودك، وإن شاء الله تقضي ويانه أحلى الأوقات.\nاعتبر نفسك بين أهلك وناسك 🐾\n╰━━━━━━━━━━━━━━━━━━╯',
  badWords: [],
  stats: { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 },
  warningSettings: { enabled: false, limit: 3, action: 'mute', duration: 10 },
  warnings: {},
  userStats: {},
  knownMembers: {},
  recentMessages: [],
  warningLog: [],
  floodUsers: {},
  game: null
});

const freshDB = () => ({
  groups: {},
  selected: {},
  protectionBack: {},
  pending: {},
  users: [],
  privateUsers: [],
  requiredChats: [],
  points: {},
  groupPoints: {},
  activeGames: {},
  customizations: {},
  stats: { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 }
});

let db = freshDB();
function save() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8'); }
  catch (e) { console.error('Could not save database:', e); }
}

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const old = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    db = { ...freshDB(), ...old };
    db.groups ||= {}; db.selected ||= {}; db.protectionBack ||= {}; db.pending ||= {}; db.users ||= []; db.privateUsers ||= []; db.requiredChats ||= [];
    db.stats = { ...freshDB().stats, ...(db.stats || {}) };
    db.points ||= {};
    db.groupPoints ||= {};
    db.activeGames ||= {};
    db.customizations ||= {};
    for (const [id, oldGroup] of Object.entries(db.groups)) {
      const g = { ...freshGroup(), ...oldGroup };
      g.id ||= id; g.replies ||= []; g.admins ||= [];
      // الروابط لها حالة واحدة مشتركة مع الحقل القديم links للتوافق مع البيانات السابقة.
      g.linksLock = Boolean(oldGroup.linksLock === undefined ? g.links : oldGroup.linksLock);
      g.links = g.linksLock;
      // خيار الصوتيات في الواجهة موحّد؛ نحافظ على توافق الحقلين القديمين.
      const audioEnabled = Boolean(oldGroup.audioLock === undefined ? oldGroup.audioClipsLock : oldGroup.audioLock);
      g.audioLock = audioEnabled;
      g.audioClipsLock = audioEnabled;
      g.userStats ||= {};
      g.knownMembers ||= {};
      g.recentMessages ||= [];
      g.badWords ||= [];
      g.stats = { ...freshGroup().stats, ...(g.stats || {}) };
      g.floodUsers ||= {};
      g.warningSettings = { enabled: false, limit: 3, action: 'mute', duration: 10, ...(g.warningSettings || {}) };
      g.warnings ||= {};
      g.warningLog ||= [];
      db.groups[id] = g;
    }
  } catch (e) { console.error('Could not read database; starting with fresh data:', e); }
}
load();

const isOwner = (ctx) => !!ctx.from && String(ctx.from.id) === OWNER_ID;
const isPrivate = (ctx) => ctx.chat?.type === 'private';
const isGroup = (ctx) => ['group', 'supergroup'].includes(ctx.chat?.type);
const userKey = (ctx) => String(ctx.from?.id || '');

function ensureUser(ctx) {
  const id = userKey(ctx);
  if (!id) return;
  let changed = false;
  if (!db.users.includes(id)) { db.users.push(id); changed = true; }
  if (isPrivate(ctx)) {
    db.privateUsers ||= [];
    if (!db.privateUsers.includes(id)) { db.privateUsers.push(id); changed = true; }
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
  uiTexts: { management: '⚙️ قسم الإدارة 🐈‍⬛\n\nهنا تكدر تتعرّف على أوامر نغنوغ، والألعاب المتوفرة، والردود التفاعلية، وطريقة استخدامها داخل المجموعة. ❤️', groups: '👥 قسم مجموعاتي | 🐈‍⬛\n\nمن هنا تكدر تستعرض مجموعاتك المفعّلة ويا نغنوغ، وتختار المجموعة اللي تريد تشوف تفاصيلها وتتحكم بالخيارات المتاحة إلها. ❤️\n\n━━━━━━━━━━━━━━━━━━\n\n👇🏻 اختار المجموعة من الأسفل. 🐾', customMenu: '╭━━━〔 🎨 تخصيص نغنوغ 〕━━━╮\n\nمن هنا تكدر تخصّص النصوص وأسماء الأزرار اللي تظهر إلك بالخاص فقط.\n✦ تعديلاتك شخصية وما تغيّر واجهة بقية المستخدمين أو إعدادات المجموعات.\n\n╰━━━━━━━━━━━━━━━━━━╯' },
  startText: '🐈‍⬛ أهلاً بيك! أني بوت نغنوغ 🐾❤️\n\n🤖 وظيفتي أساعدك بحماية وإداره مجموعتك،\n\n🛡️ حماية المجموعة من السبام والمخالفات.\n⚙️ أدوات إدارة حسب الصلاحيات الممنوحة إليّ.\n🎮 ألعاب وتحديات ترفيهية.\n🏆 نظام نقاط وإحصائيات للأعضاء.\n⚠️ تحذيرات وعقوبات للمخالفين.\n💬 ردود تلقائية ومخصصة حسب رغبتكم.\n\n━━━━━━━━━━━━━━━━━━\n\n🎁 بالمناسبة، أني مجاني بالكامل، هدية من المطوّر إلكم! ❤️‍🔥\n\nإختر القسم اللي تحتاجه من الإسفل، وخلي الباقي عليّ! 🐈‍⬛🐾',
  descriptions: {
    settings: '⚙️ قسم الإدارة 🐈‍⬛\n\nهنا تكدر تتعرّف على أوامر نغنوغ، والألعاب المتوفرة، والردود التفاعلية، وطريقة استخدامها داخل المجموعة. ❤️',
    groups: '👥 قسم مجموعاتي | 🐈‍⬛\n\nمن هنا تكدر تستعرض مجموعاتك المفعّلة ويا نغنوغ، وتختار المجموعة اللي تريد تشوف تفاصيلها وتتحكم بالخيارات المتاحة إلها. ❤️\n\n━━━━━━━━━━━━━━━━━━\n\n👇🏻 اختار المجموعة من الإسفل. 🐾',
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
  if (!db.customizations[id]) {
    db.customizations[id] = JSON.parse(JSON.stringify(DEFAULT_CUSTOMIZATION));
  } else {
    const saved = db.customizations[id];
    saved.descriptions ||= {};
    saved.replies ||= {};
    saved.labels ||= {};
    saved.uiTexts ||= {};
    if (typeof saved.helpText !== 'string') saved.helpText = '';
    saved.labels = { ...DEFAULT_CUSTOMIZATION.labels, ...saved.labels };
    saved.uiTexts = { ...DEFAULT_CUSTOMIZATION.uiTexts, ...saved.uiTexts };
    if (typeof saved.startText !== 'string' || saved.startText === '╭━━━〔 🐈‍⬛ نَغْنُوغ 🐾 〕━━━╮\n\nأهلاً وسهلاً بيك بعالم نغنوغ ❤️\nمساعدك الذكي لإدارة المجموعة وتنظيمها وحمايتها.\n\n✦ اختَر القسم المناسب من القائمة أدناه للبدء.\n\n╰━━━━━━━━━━━━━━━━━━╯') saved.startText = DEFAULT_CUSTOMIZATION.startText;
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
function uiText(ctx, key, fallback) { const value = getCustomization(ctx).uiTexts?.[key]; return typeof value === 'string' && value.trim() ? value : fallback; }

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

async function safeEdit(ctx, text, reply_markup) {
  try { await ctx.editMessageText(text, { reply_markup }); }
  catch { await ctx.reply(text, { reply_markup }); }
}

async function showOwnerPanel(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
  await safeEdit(ctx, '╭━━━〔 👑 لوحة مالك نغنوغ 〕━━━╮\n\nأهلاً بك في مركز إدارة البوت.', ownerKeyboard());
}

async function answer(ctx, text, extra = {}) {
  if (ctx.callbackQuery) {
    try { await ctx.answerCallbackQuery(); } catch {}
    if (extra.reply_markup) return safeEdit(ctx, text, extra.reply_markup);
    return safeEdit(ctx, text, new InlineKeyboard().text('🔙 رجوع', 'home'));
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
  return answer(ctx, `⚙️ إعدادات مجموعة: ${g.title}\n\n${customText(ctx, 'descriptions', 'settings') || ''}`, { reply_markup: groupSettingsKeyboard(g) });
}

async function showGroupStats(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار المجموعة أولاً.');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'الإحصائيات متاحة لمشرفيها فقط.');
  let members = 'غير متاح';
  try { members = String(await bot.api.getChatMemberCount(g.id)); } catch {}
  const s = g.stats;
  const text = `📊 إحصائيات ${g.title}\n\n👥 الأعضاء: ${members}\n💬 الرسائل: ${s.messages}`;
  return answer(ctx, text, { reply_markup: new InlineKeyboard().text('🔄 تحديث', 'groupstats').row().text('🔙 إعدادات المجموعة', 'groupsettings') });
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
  const kb = new InlineKeyboard().text('➕ إضافة قناة أو مجموعة', 'requiredadd').row().text('📋 عرض القنوات والمجموعات', 'requiredlist').row().text('🔙 لوحة المالك', 'ownerpanel');
  return answer(ctx, `📢 إدارة الاشتراك الإجباري\n\nالقنوات والمجموعات المضافة: ${db.requiredChats.length}`, { reply_markup: kb });
}

async function showRequiredList(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.');
  if (!db.requiredChats.length) return answer(ctx, 'ماكو قنوات أو مجموعات مضافة.', { reply_markup: new InlineKeyboard().text('➕ إضافة قناة', 'requiredadd').row().text('🔙 رجوع', 'requiredmenu') });
  const kb = new InlineKeyboard();
  db.requiredChats.forEach((ch, i) => kb.text(`🗑️ حذف ${ch.title || ch.username || ch.id}`, `reqdel:${i}`).row());
  kb.text('➕ إضافة قناة أخرى', 'requiredadd').row().text('🔙 رجوع', 'requiredmenu');
  return answer(ctx, `📋 قنوات ومجموعات الاشتراك الإجباري`, { reply_markup: kb });
}

const PROFILE_PHRASES = [
  'الحلو مالتنا وصل 😻❤️', 'يا بعد عيون نغنوغ إنت 🐾💕', 'ولك شهلطلة هاي، منوّر الدنيا 😂❤️'
];

async function showProfileCard(ctx, g, targetUser = null) {
  const user = targetUser || ctx.message?.reply_to_message?.from || ctx.from;
  if (!user || user.is_bot) return ctx.reply('ما أگدر أطلع بطاقة لهذا الحساب.');
  const id = String(user.id);
  const name = [user.first_name || user.name, user.last_name].filter(Boolean).join(' ') || 'عضو';
  const username = user.username ? `@${user.username}` : 'ما عنده يوزر';
  const chatId = String(g?.id || ctx.chat?.id || '');
  const scores = db.groupPoints?.[chatId] || {};
  const points = Number(scores[id] ?? db.points?.[id] ?? 0);
  const sortedIds = Object.entries(scores).sort((a, b) => Number(b[1]) - Number(a[1])).map(([userId]) => userId);
  const rank = sortedIds.indexOf(id) >= 0 ? sortedIds.indexOf(id) + 1 : null;
  const warnings = Number(g?.warnings?.[id]?.count || 0);
  const messages = Number(g?.userStats?.[id]?.messages || 0);
  const lastSeen = Number(g?.knownMembers?.[id]?.seenAt || 0);
  const activity = lastSeen && Date.now() - lastSeen < 7 * 24 * 60 * 60 * 1000 ? '🟢 متفاعل خلال آخر 7 أيام' : '⚪ ما رصدنا له تفاعلاً خلال آخر 7 أيام';
  let groupRole = 'عضو';
  try {
    if (g?.id || ctx.chat?.id) {
      const memberInfo = await ctx.api.getChatMember(g?.id || ctx.chat.id, Number(id));
      if (memberInfo.status === 'creator') groupRole = '👑 مالك المجموعة';
      else if (memberInfo.status === 'administrator') groupRole = '🛡️ مشرف تيليگرام';
      else if (g?.admins?.includes(id)) groupRole = '⚙️ مشرف نغنوغ';
      else if (memberInfo.status === 'restricted') groupRole = '🔇 عضو مقيّد';
      else if (memberInfo.status === 'left' || memberInfo.status === 'kicked') groupRole = '🚪 ليس عضواً حالياً';
    }
  } catch { if (g?.admins?.includes(id)) groupRole = '⚙️ مشرف نغنوغ'; }
  const phrase = PROFILE_PHRASES[Math.floor(Math.random() * PROFILE_PHRASES.length)];
  const caption = `🐾 بطاقة عضو — نغنوغ\n\n👤 الاسم: ${name}\n🔗 المستخدم: ${username}\n🆔 Telegram ID: ${id}\n🎖️ الرتبة داخل المجموعة: ${groupRole}\n🏅 الترتيب بالنقاط: ${rank ? `#${rank}` : 'بعده ما دخل قائمة المتصدرين'}\n⭐ نقاط الألعاب بهذه المجموعة: ${points}\n💬 الرسائل التي رصدها البوت: ${messages}\n⚠️ التحذيرات المسجلة: ${warnings}\n📈 التفاعل: ${activity}\n📝 النبذة الشخصية: غير متاحة عبر Telegram Bot API\n\n💬 ${phrase}`;
  try {
    const photos = await bot.api.getUserProfilePhotos(user.id, { limit: 1 });
    const fileId = photos.photos?.[0]?.at(-1)?.file_id;
    if (fileId) {
      await ctx.replyWithPhoto(fileId, { caption, reply_to_message_id: ctx.message.message_id });
      return;
    }
  } catch {}
  await ctx.reply(caption, { reply_to_message_id: ctx.message.message_id });
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

// تفعيل ملف الأوامر المنفصل
setupCommands(bot, db, {
  isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor,
  selectedGroup, setSelected, getCustomization, customText, getHomeKeyboard,
  HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate,
  selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats,
  showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList,
  showProfileCard, handleViolation, showOwnerPanel, PROFILE_PHRASES, uiText
});

bot.start();
