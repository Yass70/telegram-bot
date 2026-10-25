const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// حالة حماية الروابط
let linkProtection = true;

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// أمر البدء
bot.start((ctx) => {
    ctx.reply('أهلاً بك! أنا بوت حماية المجموعات 🛡️\nاكتب /admin لإظهار لوحة التحكم.');
});

// لوحة التحكم المتاحة للجميع مؤقتاً للتجربة
bot.command('admin', (ctx) => {
    const statusText = linkProtection ? '🟢 مفعلة' : '🔴 معطلة';
    ctx.reply(`🎛️ **لوحة التحكم**\n\nحالة حظر الروابط: ${statusText}`, 
        Markup.inlineKeyboard([
            [Markup.button.callback(linkProtection ? 'إيقاف حظر الروابط 🔴' : 'تفعيل حظر الروابط 🟢', 'toggle_links')]
        ])
    );
});

// تفاعل الأزرار
bot.action('toggle_links', async (ctx) => {
    linkProtection = !linkProtection;
    const statusText = linkProtection ? '🟢 مفعلة' : '🔴 معطلة';
    
    await ctx.editMessageText(`🎛️ **لوحة التحكم**\n\nحالة حظر الروابط: ${statusText}`, 
        Markup.inlineKeyboard([
            [Markup.button.callback(linkProtection ? 'إيقاف حظر الروابط 🔴' : 'تفعيل حظر الروابط 🟢', 'toggle_links')]
        ])
    );
    await ctx.answerCbQuery(`تم تغيير حالة الحظر إلى: ${statusText}`);
});

// الترحيب وحذف الروابط
bot.on('new_chat_members', (ctx) => {
    ctx.reply('أهلاً بك في المجموعة! 🛡️ يرجى عدم نشر الروابط.');
});

bot.on('text', (ctx) => {
    if (ctx.chat.type === 'private') return;
    if (!linkProtection) return;

    const text = ctx.message.text || '';
    if (text.includes('http://') || text.includes('https://') || text.includes('t.me/')) {
        ctx.deleteMessage().catch(() => {});
        ctx.reply(`عذراً، ممنوع نشر الروابط هنا! 🚫`);
    }
});

bot.launch();
console.log('Bot started successfully!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
