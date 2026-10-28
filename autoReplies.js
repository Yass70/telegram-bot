module.exports = (bot) => {
    // معالجة الردود التلقائية والرسائل النصية الواردة بأمان
    bot.on("message:text", async (ctx) => {
        try {
            const text = ctx.message.text;
            
            // يمكنك إضافة الردود التلقائية الخاصة بك هنا
            if (text.includes("مرحبا") || text.includes("السلام عليكم")) {
                await ctx.reply("وعليكم السلام ورحمة الله وبركاته! كيف يمكنني مساعدتك اليوم؟");
            }
        } catch (error) {
            console.error("خطأ في معالجة الرد التلقائي:", error);
        }
    });
};
