const PUBLIC_HOSTS = new Set(['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me']);
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;
const CHAT_ID_RE = /^-?\d{5,20}$/;

function invalid(message) { const error = new Error(message); error.code = 'CHAT_TARGET_INVALID'; return error; }

/** Parse Telegram identifiers without confusing private invite hashes with chat IDs. */
export function normalizeChatTargetInput(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw invalid('لم ترسل معرفاً. أرسل @username أو رابط t.me أو Chat ID رقمي.');
  const parts = raw.split('|').map(part => part.trim());
  if (parts.length > 2) throw invalid('صيغة الإدخال غير صحيحة. إذا كانت الجهة خاصة استخدم: Chat ID | رابط الدعوة.');
  let reference = parts[0];
  const suppliedInvite = parts[1] || '';
  if (suppliedInvite && !isPrivateInviteLink(suppliedInvite)) {
    throw invalid('الجزء الثاني يجب أن يكون رابط دعوة خاصاً يبدأ بـ https://t.me/+ أو https://t.me/joinchat/.');
  }

  if (/^https?:\/\//i.test(reference) || /^(?:www\.)?(?:t\.me|telegram\.me)\//i.test(reference)) {
    let urlText = reference;
    if (!/^https?:\/\//i.test(urlText)) urlText = `https://${urlText}`;
    let url;
    try { url = new URL(urlText.replace(/^http:\/\//i, 'https://')); }
    catch { throw invalid('الرابط غير صالح. أرسل رابطاً صحيحاً من t.me أو telegram.me.'); }
    if (!PUBLIC_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || url.port) {
      throw invalid('الرابط يجب أن يكون من t.me أو telegram.me فقط.');
    }
    const segments = url.pathname.split('/').filter(Boolean).map(segment => {
      try { return decodeURIComponent(segment); } catch { throw invalid('الرابط يحتوي على ترميز غير صالح.'); }
    });
    if (!segments.length) throw invalid('الرابط لا يحتوي على اسم مستخدم أو معرّف جهة.');
    if (segments[0].startsWith('+') || segments[0].toLowerCase() === 'joinchat') {
      throw invalid('هذا رابط دعوة خاص ولا يكشف Chat ID. أرسل Chat ID الخاص بالجهة ثم | ثم رابط الدعوة، بعد إضافة نغنوغ إليها.');
    }
    if (segments[0].toLowerCase() === 'c') {
      throw invalid('هذا رابط داخلي خاص من نوع t.me/c ولا يكشف Chat ID الكامل. أرسل Chat ID الذي يبدأ غالباً بـ -100.');
    }
    const username = segments[0].startsWith('@') ? segments[0].slice(1) : segments[0];
    if (!USERNAME_RE.test(username)) throw invalid('اسم المستخدم في الرابط غير صالح. يجب أن يكون من 5 إلى 32 حرفاً أو رقماً أو _ ويبدأ بحرف.');
    if (segments.length > 2 || (segments.length === 2 && !/^\d+$/.test(segments[1]))) {
      throw invalid('أرسل رابط القناة أو المجموعة نفسه، وليس رابط رسالة أو منشور فرعي.');
    }
    reference = `@${username}`;
  } else if (reference.startsWith('@')) {
    const username = reference.slice(1);
    if (!USERNAME_RE.test(username)) throw invalid('اسم المستخدم غير صالح. تحقق من @username.');
    reference = `@${username}`;
  } else if (CHAT_ID_RE.test(reference)) {
    // Keep as string: Telegram chat IDs may exceed JavaScript's safe integer range.
  } else {
    throw invalid('الصيغة غير مدعومة. أرسل @username أو رابط t.me/username أو Chat ID رقمي.');
  }

  if (suppliedInvite && !CHAT_ID_RE.test(reference)) {
    throw invalid('رابط الدعوة الخاص يحتاج Chat ID رقمياً قبله؛ لا يمكن استخراج هوية الجهة من رمز الدعوة وحده.');
  }
  return {
    reference,
    suppliedInvite,
    isNumericId: CHAT_ID_RE.test(reference),
    isPrivateInvite: Boolean(suppliedInvite),
    publicUsername: reference.startsWith('@') ? reference.slice(1) : '',
  };
}

export function isPrivateInviteLink(value) {
  const raw = String(value ?? '').trim();
  let url;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return false; }
  if (!PUBLIC_HOSTS.has(url.hostname.toLowerCase())) return false;
  const path = url.pathname;
  return /^\/+\+[A-Za-z0-9_-]{8,}$/i.test(path) || /^\/+joinchat\/[A-Za-z0-9_-]{8,}$/i.test(path);
}

function apiReason(error) { return String(error?.description || error?.message || 'خطأ غير معروف'); }

/** Resolve with Telegram Bot API and enforce per-service requirements before persistence. */
export async function resolveTelegramChatTarget(ctx, input, options = {}) {
  const parsed = normalizeChatTargetInput(input);
  let chat;
  try { chat = await ctx.api.getChat(parsed.reference); }
  catch (error) {
    const reason = apiReason(error);
    if (/chat not found/i.test(reason)) throw new Error('تيليغرام لم يعثر على القناة أو المجموعة. تحقق من الرابط أو Chat ID، وتأكد أن نغنوغ مضاف إلى الجهة.');
    if (/forbidden|not enough rights/i.test(reason)) throw new Error('تيليغرام رفض الوصول إلى الجهة. أضف نغنوغ إليها أولاً، ثم امنحه صلاحيات المشرف المطلوبة.');
    throw new Error(`تعذّر الوصول إلى الجهة عبر Telegram Bot API: ${reason}`);
  }
  const allowedTypes = options.allowedTypes || ['channel', 'group', 'supergroup'];
  if (!allowedTypes.includes(chat.type)) throw new Error(`نوع الجهة غير مناسب لهذه الخدمة. النوع الذي عثر عليه تيليغرام: ${chat.type}.`);

  const botId = String(options.botId || ctx.me?.id || ctx.botInfo?.id || '');
  if (!botId) throw new Error('تعذّر تحديد هوية نغنوغ لفحص صلاحياته. أعد المحاولة بعد تشغيل البوت بصورة صحيحة.');
  let botMember;
  try { botMember = await ctx.api.getChatMember(chat.id, botId); }
  catch (error) { throw new Error(`تم العثور على الجهة، لكن تعذّر فحص صلاحيات نغنوغ: ${apiReason(error)}. أضف البوت إلى الجهة ثم أعد المحاولة.`); }
  if (!['administrator', 'creator'].includes(botMember.status)) {
    throw new Error('نغنوغ ليس مشرفاً في هذه الجهة. ارفعه إلى مشرف ثم أعد المحاولة.');
  }
  if (options.requireBotPost && chat.type === 'channel' && botMember.status !== 'creator' && botMember.can_post_messages !== true) {
    throw new Error('نغنوغ مشرف، لكن صلاحية «نشر الرسائل» غير مفعّلة. فعّلها من صلاحيات المشرف ثم أعد المحاولة.');
  }
  if (options.requireUserAdmin) {
    let userMember;
    try { userMember = await ctx.api.getChatMember(chat.id, ctx.from.id); }
    catch (error) { throw new Error(`تيليغرام لم يؤكد أنك مشرف في هذه القناة: ${apiReason(error)}. يجب أن تكون مالكاً أو مشرفاً فيها.`); }
    if (!['administrator', 'creator'].includes(userMember.status)) throw new Error('تيليغرام لم يؤكد أنك مالك أو مشرف في هذه الجهة؛ لم تتم إضافتها.');
  }

  let url = chat.username ? `https://t.me/${chat.username}` : (parsed.suppliedInvite || chat.invite_link || '');
  if (!url && typeof ctx.api.exportChatInviteLink === 'function') {
    try { url = await ctx.api.exportChatInviteLink(chat.id); } catch {}
  }
  if (!url) throw new Error('تم التحقق من الجهة وصلاحيات نغنوغ، لكن لا يوجد رابط عام أو دعوة متاحة. للجهة الخاصة أرسل Chat ID ثم | ثم رابط الدعوة الخاص.');
  // A supplied invite link cannot be mapped back to a chat by Bot API. We verify the Chat ID and bot role independently.
  return {
    id: String(chat.id),
    type: chat.type,
    title: chat.title || (chat.username ? `@${chat.username}` : String(chat.id)),
    username: chat.username || '',
    url,
    privateInviteSupplied: parsed.isPrivateInvite,
    inviteAssociationVerified: !parsed.isPrivateInvite,
  };
}
