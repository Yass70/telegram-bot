import { Bot } from 'grammy';
import { setupCommands } from './commands.js';
import { db, save, freshGroup } from './database.js';
import { createHelpers } from './helpers.js';
import { installGlobalTextOverrides } from './globalTextOverrides.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = String(process.env.BOT_OWNER_ID || '').trim();
if (!TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
if (!OWNER_ID) console.warn('Warning: BOT_OWNER_ID is not set; owner-only features will be unavailable.');

const bot = new Bot(TOKEN);
bot.catch((err) => {
  console.error('Error happened in bot catch:', err);
});

const helpers = createHelpers({ bot, db, save, freshGroup, OWNER_ID });
installGlobalTextOverrides(bot, db);
setupCommands(bot, db, helpers);

// فحص التذكيرات المحفوظة دورياً، حتى تستمر بعد إعادة تشغيل الاستضافة.
let reminderCheckRunning = false;
setInterval(async () => {
  if (reminderCheckRunning) return;
  reminderCheckRunning = true;
  try {
    db.reminders = Array.isArray(db.reminders) ? db.reminders : [];
    const due = db.reminders.filter(item => item && item.status === 'pending' && Number(item.dueAt) <= Date.now());
    for (const reminder of due) {
      reminder.status = 'sending';
      reminder.attempts = Number(reminder.attempts || 0);
      save();
      try {
        await bot.api.sendMessage(Number(reminder.chatId || reminder.userId), `⏰ تذكيرك من نغنوغ 🐈‍⬛\n\n📝 ${String(reminder.text || '').slice(0, 700)}`);
        reminder.status = 'sent';
        reminder.sentAt = Date.now();
      } catch (error) {
        reminder.attempts += 1;
        reminder.lastError = String(error?.description || error?.message || 'تعذر إرسال التذكير').slice(0, 300);
        reminder.status = reminder.attempts >= 3 ? 'failed' : 'pending';
        if (reminder.status === 'pending') reminder.dueAt = Date.now() + 60_000;
        console.error('Reminder delivery failed:', reminder.id, reminder.lastError);
      }
      save();
    }
  } catch (error) {
    console.error('Reminder scheduler error:', error);
  } finally {
    reminderCheckRunning = false;
  }
}, 15_000);

// إذا أعيد تشغيل البوت أثناء محاولة إرسال، أعد المحاولة بدل بقاء التذكير عالقاً.
for (const reminder of (db.reminders || [])) {
  if (reminder?.status === 'sending') reminder.status = 'pending';
}
save();

bot.start();
