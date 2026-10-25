const { Telegraf } = require('telegraf');
const express = require('express');

// إعداد البوت والسيرفر للوحة التحكم مستقبلاً
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

// صفحة ويب بسيطة لكي تعمل الاستضافة دون توقف
app.get('/', (req, res) => {
    res.send('Telegram Protection Bot is running successfully! 🚀');
});

app.listen(PORT, () => {
    console.log(`Web dashboard server is running on port ${PORT}`);
});

// رسالة ترحيبية عند انضمام عضو جديد للمجموعة
bot.on('new_chat_members', (ctx) => {
    ctx.reply('أهلاً بك في المجموعة! 🛡️ يرجى الالتزام بالقوانين وعدم نشر الروابط.');
});

// أمر الترحيب الأساسي
bot.start((ctx) => {
    ctx.reply('أهلاً بك! أنا بوت حماية وإدارة المجموعات، أعمل الآن بنجاح 🚀');
});

// نظام حماية لحذف الروابط في المجموعات
bot.on('text', (ctx) => {
    if (ctx.chat.type === 'private') return;

    const text = ctx.message.text || '';

    // التحقق إذا كانت الرسالة تحتوي على رابط
    if (text.includes('http://') || text.includes('https://') || text.includes('t.me/')) {
        ctx.deleteMessage().catch(() => {});
        const name = ctx.from.first_name || 'عضو';
        ctx.reply(`عذراً ${name}، ممنوع نشر الروابط في هذه المجموعة! 🚫`);
    }
});

bot.launch();
console.log('تم تشغيل بوت الحماية بنجاح!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
