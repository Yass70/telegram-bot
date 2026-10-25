import fs from "node:fs";
import express from "express";
import { Bot, InlineKeyboard } from "grammy";

// 1. إعداد السيرفر لضمان استمرار عمل البوت على استضافة FadeHost
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  app.get("/", (req, res) => {
    res.send("Bot is running successfully with grammY!");
  });
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = String(process.env.BOT_OWNER_ID || process.env.ADMIN_ID || "").trim();

if (!BOT_TOKEN) {
  console.error("❌ ERROR: TELEGRAM_BOT_TOKEN is not defined!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const DATA_FILE = "./bot_data.json";

const defaults = () => ({
  links: false,
  antiflood: false,
  welcomeEnabled: true,
  welcomeText: "أهلاً بيك {name} ❤️ نورت مجموعة {title}",
});

let data = {};

try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch {
  data = {};
}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("خطأ في حفظ البيانات:", err);
  }
}

function config(chatId) {
  if (!data[chatId]) data[chatId] = defaults();
  data[chatId] = {
    ...defaults(),
    ...data[chatId],
  };
  return data[chatId];
}

function isOwner(ctx) {
  if (!OWNER_ID) return true;
  return String(ctx.from?.id || "") === OWNER_ID;
}

function isGroup(ctx) {
  return ["group", "supergroup"].includes(ctx.chat?.type);
}

function panelKeyboard() {
  return new InlineKeyboard()
    .text("🛡️ منع الروابط", "links")
    .text("🚫 مكافحة السبام", "flood")
    .row()
    .text("👋 الترحيب", "welcome")
    .text("✏️ تعديل الترحيب", "edit_welcome")
    .row()
    .text("📊 عرض الإعدادات", "settings")
    .row()
    .text("ℹ️ طريقة الاستخدام", "help");
}

function status(value) {
  return value ? "مفعّل ✅" : "متوقف ❌";
}

function panelText() {
  return (
    "👑 لوحة مالك البوت\n\n" +
    "أهلاً بيك! من هنا تكدر تتحكم بإعدادات الحماية والترحيب.\n\n" +
    "⚠️ افتح اللوحة داخل المجموعة حتى تغيّر إعداداتها."
  );
}

const recentMessages = new Map();
const pendingWelcome = new Set();

// الأوامر الأساسية
bot.command("start", async (ctx) => {
  if (isOwner(ctx)) {
    return ctx.reply(panelText(), {
      reply_markup: panelKeyboard(),
    });
  }

  return ctx.reply(
    "أهلاً بيك ❤️\n" +
    "أنا بوت إدارة وحماية المجموعات.\n" +
    "أضفني لمجموعتك حتى أساعدك بالحماية والترحيب."
  );
});

bot.command("id", async (ctx) => {
  await ctx.reply(`🆔 رقم حسابك: ${ctx.from.id}`);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "📌 الأوامر المتوفرة:\n\n" +
    "/start — فتح لوحة المالك\n" +
    "/id — معرفة رقم حسابك\n" +
    "/panel — فتح لوحة التحكم داخل المجموعة\n" +
    "/setwelcome نص الترحيب — تعديل الترحيب داخل المجموعة\n\n" +
    "لازم تمنح البوت صلاحية حذف الرسائل حتى يقدر يحذف الروابط والسبام."
  );
});

bot.command("panel", async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.reply("⛔ لوحة التحكم خاصة بمالك البوت.");
  }

  await ctx.reply(panelText(), {
    reply_markup: panelKeyboard(),
  });
});

bot.command("setwelcome", async (ctx) => {
  if (!isOwner(ctx)) {
    return ctx.reply("⛔ هذا الأمر خاص بالمالك.");
  }

  if (!isGroup(ctx)) {
    return ctx.reply(
      "افتح المجموعة وأرسل الأمر هناك.\n" +
      "مثال:\n/setwelcome أهلاً {name} ❤️ نورت {title}"
    );
  }

  const text = ctx.match?.trim();

  if (!text) {
    return ctx.reply(
      "استخدم:\n/setwelcome أهلاً {name} ❤️ نورت {title}"
    );
  }

  config(String(ctx.chat.id)).welcomeText = text;
  save();

  await ctx.reply("✅ تم حفظ نص الترحيب لهذه المجموعة.");
});

// إدارة الأزرار التفاعلية
bot.callbackQuery(
  ["links", "flood", "welcome", "edit_welcome", "settings", "help"],
  async (ctx) => {
    if (!isOwner(ctx)) {
      return ctx.answerCallbackQuery({
        text: "⛔ هذا الزر خاص بمالك البوت.",
        show_alert: true,
      });
    }

    await ctx.answerCallbackQuery();

    if (ctx.callbackQuery.data === "help") {
      return ctx.reply(
        "📖 طريقة الاستخدام:\n\n" +
        "1. أضف البوت للمجموعة.\n" +
        "2. امنحه صلاحية حذف الرسائل.\n" +
        "3. افتح /panel داخل المجموعة.\n" +
        "4. اضغط الأزرار لتغيير إعدادات المجموعة.\n\n" +
        "تعديل الترحيب متاح من زر ✏️ تعديل الترحيب."
      );
    }

    if (ctx.callbackQuery.data === "edit_welcome") {
      pendingWelcome.add(ctx.from.id);

      return ctx.reply(
        "✏️ أرسل نص الترحيب الجديد برسالة واحدة.\n\n" +
        "تقدر تستخدم:\n" +
        "{name} — اسم العضو\n" +
        "{title} — اسم المجموعة\n\n" +
        "مثال:\nأهلاً {name} ❤️ نورت {title}"
      );
    }

    if (!isGroup(ctx)) {
      return ctx.reply(
        "افتح البوت داخل المجموعة واضغط /panel هناك حتى تغيّر إعداداتها."
      );
    }

    const c = config(String(ctx.chat.id));
    const action = ctx.callbackQuery.data;

    if (action === "links") c.links = !c.links;
    if (action === "flood") c.antiflood = !c.antiflood;
    if (action === "welcome") c.welcomeEnabled = !c.welcomeEnabled;

    save();

    if (action === "settings") {
      return ctx.reply(
        "📊 إعدادات المجموعة الحالية:\n\n" +
        `🛡️ منع الروابط: ${status(c.links)}\n` +
        `🚫 مكافحة السبام: ${status(c.antiflood)}\n` +
        `👋 الترحيب: ${status(c.welcomeEnabled)}\n\n` +
        `✏️ نص الترحيب:\n${c.welcomeText}`,
        { reply_markup: panelKeyboard() }
      );
    }

    const labels = {
      links: "منع الروابط",
      flood: "مكافحة السبام",
      welcome: "الترحيب",
    };

    return ctx.reply(
      `✅ تم تحديث ${labels[action]}.\n\n` +
      `🛡️ منع الروابط: ${status(c.links)}\n` +
      `🚫 مكافحة السبام: ${status(c.antiflood)}\n` +
      `👋 الترحيب: ${status(c.welcomeEnabled)}`,
      { reply_markup: panelKeyboard() }
    );
  }
);

// الترحيب بالأعضاء الجدد
bot.on("message:new_chat_members", async (ctx) => {
  if (!isGroup(ctx)) return;

  const c = config(String(ctx.chat.id));

  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot || !c.welcomeEnabled) continue;

    const name = [member.first_name, member.last_name]
      .filter(Boolean)
      .join(" ");

    const text = c.welcomeText
      .replaceAll("{name}", name)
      .replaceAll("{title}", ctx.chat.title || "المجموعة");

    await ctx.reply(text);
  }
});

// المعالج الموحد المدمج للرسائل النصية (يحل مشكلة التعارض تماماً)
bot.on("message:text", async (ctx) => {
  if (ctx.from?.is_bot) return;

  // 1. معالجة حفظ الترحيب الجديد إذا كان المالك قد طلب ذلك
  if (isOwner(ctx) && pendingWelcome.has(ctx.from.id)) {
    if (ctx.message.text.startsWith("/")) return; // تجاوز الأوامر

    pendingWelcome.delete(ctx.from.id);

    if (!isGroup(ctx)) {
      return ctx.reply(
        "حتى أحفظ الترحيب لمجموعة محددة، أرسل الأمر داخل المجموعة:\n" +
        "/setwelcome نص الترحيب"
      );
    }

    config(String(ctx.chat.id)).welcomeText = ctx.message.text;
    save();
    return ctx.reply("✅ تم حفظ نص الترحيب بنجاح.");
  }

  // 2. تطبيق الحماية وفحص الروابط والسبام حصراً داخل المجموعات
  if (!isGroup(ctx)) return;

  const c = config(String(ctx.chat.id));
  const text = ctx.message.text;

  // فحص ومنع الروابط
  if (c.links && /(https?:\/\/|www\.|t\.me\/|telegram\.me\/)/i.test(text)) {
    try {
      await ctx.deleteMessage();
    } catch {}
    return;
  }

  // مكافحة التكرار والسبام (Anti-Flood)
  if (c.antiflood) {
    const key = `${ctx.chat.id}:${ctx.from.id}`;
    const now = Date.now();
    const previous = recentMessages.get(key) || [];
    const current = previous.filter((time) => now - time < 5000);

    current.push(now);
    recentMessages.set(key, current);

    if (current.length >= 5) {
      try {
        await ctx.deleteMessage();
      } catch {}
      return;
    }
  }
});

// معالجة الأخطاء والتشغيل
bot.catch((err) => {
  console.error("حدث خطأ في البوت:", err);
});

bot.start();
console.log("Grammy Professional Bot started successfully!");
