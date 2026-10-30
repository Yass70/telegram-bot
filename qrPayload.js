const MAX_QR_TEXT = 2500;

export const QR_TYPE_LABELS = Object.freeze({
  url: '🔗 باركود رابط',
  text: '📝 باركود نص',
  wifi: '📶 باركود Wi-Fi',
  phone: '📞 باركود هاتف',
  email: '✉️ باركود بريد إلكتروني',
  location: '📍 باركود موقع',
  contact: '👤 باركود جهة اتصال',
  image: '🖼️ باركود صورة'
});

export function buildQrPayload(type, input) {
  const value = String(input || '').trim();
  if (!value) throw new Error('المحتوى فارغ. أرسل البيانات المطلوبة.');
  if (Buffer.byteLength(value, 'utf8') > MAX_QR_TEXT) throw new Error('المحتوى طويل جداً للباركود. اختصره قليلاً ثم حاول مرة ثانية.');
  if (type === 'url') {
    let url;
    try { url = new URL(value); } catch { throw new Error('الرابط غير صحيح. أرسله كاملاً ويبدأ بـ https:// أو http://.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('نوع الرابط غير مدعوم. استخدم https أو http.');
    return url.toString();
  }
  if (type === 'text') return value;
  if (type === 'phone') {
    const phone = value.replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{5,20}$/.test(phone)) throw new Error('رقم الهاتف غير صحيح. أرسله مع رمز الدولة إن أمكن.');
    return `tel:${phone}`;
  }
  if (type === 'email') {
    const [address, subject = '', ...bodyParts] = value.split('|').map(part => part.trim());
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address || '')) throw new Error('صيغة البريد غير صحيحة. أرسل: البريد | الموضوع | نص الرسالة');
    return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyParts.join('|'))}`;
  }
  if (type === 'wifi') {
    const [ssid, password = '', security = 'WPA'] = value.split('|').map(part => part.trim());
    if (!ssid || ssid.length > 32) throw new Error('اسم شبكة Wi-Fi مطلوب وبحد أقصى 32 حرفاً. أرسل: اسم الشبكة | كلمة المرور | WPA أو WEP أو nopass');
    const mode = security.toUpperCase();
    if (!['WPA', 'WEP', 'NOPASS'].includes(mode)) throw new Error('نوع حماية Wi-Fi يجب أن يكون WPA أو WEP أو nopass.');
    if (mode !== 'NOPASS' && !password) throw new Error('أدخل كلمة مرور الشبكة، أو استخدم nopass للشبكة المفتوحة.');
    const esc = s => String(s).replace(/([\\;,:])/g, '\\$1');
    return `WIFI:T:${mode};S:${esc(ssid)};P:${esc(password)};;`;
  }
  if (type === 'location') {
    if (!/^https:\/\/(?:www\.)?google\.[^/]+\/maps|^https:\/\/maps\.app\.goo\.gl\//i.test(value) && !/^https:\/\//i.test(value)) throw new Error('أرسل رابط موقع يبدأ بـ https://.');
    return value;
  }
  if (type === 'contact') {
    const [name, phone = '', email = ''] = value.split('|').map(part => part.trim());
    if (!name || name.length > 100) throw new Error('الاسم مطلوب وبحد أقصى 100 حرف. أرسل: الاسم | الهاتف | البريد الإلكتروني');
    const cleanPhone = phone.replace(/[\s()-]/g, '');
    if (cleanPhone && !/^\+?[0-9]{5,20}$/.test(cleanPhone)) throw new Error('رقم الهاتف غير صحيح.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('البريد الإلكتروني غير صحيح.');
    const esc = s => String(s).replace(/([\\;,])/g, '\\$1');
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${esc(name)}\n${phone ? `TEL:${esc(phone)}\n` : ''}${email ? `EMAIL:${esc(email)}\n` : ''}END:VCARD`;
  }
  throw new Error('نوع الباركود غير معروف.');
}

