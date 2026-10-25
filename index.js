const { Telegraf, Markup } = require('telegraf');
const express = require('express');

// إعداد البوت والسيرفر
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID) || 0; // معرف المالك (الايدي الخاص بك)

// حالة حماية الروابط (مفعلة افتراضياً)
let linkProtection = true;

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Telegram Protection Bot is running successfully! 🚀');
});

app.listen(PORT, () => {
    console.log(`Web dashboard server is running on port ${PORT}`);
});

// أمر لوحة التحكم للمالك فقط (/admin)
bot.command('admin', (ctx) => {
    if (ADMIN_ID && ctx.from.id !== ADMIN_ID) {
        return ctx.reply('عذراً، هذا الأمر مخصص لمالك البوت فقط! ❌');
    }

    const statusText = linkProtection ? '🟢 مفعلة' : '🔴 معطلة';
    ctx.reply(`🎛️ **لوحة تحكم مالك البوت**\n\nحالة حظر الروابط: ${statusText}\nاختر الإجراء المطلوب:`, 
        Markup.inlineKeyboard([
            [Markup.button.callback(linkProtection ? 'إيقاف حظر الروابط 🔴' : 'تفعيل حظر الروابط 🟢', 'toggle_links')],
            [Markup.button.callback('📊 حالة البوت', 'bot_stats')]
        ])
    );
});

// زر تفعيل/إيقاف حظر الروابط
bot.action('toggle_links', async (ctx) => {
    if (ADMIN_ID && ctx.from.id !== ADMIN_ID) {
        return ctx.answerCbQuery('هذا الزر لمالك البوت فقط! ❌', { show_alert: true });
    }
    
    linkProtection = !linkProtection;
    const statusText = linkProtection ? '🟢 مفعلة' : '🔴 معطلة';
    
    await ctx.editMessageText(`🎛️ **لوحة تحكم مالك البوت**\n\nحالة حظر الروابط: ${statusText}\nاختر الإجراء المطلوب:`, 
        Markup.inlineKeyboard([
            [Markup.button.callback(linkProtection ? 'إيقاف حظر الروابط 🔴' : 'تفعيل حظر الروابط 🟢', 'toggle_links')],
            [Markup.button.callback('📊 حالة البوت', 'bot_stats')]
        ])
    );
    await ctx.answerCbQuery(`تم تغيير حالة حظر الروابط إلى: ${statusText}`);
});

// زر إحصائيات البوت
bot.action('bot_stats', async (ctx) => {
    if (ADMIN_ID && ctx.from.id !== ADMIN_ID) {
        return ctx.answerCbQuery('هذا الزر لمالك البوت فقط! ❌', { show_alert: true });
    }
    await ctx.answerCbQuery('البوت يعمل بكفاءة وبأمان تام على استضافة FadeHost 🚀', { show_alert: true });
});

// رسالة ترحيبية عند انضمام عضو جديد
bot.on('new_chat_members', (ctx) => {
    ctx.reply('أهلاً بك في المجموعة! 🛡️ يرجى الالتزام بالقوانين وعدم نشر الروابط.');
});

bot.start((ctx) => {
    ctx.reply('أهلاً بك! أنا بوت حماية وإدارة المجموعات، أعمل الآن بنجاح 🚀');
});

// نظام حماية لحذف الروابط في المجموعات
bot.on('text', (ctx) => {
    if (ctx.chat.type === 'private') return;
    if (!linkProtection) return; // إذا كانت الحماية معطلة من لوحة التحكم، لا تحذف شيئاً

    const text = ctx.message.text || '';
    
    if (text.includes('http://') || text.includes('https://') || text.includes('t.me/')) {
        ctx.deleteMessage().catch(() => {});
        const name = ctx.from.first_name || 'عضو';
        ctx.reply(`عذراً ${name}، ممنوع نشر الروابط في هذه المجموعة! 🚫`);
    }
});

bot.launch();
console.log('تم تشغيل بوت الحماية مع لوحة التحكم بنجاح!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
