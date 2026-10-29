// أدوات مواعيد بغداد (UTC+3) مع إدخال مبسّط: اليوم/باچر أو يوم/شهر/سنة ثم الساعة.
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

function baghdadParts(timestamp = Date.now()) {
  const d = new Date(timestamp + BAGHDAD_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function parseBaghdadDay(input, now = Date.now()) {
  const raw = String(input || '').trim().toLocaleLowerCase('ar').replace(/[أإآ]/g, 'ا');
  let { year, month, day } = baghdadParts(now);
  if (/^(اليوم|هسه|هذا اليوم)$/.test(raw)) {
    // use today's Baghdad date
  } else if (/^(باچر|باجر|غدا|غداً|بكره|بكرة|باجرَ)$/.test(raw)) {
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear(); month = next.getUTCMonth() + 1; day = next.getUTCDate();
  } else {
    const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{4}))?$/);
    if (!m) return { ok: false, error: 'ما فهمت اليوم. أرسل «اليوم» أو «باچر»، أو تاريخاً مثل 30/10/2026.' };
    day = Number(m[1]); month = Number(m[2]); year = m[3] ? Number(m[3]) : year;
    const check = new Date(Date.UTC(year, month - 1, day));
    if (month < 1 || month > 12 || day < 1 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
      return { ok: false, error: 'التاريخ غير صحيح. أرسله مثل 30/10/2026.' };
    }
    if (!m[3] && Date.UTC(year, month - 1, day) < Date.UTC(...Object.values(baghdadParts(now)).map((v, i) => i === 1 ? v - 1 : v))) {
      year += 1;
    }
  }
  return { ok: true, year, month, day };
}

export function parseBaghdadTime(day, input, now = Date.now()) {
  const m = String(input || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { ok: false, error: 'أرسل الساعة بصيغة ساعة:دقيقة، مثل 18:45 أو 9:05.' };
  const hour = Number(m[1]), minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { ok: false, error: 'الساعة غير صحيحة. استخدم 00:00 إلى 23:59.' };
  const timestamp = Date.UTC(day.year, day.month - 1, day.day, hour - 3, minute, 0, 0);
  const check = new Date(timestamp + BAGHDAD_OFFSET_MS);
  if (check.getUTCFullYear() !== day.year || check.getUTCMonth() !== day.month - 1 || check.getUTCDate() !== day.day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute) {
    return { ok: false, error: 'اليوم أو الوقت غير صحيح. تأكد من التاريخ والساعة.' };
  }
  if (timestamp <= now) return { ok: false, error: 'هذا الموعد صار بالماضي. اختَر يوماً ووقتاً بالمستقبل.' };
  return { ok: true, timestamp };
}

// توافق مع النسخ السابقة التي كانت تطلب التاريخ والساعة في رسالة واحدة.
export function parseBaghdadDateTime(input, now = Date.now()) {
  const match = String(input || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return { ok: false, error: 'الصيغة مو صحيحة. استخدم: يوم/شهر/سنة ساعة:دقيقة\nمثال: 30/10/2026 18:45' };
  const day = parseBaghdadDay(`${match[1]}/${match[2]}/${match[3]}`, now);
  if (!day.ok) return day;
  return parseBaghdadTime(day, `${match[4]}:${match[5]}`, now);
}
