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

/**
 * Return a usable join URL. Public chats always use their canonical username URL.
 * For private chats, never expose a numeric Chat ID as a URL and never trust an
 * arbitrary invite hash: create a fresh bot-owned invite link through Bot API.
 */
export async function ensureTelegramJoinLink(api, chat, botMember, options = {}) {
  if (chat?.username) {
    return {
      url: `https://t.me/${chat.username}`,
      inviteLink: '',
      inviteLinkGeneratedByBot: false,
      inviteLinkCreatedAt: 0,
      createsJoinRequest: false,
    };
  }

  const existing = options.target || {};
  const now = Date.now();
  const maxAge = Number(options.maxStoredInviteAgeMs || 6 * 60 * 60 * 1000);
  const expiry = Number(existing.inviteLinkExpiresAt || 0);
  const createdAt = Number(existing.inviteLinkCreatedAt || 0);
  if (existing.inviteLinkGeneratedByBot === true
      && typeof existing.inviteLink === 'string'
      && /^https:\/\/t\.me\/(?:\+|joinchat\/)/i.test(existing.inviteLink)
      && (!expiry || expiry * 1000 > now + 60_000)
      && createdAt > 0 && now - createdAt < maxAge) {
    return {
      url: existing.inviteLink,
      inviteLink: existing.inviteLink,
      inviteLinkGeneratedByBot: true,
      inviteLinkCreatedAt: createdAt,
      inviteLinkExpiresAt: expiry,
      createsJoinRequest: existing.createsJoinRequest === true,
    };
  }

  const canInvite = botMember?.status === 'creator' || botMember?.can_invite_users === true;
  if (!canInvite) {
    throw new Error('الجهة خاصة ولا يوجد لها رابط عام. يحتاج نغنوغ صلاحية «دعوة المستخدمين عبر رابط» لإنشاء رابط انضمام صالح؛ فعّل can_invite_users للبوت ثم أعد المحاولة.');
  }
  if (typeof api.createChatInviteLink !== 'function') {
    throw new Error('إصدار Telegram Bot API المتاح لا يدعم إنشاء روابط الدعوة. حدّث grammY/Telegram Bot API ثم أعد المحاولة.');
  }

  // A supplied private invite means the owner intends an approval-based route.
  // We create our own fresh invite with the same join-request behavior instead
  // of trusting an invite hash that the Bot API cannot inspect or validate.
  const createsJoinRequest = options.createsJoinRequest === true;
  let invite;
  try {
    invite = await api.createChatInviteLink(chat.id, {
      name: `نغنوغ اشتراك ${String(chat.title || 'جهة').slice(0, 20)}`,
      creates_join_request: createsJoinRequest,
    });
  } catch (error) {
    const reason = apiReason(error);
    throw new Error(`تعذّر إنشاء رابط انضمام خاص صالح. تأكد من صلاحية «دعوة المستخدمين عبر رابط» لدى نغنوغ. السبب: ${reason}`);
  }
  if (!invite?.invite_link || !/^https:\/\/t\.me\/(?:\+|joinchat\/)/i.test(invite.invite_link)) {
    throw new Error('أعاد تيليغرام نتيجة لا تحتوي على رابط دعوة صالح؛ لم تُحفظ الجهة.');
  }
  return {
    url: invite.invite_link,
    inviteLink: invite.invite_link,
    inviteLinkGeneratedByBot: true,
    inviteLinkCreatedAt: now,
    inviteLinkExpiresAt: Number(invite.expire_date || 0),
    createsJoinRequest: invite.creates_join_request === true,
  };
}

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

  const join = await ensureTelegramJoinLink(ctx.api, chat, botMember, {
    target: options.existingTarget,
    createsJoinRequest: parsed.isPrivateInvite || options.createsJoinRequest === true,
  });
  return {
    id: String(chat.id),
    type: chat.type,
    title: chat.title || (chat.username ? `@${chat.username}` : String(chat.id)),
    username: chat.username || '',
    ...join,
    privateInviteSupplied: parsed.isPrivateInvite,
    inviteAssociationVerified: true,
  };
}
