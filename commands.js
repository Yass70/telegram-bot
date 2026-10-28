const { Composer } = require("grammy");

module.exports = (bot) => {
    // معالج الأوامر الرئيسي
    bot.command("start", async (ctx) => {
        try {
            await ctx.reply("أهلاً بك! تم إصلاح وتحديث البوت بنجاح ليعمل بكفاءة واستقرار تام.");
        } catch (error) {
            console.error("خطأ في أمر البدء:", error);
        }
    });

    // ربط ملفات الأوامر الفرعية إن وجدت بأمان
    try {
        const callbacks = require("./commands/callbacks");
        if (typeof callbacks === 'function') callbacks(bot);
    } catch (e) {
        // تجاهل إذا لم يكن الملف موجوداً
    }

    try {
        const messages = require("./commands/messages");
        if (typeof messages === 'function') messages(bot);
    } catch (e) {
        // تجاهل إذا لم يكن الملف موجوداً
    }
};
