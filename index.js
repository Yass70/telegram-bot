const { Bot } = require("grammy");

// ضع توكن البوت الخاص بك هنا
const token = process.env.BOT_TOKEN || "YOUR_BOT_TOKEN";
const bot = new Bot(token);

// معالج الأخطاء العالمي لمنع توقف البوت وحل مشاكل الـ Composer الاستثنائية
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`خطأ أثناء معالجة التحديث ${ctx?.update?.update_id || 'غير معروف'}:`);
    console.error(err.error);
});

// استيراد الأوامر والملفات الأساسية بلطف مع معالجة الأخطاء
try {
    require("./commands")(bot);
} catch (e) {
    console.error("خطأ في تحميل ملف الأوامر:", e.message);
}

try {
    require("./autoReplies")(bot);
} catch (e) {
    console.error("خطأ في تحميل الردود التلقائية:", e.message);
}

// تشغيل البوت بأمان
bot.start().then(() => {
    console.log("تم تشغيل البوت بنجاح واستقرار تام.");
}).catch((err) => {
    console.error("فشل تشغيل البوت:", err);
});
