import fs from 'node:fs';
import { Bot, InlineKeyboard } from 'grammy';

import {
  GROUP_RULES,
  NORMAL_MEMBER_RULES_REPLY,
  findAutoReply
} from './autoReplies.js';

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
  badWords: [], // قائمة الكلمات الممنوعة الخاصة بالمجموعة
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
const gameQuestions = [
  { q: 'شنو عاصمة العراق؟ 🇮🇶', a: 'بغداد' },
  { q: 'شنو عاصمة مصر؟ 🇪🇬', a: 'القاهرة' },
  { q: 'شنو عاصمة فرنسا؟ 🇫🇷', a: 'باريس' },
  { q: 'شنو عاصمة السعودية؟ 🇸🇦', a: 'الرياض' },
  { q: 'شنو عاصمة الأردن؟ 🇯🇴', a: 'عمان' },
  { q: 'شنو عاصمة تركيا؟ 🇹🇷', a: 'أنقرة' },
  { q: 'شنو عاصمة اليابان؟ 🇯🇵', a: 'طوكيو' },
  { q: 'شنو عاصمة إيطاليا؟ 🇮🇹', a: 'روما' },
  { q: 'شنو عاصمة بريطانيا؟ 🇬🇧', a: 'لندن' },
  { q: 'شنو عاصمة لبنان؟ 🇱🇧', a: 'بيروت' },

  { q: 'شنو أكبر كوكب بالمجموعة الشمسية؟ 🪐', a: 'المشتري' },
  { q: 'شنو الكوكب الأحمر؟ 🔴', a: 'المريخ' },
  { q: 'شنو أقرب كوكب للشمس؟ ☀️', a: 'عطارد' },
  { q: 'شنو اسم القمر الطبيعي للأرض؟ 🌙', a: 'القمر' },
  { q: 'كم كوكب بالمجموعة الشمسية؟ 🪐', a: '8' },
  { q: 'شنو النجم اللي يضيء الأرض بالنهار؟ ☀️', a: 'الشمس' },
  { q: 'شنو الغاز اللي يحتاجه الإنسان للتنفس؟ 🌬️', a: 'الأوكسجين' },
  { q: 'شنو العضو اللي يضخ الدم بالجسم؟ ❤️', a: 'القلب' },
  { q: 'كم عين عند الإنسان عادةً؟ 👀', a: '2' },
  { q: 'كم أذن عند الإنسان عادةً؟ 👂', a: '2' },

  { q: 'شنو الحيوان الملقب بسفينة الصحراء؟ 🐪', a: 'الجمل' },
  { q: 'شنو الحيوان المعروف بملك الغابة؟ 🦁', a: 'الأسد' },
  { q: 'شنو الحيوان اللي عنده خرطوم طويل؟ 🐘', a: 'الفيل' },
  { q: 'شنو أسرع حيوان بري؟ 🐆', a: 'الفهد' },
  { q: 'كم رجل للعنكبوت؟ 🕷️', a: '8' },
  { q: 'شنو الطير اللي ما يطير ويعيش بالمناطق الباردة؟ 🐧', a: 'البطريق' },
  { q: 'شنو أكبر حيوان بالعالم؟ 🐋', a: 'الحوت الأزرق' },
  { q: 'شنو الحيوان اللي يُنتج الصوف؟ 🐑', a: 'الخروف' },
  { q: 'شنو الحيوان المعروف بقدرته على تغيير لونه؟ 🦎', a: 'الحرباء' },
  { q: 'شنو الحيوان اللي يحمل صغاره بكيس؟ 🦘', a: 'الكنغر' },

  { q: 'كم يوم بالأسبوع؟ 📅', a: '7' },
  { q: 'كم شهر بالسنة؟ 📆', a: '12' },
  { q: 'كم فصل بالسنة؟ 🌦️', a: '4' },
  { q: 'كم ساعة باليوم؟ ⏰', a: '24' },
  { q: 'كم دقيقة بالساعة؟ ⏱️', a: '60' },
  { q: 'كم ثانية بالدقيقة؟ ⏳', a: '60' },
  { q: 'شنو ناتج 5 + 5؟ 🧮', a: '10' },
  { q: 'شنو ناتج 9 - 4؟ ➖', a: '5' },
  { q: 'شنو ناتج 6 × 3؟ ✖️', a: '18' },
  { q: 'شنو ناتج 20 ÷ 4؟ ➗', a: '5' },

  { q: 'شنو لون الموز الناضج غالباً؟ 🍌', a: 'أصفر' },
  { q: 'شنو لون العشب غالباً؟ 🌱', a: 'أخضر' },
  { q: 'شنو لون الثلج غالباً؟ ❄️', a: 'أبيض' },
  { q: 'شنو لون الفحم؟ ⚫', a: 'أسود' },
  { q: 'شنو المادة اللي نشربها حتى نروي العطش؟ 💧', a: 'الماء' },
  { q: 'شنو الفاكهة المشهورة بلونها البرتقالي؟ 🍊', a: 'البرتقال' },
  { q: 'من أي جهة تشرق الشمس؟ 🌅', a: 'الشرق' },
  { q: 'من أي جهة تغرب الشمس؟ 🌇', a: 'الغرب' },
  { q: 'شنو نستخدم حتى نكتب على الورق؟ ✏️', a: 'القلم' },
  { q: 'شنو الجهاز اللي نستخدمه للاتصال بالناس؟ 📱', a: 'الهاتف' },

  { q: 'شنو أكبر قارة بالعالم؟ 🌍', a: 'آسيا' },
  { q: 'شنو أكبر محيط بالعالم؟ 🌊', a: 'المحيط الهادئ' },
  { q: 'بأي قارة تقع العراق؟ 🗺️', a: 'آسيا' },
  { q: 'شنو النهر المشهور اللي يمر ببغداد؟ 🏞️', a: 'دجلة' },
  { q: 'شنو البحر اللي يفصل بين السعودية وأفريقيا؟ 🌊', a: 'البحر الأحمر' },
  { q: 'شنو اللغة الرسمية بالعراق؟ 🇮🇶', a: 'العربية' },
  { q: 'شنو العملة الرسمية بالعراق؟ 💵', a: 'الدينار العراقي' },
  { q: 'شنو الشهر اللي يجي بعد رمضان؟ 🌙', a: 'شوال' },
  { q: 'شنو أول شهر بالسنة الميلادية؟ 🎉', a: 'يناير' },
  { q: 'شنو آخر شهر بالسنة الميلادية؟ 🎆', a: 'ديسمبر' },

  { q: 'شنو الحيوان اللي ينبح؟ 🐕', a: 'الكلب' },
  { q: 'شنو الحيوان اللي يموء؟ 🐈', a: 'القط' },
  { q: 'شنو الطير المعروف بتقليد الأصوات؟ 🦜', a: 'الببغاء' },
  { q: 'شنو الحشرة اللي تصنع العسل؟ 🐝', a: 'النحلة' },
  { q: 'شنو الحشرة اللي تضيء بالليل؟ ✨', a: 'اليراعة' },
  { q: 'شنو الحيوان اللي يعيش بالماء ويتنفس بالخياشيم؟ 🐟', a: 'السمك' },
  { q: 'شنو الحيوان اللي عنده درع ويحتمي بداخله؟ 🐢', a: 'السلحفاة' },
  { q: 'شنو اسم صغير الدجاجة؟ 🐥', a: 'الصوص' }
];
function normalizeGameAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}
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
    .url(
  '➕ أضفني للمجموعة',
  `https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+pin_messages`
)
    .text('⚙️ إعدادات المجموعة', 'groupsettings').text('👥 مجموعاتي', 'mygroups').row()
    .text('👤 معلومات حسابي', 'accountinfo').text('💬 الردود التلقائية', 'userreplies').row()
    .text('📖 المساعدة', 'help');
  if (isOwner(ctx)) kb.row().text('🔒 الاشتراك الإجباري', 'requiredmenu').text('👑 لوحة المالك', 'ownerpanel');
  return kb;
}

const HELP_TEXT = `🐈‍⬛ أهلاً بيك بعالم نغنوغ! 🖤✨

نغنوغ مو مجرد بوت، هو مساعد لمجموعتكم، صممته حتى يسهّل الإدارة، يقلّل الإزعاج، ويخلي تجربة المجموعة أكثر ترتيباً ومتعة. 😼

━━━━━━━━━━━━━━━━━━

🎁 مجاني بالكامل
نغنوغ هدية من المطوّر إلكم ❤️
تگدر تستخدم ميزاته مجاناً، بدون اشتراك إجباري أو رسوم مقابل استخدام البوت.

━━━━━━━━━━━━━━━━━━

🛡️ الحماية وإدارة المجموعة
أدوات تساعد المشرفين على تنظيم المجموعة وتقليل السبام والمخالفات، حتى تبقى الدردشة مرتبة ومريحة للأعضاء.

━━━━━━━━━━━━━━━━━━

⚖️ التحذيرات والعقوبات
يساعد نظام التحذيرات المشرفين على تنبيه العضو إذا خالف قوانين المجموعة.
وعند تكرار المخالفات، يمكن استخدام العقوبات المتوفرة بالبوت، مثل تقييد العضو أو كتمه أو اتخاذ إجراء إداري آخر، حسب الميزات المفعّلة وإعدادات المجموعة.

━━━━━━━━━━━━━━━━━━

💬 الردود التلقائية
تگدر تستفيد من الردود التلقائية حتى يجاوب البوت على كلمات أو عبارات محددة برسائل جاهزة.
تفيد بالترحيب، والإجابة عن الأسئلة المتكررة، وتوضيح قوانين المجموعة أو معلوماتها بدون ما يحتاج المشرف يكرر نفس الجواب كل مرة.

━━━━━━━━━━━━━━━━━━

👤 معلومات الحساب
تعرّف على معلوماتك وتابع النقاط والترتيب إذا كانت هذه الميزات متوفرة ومفعّلة بالبوت.

━━━━━━━━━━━━━━━━━━

⚙️ إعدادات المجموعة
تعرّف على إعدادات المجموعة وتحكّم بالخيارات المتاحة حسب صلاحياتك والميزات المفعّلة.

━━━━━━━━━━━━━━━━━━

🧑‍💻 تحتاج مساعدة؟
عندك مشكلة، استفسار، أو اقتراح لميزة جديدة؟
تواصل ويا المطوّر وشارك فكرتك، لأن ملاحظاتكم تساعد على تحسين نغنوغ وتطويره باستمرار. ❤️

━━━━━━━━━━━━━━━━━━

🐈‍⬛ نغنوغ — هدية من المطوّر، ويتطوّر باهتمامكم وتفاعلكم. ❤️‍🔥`;
function helpKeyboard(ctx) {
  return new InlineKeyboard()
    .text('🔙 القائمة الرئيسية', 'home')
    .url('👤 حسابي', 'https://t.me/llll6llll6');
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
  const w = g.warningSettings || {
    enabled: false,
    limit: 3,
    action: 'mute',
    duration: 10
  };

  const actionNames = {
    none: 'بدون إجراء',
    mute: 'كتم',
    kick: 'طرد',
    ban: 'حظر'
  };

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
  const text = 'أهلاً بك في بوت نغنوغ 🐈‍⬛\n\nوظيفتي حماية وإدارة المجموعات من الروابط والكلمات الممنوعة والسبام، وتوفير أدوات إدارية قابلة للتخصيص. 🐾\n\nاختَر من القائمة أدناه ⬇️';
  await safeEdit(ctx, text, mainKeyboard(ctx));
}
async function showOwnerPanel(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت فقط.');
  await safeEdit(ctx, '👑 لوحة المالك — نغنوغ 🐾\n\nاختر القسم الذي تريد إدارته:', ownerKeyboard());
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
      console.warn('Subscription check failed for', ch.id, e?.description || e?.message);
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
  const note = result.inaccessible ? '\n\n⚠️ ما كدرت أتحقق من الاشتراك. لازم يضيفني مالك القناة مشرفاً حتى أتحقق.' : '';
  const text = `🔒 حتى تستخدم نغنوغ، اشترك بالقناة المطلوبة أولاً.${note}\n\nبعد الاشتراك اضغط «تحققت من الاشتراك».`;
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
  if (!entries.length) return answer(ctx, 'ما عندي مجموعة مفعّلة ظاهرة إلك حالياً.\n\nضيف البوت للمجموعة، وخلي أحد المشرفين يرسل «تفعيل» داخلها، وبعدها افتح الخاص واضغط إدارة مجموعتي.');
  return answer(ctx, '👥 اختار المجموعة اللي تريد تديرها:', { reply_markup: kb });
}
async function showGroupSettings(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار مجموعتك أولاً من «إدارة مجموعتي».');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'عذراً، إدارة هذه المجموعة متاحة للمالك أو لمشرفيها فقط.');
  setSelected(ctx, g.id);
  return answer(ctx, `⚙️ إعدادات مجموعة: ${g.title}\n\nاختار الميزة اللي تريد تعدّلها:`, { reply_markup: groupSettingsKeyboard(g) });
}
async function showGroupStats(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار المجموعة أولاً من «إدارة مجموعتي».');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'الإحصائيات الخاصة بهذه المجموعة متاحة لمشرفيها فقط.');
  let members = 'غير متاح';
  try { members = String(await bot.api.getChatMemberCount(g.id)); } catch {}
  const s = g.stats;
  const text = `📊 إحصائيات ${g.title}\n\n👥 عدد الأعضاء الحالي: ${members}\n💬 الرسائل النصية المرصودة: ${s.messages}\n🔗 الروابط المحذوفة: ${s.deletedLinks}\n🚫 حالات السبام: ${s.floodEvents}\n👋 الترحيبات المرسلة: ${s.welcomed}\n\nملاحظة: الإحصائيات تبدأ من تفعيل التتبع بهذا الإصدار، وما تشمل بيانات ما قبل التحديث.`;
  return answer(ctx, text, { reply_markup: new InlineKeyboard().text('🔄 تحديث', 'groupstats').row().text('🔙 إعدادات المجموعة', 'groupsettings').row().text('🏠 الرئيسية', 'home') });
}
async function showReplyList(ctx, g = selectedGroup(ctx)) {
  if (!g) return answer(ctx, 'اختار مجموعة أولاً.');
  if (!await userCanManage(ctx, g)) return answer(ctx, 'ما عندك صلاحية لإدارة ردود هذه المجموعة.');
  if (!g.replies.length) return answer(ctx, '📋 ماكو ردود تلقائية مضافة حالياً.', { reply_markup: repliesKeyboard() });
  const body = g.replies.map((r, i) => `${i + 1}. «${r.trigger}» ➜ ${r.response}`).join('\n\n');
  return answer(ctx, `💬 الردود التلقائية في ${g.title}\n\n${body}`, { reply_markup: repliesKeyboard() });
}
function pending(ctx, value) { db.pending[userKey(ctx)] = value; save(); }
function clearPending(ctx) { delete db.pending[userKey(ctx)]; save(); }
async function ownerRequiredMenu(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
  const kb = new InlineKeyboard().text('➕ إضافة قناة اشتراك', 'requiredadd').row().text('📋 عرض القنوات', 'requiredlist').row().text('🔙 لوحة المالك', 'ownerpanel');
  return answer(ctx, `📢 إدارة الاشتراك الإجباري\n\nالقنوات المضافة حالياً: ${db.requiredChats.length}\nأرسل اسم مستخدم عام مثل @channel أو رابط قناة عامة. لازم يكون البوت مشرفاً بالقناة حتى يتحقق من الاشتراك.`, { reply_markup: kb });
}
async function showRequiredList(ctx) {
  if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بمالك البوت.');
  if (!db.requiredChats.length) return answer(ctx, 'ماكو قنوات اشتراك إجباري مضافة.', { reply_markup: new InlineKeyboard().text('➕ إضافة قناة', 'requiredadd').row().text('🔙 رجوع', 'requiredmenu') });
  const kb = new InlineKeyboard();
  db.requiredChats.forEach((ch, i) => kb.text(`🗑️ حذف ${ch.title || ch.username || ch.id}`, `reqdel:${i}`).row());
  kb.text('➕ إضافة قناة', 'requiredadd').row().text('🔙 رجوع', 'requiredmenu');
  return answer(ctx, `📋 قنوات الاشتراك الإجباري\n\n${db.requiredChats.map((c, i) => `${i + 1}. ${c.title || c.username || c.id}`).join('\n')}`, { reply_markup: kb });
}

// دالة معالجة المخالفات وإصدار التحذيرات والعقوبات التلقائية
async function handleViolation(ctx, g, reason) {
  const userId = userKey(ctx);
  const name = ctx.from.first_name || 'عضو';
  
  g.warnings ||= {};
  g.warnings[userId] ||= { count: 0, name };
  g.warnings[userId].count += 1;
  g.warnings[userId].name = name;

  g.warningLog ||= [];
  g.warningLog.push({
    userId,
    name,
    reason,
    date: new Date().toISOString()
  });

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
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
          },
          until_date: untilDate
        });
        await ctx.reply(`⚖️ تم كتم العضو ${name} لمدة ${durationMins} دقيقة لتجاوزه الحد الأقصى للتحذيرات.`);
      } else if (action === 'kick') {
        await ctx.api.banChatMember(ctx.chat.id, Number(userId));
        await ctx.api.unbanChatMember(ctx.chat.id, Number(userId));
        await ctx.reply(`⚖️ تم طرد العضو ${name} لتجاوزه الحد الأقصى للتحذيرات.`);
      } else if (action === 'ban') {
        await ctx.api.banChatMember(ctx.chat.id, Number(userId));
        await ctx.reply(`⚖️ تم حظر العضو ${name} نهائياً لتجاوزه الحد الأقصى للتحذيرات.`);
      }
    } catch (err) {
      console.error('Failed to apply penalty:', err);
      await ctx.reply('⚠️ لم أستطيع تطبيق العقوبة، تأكد من صلاحيات المشرف للبوت.');
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

  if (!isPrivate(ctx)) {
    return ctx.reply(
      '🐾 حتى تدير نغنوغ، افتح البوت بالخاص واضغط Start ❤️'
    );
  }

  if (!await subscriptionGate(ctx)) return;

  await ctx.reply(
    'أهلاً بك في بوت نغنوغ 🐈‍⬛\n\n' +
    'وظيفتي حماية وإدارة المجموعات من الروابط والسبام وتوفير أدوات إدارية. 🐾\n\n' +
    'اختَر من القائمة أدناه ⬇️',
    { reply_markup: mainKeyboard(ctx) }
  );
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
  if (!isGroup(ctx)) {
    return ctx.reply('🐾 أرسل كلمة «تفعيل» داخل المجموعة المراد تفعيلها.');
  }

  if (!await userIsAdmin(ctx.chat.id, ctx.from.id)) {
    return ctx.reply('⚠️ لازم تكون مشرفاً بالمجموعة حتى تفعّل البوت.');
  }

  const g = groupFor(ctx.chat);

  if (g.activated) {
    return ctx.reply('🐾 نغنوغ يعمل حالياً في هذه المجموعة ❤️\n\nتگدر تتحكم بإعدادات البوت من الخاص.');
  }

  g.activated = true;
  g.activatedBy = userKey(ctx);
  g.title = ctx.chat.title || g.title;

  if (!g.admins.includes(userKey(ctx))) {
    g.admins.push(userKey(ctx));
  }

  g.activatedAt ||= new Date().toISOString();

  save();

  return ctx.reply(
    '🐾 نغنوغ — تم التفعيل بنجاح!\n\n' +
    '🛡️ بوت الحماية صار فعّال بمجموعتك.\n\n' +
    '⚙️ إعدادات البوت وإدارته تكون من الخاص، مو داخل المجموعة.\n\n' +
    '❤️ خلي مجموعتك بأمان ويا نغنوغ!'
  );
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
    await ctx.answerCallbackQuery({
      text: '⚙️ إدارة نغنوغ متاحة من الخاص فقط ❤️'
    });
    return;
  }
  if (data === 'checksubscription') {
    const result = await checkSubscription(ctx.from.id);

    if (result.ok) {
      await ctx.answerCallbackQuery({
        text: 'تم التحقق بنجاح ❤️'
      });
      return showHome(ctx);
    }

    await ctx.answerCallbackQuery({
      text: 'بعدك مو مشترك بالقناة المطلوبة.'
    });

    return subscriptionGate(ctx);
  }
  if (!await subscriptionGate(ctx)) { try { await ctx.answerCallbackQuery(); } catch {} return; }
  try { await ctx.answerCallbackQuery(); } catch {}
  if (data === 'home') return showHome(ctx);
  if (data === 'howto') return answer(ctx, '📖 طريقة الاستخدام — نغنوغ 🐾\n\n1️⃣ ضيف البوت لمجموعتك.\n2️⃣ خلي أحد المشرفين يرسل «تفعيل» داخل المجموعة.\n3️⃣ امنح البوت صلاحيات المشرف المطلوبة.\n4️⃣ افتح الخاص واضغط «إدارة مجموعتي».\n5️⃣ عدّل الترحيب ومنع الروابط والسبام والردود التلقائية.\n\n🐾 نغنوغ وياك حتى تبقى مجموعتك أكثر أماناً.', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
  if (data === 'protection') return answer(ctx, '🛡️ أوامر وميزات الحماية\n\n🔗 منع الروابط: يحذف الرسائل النصية التي تحتوي روابط عند تفعيل الميزة.\n🚫 منع السبام: يرصد تكرار الرسائل بسرعة ويحاول حذف الرسائل الزائدة.\n👋 الترحيب: يرسل رسالة للأعضاء الجدد.\n💬 الردود التلقائية: يرد عند مطابقة عبارة محفوظة.\n\nملاحظة: حذف الرسائل يحتاج أن يكون البوت مشرفاً مع صلاحية حذف الرسائل.', { reply_markup: new InlineKeyboard().text('👥 إدارة مجموعتي', 'mygroups').row().text('🔙 الرئيسية', 'home') });
  if (data === 'help') return answer(ctx, HELP_TEXT, { reply_markup: helpKeyboard(ctx) });
  if (data === 'accountinfo') {
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'غير متوفر';
    const username = ctx.from.username ? `@${ctx.from.username}` : 'ما عندك اسم مستخدم';
    return answer(ctx, `👤 معلومات حسابك\n\n📝 الاسم: ${name}\n🔗 المستخدم: ${username}\n🆔 المعرف: ${ctx.from.id}\n\nملاحظة: نظام عدّ التحذيرات لكل عضو لم يُضف إلى هذا الإصدار بعد.`, { reply_markup: new InlineKeyboard().text('🔙 القائمة الرئيسية', 'home') });
  }
  if (data === 'userreplies') {
    return answer(ctx, '💬 الردود التلقائية\n\nحتى تشوف الردود وتديرها، اختار مجموعة من «مجموعاتي». إدارة الردود متاحة لمالك المجموعة أو مشرف مخوّل. إذا ما عندك مجموعة مفعّلة، ضيف نغنوغ للمجموعة وخلي أحد المشرفين يرسل «تفعيل».', { reply_markup: new InlineKeyboard().text('👥 مجموعاتي', 'mygroups').row().text('🔙 القائمة الرئيسية', 'home') });
  }
  if (data === 'ownerpanel') return showOwnerPanel(ctx);
  if (data === 'mygroups') { if (!isPrivate(ctx)) return answer(ctx, 'إدارة المجموعات متاحة من الخاص فقط.'); return showGroups(ctx); }
  if (data.startsWith('choosegroup:')) {
    const id = data.slice('choosegroup:'.length); const g = db.groups[id];
    if (!g?.activated) return answer(ctx, 'هذه المجموعة غير مفعّلة.');
    if (!await userCanManage(ctx, g)) return answer(ctx, 'إدارة هذه المجموعة متاحة لمشرفيها فقط.');
    setSelected(ctx, id); return showGroupSettings(ctx, g);
  }
  if (data === 'groupsettings') return showGroupSettings(ctx);

  if (data === 'warningsmenu') {
    const g = selectedGroup(ctx);
    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }

    g.warningSettings ||= {
      enabled: false,
      limit: 3,
      action: 'mute',
      duration: 10
    };

    save();

    return ctx.editMessageText(
      `🛡️ التحذيرات والعقوبات\n\n` +
      `المجموعة: ${g.title}\n` +
      `الحالة: ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'}\n` +
      `عدد التحذيرات: ${g.warningSettings.limit}\n` +
      `العقوبة: ${g.warningSettings.action}\n` +
      `مدة الكتم: ${g.warningSettings.duration} دقيقة`,
      { reply_markup: warningsKeyboard(g) }
    );
  }

  // ===== إدارة الكلمات الممنوعة =====
  if (data === 'badwordsmenu') {
    const g = selectedGroup(ctx);
    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }
    g.badWords ||= [];
    
    const kb = new InlineKeyboard();
    kb.text('➕ إضافة كلمة ممنوعة', 'badwordadd').row();
    
    if (g.badWords.length > 0) {
      g.badWords.forEach((word, index) => {
        kb.text(`🗑️ حذف: ${word}`, `badworddel:${index}`).row();
      });
    }
    kb.text('🔙 رجوع للتحذيرات', 'warningsmenu');

    const wordsList = g.badWords.length > 0 ? g.badWords.join(', ') : 'لا توجد كلمات ممنوعة مضافة حالياً.';
    return ctx.editMessageText(
      `🚫 إدارة الكلمات الممنوعة\n\n` +
      `المجموعة: ${g.title}\n` +
      `الكلمات المخالفة المرصودة حالياً:\n${wordsList}`,
      { reply_markup: kb }
    );
  }

  if (data === 'badwordadd') {
    const g = selectedGroup(ctx);
    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }
    pending(ctx, { action: 'badword-add', groupId: g.id });
    return answer(ctx, '➕ أرسل الآن الكلمة أو العبارة المخالفة التي تريد أن يرصدها البوت ويحذفها تلقائياً.');
  }

  if (data.startsWith('badworddel:')) {
    const g = selectedGroup(ctx);
    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }
    const index = Number(data.split(':')[1]);
    g.badWords ||= [];
    if (g.badWords[index]) {
      const removed = g.badWords.splice(index, 1)[0];
      save();
      await answer(ctx, `✅ تم حذف الكلمة "${removed}" من قائمة الممنوعات.`);
    }

    // إعادة عرض القائمة
    const kb = new InlineKeyboard();
    kb.text('➕ إضافة كلمة ممنوعة', 'badwordadd').row();
    if (g.badWords.length > 0) {
      g.badWords.forEach((word, idx) => {
        kb.text(`🗑️ حذف: ${word}`, `badworddel:${idx}`).row();
      });
    }
    kb.text('🔙 رجوع للتحذيرات', 'warningsmenu');
    const wordsList = g.badWords.length > 0 ? g.badWords.join(', ') : 'لا توجد كلمات ممنوعة مضافة حالياً.';
    return ctx.editMessageText(
      `🚫 إدارة الكلمات الممنوعة\n\n` +
      `المجموعة: ${g.title}\n` +
      `الكلمات المخالفة المرصودة حالياً:\n${wordsList}`,
      { reply_markup: kb }
    );
  }
  // ===================================

  if (data === 'warningstoggle') {
    const g = selectedGroup(ctx);
    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }

    g.warningSettings ||= {
      enabled: false,
      limit: 3,
      action: 'mute',
      duration: 10
    };

    g.warningSettings.enabled = !g.warningSettings.enabled;
    save();

    await answer(ctx, g.warningSettings.enabled
      ? '✅ تم تفعيل إعدادات التحذيرات.'
      : '⏸️ تم إيقاف إعدادات التحذيرات.');

    return ctx.editMessageText(
      `🛡️ التحذيرات والعقوبات\n\n` +
      `المجموعة: ${g.title}\n` +
      `الحالة: ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'}\n` +
      `عدد التحذيرات: ${g.warningSettings.limit}\n` +
      `العقوبة: ${g.warningSettings.action}\n` +
      `مدة الكتم: ${g.warningSettings.duration} دقيقة`,
      { reply_markup: warningsKeyboard(g) }
    );
  }

  if (data === 'warningslimit') {
    const g = selectedGroup(ctx);
    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }

    g.warningSettings ||= {
      enabled: false,
      limit: 3,
      action: 'mute',
      duration: 10
    };

    const limits = [2, 3, 5, 10];
    const index = limits.indexOf(Number(g.warningSettings.limit));
    g.warningSettings.limit = limits[(index + 1) % limits.length];

    save();
    await answer(ctx, `🔢 عدد التحذيرات: ${g.warningSettings.limit}`);

    return ctx.editMessageText(
      `🛡️ التحذيرات والعقوبات\n\n` +
      `المجموعة: ${g.title}\n` +
      `الحالة: ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'}\n` +
      `عدد التحذيرات: ${g.warningSettings.limit}\n` +
      `العقوبة: ${g.warningSettings.action}\n` +
      `مدة الكتم: ${g.warningSettings.duration} دقيقة`,
      { reply_markup: warningsKeyboard(g) }
    );
  }

  if (data === 'warningsaction') {
    const g = selectedGroup(ctx);
    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }

    g.warningSettings ||= {
      enabled: false,
      limit: 3,
      action: 'mute',
      duration: 10
    };

    const actions = ['mute', 'kick', 'ban'];
    const index = actions.indexOf(g.warningSettings.action);
    g.warningSettings.action = actions[(index + 1) % actions.length];

    const names = {
      mute: 'كتم',
      kick: 'طرد',
      ban: 'حظر'
    };

    save();
    await answer(ctx, `⚖️ العقوبة المختارة: ${names[g.warningSettings.action]}`);

    return ctx.editMessageText(
      `🛡️ التحذيرات والعقوبات\n\n` +
      `المجموعة: ${g.title}\n` +
      `الحالة: ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'}\n` +
      `عدد التحذيرات: ${g.warningSettings.limit}\n` +
      `العقوبة: ${names[g.warningSettings.action]}\n` +
      `مدة الكتم: ${g.warningSettings.duration} دقيقة`,
      { reply_markup: warningsKeyboard(g) }
    );
  }

  if (data === 'warningsduration') {
    const g = selectedGroup(ctx);
    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }

    g.warningSettings ||= {
      enabled: false,
      limit: 3,
      action: 'mute',
      duration: 10
    };

    const durations = [5, 10, 30, 60, 120];
    const index = durations.indexOf(Number(g.warningSettings.duration));
    g.warningSettings.duration = durations[(index + 1) % durations.length];

    save();
    await answer(ctx, `⏱️ مدة الكتم: ${g.warningSettings.duration} دقيقة`);

    return ctx.editMessageText(
      `🛡️ التحذيرات والعقوبات\n\n` +
      `المجموعة: ${g.title}\n` +
      `الحالة: ${g.warningSettings.enabled ? '🟢 مفعّل' : '⚪ متوقف'}\n` +
      `عدد التحذيرات: ${g.warningSettings.limit}\n` +
      `العقوبة: ${g.warningSettings.action}\n` +
      `مدة الكتم: ${g.warningSettings.duration} دقيقة`,
      { reply_markup: warningsKeyboard(g) }
    );
  }

  if (data === 'warningslog') {
    const g = selectedGroup(ctx);

    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }

    const logs = (g.warningLog || []).slice(-15).reverse();

    if (!logs.length) {
      return answer(ctx, '📋 ماكو تحذيرات مسجّلة بهذه المجموعة بعد.', {
        reply_markup: new InlineKeyboard()
          .text('🔙 رجوع للتحذيرات', 'warningsmenu')
      });
    }

    const text = logs.map((item, i) => {
      const date = item.date
        ? new Date(item.date).toLocaleString('en-GB')
        : 'غير محدد';

      return `${i + 1}. 👤 ${item.name || item.userId || 'عضو'}\n` +
        `⚠️ السبب: ${item.reason || 'غير محدد'}\n` +
        `🕒 الوقت: ${date}`;
    }).join('\n\n');

    return answer(ctx, `📋 آخر التحذيرات في ${g.title}\n\n${text}`, {
      reply_markup: new InlineKeyboard()
        .text('🔙 رجوع للتحذيرات', 'warningsmenu')
    });
  }

  if (data === 'warningsclear') {
    const g = selectedGroup(ctx);

    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }

    const members = Object.entries(g.warnings || {})
      .filter(([_, value]) => Number(value?.count || 0) > 0);

    if (!members.length) {
      return answer(ctx, '🧹 ماكو أعضاء عندهم تحذيرات حالياً.', {
        reply_markup: new InlineKeyboard()
          .text('🔙 رجوع للتحذيرات', 'warningsmenu')
      });
    }

    const kb = new InlineKeyboard();

    for (const [userId, value] of members.slice(0, 30)) {
      kb.text(
        `🧹 ${String(value.name || userId).slice(0, 25)} (${value.count})`,
        `warningclear:${userId}`
      ).row();
    }

    kb.text('🔙 رجوع للتحذيرات', 'warningsmenu');

    return answer(ctx, 'اختار العضو الذي تريد تصفير تحذيراته:', {
      reply_markup: kb
    });
  }

  if (data.startsWith('warningclear:')) {
    const g = selectedGroup(ctx);

    if (!g || !await userCanManage(ctx, g)) {
      return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    }

    const userId = data.slice('warningclear:'.length);

    if (!g.warnings?.[userId]) {
      return answer(ctx, 'ما لقيت تحذيرات لهذا العضو.');
    }

    const count = g.warnings[userId].count || 0;
    delete g.warnings[userId];
    save();

    return answer(ctx, `✅ تم تصفير تحذيرات العضو.\nعدد التحذيرات التي أُزيلت: ${count}`, {
      reply_markup: new InlineKeyboard()
        .text('🔙 رجوع للتحذيرات', 'warningsmenu')
    });
  }

  if (data === 'welcomeedit') { const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.'); pending(ctx, { action: 'welcome', groupId: g.id }); return answer(ctx, `👋 أرسل رسالة الترحيب الجديدة لمجموعة ${g.title}.\n\nتگدر تستخدم {name} لاسم العضو و{title} لاسم المجموعة.`); }
  if (data === 'togglelinks' || data === 'toggleflood' || data === 'togglereplies') {
    const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.');
    if (data === 'togglelinks') g.links = !g.links;
    if (data === 'toggleflood') g.flood = !g.flood;
    if (data === 'togglereplies') g.autoReply = !g.autoReply;
    save(); return showGroupSettings(ctx, g);
  }
  if (data === 'repliesmenu') return answer(ctx, '💬 إدارة الردود التلقائية\n\nأضف عبارة يكتبها العضو، ثم اكتب الرد الذي تريد أن يرسله البوت.', { reply_markup: repliesKeyboard() });
  if (data === 'replyadd') { const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.'); pending(ctx, { action: 'reply-trigger', groupId: g.id }); return answer(ctx, '➕ أرسل العبارة التي تريد أن يلتقطها البوت.\nمثال: السلام عليكم'); }
  if (data === 'replylist') return showReplyList(ctx);
  if (data === 'replydelete') { const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'اختار مجموعة تملك صلاحية إدارتها.'); if (!g.replies.length) return answer(ctx, 'ماكو ردود حتى تحذفها.', { reply_markup: repliesKeyboard() }); const kb = new InlineKeyboard(); g.replies.forEach((r, i) => kb.text(`🗑️ ${i + 1}. ${r.trigger.slice(0, 25)}`, `replydel:${i}`).row()); kb.text('🔙 رجوع', 'repliesmenu'); return answer(ctx, 'اختار الرد الذي تريد حذفه:', { reply_markup: kb }); }
  if (data.startsWith('replydel:')) { const g = selectedGroup(ctx); if (!g || !await userCanManage(ctx, g)) return answer(ctx, 'ما عندك صلاحية.'); const i = Number(data.split(':')[1]); if (!Number.isInteger(i) || !g.replies[i]) return answer(ctx, 'هذا الرد غير موجود.'); const removed = g.replies.splice(i, 1)[0]; save(); return answer(ctx, `🗑️ تم حذف الرد: ${removed.trigger}`, { reply_markup: repliesKeyboard() }); }
  if (data === 'groupstats') return showGroupStats(ctx);
  if (data === 'ownerpanel') return showOwnerPanel(ctx);
  if (data === 'botstats') {
    if (!isOwner(ctx)) {
      return answer(ctx, 'هذا القسم خاص بمالك البوت.');
    }

    const totalUsers = (db.privateUsers || []).length;

    return answer(
      ctx,
      `📊 إحصائيات البوت — نغنوغ 🐾\n\n` +
      `👤 عدد مستخدمي البوت: ${totalUsers}\n\n` +
      `📌 العدد يشمل المستخدمين الذين تفاعلوا مع البوت في الخاص منذ بدء تسجيلهم.`,
      { reply_markup: ownerKeyboard() }
    );
  }
  if (data === 'activatedgroups') { if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.'); const gs = Object.values(db.groups).filter(g => g.activated); return answer(ctx, gs.length ? `👥 المجموعات المفعّلة:\n\n${gs.map((g, i) => `${i + 1}. ${g.title} (${g.id})`).join('\n')}` : 'ماكو مجموعات مفعّلة حالياً.', { reply_markup: ownerKeyboard() }); }
  if (data === 'botsettings') { if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.'); return answer(ctx, `⚙️ إعدادات البوت\n\nإصدار التطبيق: 2.1.0\nوضع التشغيل: polling\nقنوات الاشتراك الإجباري: ${db.requiredChats.length}\nالمجموعات المفعّلة: ${Object.values(db.groups).filter(g => g.activated).length}\n\nإعدادات كل مجموعة تُدار بشكل مستقل من «إدارة مجموعتي».`, { reply_markup: ownerKeyboard() }); }
  if (data === 'globalprotection') { if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.'); return answer(ctx, '🛡️ إعدادات الحماية العامة\n\nإعدادات منع الروابط والسبام حالياً مستقلة لكل مجموعة، حتى تگدر تضبطها حسب حاجة كل مجموعة. اختار «المجموعات المفعّلة» لمراجعتها.', { reply_markup: ownerKeyboard() }); }
  if (data === 'requiredmenu') return ownerRequiredMenu(ctx);
  if (data === 'requiredadd') { if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.'); pending(ctx, { action: 'required-add' }); return answer(ctx, 'أرسل @username للقناة أو رابطها العام مثل https://t.me/channelname.\n\nلا ترسل رابط دعوة خاص؛ استخدم قناة عامة يمكن للبوت الوصول إليها.'); }
  if (data === 'requiredlist') return showRequiredList(ctx);
  if (data.startsWith('reqdel:')) { if (!isOwner(ctx)) return answer(ctx, 'هذا القسم خاص بالمالك.'); const i = Number(data.split(':')[1]); if (!db.requiredChats[i]) return answer(ctx, 'القناة غير موجودة.'); const ch = db.requiredChats.splice(i, 1)[0]; save(); return answer(ctx, `تم حذف شرط الاشتراك: ${ch.title || ch.id}`, { reply_markup: new InlineKeyboard().text('📋 عرض القنوات', 'requiredlist').row().text('🔙 رجوع', 'requiredmenu') }); }
  return answer(ctx, 'هذا الزر غير معروف. ارجع للقائمة الرئيسية وحاول مرة ثانية.');
});

bot.on('message:text', async ctx => {
  ensureUser(ctx);
  const text = ctx.message.text.trim();
  if (isGroup(ctx)) {
    const g = db.groups[String(ctx.chat.id)];
    if (!g?.activated || text.startsWith('/')) return;
    g.title = ctx.chat.title || g.title;
    g.stats.messages++; db.stats.messages++;

    // 1. فحص الكلمات الممنوعة المضافة يدوياً
    if (g.badWords && g.badWords.length > 0 && !await userIsAdmin(ctx.chat.id, ctx.from.id)) {
      const lowerText = text.toLowerCase();
      const matchedWord = g.badWords.find(word => lowerText.includes(word.toLowerCase()));
      if (matchedWord) {
        try {
          await ctx.deleteMessage();
          await handleViolation(ctx, g, `استخدام كلمة ممنوعة (${matchedWord})`);
        } catch (e) {
          console.warn('Could not delete bad word message; bot may need admin rights.');
        }
        save();
        return;
      }
    }

    // 2. فحص منع الروابط وتطبيق التحذير تلقائياً
    if (g.links && /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|@[A-Za-z0-9_]{5,})/i.test(text) && !await userIsAdmin(ctx.chat.id, ctx.from.id)) {
      try { 
        await ctx.deleteMessage(); 
        g.stats.deletedLinks++; 
        db.stats.deletedLinks++; 
        await handleViolation(ctx, g, 'إرسال رابط ممنوع');
      } catch (e) { 
        console.warn('Could not delete link; bot may need admin rights.'); 
      }
      save(); 
      return;
    }

    // 3. فحص منع السبام وتطبيق التحذير تلقائياً
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

    // ===== الردود التلقائية =====

    const normalizedText = normalizeGameAnswer(text);

    // طلب القوانين: المشرف يرى القوانين، والعضو العادي يرى الرد المحدد
    if (['القوانين', 'قوانين'].includes(normalizedText)) {
      const canManage = await userCanManage(ctx, g);

await ctx.reply(
  canManage ? GROUP_RULES : NORMAL_MEMBER_RULES_REPLY,
  {
    reply_to_message_id: ctx.message.message_id
  }
);

      return;
    }

    // الردود التلقائية العامة والردود المخصصة للمجموعة
 if (
  g.autoReply &&
  !['العاب', 'لعبه', 'لعبة'].includes(normalizedText)
) {
  // أولاً: الردود الموجودة في ملف autoReplies.js
  const automaticReply = findAutoReply(text);

  if (automaticReply) {
    await ctx.reply(automaticReply, {
      reply_to_message_id: ctx.message.message_id
    });
    return;
  }

  // ثانياً: الردود التي يضيفها المشرف من لوحة نغنوغ
  const customReply = (g.replies || []).find(
    reply =>
      normalizeGameAnswer(reply.trigger) === normalizedText
  );

  if (customReply) {
    await ctx.reply(customReply.response, {
      reply_to_message_id: ctx.message.message_id
    });
    return;
  }
}

    // ===== نهاية الردود التلقائية =====
    const gameText = text.trim().toLocaleLowerCase('ar')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/\s+/g, ' ');

    if (['العاب', 'لعبه', 'لعبة'].includes(gameText)) {
      if (g.game?.active) {
        await ctx.reply('🎮 اللعبة شغّالة بالفعل! جاوبوا على السؤال الحالي 🐈‍⬛');
        return;
      }

      const firstIndex = Math.floor(Math.random() * gameQuestions.length);

      g.game = {
        active: true,
        round: 1,
        totalRounds: 10,
        usedQuestions: [firstIndex],
        questionIndex: firstIndex,
        answer: gameQuestions[firstIndex].a,
        scores: {},
        names: {}
      };

      save();
      await ctx.reply(
        `🐈‍⬛🔥 تحدّي نغنوغ بدأ!\n\n` +
        `📋 10 أسئلة، وأول واحد يجاوب صح ياخذ نقطة!\n` +
        `🏆 النقاط تنحفظ بحسابه.\n\n` +
        `❓ السؤال 1/10:\n${gameQuestions[firstIndex].q}`
      );
      return;
    }


    if (g.game?.active) {
      const skipText = normalizeGameAnswer(text);

      // تخطي السؤال عند كتابة التالي
      if (['التالي', 'تالي'].includes(skipText)) {
        const skippedAnswer = g.game.answer;

        if (g.game.round >= g.game.totalRounds) {
          g.game = null;
          save();

          await ctx.reply(
            `🏁 انتهى تحدّي نغنوغ!\n` +
            `💡 جواب السؤال الأخير كان: ${skippedAnswer}\n` +
            `🎮 انتهت الأسئلة العشرة!`
          );
          return;
        }

        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * gameQuestions.length);
        } while (g.game.usedQuestions.includes(nextIndex));

        const nextRound = g.game.round + 1;

        g.game.usedQuestions.push(nextIndex);
        g.game.round = nextRound;
        g.game.questionIndex = nextIndex;
        g.game.answer = gameQuestions[nextIndex].a;

        save();

        await ctx.reply(
          `⏭️ تم تخطي السؤال!\n` +
          `💡 الإجابة الصحيحة: ${skippedAnswer}\n\n` +
          `❓ السؤال ${nextRound}/${g.game.totalRounds}:\n` +
          `${gameQuestions[nextIndex].q}`
        );
        return;
      }

      const answerVal = normalizeGameAnswer(text);
      const correctAnswer = normalizeGameAnswer(g.game.answer);

      if (answerVal === correctAnswer) {
        const uid = userKey(ctx);
        const name = ctx.from.first_name || 'عضو';

        g.game.scores[uid] = Number(g.game.scores[uid] || 0) + 1;
        g.game.names[uid] = name;

        db.points[uid] = Number(db.points[uid] || 0) + 1;

        const wonRound = g.game.round;
        const winnerMessage =
          `✅ إجابة صحيحة!\n` +
          `🏅 الفائز بالسؤال: ${name}\n` +
          `⭐ نقاطه بهالجولة: ${g.game.scores[uid]}\n` +
          `💎 نقاطه الدائمة: ${db.points[uid]}`;

        if (wonRound >= g.game.totalRounds) {
          const scores = Object.entries(g.game.scores);
          const maxScore = Math.max(...scores.map(([, score]) => score));
          const winners = scores.filter(([, score]) => score === maxScore);

          let finalMessage = `\n\n🏁 انتهى تحدّي نغنوغ!\n\n`;

          if (winners.length === 1) {
            const [winnerId] = winners[0];
            finalMessage += `👑 بطل التحدّي: ${g.game.names[winnerId]}\n`;
          } else {
            finalMessage += `🤝 تعادل بين:\n`;
            finalMessage += winners.map(([id]) => `• ${g.game.names[id]}`).join('\n') + '\n';
          }

          finalMessage += `🏆 النتيجة النهائية:\n`;
          finalMessage += scores
            .sort((a, b) => b[1] - a[1])
            .map(([id, score]) => `• ${g.game.names[id]}: ${score} نقطة`)
            .join('\n');

          g.game = null;
          save();
          await ctx.reply(winnerMessage + finalMessage);
          return;
        }

        const nextRound = wonRound + 1;
        let nextIndex;

        do {
          nextIndex = Math.floor(Math.random() * gameQuestions.length);
        } while (g.game.usedQuestions.includes(nextIndex));

        g.game.usedQuestions.push(nextIndex);
        g.game.round = nextRound;
        g.game.questionIndex = nextIndex;
        g.game.answer = gameQuestions[nextIndex].a;

        save();
        await ctx.reply(
          `${winnerMessage}\n\n` +
          `❓ السؤال ${nextRound}/10:\n${gameQuestions[nextIndex].q}`
        );
        return;
      }
    }
  } else {
    const p = db.pending[userKey(ctx)];
    if (p) {
      if (p.action === 'welcome') {
        const g = db.groups[p.groupId];
        if (g && await userCanManage(ctx, g)) {
          g.welcomeText = text;
          save();
          clearPending(ctx);
          return answer(ctx, `✅ تم تحديث رسالة الترحيب بنجاح لمجموعة ${g.title}!`, { reply_markup: new InlineKeyboard().text('⚙️ إعدادات المجموعة', 'groupsettings') });
        }
      }
      if (p.action === 'reply-trigger') {
        clearPending(ctx);
        pending(ctx, { action: 'reply-response', groupId: p.groupId, trigger: text });
        return ctx.reply('➕ أرسل الآن الرد الذي تريد أن يرسله البوت عندما يكتب المستخدم هذه العبارة:');
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
      // استقبال الكلمة الممنوعة الجديدة
      if (p.action === 'badwordadd') {
        const g = db.groups[p.groupId];
        if (g && await userCanManage(ctx, g)) {
          g.badWords ||= [];
          g.badWords.push(text);
          save();
          clearPending(ctx);
          return answer(ctx, `✅ تم إضافة الكلمة "${text}" إلى قائمة الكلمات الممنوعة بنجاح!`, { reply_markup: new InlineKeyboard().text('🚫 إدارة الكلمات الممنوعة', 'badwordsmenu') });
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
          return answer(ctx, `✅ تم إضافة القناة ${chat.title || username} بنجاح لاشتراك إجباري.`, { reply_markup: new InlineKeyboard().text('📢 إدارة الاشتراك الإجباري', 'requiredmenu') });
        } catch (e) {
          return answer(ctx, `❌ ما قدرت أوصل للقناة. تأكد أن المعرف صحيح وأن البوت مشرف فيها.\nخطأ: ${e.message}`, { reply_markup: new InlineKeyboard().text('📢 إدارة الاشتراك الإجباري', 'requiredmenu') });
        }
      }
    }
    return showHome(ctx);
  }
});

bot.start();
