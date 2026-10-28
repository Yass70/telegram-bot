import { loadStore, saveStore } from './src/store.js';
import { createBot } from './src/bot.js';

const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
if (!token) {
  console.error('❌ المتغير TELEGRAM_BOT_TOKEN غير موجود. أضفه من إعدادات الاستضافة ولا تكتبه داخل الملفات.');
  process.exit(1);
}
if (!String(process.env.BOT_OWNER_ID || '').trim()) {
  console.warn('⚠️ BOT_OWNER_ID غير مضبوط؛ لوحة المالك والميزات الخاصة به لن تعمل حتى تضيف رقم تيليغرام الرقمي للمالك.');
}

await loadStore();
const bot = createBot(token);
const me = await bot.api.getMe();
console.log(`🐈‍⬛ نغنوغ يعمل الآن: @${me.username}`);
await bot.start({ onStart: info => console.log(`✅ بدأ استقبال التحديثات للبوت @${info.username}`) });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    console.log(`\n⏹️ استلام ${signal}، جارٍ حفظ البيانات وإيقاف البوت...`);
    try { await bot.stop(); } catch {}
    try { await saveStore(); } catch (e) { console.error('تعذر حفظ البيانات عند الإيقاف:', e.message); }
    process.exit(0);
  });
}
