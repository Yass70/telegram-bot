
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

const defaults = () => ({
  title: "",
  links: false,
  flood: false,
  welcomeEnabled: true,
  autoReply: true,
  welcomeText: "أهلاً بيك {name} ❤️ نورت مجموعة {title}",
  stats: { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 }
});

let db = {
  groups: {},
  selected: {},
  pending: {}
};

try {
  const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  db = {
    groups: saved.groups || {},
    selected: saved.selected || {},
    pending: saved.pending || {}
  };
} catch {}

const recentMessages = new Map();

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("[save]", e.message);
  }
}

function isOwner(ctx) {
  return String(ctx.from?.id || "") === OWNER_ID;
}

function isGroup(ctx) {
  return ["group", "supergroup"].includes(ctx.chat?.type);
}

function getGroup(id) {
  const key = String(id);
  if (!db.groups[key]) db.groups[key] = defaults();

  const c = db.groups[key];
  const d = defaults();

  c.title ??= "";
  c.links ??= d.links;
  c.flood ??= d.flood;
  c.welcomeEnabled ??= d.welcomeEnabled;
  c.autoReply ??= d.autoReply;
  c.welcomeText ??= d.welcomeText;
  c.stats = { ...d.stats, ...(c.stats || {}) };

  return c;
}

function rememberGroup(ctx) {
  if (!isGroup(ctx)) return;
  getGroup(ctx.chat.id).title = ctx.chat.title || String(ctx.chat.id);
  save();
}

function selectedId(ctx) {
  if (isGroup(ctx)) return String(ctx.chat.id);
  return db.selected[OWNER_ID] || null;
}

function state(v) {
  return v ? "مفعّل ✅" : "متوقف ❌";
}

function ownerKeyboard() {
  return new Keyboard()
    .text("🏠 الرئيسية").text("📂 مجموعاتي").row()
    .text("📊 الإحصائيات").text("⚙️ إعدادات المجموعة").row()
    .text("📖 المساعدة").text("👨‍💻 المطور")
    .resized();
}

function mainInlineKeyboard() {
  return new InlineKeyboard()
    .text("📂 اختيار مجموعة", "groups")
    .row()
    .text("⚙️ الإعدادات", "settings")
    .text("📊 الإحصائيات", "stats")
    .row()
    .text("📖 المساعدة", "help");
}

function settingsKeyboard() {
  return new InlineKeyboard()
    .text("🛡️ منع الروابط", "toggle:links")
    .text("🚫 مكافحة السبام", "toggle:flood")
    .row()
    .text("👋 الترحيب", "toggle:welcome")
    .text("💬 الردود", "toggle:reply")
    .row()
    .text("✏️ تعديل الترحيب", "editwelcome")
    .row()
    .text("📊 الإحصائيات", "stats")
    .text("📂 المجموعات", "groups")
    .row()
    .text("🏠 الرئيسية", "home");
}

function groupsKeyboard() {
  const kb = new InlineKeyboard();
  const groups = Object.entries(db.groups).slice(0, 40);

  for (const [id, c] of groups) {
    kb.text(`📁 ${(c.title || id).slice(0, 35)}`, `choose:${id}`).row();
  }

  kb.text("🔄 تحديث", "groups").text("🏠 الرئيسية", "home");
  return kb;
}

async function home(ctx) {
  await ctx.reply(
    "👑 لوحة مالك البوت\n\n" +
    "أهلاً بيك. اختَر القسم الذي تريد إدارته.\n" +
    "الأزرار خاصة بحساب المالك فقط.",
    {
      reply_markup: isOwner(ctx) && ctx.chat.type === "private"
        ? ownerKeyboard()
        : mainInlineKeyboard()
    }
  );
}

async function showSettings(ctx, id) {
  const c = getGroup(id);

  await ctx.reply(
    `⚙️ إعدادات المجموعة\n📌 ${c.title || id}\n\n` +
    `🛡️ منع الروابط: ${state(c.links)}\n` +
    `🚫 مكافحة السبام: ${state(c.flood)}\n` +
    `👋 الترحيب: ${state(c.welcomeEnabled)}\n` +
    `💬 الردود التلقائية: ${state(c.autoReply)}\n\n` +
    "اختَر الإعداد الذي تريد تغييره:",
    { reply_markup: settingsKeyboard() }
  );
}

async function showGroups(ctx) {
  if (!Object.keys(db.groups).length) {
    return ctx.reply(
      "ما عندي مجموعات مسجلة بعد.\n\n" +
      "أضف البوت لمجموعتك، ثم أرسل /panel داخل المجموعة مرة واحدة."
    );
  }

  return ctx.reply("📂 اختَر المجموعة التي تريد إدارتها:", {
    reply_markup: groupsKeyboard()
  });
}

async function showStats(ctx, id) {
  const c = getGroup(id);
  let members = "غير متاح";

  try {
    members = String(await bot.api.getChatMemberCount(id));
  } catch {
    members = "تعذر الجلب";
  }

  await ctx.reply(
    `📊 إحصائيات ${c.title || id}\n\n` +
    `👥 الأعضاء الحاليون: ${members}\n` +
    `💬 الرسائل المرصودة: ${c.stats.messages}\n` +
    `🔗 الروابط المحذوفة: ${c.stats.deletedLinks}\n` +
    `🚫 حالات السبام: ${c.stats.floodEvents}\n` +
    `👋 رسائل الترحيب: ${c.stats.welcomed}\n\n` +
    "إحصائيات الرسائل تبدأ من تشغيل هذه النسخة.",
    { reply_markup: settingsKeyboard() }
  );
}

bot.command("start", async (ctx) => {
  if (isOwner(ctx)) {
    if (isGroup(ctx)) {
      rememberGroup(ctx);
      db.selected[OWNER_ID] = String(ctx.chat.id);
      save();
    }

    await ctx.reply(
      "🚀 البوت يعمل!\nاستخدم الأزرار أدناه للتنقل، أو اكتب /panel.",
      {
        reply_markup: ctx.chat.type === "private"
          ? ownerKeyboard()
          : mainInlineKeyboard()
      }
    );

    return home(ctx);
  }

  await ctx.reply(
    "أهلاً بيك ❤️\nأنا بوت إدارة المجموعات والحماية.\nاكتب /help للمساعدة."
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "📖 المساعدة\n\n" +
    "/start — البدء\n" +
    "/help — المساعدة\n" +
    "/id — رقم حسابك\n" +
    "/panel — لوحة التحكم\n" +
    "/developer — معلومات المطور\n\n" +
    "لعمل الحماية، امنح البوت صلاحية حذف الرسائل داخل المجموعة."
  );
});

bot.command("id", async (ctx) => {
  await ctx.reply(`🆔 رقم حسابك: ${ctx.from.id}`);
});

bot.command("developer", async (ctx) => {
  await ctx.reply(
    "👨‍💻 معلومات المطور\n\n" +
    "بوت لإدارة المجموعات والترحيب بالأعضاء والحماية من الروابط والسبام."
  );
});

bot.command("panel", async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.reply("⛔ لوحة التحكم خاصة بمالك البوت.");
  }

  if (isGroup(ctx)) {
    rememberGroup(ctx);
    db.selected[OWNER_ID] = String(ctx.chat.id);
    save();
    return showSettings(ctx, ctx.chat.id);
  }

  return home(ctx);
});

bot.command("cancel", async (ctx) => {
  if (!isOwner(ctx)) return;
  delete db.pending[OWNER_ID];
  save();
  await ctx.reply("✅ تم إلغاء العملية.", {
    reply_markup: ownerKeyboard()
  });
});

bot.callbackQuery("home", async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.answerCallbackQuery({
      text: "هذا الخيار خاص بالمالك فقط.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();
  return home(ctx);
});

bot.callbackQuery("groups", async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.answerCallbackQuery({
      text: "هذا الخيار خاص بالمالك فقط.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();
  return showGroups(ctx);
});

bot.callbackQuery(/^choose:(-?\d+)$/, async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.answerCallbackQuery({
      text: "غير مسموح.",
      show_alert: true
    });
  }

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
  if (!isOwner(ctx)) {
    return ctx.answerCallbackQuery({
      text: "هذا الخيار خاص بالمالك فقط.",
      show_alert: true
    });
  }

  const id = selectedId(ctx);
  await ctx.answerCallbackQuery();

  if (!id || !db.groups[id]) return showGroups(ctx);
  return showSettings(ctx, id);
});

bot.callbackQuery("stats", async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.answerCallbackQuery({
      text: "هذا الخيار خاص بالمالك فقط.",
      show_alert: true
    });
  }

  const id = selectedId(ctx);
  await ctx.answerCallbackQuery();

  if (!id || !db.groups[id]) return showGroups(ctx);
  return showStats(ctx, id);
});

bot.callbackQuery("help", async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.answerCallbackQuery({
      text: "هذا الخيار خاص بالمالك فقط.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();
  return ctx.reply(
    "📖 طريقة الاستخدام\n\n" +
    "1. أضف البوت للمجموعة.\n" +
    "2. امنحه صلاحية حذف الرسائل.\n" +
    "3. أرسل /panel داخل المجموعة.\n" +
    "4. ارجع إلى الخاص واختر مجموعتك.\n" +
    "5. استخدم الأزرار لتغيير الإعدادات."
  );
});

bot.callbackQuery(/^toggle:(links|flood|welcome|reply)$/, async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.answerCallbackQuery({
      text: "⛔ المالك فقط يستطيع تغيير الإعدادات.",
      show_alert: true
    });
  }

  const id = selectedId(ctx);

  if (!id || !db.groups[id]) {
    await ctx.answerCallbackQuery({ text: "اختَر مجموعة أولاً." });
    return showGroups(ctx);
  }

  const c = getGroup(id);
  const action = ctx.match[1];

  if (action === "links") c.links = !c.links;
  if (action === "flood") c.flood = !c.flood;
  if (action === "welcome") c.welcomeEnabled = !c.welcomeEnabled;
  if (action === "reply") c.autoReply = !c.autoReply;

  save();
  await ctx.answerCallbackQuery({ text: "تم تحديث الإعداد" });
  return showSettings(ctx, id);
});

bot.callbackQuery("editwelcome", async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.answerCallbackQuery({
      text: "هذا الخيار خاص بالمالك فقط.",
      show_alert: true
    });
  }

  const id = selectedId(ctx);

  if (!id || !db.groups[id]) {
    await ctx.answerCallbackQuery({ text: "اختَر مجموعة أولاً." });
    return showGroups(ctx);
  }

  db.pending[OWNER_ID] = { action: "welcome", groupId: id };
  save();

  await ctx.answerCallbackQuery();
  return ctx.reply(
    "✏️ أرسل نص الترحيب الجديد في الخاص.\n\n" +
    "{name} = اسم العضو\n{title} = اسم المجموعة\n\n" +
    "للإلغاء أرسل /cancel"
  );
});

bot.on("my_chat_member", async (ctx) => {
  if (!isGroup(ctx)) return;

  const status = ctx.myChatMember.new_chat_member.status;

  if (["member", "administrator"].includes(status)) {
    rememberGroup(ctx);
  }
});

bot.on("message:new_chat_members", async (ctx) => {
  rememberGroup(ctx);

  const c = getGroup(ctx.chat.id);
  if (!c.welcomeEnabled) return;

  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;

    const name = [member.first_name, member.last_name]
      .filter(Boolean)
      .join(" ");

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

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text || "";

  if (isGroup(ctx)) rememberGroup(ctx);

  // استقبال أزرار القائمة الدائمة في الخاص.
  if (ctx.chat.type === "private" && isOwner(ctx)) {
    if (text === "🏠 الرئيسية") return home(ctx);
    if (text === "📂 مجموعاتي") return showGroups(ctx);
    if (text === "📊 الإحصائيات") {
      const id = selectedId(ctx);
      return id && db.groups[id] ? showStats(ctx, id) : showGroups(ctx);
    }
    if (text === "⚙️ إعدادات المجموعة") {
      const id = selectedId(ctx);
      return id && db.groups[id] ? showSettings(ctx, id) : showGroups(ctx);
    }
    if (text === "📖 المساعدة") {
      return ctx.reply("استخدم /start للبدء و/panel لفتح لوحة التحكم.");
    }
    if (text === "👨‍💻 المطور") {
      return ctx.reply("👨‍💻 بوت إدارة المجموعات والحماية.");
    }

    // حفظ الترحيب الذي أرسله المالك.
    if (db.pending[OWNER_ID]?.action === "welcome") {
      if (text.startsWith("/")) return;

      const id = db.pending[OWNER_ID].groupId;

      if (!db.groups[id]) {
        delete db.pending[OWNER_ID];
        save();
        return ctx.reply("المجموعة غير مسجلة. أرسل /panel داخلها مجددًا.");
      }

      getGroup(id).welcomeText = text.slice(0, 1000);
      delete db.pending[OWNER_ID];
      save();

      return ctx.reply("✅ تم حفظ نص الترحيب.", {
        reply_markup: ownerKeyboard()
      });
    }
  }

  // ردود المستخدمين في الخاص.
  if (ctx.chat.type === "private" && !ctx.from?.is_bot) {
    if (text.startsWith("/")) return;

    if (/^(هلا|هلو|مرحبا|السلام عليكم|سلام|شلونك)$/i.test(text.trim())) {
      return ctx.reply("هلا بيك ❤️ نورت البوت! اكتب /help للمساعدة.");
    }

    if (/(مساعدة|الأوامر|شلون|كيف)/i.test(text)) {
      return ctx.reply("أنا بوت إدارة مجموعات ❤️\nاكتب /help حتى تعرف الوظائف.");
    }

    return ctx.reply(
      "وصلتني رسالتك ❤️\nأنا بوت إدارة مجموعات وردودي مبرمجة مسبقاً.\nاكتب /help للمساعدة."
    );
  }

  if (!isGroup(ctx) || ctx.from?.is_bot) return;

  const c = getGroup(ctx.chat.id);
  c.stats.messages++;

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

  if (c.flood) {
    const key = `${ctx.chat.id}:${ctx.from.id}`;
    const now = Date.now();
    const times = (recentMessages.get(key) || []).filter(t => now - t < 5000);

    times.push(now);
    recentMessages.set(key, times);

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

  if (c.autoReply && !text.startsWith("/")) {
    if (/^(هلا|هلو|مرحبا|السلام عليكم|سلام)$/i.test(text.trim())) {
      await ctx.reply("وعليكم السلام ورحمة الله ❤️");
    } else if (/^بوت$/i.test(text.trim())) {
      await ctx.reply("تفضل ❤️ شنو تحتاج؟");
    }
  }

  save();
});

bot.catch((err) => {
  console.error("[bot error]", err.error || err);
});

async function setup() {
  await bot.api.setMyCommands([
    { command: "start", description: "🚀 البدء وتشغيل البوت" },
    { command: "help", description: "📖 المساعدة وطريقة الاستخدام" },
    { command: "panel", description: "⚙️ لوحة تحكم المالك" },
    { command: "id", description: "🆔 معرفة رقم حسابك" },
    { command: "developer", description: "👨‍💻 معلومات المطور" }
  ], {
    scope: { type: "all_private_chats" },
    language_code: "ar"
  });

  await bot.api.setMyDescription(
    "🤖 بوت إدارة المجموعات وحمايتها من الروابط والسبام، مع الترحيب بالأعضاء والإحصائيات."
  );

  await bot.api.setMyShortDescription(
    "🛡️ إدارة المجموعات والحماية والترحيب"
  );

  const me = await bot.api.getMe();
  console.log(`✅ Logged in as @${me.username}`);

  await bot.start();
}

setup().catch((err) => {
  console.error("[startup]", err);
  process.exit(1);
});
