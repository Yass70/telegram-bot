

import fs from "node:fs";
import { Bot, InlineKeyboard, Keyboard } from "grammy";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = String(process.env.BOT_OWNER_ID || "").trim();
const DATA_FILE = "./bot_data.json";

if (!TOKEN || !OWNER_ID) {
  console.error("Missing TELEGRAM_BOT_TOKEN or BOT_OWNER_ID");
  process.exit(1);
}

const bot = new Bot(TOKEN);
const floodTimes = new Map();

const defaults = () => ({
  title: "",
  links: false,
  flood: false,
  welcomeEnabled: true,
  autoReply: true,
  welcomeText: "أهلاً بيك {name} ❤️ نورت مجموعة {title}",
  replies: [
    { trigger: "هلا", response: "هلا بيك ❤️ نورت المجموعة!" },
    { trigger: "بوت", response: "تفضل، آني حاضر 🤖" }
  ],
  stats: {
    messages: 0,
    deletedLinks: 0,
    floodEvents: 0,
    welcomed: 0
  }
});

let db = { groups: {}, selected: {}, pending: {} };

try {
  const old = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  db = {
    groups: old.groups || {},
    selected: old.selected || {},
    pending: old.pending || {}
  };
} catch {}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("[save]", e.message);
  }
}

function owner(ctx) {
  return String(ctx.from?.id || "") === OWNER_ID;
}

function groupChat(ctx) {
  return ["group", "supergroup"].includes(ctx.chat?.type);
}

function getGroup(id) {
  const key = String(id);
  if (!db.groups[key]) db.groups[key] = defaults();

  const c = db.groups[key];
  const d = defaults();

  for (const k of ["links", "flood", "welcomeEnabled", "autoReply"]) {
    if (typeof c[k] !== "boolean") c[k] = d[k];
  }

  c.title ||= key;
  c.welcomeText ||= d.welcomeText;
  if (!Array.isArray(c.replies)) c.replies = d.replies;
  c.stats = { ...d.stats, ...(c.stats || {}) };
  return c;
}

function remember(ctx) {
  if (!groupChat(ctx)) return;
  getGroup(ctx.chat.id).title = ctx.chat.title || String(ctx.chat.id);
  save();
}

function selected(ctx) {
  return groupChat(ctx)
    ? String(ctx.chat.id)
    : db.selected[OWNER_ID] || null;
}

function status(v) {
  return v ? "مفعّل ✅" : "متوقف ❌";
}

function mainMenu() {
  return new Keyboard()
    .text("🏠 الرئيسية").text("📂 مجموعاتي").row()
    .text("⚙️ إعدادات المجموعة").text("📊 الإحصائيات").row()
    .text("💬 الردود التلقائية").text("📖 المساعدة").row()
    .text("👨‍💻 المطور")
    .resized();
}

function panelButtons() {
  return new InlineKeyboard()
    .text("📂 اختيار مجموعة", "groups").row()
    .text("⚙️ الإعدادات", "settings")
    .text("📊 الإحصائيات", "stats").row()
    .text("💬 الردود", "replies")
    .text("📖 المساعدة", "help").row()
    .text("🏠 الرئيسية", "home");
}

function settingsButtons() {
  return new InlineKeyboard()
    .text("🛡️ منع الروابط", "toggle:links")
    .text("🚫 مكافحة السبام", "toggle:flood").row()
    .text("👋 الترحيب", "toggle:welcome")
    .text("💬 الردود", "toggle:autoReply").row()
    .text("✏️ تعديل الترحيب", "editwelcome").row()
    .text("📊 الإحصائيات", "stats")
    .text("🏠 الرئيسية", "home");
}

function replyButtons() {
  return new InlineKeyboard()
    .text("➕ إضافة رد", "addreply")
    .text("📋 عرض الردود", "listreplies").row()
    .text("🗑️ حذف رد", "delreply")
    .text("🏠 الرئيسية", "home");
}

async function home(ctx) {
  await ctx.reply(
    "👑 لوحة مالك البوت\n\n" +
    "اختَر القسم المطلوب من الأزرار أدناه.\n" +
    "لإضافة مجموعة جديدة، أضف البوت إليها ثم أرسل /panel داخلها.",
    { reply_markup: mainMenu() }
  );

  await ctx.reply("لوحة التحكم:", {
    reply_markup: panelButtons()
  });
}

async function showGroups(ctx) {
  const entries = Object.entries(db.groups);

  if (!entries.length) {
    return ctx.reply(
      "ماكو مجموعات مسجلة بعد.\n" +
      "أضف البوت للمجموعة، ثم أرسل /panel داخلها."
    );
  }

  const kb = new InlineKeyboard();
  for (const [id, c] of entries.slice(0, 50)) {
    kb.text(`📁 ${(c.title || id).slice(0, 30)}`, `choose:${id}`).row();
  }
  kb.text("🏠 الرئيسية", "home");

  return ctx.reply("📂 اختَر المجموعة:", { reply_markup: kb });
}

async function showSettings(ctx, id) {
  const c = getGroup(id);
  return ctx.reply(
    `⚙️ إعدادات المجموعة\n\n` +
    `📌 ${c.title}\n` +
    `🛡️ منع الروابط: ${status(c.links)}\n` +
    `🚫 مكافحة السبام: ${status(c.flood)}\n` +
    `👋 الترحيب: ${status(c.welcomeEnabled)}\n` +
    `💬 الردود التلقائية: ${status(c.autoReply)}\n\n` +
    "اختَر الإعداد الذي تريد تغييره:",
    { reply_markup: settingsButtons() }
  );
}

async function showStats(ctx, id) {
  const c = getGroup(id);
  let members = "غير متاح";

  try {
    members = String(await bot.api.getChatMemberCount(id));
  } catch {}

  return ctx.reply(
    `📊 إحصائيات ${c.title}\n\n` +
    `👥 الأعضاء الحاليون: ${members}\n` +
    `💬 الرسائل المرصودة: ${c.stats.messages}\n` +
    `🔗 الروابط المحذوفة: ${c.stats.deletedLinks}\n` +
    `🚫 حالات السبام: ${c.stats.floodEvents}\n` +
    `👋 رسائل الترحيب: ${c.stats.welcomed}\n\n` +
    "إحصائيات الرسائل تبدأ من تشغيل هذه النسخة.",
    { reply_markup: settingsButtons() }
  );
}

async function showReplies(ctx, id) {
  const c = getGroup(id);
  const list = c.replies.length
    ? c.replies.map((r, i) => `${i + 1}. إذا كتب العضو: ${r.trigger}\n   الرد: ${r.response}`).join("\n\n")
    : "لا توجد ردود مخصصة.";

  return ctx.reply(
    `💬 الردود التلقائية\n\n${list}\n\n` +
    "تُفحص الردود عند تطابق رسالة العضو مع كلمة التفعيل.",
    { reply_markup: replyButtons() }
  );
}

async function needOwner(ctx) {
  if (owner(ctx)) return true;

  await ctx.answerCallbackQuery({
    text: "هذا الخيار خاص بمالك البوت.",
    show_alert: true
  }).catch(() => {});

  return false;
}

async function botAdmin(ctx) {
  try {
    const m = await ctx.api.getChatMember(
      ctx.chat.id,
      ctx.me.id
    );
    return ["administrator", "creator"].includes(m.status);
  } catch {
    return false;
  }
}

async function userAdmin(ctx, userId) {
  try {
    const m = await ctx.api.getChatMember(ctx.chat.id, userId);
    return ["administrator", "creator"].includes(m.status);
  } catch {
    return false;
  }
}

// أوامر البوت الأساسية
bot.command("start", async (ctx) => {
  if (owner(ctx)) return home(ctx);

  return ctx.reply(
    "أهلاً بيك ❤️\n" +
    "آني بوت إدارة المجموعات والحماية.\n" +
    "اكتب /help لمعرفة الأوامر."
  );
});

bot.command("help", async (ctx) => {
  return ctx.reply(
    "📖 الأوامر\n\n" +
    "/start — بدء البوت\n" +
    "/help — المساعدة\n" +
    "/id — رقم حسابك\n" +
    "/panel — لوحة المالك\n" +
    "/developer — معلومات المطور\n\n" +
    "أوامر الإدارة داخل المجموعة، استخدمها بالرد على رسالة العضو:\n" +
    "/mute — كتم\n" +
    "/unmute — فك الكتم\n" +
    "/ban — حظر\n" +
    "/unban — فك الحظر بالرد على رسالة العضو غير كافٍ؛ استخدم رقم الحساب في الأمر\n" +
    "/kick — طرد\n" +
    "/pin — تثبيت الرسالة\n" +
    "/unpin — إلغاء تثبيت الرسالة\n\n" +
    "تحتاج أوامر الإدارة إلى صلاحيات مناسبة."
  );
});

bot.command("id", async (ctx) => {
  await ctx.reply(`🆔 رقم حسابك: ${ctx.from.id}`);
});

bot.command("developer", async (ctx) => {
  await ctx.reply("👨‍💻 بوت إدارة المجموعات والحماية والترحيب.");
});

bot.command("panel", async (ctx) => {
  if (!owner(ctx)) {
    return ctx.reply("⛔ لوحة التحكم خاصة بمالك البوت.");
  }

  if (groupChat(ctx)) {
    remember(ctx);
    db.selected[OWNER_ID] = String(ctx.chat.id);
    save();
    return showSettings(ctx, ctx.chat.id);
  }

  return home(ctx);
});

bot.command("cancel", async (ctx) => {
  if (!owner(ctx)) return;
  delete db.pending[OWNER_ID];
  save();
  await ctx.reply("تم إلغاء العملية.", { reply_markup: mainMenu() });
});

// أزرار لوحة المالك
bot.callbackQuery("home", async (ctx) => {
  if (!(await needOwner(ctx))) return;
  await ctx.answerCallbackQuery();
  return home(ctx);
});

bot.callbackQuery("groups", async (ctx) => {
  if (!(await needOwner(ctx))) return;
  await ctx.answerCallbackQuery();
  return showGroups(ctx);
});

bot.callbackQuery(/^choose:(-?\d+)$/, async (ctx) => {
  if (!(await needOwner(ctx))) return;

  const id = String(ctx.match[1]);
  if (!db.groups[id]) {
    return ctx.answerCallbackQuery({
      text: "المجموعة غير مسجلة.",
      show_alert: true
    });
  }

  db.selected[OWNER_ID] = id;
  save();

  await ctx.answerCallbackQuery({ text: "تم اختيار المجموعة" });
  return showSettings(ctx, id);
});

bot.callbackQuery("settings", async (ctx) => {
  if (!(await needOwner(ctx))) return;
  await ctx.answerCallbackQuery();

  const id = selected(ctx);
  if (!id || !db.groups[id]) return showGroups(ctx);
  return showSettings(ctx, id);
});

bot.callbackQuery("stats", async (ctx) => {
  if (!(await needOwner(ctx))) return;
  await ctx.answerCallbackQuery();

  const id = selected(ctx);
  if (!id || !db.groups[id]) return showGroups(ctx);
  return showStats(ctx, id);
});

bot.callbackQuery("replies", async (ctx) => {
  if (!(await needOwner(ctx))) return;
  await ctx.answerCallbackQuery();

  const id = selected(ctx);
  if (!id || !db.groups[id]) return showGroups(ctx);
  return showReplies(ctx, id);
});

bot.callbackQuery("help", async (ctx) => {
  if (!(await needOwner(ctx))) return;
  await ctx.answerCallbackQuery();
  return ctx.reply(
    "📖 طريقة الاستخدام\n\n" +
    "1. أضف البوت إلى المجموعة.\n" +
    "2. امنحه صلاحيات الإدارة التي يحتاجها.\n" +
    "3. أرسل /panel داخل المجموعة.\n" +
    "4. افتح الخاص واختر المجموعة.\n" +
    "5. غيّر إعدادات الحماية والترحيب."
  );
});

bot.callbackQuery(/^toggle:(links|flood|welcome|autoReply)$/, async (ctx) => {
  if (!(await needOwner(ctx))) return;

  const id = selected(ctx);
  if (!id || !db.groups[id]) {
    await ctx.answerCallbackQuery({ text: "اختَر مجموعة أولاً." });
    return showGroups(ctx);
  }

  const c = getGroup(id);
  const key = ctx.match[1];
  c[key] = !c[key];
  save();

  await ctx.answerCallbackQuery({ text: "تم تحديث الإعداد." });
  return showSettings(ctx, id);
});

bot.callbackQuery("editwelcome", async (ctx) => {
  if (!(await needOwner(ctx))) return;

  const id = selected(ctx);
  if (!id || !db.groups[id]) {
    await ctx.answerCallbackQuery({ text: "اختَر مجموعة أولاً." });
    return showGroups(ctx);
  }

  db.pending[OWNER_ID] = { action: "welcome", groupId: id };
  save();

  await ctx.answerCallbackQuery();
  return ctx.reply(
    "✏️ أرسل نص الترحيب الجديد.\n\n" +
    "{name} = اسم العضو\n{title} = اسم المجموعة\n\n" +
    "للإلغاء أرسل /cancel"
  );
});

bot.callbackQuery("addreply", async (ctx) => {
  if (!(await needOwner(ctx))) return;

  const id = selected(ctx);
  if (!id || !db.groups[id]) {
    await ctx.answerCallbackQuery({ text: "اختَر مجموعة أولاً." });
    return showGroups(ctx);
  }

  db.pending[OWNER_ID] = { action: "addreply", groupId: id, step: "trigger" };
  save();

  await ctx.answerCallbackQuery();
  return ctx.reply(
    "➕ أرسل كلمة التفعيل أولاً.\n" +
    "مثال: هلا\n\nللإلغاء /cancel"
  );
});

bot.callbackQuery("listreplies", async (ctx) => {
  if (!(await needOwner(ctx))) return;

  const id = selected(ctx);
  await ctx.answerCallbackQuery();

  if (!id || !db.groups[id]) return showGroups(ctx);
  return showReplies(ctx, id);
});

bot.callbackQuery("delreply", async (ctx) => {
  if (!(await needOwner(ctx))) return;

  const id = selected(ctx);
  if (!id || !db.groups[id]) {
    await ctx.answerCallbackQuery({ text: "اختَر مجموعة أولاً." });
    return showGroups(ctx);
  }

  db.pending[OWNER_ID] = { action: "delreply", groupId: id };
  save();

  await ctx.answerCallbackQuery();
  return ctx.reply("أرسل رقم الرد الذي تريد حذفه. استخدم 📋 عرض الردود لمعرفة الأرقام.");
});

// تسجيل المجموعات عند إضافة البوت
bot.on("my_chat_member", async (ctx) => {
  if (!groupChat(ctx)) return;

  const status = ctx.myChatMember.new_chat_member.status;
  if (["member", "administrator"].includes(status)) {
    remember(ctx);
  }
});

// الترحيب
bot.on("message:new_chat_members", async (ctx) => {
  remember(ctx);
  const c = getGroup(ctx.chat.id);

  if (!c.welcomeEnabled) return;

  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;

    const name = [member.first_name, member.last_name]
      .filter(Boolean).join(" ");

    const text = c.welcomeText
      .replaceAll("{name}", name)
      .replaceAll("{title}", ctx.chat.title || "المجموعة");

    try {
      await ctx.reply(text);
      c.stats.welcomed++;
    } catch (e) {
      console.error("[welcome]", e.message);
    }
  }

  save();
});

// أوامر الإدارة: تتطلب الرد على رسالة العضو
async function moderationTarget(ctx) {
  const target = ctx.message?.reply_to_message?.from;
  if (!target || target.is_bot) {
    await ctx.reply("⚠️ استخدم الأمر بالرد على رسالة العضو المطلوب.");
    return null;
  }
  return target;
}

async function checkModPermission(ctx) {
  if (!groupChat(ctx)) {
    await ctx.reply("هذا الأمر يُستخدم داخل المجموعة فقط.");
    return false;
  }

  if (!(await userAdmin(ctx, ctx.from.id))) {
    await ctx.reply("⛔ يجب أن تكون مشرفاً في المجموعة لاستخدام هذا الأمر.");
    return false;
  }

  if (!(await botAdmin(ctx))) {
    await ctx.reply("⚠️ يجب ترقية البوت إلى مشرف ومنحه صلاحية الإدارة.");
    return false;
  }

  return true;
}

bot.command("mute", async (ctx) => {
  if (!(await checkModPermission(ctx))) return;
  const target = await moderationTarget(ctx);
  if (!target) return;

  try {
    await ctx.api.restrictChatMember(ctx.chat.id, target.id, {
      can_send_messages: false
    });
    await ctx.reply(`🔇 تم كتم ${target.first_name}.`);
  } catch (e) {
    await ctx.reply("تعذر الكتم. تحقق من صلاحيات البوت ورتبة العضو.");
    console.error("[mute]", e.message);
  }
});

bot.command("unmute", async (ctx) => {
  if (!(await checkModPermission(ctx))) return;
  const target = await moderationTarget(ctx);
  if (!target) return;

  try {
    await ctx.api.restrictChatMember(ctx.chat.id, target.id, {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_video_notes: true,
      can_send_voice_notes: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true
    });
    await ctx.reply(`🔊 تم فك كتم ${target.first_name}.`);
  } catch (e) {
    await ctx.reply("تعذر فك الكتم. تحقق من صلاحيات البوت.");
    console.error("[unmute]", e.message);
  }
});

bot.command("ban", async (ctx) => {
  if (!(await checkModPermission(ctx))) return;
  const target = await moderationTarget(ctx);
  if (!target) return;

  try {
    await ctx.api.banChatMember(ctx.chat.id, target.id);
    await ctx.reply(`⛔ تم حظر ${target.first_name}.`);
  } catch (e) {
    await ctx.reply("تعذر الحظر. تحقق من صلاحيات البوت ورتبة العضو.");
    console.error("[ban]", e.message);
  }
});

bot.command("kick", async (ctx) => {
  if (!(await checkModPermission(ctx))) return;
  const target = await moderationTarget(ctx);
  if (!target) return;

  try {
    await ctx.api.banChatMember(ctx.chat.id, target.id);
    await ctx.api.unbanChatMember(ctx.chat.id, target.id);
    await ctx.reply(`👢 تم طرد ${target.first_name}.`);
  } catch (e) {
    await ctx.reply("تعذر الطرد. تحقق من صلاحيات البوت ورتبة العضو.");
    console.error("[kick]", e.message);
  }
});

bot.command("unban", async (ctx) => {
  if (!(await checkModPermission(ctx))) return;

  const id = Number(ctx.match.trim());
  if (!Number.isSafeInteger(id) || id <= 0) {
    return ctx.reply("اكتب رقم حساب العضو بعد الأمر.\nمثال: /unban 123456789");
  }

  try {
    await ctx.api.unbanChatMember(ctx.chat.id, id);
    await ctx.reply("✅ تم فك الحظر إن كان العضو محظوراً.");
  } catch (e) {
    await ctx.reply("تعذر فك الحظر. تحقق من صلاحيات البوت.");
    console.error("[unban]", e.message);
  }
});

bot.command("pin", async (ctx) => {
  if (!(await checkModPermission(ctx))) return;

  const msg = ctx.message.reply_to_message;
  if (!msg) return ctx.reply("استخدم /pin بالرد على الرسالة التي تريد تثبيتها.");

  try {
    await ctx.api.pinChatMessage(ctx.chat.id, msg.message_id);
    await ctx.reply("📌 تم تثبيت الرسالة.");
  } catch (e) {
    await ctx.reply("تعذر التثبيت. تحقق من صلاحيات البوت.");
    console.error("[pin]", e.message);
  }
});

bot.command("unpin", async (ctx) => {
  if (!(await checkModPermission(ctx))) return;

  try {
    const msg = ctx.message.reply_to_message;
    if (msg) {
      await ctx.api.unpinChatMessage(ctx.chat.id, msg.message_id);
    } else {
      await ctx.api.unpinAllChatMessages(ctx.chat.id);
    }
    await ctx.reply("📌 تم إلغاء التثبيت.");
  } catch (e) {
    await ctx.reply("تعذر إلغاء التثبيت. تحقق من صلاحيات البوت.");
    console.error("[unpin]", e.message);
  }
});

// الرسائل النصية: إعدادات المالك، الحماية والردود
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text || "";

  if (groupChat(ctx)) remember(ctx);

  // قائمة الأزرار في الخاص
  if (ctx.chat.type === "private" && owner(ctx)) {
    if (text === "🏠 الرئيسية") return home(ctx);
    if (text === "📂 مجموعاتي") return showGroups(ctx);
    if (text === "⚙️ إعدادات المجموعة") {
      const id = selected(ctx);
      return id && db.groups[id] ? showSettings(ctx, id) : showGroups(ctx);
    }
    if (text === "📊 الإحصائيات") {
      const id = selected(ctx);
      return id && db.groups[id] ? showStats(ctx, id) : showGroups(ctx);
    }
    if (text === "💬 الردود التلقائية") {
      const id = selected(ctx);
      return id && db.groups[id] ? showReplies(ctx, id) : showGroups(ctx);
    }
    if (text === "📖 المساعدة") {
      return ctx.reply("استخدم /help للمساعدة و/panel لفتح لوحة المالك.");
    }
    if (text === "👨‍💻 المطور") {
      return ctx.reply("👨‍💻 بوت إدارة المجموعات والحماية.");
    }

    const pending = db.pending[OWNER_ID];

    if (pending) {
      if (text.startsWith("/")) return;

      const c = getGroup(pending.groupId);

      if (pending.action === "welcome") {
        c.welcomeText = text.slice(0, 1000);
        delete db.pending[OWNER_ID];
        save();
        return ctx.reply("✅ تم حفظ رسالة الترحيب.");
      }

      if (pending.action === "addreply") {
        if (pending.step === "trigger") {
          pending.trigger = text.slice(0, 100);
          pending.step = "response";
          save();
          return ctx.reply("هسه أرسل الرد الذي تريد إرساله عند كتابة هذه الكلمة.");
        }

        if (pending.step === "response") {
          if (c.replies.length >= 30) {
            delete db.pending[OWNER_ID];
            save();
            return ctx.reply("وصلت إلى الحد الأقصى وهو 30 ردًا لكل مجموعة.");
          }

          c.replies.push({
            trigger: pending.trigger,
            response: text.slice(0, 500)
          });

          delete db.pending[OWNER_ID];
          save();
          return ctx.reply("✅ تمت إضافة الرد التلقائي.");
        }
      }

      if (pending.action === "delreply") {
        const n = Number(text.trim());

        if (!Number.isInteger(n) || n < 1 || n > c.replies.length) {
          return ctx.reply("رقم غير صحيح. أرسل رقمًا من قائمة الردود أو /cancel.");
        }

        c.replies.splice(n - 1, 1);
        delete db.pending[OWNER_ID];
        save();
        return ctx.reply("🗑️ تم حذف الرد.");
      }
    }
  }

  // رد خاص للمستخدمين
  if (ctx.chat.type === "private" && !ctx.from.is_bot) {
    if (text.startsWith("/")) return;

    if (/^(هلا|هلو|مرحبا|السلام عليكم|سلام)$/i.test(text.trim())) {
      return ctx.reply("هلا بيك ❤️ نورت البوت! اكتب /help للمساعدة.");
    }

    return ctx.reply("وصلتني رسالتك ❤️\nاكتب /help لمعرفة وظائف البوت.");
  }

  if (!groupChat(ctx) || ctx.from.is_bot || text.startsWith("/")) return;

  const c = getGroup(ctx.chat.id);
  c.stats.messages++;

  // منع الروابط
  if (c.links && /(https?:\/\/|www\.|t\.me\/|telegram\.me\/)/i.test(text)) {
    try {
      await ctx.deleteMessage();
      c.stats.deletedLinks++;
    } catch (e) {
      console.error("[links]", e.message);
    }
    save();
    return;
  }

  // مكافحة السبام: خمس رسائل خلال خمس ثوانٍ
  if (c.flood) {
    const key = `${ctx.chat.id}:${ctx.from.id}`;
    const now = Date.now();
    const times = (floodTimes.get(key) || []).filter(t => now - t < 5000);
    times.push(now);
    floodTimes.set(key, times);

    if (times.length >= 5) {
      try {
        await ctx.deleteMessage();
        c.stats.floodEvents++;
      } catch (e) {
        console.error("[flood]", e.message);
      }
      save();
      return;
    }
  }

  // الردود المخصصة
  if (c.autoReply) {
    const normalized = text.trim().toLowerCase();
    const match = c.replies.find(
      r => r.trigger.trim().toLowerCase() === normalized
    );

    if (match) {
      await ctx.reply(match.response);
    }
  }

  save();
});

bot.catch((err) => {
  console.error("[bot error]", err.error || err);
});

async function setup() {
  await bot.api.setMyCommands([
    { command: "start", description: "🚀 بدء البوت" },
    { command: "help", description: "📖 المساعدة" },
    { command: "panel", description: "⚙️ لوحة المالك" },
    { command: "id", description: "🆔 رقم حسابك" },
    { command: "developer", description: "👨‍💻 معلومات المطور" }
  ], {
    scope: { type: "all_private_chats" },
    language_code: "ar"
  });

  await bot.api.setMyDescription(
    "بوت إدارة المجموعات: الحماية من الروابط والسبام، الترحيب، الردود التلقائية والإحصائيات."
  );

  await bot.api.setMyShortDescription(
    "إدارة المجموعات والحماية والترحيب"
  );

  const me = await bot.api.getMe();
  console.log(`Logged in as @${me.username}`);

  await bot.start();
}

setup().catch((e) => {
  console.error("[startup]", e);
  process.exit(1);
});
