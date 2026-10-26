import fs from 'node:fs';
import { Bot, InlineKeyboard } from 'grammy';

import {
  GROUP_RULES,
  NORMAL_MEMBER_RULES_REPLY,
  findAutoReply
} from './autoReplies.js';

import { startNewGame, handleGameMessage, normalizeGameAnswer } from './game.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = String(process.env.BOT_OWNER_ID || '').trim();
const DATA_FILE = './bot_data.json';
if (!TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
if (!OWNER_ID) console.warn('Warning: BOT_OWNER_ID is not set; owner-only features will be unavailable.');

const bot = new Bot(TOKEN);
const freshGroup = () => ({
  id: '', title: '', activated: false, activatedBy: '', admins: [], activatedAt: null,
  links: false, flood: false, welcomeEnabled: true, autoReply: true,
  welcomeText: 'أهلاً بيك {name} ❤️ نورت مجموعة {title}', replies: [],
  badWords: [],
  stats: { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 },

  warningSettings: {
    enabled: false,
    limit: 3,
    action: 'mute',
    duration: 10
  },
  warnings: {},
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
  stats: {
    messages: 0,
    deletedLinks: 0,
    floodEvents: 0,
    welcomed: 0
  }
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
    for (const [id, oldGroup] of Object.entries(db.groups)) {
      const g = { ...freshGroup(), ...oldGroup };
      g.id ||= id; g.replies ||= []; g.admins ||= [];
      g.badWords ||= [];
      g.stats = { ...freshGroup().stats, ...(g.stats || {}) };
      g.floodUsers ||= {};
      g.warningSettings = {
        enabled: false,
        limit: 3,
        action: 'mute',
        duration: 10,
        ...(g.warningSettings || {})
      };

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
  if (!db.users.includes(id)) {
    db.users.push(id);
    changed = true;
  }
  if (isPrivate(ctx)) {
    db.privateUsers ||= [];
    if (!db.privateUsers.includes(id)) {
      db.privateUsers.push(id);
      changed = true;
    }
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

function mainKeyboard(ctx) {
  const botUsername = bot.botInfo?.username || 'YZ_VIDbot';
  const kb = new InlineKeyboard()
    .url('➕ أضفني للمجموعة', `https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+pin_messages`)
    .text('⚙️ إعدادات المجموعة', 'groupsettings').text('👥 مجموعاتي', 'mygroups').row()
    .text('👤 معلومات حسابي', 'accountinfo').text('💬 الردود التلقائية', 'userreplies').row()
    .text('📖 المساعدة', 'help');
  if (isOwner(ctx)) kb.row().text('🔒 الاشتراك الإجباري', 'requiredmenu').text('👑 لوحة المالك', 'ownerpanel');
  return kb;
}

const HELP_TEXT = `🐈‍⬛ أهلاً بيك بعالم نغنوغ! 🖤✨\n\nوظيفتي حماية وإدارة المجموعات 🐾`;

function helpKeyboard(ctx) {
  return new InlineKeyboard().text('🔙 القائمة الرئيسية', 'home').url('👤 حسابي', 'https://t.me/llll6llll6');
}
function ownerKeyboard() {
  return new InlineKeyboard()
    .text('📊 إحصائيات البوت', 'botstats').row()
    .text('👥 المجموعات المفعّلة', 'activatedgroups').row()
    .text('⚙️ إعدادات البوت', 'botsettings').row()
    .text('🛡️ إعدادات الحماية العامة', 'globalprotection').row()
    .text('📢 إدارة الاشتراك الإجباري', 'requiredmenu').row()
    .text('🔙 القائمة الرئيسية', 'home');
}

function warningsKeyboard(g) {
  const w = g.warningSettings || { enabled: false, limit: 3, action: 'mute', duration: 10 };
  const actionNames = { none: 'بدون إجراء', mute: 'كتم', kick: 'طرد', ban: 'حظر' };

  return new InlineKeyboard()
    .text(`${w.enabled ? '🟢' : '⚪'} نظام التحذيرات: ${w.enabled ? 'مفعّل' : 'متوقف'}`, 'warningstoggle').row()
    .text(`🔢 عدد التحذيرات: ${w.limit}`, 'warningslimit').row()
    .text(`⚖️ العقوبة: ${actionNames[w.action] || 'كتم'}`, 'warningsaction').row()
    .text(`⏱️ مدة الكتم: ${w.duration} دقيقة`, 'warningsduration').row()
    .text('🚫 إدارة الكلمات الممنوعة', 'badwordsmenu').row()
    .text('📋 سجل التحذيرات', 'warningslog').row()
    .text('🧹 تصفير تحذيرات عضو', 'warningsclear').row()
    .text('🔙 رجوع لإعدادات المجموعة', 'groupsettings');
}

function groupSettingsKeyboard(g) {
  return new InlineKeyboard()
    .text('👋 تعديل رسالة الترحيب', 'welcomeedit').row()
    .text(`${g.links ? '🟢' : '⚪'} منع الروابط: ${g.links ? 'مفعّل' : 'متوقف'}`, 'togglelinks').row()
    .text(`${g.flood ? '🟢' : '⚪'} منع السبام: ${g.flood ? 'مفعّل' : 'متوقف'}`, 'toggleflood').row()
    .text(`${g.autoReply ? '🟢' : '⚪'} الردود التلقائية: ${g.autoReply ? 'مفعّلة' : 'متوقفة'}`, 'togglereplies').row()
    .text('🛡️ التحذيرات والعقوبات', 'warningsmenu').row()
    .text('💬 إدارة الردود التلقائية', 'repliesmenu').row()
    .text('📊 إحصائيات المجموعة', 'groupstats').row()
    .text('🔙 رجوع', 'home');
}

function repliesKeyboard() {
  return new InlineKeyboard().text('➕ إضافة رد', 'replyadd').row()
    .text('📋 عرض الردود', 'replylist').row()
    .text('🗑️ حذف رد', 'replydelete').row()
    .text('🔙 رجوع لإعدادات المجموعة', 'groupsettings');
}

async function safeEdit(ctx, text, reply_markup) {
  try { await ctx.editMessageText(text, { reply_markup }); }
  catch { await ctx.reply(text, { reply_markup }); }
}
async function showHome(ctx) {
  await safeEdit(ctx, 'أهلاً بك في بوت نغنوغ 🐈‍⬛\n\nوظيفتي حماية وإدارة المجموعات 🐾', mainKeyboard(ctx));
}
async function showOwnerPanel(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
  await safeEdit(ctx, '👑 لوحة المالك — نغنوغ 🐾', ownerKeyboard());
}
async function answer(ctx, text, extra = {}) {
  if (ctx.callbackQuery) {
    try { await ctx.answerCallbackQuery({ text: text.length < 190 ? text : undefined }); } catch {}
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
  for (const ch of db.requiredChats) {
    try {
      const m = await bot.api.getChatMember(ch.id, Number(userId));
      const ok = ['member', 'administrator', 'creator'].includes(m.status) || (m.status === 'restricted' && m.is_member);
      if (!ok) return { ok: false, channel: ch };
    } catch (e) {
      return { ok: false, channel: ch, inaccessible: true };
    }
  }
  return { ok: true };
}
async function subscriptionGate(ctx) {
  if (isOwner(ctx) || !isPrivate(ctx) || db.requiredChats.length === 0) return true;
  const result = await checkSubscription(ctx.from.id);
  if (result.ok) return true;
  const ch = result.channel;
  const kb = new InlineKeyboard();
  if (ch?.url) kb.url('🔗 اشترك بالقناة', ch.url).row();
  kb.text('✅ تحققت من الاشتراك', 'checksubscription');
  const text = `🔒 حتى تستخدم نغنوغ، اشترك بالقناة المطلوبة أولاً.`;
  if (ctx.callbackQuery) await safeEdit(ctx, text, kb); else await ctx.reply(text, { reply_markup: kb });
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
  if (!entries.length) return answer(ctx, 'ما عندي مجموعة مفعّلة ظاهرة إلك حالياً.');
  return answer(ctx, '👥 اختار المجموعة اللي تريد تديرها:', { reply_markup: kb });
}
async function showGroupSettings(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار مجموعتك أولاً.');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة هذه المجموعة متاحة لمشرفيها فقط.');
  setSelected(ctx, g.id);
  return answer(ctx, `⚙️ إعدادات مجموعة: ${g.title}`, { reply_markup: groupSettingsKeyboard(g) });
}
async function showGroupStats(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار المجموعة أولاً.');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'الإحصائيات متاحة لمشرفيها فقط.');
  let members = 'غير متاح';
  try { members = String(await bot.api.getChatMemberCount(g.id)); } catch {}
  const s = g.stats;
  const text = `📊 إحصائيات ${g.title}\n\n👥 الأعضاء: ${members}\n💬 الرسائل: ${s.messages}\n🔗 الروابط المحذوفة: ${s.deletedLinks}\n🚫 السبام: ${s.floodEvents}`;
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
  const kb = new InlineKeyboard().text('➕ إضافة قناة اشتراك', 'requiredadd').row().text('📋 عرض القنوات', 'requiredlist').row().text('🔙 لوحة المالك', 'ownerpanel');
  return answer(ctx, `📢 إدارة الاشتراك الإجباري\n\nالقنوات: ${db.requiredChats.length}`, { reply_markup: kb });
}
async function showRequiredList(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.');
  if (!db.requiredChats.length) return answer(ctx, 'ماكو قنوات مضافة.', { reply_markup: new InlineKeyboard().text('➕ إضافة قناة', 'requiredadd').row().text('🔙 رجوع', 'requiredmenu') });
  const kb = new InlineKeyboard();
  db.requiredChats.forEach((ch, i) => kb.text(`🗑️ حذف ${ch.title || ch.username || ch.id}`, `reqdel:${i}`).row());
  kb.text('➕ إضافة قناة', 'requiredadd').row().text('🔙 رجوع', 'requiredmenu');
  return answer(ctx, `📋 قنوات الاشتراك الإجباري`, { reply_markup: kb });
}

async function handleViolation(ctx, g, reason) {
  const userId = userKey(ctx);
  const name = ctx.from.first_name || 'عضو';
  
  g.warnings ||= {};
  g.warnings[userId] ||= { count: 0, name };
  g.warnings[userId].count += 1;
  g.warnings[userId].name = name;

  g.warningLog ||= [];
  g.warningLog.push({ userId, name, reason, date: new Date().toISOString() });

  const currentWarnings = g.warnings[userId].count;
  const limit = g.warningSettings?.limit || 3;

  await ctx.reply(`⚠️ العضو ${name} خالف القوانين (${reason}).\nالتحذيرات: ${currentWarnings}/${limit}`);

  if (g.warningSettings?.enabled && currentWarnings >= limit) {
    const action = g.warningSettings.action || 'mute';
    const durationMins = Number(g.warningSettings.duration || 10);

    try {
      if (action === 'mute') {
        const untilDate = Math.floor(Date.now() / 1000) + (durationMins * 60);
        await ctx.api.restrictChatMember(ctx.chat.id, Number(userId), {
          permissions: { can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false },
          until_date: untilDate
        });
        await ctx.reply(`⚖️ تم كتم العضو ${name} لمدة ${durationMins} دقيقة.`);
      } else if (action === 'kick') {
        await ctx.api.banChatMember(ctx.chat.id, Number(userId));
        await ctx.api.unbanChatMember(ctx.chat.id, Number(userId));
        await ctx.reply(`⚖️ تم طرد العضو ${name}.`);
      } else if (action === 'ban') {
        await ctx.api.banChatMember(ctx.chat.id, Number(userId));
        await ctx.reply(`⚖️ تم حظر العضو ${name} نهائياً.`);
      }
    } catch (err) {
      console.error('Failed to apply penalty:', err);
    }
    delete g.warnings[userId];
  }
  save();
}

bot.command('help', async ctx => {
  ensureUser(ctx);
  if (!await subscriptionGate(ctx)) return;
  await ctx.reply(HELP_TEXT, { reply_markup: helpKeyboard(ctx) });
});
bot.command('start', async ctx => {
  ensureUser(ctx);
  if (!isPrivate(ctx)) return ctx.reply('🐾 افتح البوت بالخاص واضغط Start ❤️');
  if (!await subscriptionGate(ctx)) return;
  await ctx.reply('أهلاً بك في بوت نغنوغ 🐈‍⬛', { reply_markup: mainKeyboard(ctx) });
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
    await ctx.answerCallbackQuery({ text: 'بعدك مو مشترك بالقناة المطلوبة.' });
    return subscriptionGate(ctx);
  }
  if (!await subscriptionGate(ctx)) { try { await ctx.answerCallbackQuery(); } catch {} return; }
  try { await ctx.answerCallbackQuery(); } catch {}

  if (data === 'home') return showHome(ctx);
  if (data === 'howto') return answer(ctx, '📖 طريقة الاستخدام — نغنوغ 🐾', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
  if (data === 'protection') return answer(ctx, '🛡️ ميزات الحماية', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
  if (data === 'help') return answer(ctx, HELP_TEXT, { reply_markup: helpKeyboard(ctx) });
  if (data === 'accountinfo') {
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'غير متوفر';
    const username = ctx.from.username ? `@${ctx.from.username}` : 'ما عندك اسم مستخدم';
    return answer(ctx, `👤 معلومات حسابك\n\n📝 الاسم: ${name}\n🔗 المستخدم: ${username}`, { reply_markup: new InlineKeyboard().text('🔙 القائمة الرئيسية', 'home') });
  }
  if (data === 'userreplies') return answer(ctx, '💬 الردود التلقائية', { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').row().text('🔙 القائمة الرئيسية', 'home') });
  if (data === 'ownerpanel') return showOwnerPanel(ctx);
  if (data === 'mygroups') { if (!isPrivate(ctx)) return answer(ctx, 'إدارة المجموعات متاحة من الخاص فقط.'); return showGroups(ctx); }
  if (data.startsWith('choosegroup:')) {
    const id = data.slice('choosegroup:'.length); const g = db.groups[id];
    if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة.');
    if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة هذه المجموعة متاحة للمشرفين فقط.');
    setSelected(ctx, id); return showGroupSettings(ctx, g);
  }
  if (data === 'groupsettings') return showGroupSettings(ctx);

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
  if (data === 'requiredadd') { if (!isOwner(ctx)) return answer(ctx, 'خاص بالمالك.'); pending(ctx, { action: 'required-add' }); return answer(ctx, 'أرسل معرف القناة @username'); }
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

bot.on('message:text', async ctx => {
  ensureUser(ctx);
  const text = ctx.message.text.trim();
  if (isGroup(ctx)) {
    const g = db.groups[String(ctx.chat.id)];
    if (!g?.activated || text.startsWith('/')) return;
    g.title = ctx.chat.title || g.title;
    g.stats.messages++; db.stats.messages++;

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

    // 5. الردود التلقائية
    if (g.autoReply && !['العاب', 'لعبه', 'لعبة'].includes(normalizedText)) {
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

    // 6. تشغيل أو تفاعل مع اللعبة (مستورد بالكامل من game.js)
    if (['العاب', 'لعبه', 'لعبة'].includes(normalizedText)) {
      if (g.game?.active) {
        await ctx.reply('🎮 اللعبة شغّالة بالفعل!');
        return;
      }
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
      if (p.action === 'welcome') {
        const g = db.groups[p.groupId];
        if (g && await userCanManage(ctx, g)) {
          g.welcomeText = text;
          save();
          clearPending(ctx);
          return answer(ctx, `✅ تم تحديث رسالة الترحيب بنجاح!`, { reply_markup: new InlineKeyboard().text('⚙️ إعدادات المجموعة', 'groupsettings') });
        }
      }
      if (p.action === 'reply-trigger') {
        clearPending(ctx);
        pending(ctx, { action: 'reply-response', groupId: p.groupId, trigger: text });
        return ctx.reply('➕ أرسل الآن الرد الذي يرده البوت لهذه العبارة:');
      }
      if (p.action === 'reply-response') {
        const g = db.groups[p.groupId];
        if (g && await userCanManage(ctx, g)) {
          g.replies.push({ trigger: p.trigger, response: text });
          save();
          clearPending(ctx);
          return answer(ctx, `✅ تم إضافة الرد التلقائي بنجاح!`, { reply_markup: new InlineKeyboard().text('💬 الردود التلقائية', 'repliesmenu') });
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
        let username = text;
        if (username.startsWith('https://t.me/')) username = '@' + username.split('https://t.me/')[1];
        if (!username.startsWith('@')) username = '@' + username;
        try {
          const chat = await bot.api.getChat(username);
          db.requiredChats.push({ id: chat.id, username: chat.username || username, title: chat.title || username, url: chat.username ? `https://t.me/${chat.username}` : undefined });
          save();
          return answer(ctx, `✅ تم إضافة القناة بنجاح.`, { reply_markup: new InlineKeyboard().text('📢 إدارة الاشتراك الإجباري', 'requiredmenu') });
        } catch (e) {
          return answer(ctx, `❌ خطأ في الوصول للقناة: ${e.message}`, { reply_markup: new InlineKeyboard().text('📢 إدارة الاشتراك الإجباري', 'requiredmenu') });
        }
      }
    }
    return showHome(ctx);
  }
});

bot.start();
