// يقرأ موعد المستخدم بصيغة يوم/شهر/سنة ساعة:دقيقة حسب توقيت بغداد (UTC+3).
export function parseBaghdadDateTime(input, now = Date.now()) {
  const match = String(input || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return { ok: false, error: 'الصيغة مو صحيحة. استخدم: يوم/شهر/سنة ساعة:دقيقة\nمثال: 30/10/2026 18:45' };
  const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw] = match;
  const day = Number(dayRaw), month = Number(monthRaw), year = Number(yearRaw);
  const hour = Number(hourRaw), minute = Number(minuteRaw);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, error: 'اليوم أو الشهر أو الوقت غير صحيح. حاول مرة ثانية.' };
  }
  // العراق ثابت على UTC+3؛ تحويل وقت بغداد المحلي إلى UTC.
  const timestamp = Date.UTC(year, month - 1, day, hour - 3, minute, 0, 0);
  const check = new Date(timestamp + 3 * 60 * 60 * 1000);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute) {
    return { ok: false, error: 'هذا التاريخ غير موجود بالتقويم. تأكد من اليوم والشهر.' };
  }
  if (timestamp <= now) return { ok: false, error: 'الموعد لازم يكون بالمستقبل. أرسل تاريخاً ووقتاً قادمين.' };
  return { ok: true, timestamp };
}
