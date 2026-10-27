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
  welcomeText: '🐾 أهلاً وسهلاً بـ {name} ❤️ نورت مجموعة {title}، نتمنى لك وقتاً ممتعاً ويانه!',
  badWords: [],
  stats: { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 },
  warningSettings: { enabled: false, limit: 3, action: 'mute', duration: 10 },
  warnings: {},
  userStats: {},
  knownMembers: {},
  warningLog: [],
  floodUsers: {},
  game: null
});

const freshDB = () => ({
  groups: {},
  selected: {},
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
    db.groups ||= {}; db.selected ||= {}; db.pending ||= {}; db.users ||= []; db.privateUsers ||= []; db.requiredChats ||= [];
    db.stats = { ...freshDB().stats, ...(db.stats || {}) };
    db.points ||= {};
    db.groupPoints ||= {};
    db.activeGames ||= {};
    db.customizations ||= {};
    for (const [id, oldGroup] of Object.entries(db.groups)) {
      const g = { ...freshGroup(), ...oldGroup };
      g.id ||= id; g.replies ||= []; g.admins ||= [];
      if (oldGroup.linksLock === undefined) g.linksLock = !!g.links;
      g.userStats ||= {};
      g.knownMembers ||= {};
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
  startText: '🐈‍⬛ هلا بيك بعالم نغنوغ! 🐾❤️\n\nبوت لإدارة المجموعات وحمايتها وتنظيمها.\n\nاختار القسم المناسب من القائمة أدناه حتى تبدأ.',
  descriptions: {
    settings: '⚙️ إعدادات المجموعة: التحكم بميزات الإدارة والحماية.',
    groups: '👥 مجموعاتي: عرض المجموعات المفعّلة وإدارتها.',
    account: '👤 معلومات حسابي: عرض معلومات حسابك.',
    replies: '💬 الردود التلقائية: الوصول إلى قسم الردود.'
  },
  replies: {
    account: '👤 معلومات حسابك',
    replies: '💬 الردود التلقائية',
    nogroups: 'ما عندي مجموعة مفعّلة ظاهرة إلك حالياً.'
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
    if (typeof saved.startText !== 'string') saved.startText = DEFAULT_CUSTOMIZATION.startText;
  }
  return db.customizations[id];
}

function customText(ctx, section, key) {
  const c = getCustomization(ctx);
  return section === 'startText' ? c.startText : c[section]?.[key];
}

function getHomeKeyboard(ctx) {
  const kb = mainKeyboard(ctx, bot);
  const hasCustomizationButton = (kb.inline_keyboard || []).some(row =>
    row.some(button => button.callback_data === 'custommenu')
  );
  if (!hasCustomizationButton) kb.row().text('🎨 تخصيص البوت', 'custommenu');
  if (isOwner(ctx)) {
    kb.row().text('🔒 الاشتراك الإجباري', 'requiredmenu').text('👑 لوحة المالك', 'ownerpanel');
  }
  return kb;
}

const HELP_TEXT = `🐈‍⬛ أهلاً بيك بعالم نغنوغ! 🐾❤️\n\nنغنوغ بوت لإدارة المجموعات وحمايتها...`;

async function safeEdit(ctx, text, reply_markup) {
  try { await ctx.editMessageText(text, { reply_markup }); }
  catch { await ctx.reply(text, { reply_markup }); }
}

async function showOwnerPanel(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
  await safeEdit(ctx, '👑 لوحة المالك — نغنوغ 🐾', ownerKeyboard());
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
  return answer(ctx, `${customText(ctx, 'descriptions', 'groups') || '👥 مجموعاتي'}\n\nاختار المجموعة اللي تريد تديرها:`, { reply_markup: kb });
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
  const name = ctx.from.first_name || 'عضو';
  g.warnings ||= {};
  g.warnings[userId] ||= { count: 0, name };
  g.warnings[userId].count += 1;
  g.warningLog ||= [];
  g.warningLog.push({ userId, name, reason, date: new Date().toISOString() });
  save();
}

// تفعيل ملف الأوامر المنفصل
setupCommands(bot, db, {
  isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor,
  selectedGroup, setSelected, getCustomization, customText, getHomeKeyboard,
  HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate,
  selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats,
  showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList,
  showProfileCard, handleViolation, showOwnerPanel, PROFILE_PHRASES
});

bot.start();
