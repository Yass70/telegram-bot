import { Bot, InlineKeyboard } from 'grammy';
import { getStore, saveStore, ensureUser, ensureGroup } from './store.js';
import { DEFAULT_TEXTS, textFor, mainKeyboard, ownerKeyboard, backKeyboard, groupSettingsKeyboard } from './ui.js';
import { isLink, isFlood, escapeHtml } from './moderation.js';

const OWNER_ID = String(process.env.BOT_OWNER_ID || '').trim();
const pendingGame = new Map();
const animals = [ ['🐱','قطة'], ['🐶','كلب'], ['🦁','أسد'], ['🐼','باندا'], ['🐰','أرنب'], ['🦊','ثعلب'] ];
const isOwner = ctx => Boolean(OWNER_ID && String(ctx.from?.id) === OWNER_ID);
const isPrivate = ctx => ctx.chat?.type === 'private';
const userId = ctx => String(ctx.from?.id || '');
const groupId = ctx => String(ctx.chat?.id || '');
const userMention = user => `<a href="tg://user?id=${user.id}">${escapeHtml(user.first_name || 'العضو')}</a>`;

async function safeReply(ctx, text, extra = {}) {
  try { return await ctx.reply(text, { parse_mode: 'HTML', ...extra }); }
  catch (e) { console.error('[reply]', e.message); return null; }
}
async function isAdmin(ctx, chatId = ctx.chat?.id, uid = ctx.from?.id) {
  try { const m = await ctx.api.getChatMember(chatId, uid); return ['creator','administrator'].includes(m.status); }
  catch { return false; }
}
async function checkRequired(ctx) {
  const required = getStore().requiredChat;
  if (!required || isOwner(ctx)) return true;
  if (!ctx.from || !isPrivate(ctx)) return true;
  try {
    const m = await ctx.api.getChatMember(required.id, ctx.from.id);
    if (['creator','administrator','member'].includes(m.status) || (m.status === 'restricted' && m.is_member)) return true;
  } catch (e) { console.warn('[required-chat] تحقق غير ناجح:', e.message); }
  const joinUrl = required.url || (required.username ? `https://t.me/${required.username.replace(/^@/, '')}` : null);
  const kb = new InlineKeyboard();
  if (joinUrl) kb.url('📢 انضم للقناة / المجموعة', joinUrl).row();
  kb.text('✅ تحقّق من الاشتراك', 'required:check');
  await safeReply(ctx, `🔐 <b>الاشتراك مطلوب</b>\n\nحتى تستخدم نغنوغ، انضم أولاً إلى: ${escapeHtml(required.title || required.username || required.id)} ثم اضغط «تحقّق من الاشتراك».`, { reply_markup: kb });
  return false;
}
function ensureContext(ctx) {
  if (ctx.from) ensureUser(ctx.from);
  if (ctx.chat && ['group','supergroup'].includes(ctx.chat.type)) ensureGroup(ctx.chat);
}
async function renderHome(ctx, edit = false) {
  const id = ctx.from?.id;
  const message = `<b>${escapeHtml(textFor('welcome', id))}</b>\n\n${escapeHtml(textFor('subtitle', id))}`;
  const extra = { reply_markup: mainKeyboard(id, isOwner(ctx)), parse_mode: 'HTML' };
  if (edit && ctx.callbackQuery?.message) {
    try { await ctx.editMessageText(message, extra); return; } catch {}
  }
  await safeReply(ctx, message, extra);
}
async function renderGroupSettings(ctx, gid, edit = false) {
  const g = getStore().groups[String(gid)];
  if (!g) return safeReply(ctx, 'ما لقيت هاي المجموعة مسجّلة. أضف نغنوغ للمجموعة واكتب «تفعيل» بيها أولاً.');
  const message = `🛡️ <b>إدارة المجموعة والحماية</b>\n\n👥 <b>${escapeHtml(g.title)}</b>\nاختار الميزة حتى تشغّلها أو تطفيها. لازم نغنوغ يكون مشرفاً حتى يطبّق الحماية.`;
  const extra = { reply_markup: groupSettingsKeyboard(g), parse_mode: 'HTML' };
  if (edit) { try { await ctx.editMessageText(message, extra); return; } catch {} }
  await safeReply(ctx, message, extra);
}
async function ownerOnly(ctx) { if (!isOwner(ctx)) { await safeReply(ctx, '⛔ هذا القسم خاص بمالك البوت.'); return false; } return true; }

export function createBot(token) {
  const bot = new Bot(token);
  bot.use(async (ctx, next) => {
    ensureContext(ctx);
    if (isPrivate(ctx) && ctx.from && !isOwner(ctx) && ctx.callbackQuery?.data !== 'required:check' && getStore().requiredChat) {
      const allowed = await checkRequired(ctx);
      if (!allowed) {
        if (ctx.callbackQuery) { try { await ctx.answerCallbackQuery({ text: 'اشترك أولاً حتى تستخدم البوت', show_alert: true }); } catch {} }
        return;
      }
    }
    if (ctx.chat && ['group','supergroup'].includes(ctx.chat.type)) {
      const g = ensureGroup(ctx.chat);
      if (ctx.from && !ctx.from.is_bot) {
        g.members[String(ctx.from.id)] ||= { id: String(ctx.from.id), name: ctx.from.first_name || 'عضو', messages: 0, points: 0, warnings: 0 };
        g.members[String(ctx.from.id)].name = ctx.from.first_name || g.members[String(ctx.from.id)].name;
        g.members[String(ctx.from.id)].messages++;
        g.messageCount++;
        const u = ensureUser(ctx.from); u.messages++;
        await saveStore();
      }
    }
    await next();
  });

  bot.command('start', async ctx => { await renderHome(ctx); });
  bot.command('help', async ctx => safeReply(ctx, '📖 <b>مساعدة نغنوغ</b>\n/start — القائمة الرئيسية\n/panel — إعدادات مجموعتك\n/id — عرض المعرّف\n/game — لعبة تخمين الحيوان\n/me — بطاقتك\n/points — نقاطك\n/top — المتصدرون\n/warn بالرد على عضو — تحذير\n/mute أو /unmute بالرد — كتم/فك كتم\n/pin أو /unpin بالرد — تثبيت/إلغاء تثبيت\n\nأوامر الإدارة تعمل للمشرفين حسب صلاحياتهم.'));
  bot.command('id', ctx => safeReply(ctx, `🆔 معرّفك: <code>${ctx.from.id}</code>\nمعرّف المحادثة: <code>${ctx.chat.id}</code>`));
  bot.command('panel', async ctx => {
    if (isPrivate(ctx)) return renderHome(ctx);
    const g = ensureGroup(ctx.chat); g.active = true; await saveStore();
    await safeReply(ctx, '🐈‍⬛ تم تسجيل المجموعة! افتح البوت بالخاص واضغط «مجموعاتي» لإدارة الإعدادات.');
  });
  bot.hears(/^تفعيل$/i, async ctx => {
    if (!['group','supergroup'].includes(ctx.chat.type)) return;
    if (!await isAdmin(ctx)) return safeReply(ctx, 'لازم مشرف المجموعة هو اللي يفعّل نغنوغ.');
    const g = ensureGroup(ctx.chat); g.active = true; await saveStore();
    await safeReply(ctx, '✅ تم تفعيل نغنوغ بهالمجموعة. افتح البوت بالخاص لإعداد الحماية والترحيب.');
  });
  bot.command('me', async ctx => {
    const u = ensureUser(ctx.from); const g = getStore().groups[groupId(ctx)]; const gm = g?.members?.[userId(ctx)];
    await safeReply(ctx, `🪪 <b>بطاقتك</b>\n👤 ${escapeHtml(ctx.from.first_name)}\n⭐ نقاطك: ${u.points || 0}\n💬 رسائلك المسجّلة: ${u.messages || 0}${gm ? `\n👥 رسائلك بهالمجموعة: ${gm.messages}\n⚠️ تحذيراتك: ${gm.warnings || 0}` : ''}`);
  });
  bot.command('points', ctx => safeReply(ctx, `⭐ نقاطك الحالية: <b>${getStore().users[userId(ctx)]?.points || 0}</b>`));
  bot.command('top', async ctx => {
    const g = getStore().groups[groupId(ctx)];
    const entries = Object.values(g?.members || {}).sort((a,b) => (b.points || 0) - (a.points || 0)).slice(0,10);
    if (!entries.length) return safeReply(ctx, 'ماكو نقاط مسجلة بهالمجموعة لحد الآن.');
    await safeReply(ctx, '🏆 <b>متصدرو المجموعة</b>\n' + entries.map((m,i) => `${i+1}. ${escapeHtml(m.name)} — ⭐ ${m.points || 0}`).join('\n'));
  });
  bot.command('music', async ctx => {
    const songs = getStore().songs;
    if (!songs.length) return safeReply(ctx, '🎵 مكتبة الأغاني فارغة حالياً. مالك البوت يقدر يرسل ملفاً صوتياً للبوت بالخاص حتى يضيفه.');
    const kb = new InlineKeyboard();
    songs.slice(0, 20).forEach((song, i) => kb.text(`🎵 ${song.title}`, `song:${i}`).row());
    await safeReply(ctx, '🎵 <b>مكتبة نغنوغ</b>\nاختار المقطع حتى أرسله بهالمحادثة:', { reply_markup: kb });
  });
  bot.command('game', async ctx => {
    const [, answer] = animals[Math.floor(Math.random() * animals.length)];
    pendingGame.set(`${groupId(ctx)}:${userId(ctx)}`, { answer, expires: Date.now() + 60000 });
    const kb = new InlineKeyboard();
    for (const [em, name] of animals) kb.text(`${em} ${name}`, `game:${userId(ctx)}:${name}`).row();
    await safeReply(ctx, `🎮 <b>خمن الحيوان!</b>\nعندك دقيقة حتى تختار الحيوان الصحيح.`, { reply_markup: kb });
  });

  bot.command('warn', async ctx => applyWarning(ctx, bot, +1));
  bot.command('unwarn', async ctx => applyWarning(ctx, bot, -1));
  bot.command('mute', async ctx => applyRestriction(ctx, bot, 'mute'));
  bot.command('unmute', async ctx => applyRestriction(ctx, bot, 'unmute'));
  bot.command('ban', async ctx => applyRestriction(ctx, bot, 'ban'));
  bot.command('unban', async ctx => applyRestriction(ctx, bot, 'unban'));
  bot.command('pin', async ctx => applyPin(ctx, bot, true));
  bot.command('unpin', async ctx => applyPin(ctx, bot, false));

  bot.on('message:new_chat_members', async ctx => {
    const g = ensureGroup(ctx.chat);
    if (!g.settings.welcome) return;
    for (const m of ctx.message.new_chat_members) {
      if (m.is_bot) continue;
      const name = escapeHtml(m.first_name || 'صديقنا');
      await safeReply(ctx, escapeHtml(g.welcomeText).replaceAll('{name}', name).replaceAll('{title}', escapeHtml(ctx.chat.title || 'المجموعة')));
    }
  });

  bot.on('message:text', async ctx => {
    if (isPrivate(ctx)) {
      const p = getStore().pending[userId(ctx)];
      if (p) return handlePendingText(ctx, p, ctx.message.text);
      return;
    }
    const g = ensureGroup(ctx.chat); const text = ctx.message.text || '';
    if (ctx.from?.is_bot) return;
    if (g.settings.links && isLink(text) && !await isAdmin(ctx)) {
      try { await ctx.deleteMessage(); await safeReply(ctx, `🚫 ${userMention(ctx.from)} الروابط ممنوعة بهالمجموعة.`); } catch (e) { console.warn('[link-protection]', e.message); }
      return;
    }
    if (g.settings.flood && isFlood(ctx.chat.id, ctx.from.id) && !await isAdmin(ctx)) {
      try { await ctx.deleteMessage(); await ctx.api.restrictChatMember(ctx.chat.id, ctx.from.id, { permissions: { can_send_messages: false }, until_date: Math.floor(Date.now()/1000) + 60 }); await safeReply(ctx, `🔇 ${userMention(ctx.from)} تم كتمك دقيقة بسبب التكرار.`); } catch (e) { console.warn('[flood-protection]', e.message); }
      return;
    }
    if (g.settings.autoReplies) {
      const t = text.trim().toLowerCase();
      const replies = new Map([
        ['السلام عليكم','وعليكم السلام ورحمة الله وبركاته 🌷'], ['سلام','هلا بالسلام وأهله ❤️'], ['شلونكم','بخير دامك بخير 🫶🏻'], ['نغنوغ','عيونه نغنوغ حاضر 🐈‍⬛🐾'], ['شكرا','العفو يا وردة 🌹'], ['احبك','وأني أحب طيبتك 😂❤️']
      ]);
      if (replies.has(t)) await safeReply(ctx, replies.get(t));
    }
  });

  bot.on('message:audio', async ctx => {
    if (!isOwner(ctx) || !isPrivate(ctx)) return;
    getStore().pending[userId(ctx)] = { type: 'songTitle', fileId: ctx.message.audio.file_id, title: ctx.message.audio.title || 'أغنية بدون عنوان' };
    await saveStore();
    await safeReply(ctx, '🎵 وصلني الملف الصوتي. اكتب اسم الأغنية حتى أحفظها بمكتبة نغنوغ.');
  });
  bot.on('message:voice', async ctx => {
    if (!isOwner(ctx) || !isPrivate(ctx)) return;
    getStore().pending[userId(ctx)] = { type: 'songTitle', fileId: ctx.message.voice.file_id, title: 'مقطع صوتي' };
    await saveStore(); await safeReply(ctx, '🎵 وصلني المقطع الصوتي. اكتب اسمه حتى أحفظه.');
  });

  bot.callbackQuery('required:check', async ctx => { await ctx.answerCallbackQuery(); if (await checkRequired(ctx)) { try { await ctx.deleteMessage(); } catch {} await renderHome(ctx); } });
  bot.callbackQuery(/^menu:/, async ctx => {
    await ctx.answerCallbackQuery(); const action = ctx.callbackQuery.data.slice(5); const id = userId(ctx);
    if (action === 'home') return renderHome(ctx, true);
    if (action === 'protection') {
      const groups = Object.values(getStore().groups).filter(g => g.active && (g.members?.[id] || g.ownerId === id));
      if (!groups.length) return ctx.editMessageText('🛡️ حتى تدير مجموعة، أضف نغنوغ لمجموعتك كمسؤول واكتب «تفعيل» داخلها، وبعدها ارجع لهنا.', { reply_markup: backKeyboard() });
      const kb = new InlineKeyboard(); for (const g of groups) kb.text(`👥 ${g.title}`, `group:${g.id}`).row(); kb.text('⬅️ رجوع','menu:home');
      return ctx.editMessageText('اختار المجموعة اللي تريد تديرها:', { reply_markup: kb });
    }
    if (action === 'groups') {
      const groups = Object.values(getStore().groups).filter(g => g.active);
      const kb = new InlineKeyboard(); for (const g of groups) kb.text(`👥 ${g.title}`, `group:${g.id}`).row(); kb.text('➕ طريقة التفعيل','menu:activate').row().text('⬅️ رجوع','menu:home');
      return ctx.editMessageText(groups.length ? '👥 <b>المجموعات المسجلة</b>\nاختار مجموعة لإعدادها:' : 'ماكو مجموعات مفعّلة بعد. أضف نغنوغ لمجموعتك، امنحه صلاحيات مناسبة، ثم اكتب «تفعيل».', { parse_mode: 'HTML', reply_markup: kb });
    }
    if (action === 'activate') return ctx.editMessageText('1. أضف @' + (ctx.me?.username || 'bot') + ' إلى المجموعة.\n2. امنحه صلاحية حذف الرسائل وتقييد الأعضاء إذا تريد الحماية.\n3. اكتب «تفعيل» داخل المجموعة وأنت مشرف.\n4. ارجع لقسم «مجموعاتي».', { reply_markup: backKeyboard('menu:groups') });
    if (action === 'stats') { const u = getStore().users[id] || {}; return ctx.editMessageText(`📊 <b>إحصائياتك</b>\n⭐ نقاطك: ${u.points || 0}\n💬 رسائلك المسجّلة: ${u.messages || 0}`, { parse_mode:'HTML', reply_markup: backKeyboard() }); }
    if (action === 'games') return ctx.editMessageText('🎮 <b>الألعاب والنقاط</b>\nاستخدم /game داخل المجموعة للعب تخمين الحيوان. الجواب الصحيح يمنحك 5 نقاط.\nاستخدم /points لمعرفة نقاطك و /top للمتصدرين.', { parse_mode:'HTML', reply_markup: backKeyboard() });
    if (action === 'decorate') {
      const kb = new InlineKeyboard().text('✨ زخرفة نص', 'decorate:prompt').row().text('⬅️ رجوع','menu:home');
      return ctx.editMessageText('✨ <b>زخرفة الأسماء والنصوص</b>\nاضغط الزر ثم اكتب الاسم أو العبارة اللي تريد تزخرفها.', { parse_mode:'HTML', reply_markup: kb });
    }
    if (action === 'music') {
      const songs = getStore().songs; const kb = new InlineKeyboard(); songs.slice(0,20).forEach((s,i)=>kb.text(`🎵 ${s.title}`, `song:${i}`).row()); kb.text('⬅️ رجوع','menu:home');
      return ctx.editMessageText(songs.length ? '🎵 <b>مكتبة نغنوغ</b>\nاختار ملفاً لإرساله هنا:' : 'مكتبة الأغاني فارغة حالياً. مالك البوت يقدر يرسل ملفاً صوتياً للبوت بالخاص حتى يضيفه.', { parse_mode:'HTML', reply_markup: kb });
    }
    if (action === 'warnings') return ctx.editMessageText('⚠️ <b>التحذيرات والعقوبات</b>\nداخل المجموعة: رد على رسالة العضو بالأمر /warn للتحذير أو /unwarn لإزالة تحذير. /mute و /unmute للكتم، /ban و /unban للحظر. يجب أن تكون مشرفاً وتتوفر صلاحيات البوت.', { parse_mode:'HTML', reply_markup: backKeyboard() });
    if (action === 'customize') {
      const kb = new InlineKeyboard(); for (const key of ['welcome','subtitle','help']) kb.text(({welcome:'نص البداية',subtitle:'الوصف',help:'المساعدة'})[key], `custom:${key}`).row(); kb.text('↩️ استعادة النصوص الافتراضية','custom:reset').row().text('⬅️ رجوع','menu:home');
      return ctx.editMessageText('🎨 <b>تخصيص نصوصك الشخصية</b>\nالتغييرات هنا تظهر إلك وحدك، وما تغيّر نصوص بقية المستخدمين.', { parse_mode:'HTML', reply_markup: kb });
    }
    if (action === 'help') return ctx.editMessageText('📖 /start القائمة الرئيسية\n/panel تسجيل المجموعة\n/game لعبة\n/me بطاقتك\n/points نقاطك\n/top المتصدرون\n/‏warn التحذير بالرد على رسالة\n/mute و /unmute كتم وفك كتم\n/ban و /unban حظر وفك حظر', { reply_markup: backKeyboard() });
  });
  bot.callbackQuery(/^group:(-?\d+)$/, async ctx => {
    await ctx.answerCallbackQuery(); const gid = ctx.match[1]; const g = getStore().groups[gid];
    if (!g) return ctx.editMessageText('المجموعة غير موجودة.');
    try { const m = await ctx.api.getChatMember(gid, ctx.from.id); if (!['creator','administrator'].includes(m.status) && !isOwner(ctx)) return ctx.editMessageText('⛔ لازم تكون مشرفاً بالمجموعة حتى تغيّر إعداداتها.'); } catch { if (!isOwner(ctx)) return ctx.editMessageText('ما قدرت أتحقق من صلاحيتك. تأكد أن البوت موجود بالمجموعة.'); }
    await renderGroupSettings(ctx, gid, true);
  });
  bot.callbackQuery(/^toggle:(-?\d+):(links|flood|welcome|autoReplies|warnings)$/, async ctx => {
    const [,gid,key] = ctx.match; const g = getStore().groups[gid]; if (!g) return ctx.answerCallbackQuery({ text:'المجموعة غير موجودة', show_alert:true });
    if (!isOwner(ctx) && !await isAdmin(ctx, Number(gid), ctx.from.id)) return ctx.answerCallbackQuery({ text:'هذا الإعداد للمشرفين فقط', show_alert:true });
    g.settings[key] = !g.settings[key]; await saveStore(); await ctx.answerCallbackQuery({ text: g.settings[key] ? 'تم التشغيل ✅' : 'تم الإيقاف' }); await renderGroupSettings(ctx, gid, true);
  });
  bot.callbackQuery(/^welcomeedit:(-?\d+)$/, async ctx => { await ctx.answerCallbackQuery(); getStore().pending[userId(ctx)] = { type:'welcomeText', groupId:ctx.match[1] }; await saveStore(); await ctx.editMessageText('✏️ اكتب نص الترحيب الجديد. تقدر تستخدم {name} لاسم العضو و {title} لاسم المجموعة.', { reply_markup: backKeyboard('menu:groups') }); });

  bot.callbackQuery('owner:home', async ctx => { if (!await ownerOnly(ctx)) return ctx.answerCallbackQuery(); await ctx.answerCallbackQuery(); await ctx.editMessageText('👑 <b>لوحة مالك نغنوغ</b>\nتحكم بإحصائيات البوت ورسائله وإعداداته العامة.', { parse_mode:'HTML', reply_markup: ownerKeyboard() }); });
  bot.callbackQuery(/^owner:(stats|users)$/, async ctx => {
    if (!isOwner(ctx)) return ctx.answerCallbackQuery({ text:'للمالك فقط', show_alert:true }); await ctx.answerCallbackQuery(); const d = getStore();
    if (ctx.match[1] === 'users') return ctx.editMessageText(`👤 عدد مستخدمي البوت المسجلين: <b>${Object.keys(d.users).length}</b>`, { parse_mode:'HTML', reply_markup:backKeyboard('owner:home') });
    return ctx.editMessageText(`📊 <b>إحصائيات نغنوغ</b>\n👤 المستخدمون: ${Object.keys(d.users).length}\n👥 المجموعات المسجلة: ${Object.keys(d.groups).length}\n🎵 الأغاني: ${d.songs.length}\n💬 مجموع رسائل المجموعات المسجلة: ${Object.values(d.groups).reduce((n,g)=>n+(g.messageCount||0),0)}`, { parse_mode:'HTML', reply_markup:backKeyboard('owner:home') });
  });
  bot.callbackQuery('owner:broadcast', async ctx => { if (!isOwner(ctx)) return ctx.answerCallbackQuery({ text:'للمالك فقط', show_alert:true }); await ctx.answerCallbackQuery(); getStore().pending[userId(ctx)]={type:'broadcast'}; await saveStore(); await ctx.editMessageText('📣 أرسل الآن نص الرسالة التي تريد إذاعتها لكل مستخدمي البوت. للإلغاء اضغط رجوع.', { reply_markup:backKeyboard('owner:home') }); });
  bot.callbackQuery('owner:texts', async ctx => { if (!isOwner(ctx)) return ctx.answerCallbackQuery({ text:'للمالك فقط', show_alert:true }); await ctx.answerCallbackQuery(); const labels = { welcome:'رسالة البداية', subtitle:'وصف البوت', ownerPanel:'عنوان لوحة المالك', userPanel:'عنوان لوحة المستخدم', groups:'زر مجموعاتي', stats:'زر الإحصائيات', help:'زر المساعدة', customize:'زر تخصيص النصوص', protection:'زر إدارة المجموعة والحماية', games:'زر الألعاب والنقاط', decorate:'زر زخرفة الأسماء', music:'زر الأغاني', warnings:'زر التحذيرات والعقوبات', broadcast:'زر الإذاعة', globalTexts:'زر تخصيص النصوص العامة', forceJoin:'زر الاشتراك الإجباري', userCount:'زر عدد المستخدمين', back:'زر الرجوع', cancel:'زر الإلغاء' }; const kb = new InlineKeyboard(); for (const key of Object.keys(DEFAULT_TEXTS)) kb.text(labels[key] || key,`globaltext:${key}`).row(); kb.text('⬅️ رجوع','owner:home'); await ctx.editMessageText('📝 اختار النص العام اللي تريد تغيّره. التغييرات تطبق على مستخدمي البوت كلهم عند ظهور النص المختار.', { reply_markup:kb }); });
  bot.callbackQuery('owner:force', async ctx => { if (!isOwner(ctx)) return ctx.answerCallbackQuery({ text:'للمالك فقط', show_alert:true }); await ctx.answerCallbackQuery(); getStore().pending[userId(ctx)]={type:'requiredChat'}; await saveStore(); await ctx.editMessageText('🔐 أرسل معرّف القناة أو المجموعة المطلوبة مثل @mychannel أو -1001234567890.\nتأكد أن البوت يستطيع التحقق من عضوية المستخدمين، والأفضل أن يكون مشرفاً بالقناة. لإلغاء الاشتراك الإجباري استخدم /disablejoin بالخاص.'); });
  bot.command('disablejoin', async ctx => { if (!await ownerOnly(ctx)) return; delete getStore().requiredChat; await saveStore(); await safeReply(ctx,'✅ تم إيقاف الاشتراك الإجباري.'); });
  bot.callbackQuery(/^globaltext:(.+)$/, async ctx => { if (!isOwner(ctx)) return ctx.answerCallbackQuery({ text:'للمالك فقط', show_alert:true }); await ctx.answerCallbackQuery(); const key=ctx.match[1]; getStore().pending[userId(ctx)]={type:'globalText',key}; await saveStore(); const labels = { welcome:'رسالة البداية', subtitle:'وصف البوت', ownerPanel:'عنوان لوحة المالك', userPanel:'عنوان لوحة المستخدم', groups:'زر مجموعاتي', stats:'زر الإحصائيات', help:'زر المساعدة', customize:'زر تخصيص النصوص', protection:'زر إدارة المجموعة والحماية', games:'زر الألعاب والنقاط', decorate:'زر زخرفة الأسماء', music:'زر الأغاني', warnings:'زر التحذيرات والعقوبات', broadcast:'زر الإذاعة', globalTexts:'زر تخصيص النصوص العامة', forceJoin:'زر الاشتراك الإجباري', userCount:'زر عدد المستخدمين', back:'زر الرجوع', cancel:'زر الإلغاء' }; await ctx.editMessageText(`📝 اكتب النص الجديد للخانة: ${labels[key] || key}\nأرسل /cancel للإلغاء.`); });
  bot.callbackQuery(/^custom:(.+)$/, async ctx => { await ctx.answerCallbackQuery(); const key=ctx.match[1]; if (key==='reset') { getStore().users[userId(ctx)].customTexts={}; await saveStore(); return ctx.editMessageText('✅ رجعت النصوص الافتراضية الخاصة بحسابك.',{reply_markup:backKeyboard()}); } getStore().pending[userId(ctx)]={type:'userText',key}; await saveStore(); await ctx.editMessageText(`🎨 اكتب النص الشخصي الجديد للخانة (${key}). التغيير يخص حسابك وحدك.`); });
  bot.callbackQuery('decorate:prompt', async ctx => { await ctx.answerCallbackQuery(); getStore().pending[userId(ctx)]={type:'decorate'}; await saveStore(); await ctx.editMessageText('اكتب الاسم أو العبارة اللي تريد تزخرفها.'); });
  bot.callbackQuery(/^song:(\d+)$/, async ctx => { await ctx.answerCallbackQuery(); const song=getStore().songs[Number(ctx.match[1])]; if (!song) return ctx.reply('الأغنية غير موجودة.'); try { await ctx.replyWithAudio(song.fileId,{caption:`🎵 ${escapeHtml(song.title)}`}); } catch { await ctx.reply('تعذر إرسال هذا الملف الصوتي. قد يكون الملف لم يعد متاحاً.'); } });
  bot.callbackQuery(/^game:(\d+):(.+)$/, async ctx => {
    const [,owner,answer] = ctx.match; if (owner!==userId(ctx)) return ctx.answerCallbackQuery({text:'هاي اللعبة مو إلك 🙂',show_alert:true});
    const key=`${groupId(ctx)}:${userId(ctx)}`; const game=pendingGame.get(key); if (!game || game.expires<Date.now()) { pendingGame.delete(key); return ctx.answerCallbackQuery({text:'انتهى وقت اللعبة، جرّب /game من جديد.',show_alert:true}); }
    await ctx.answerCallbackQuery(); if (answer===game.answer) { pendingGame.delete(key); const u=getStore().users[userId(ctx)]; u.points=(u.points||0)+5; const g=getStore().groups[groupId(ctx)]; if (g?.members?.[userId(ctx)]) g.members[userId(ctx)].points=(g.members[userId(ctx)].points||0)+5; await saveStore(); await ctx.reply(`🎉 صحيح! الحيوان هو ${answer}. ربحت 5 نقاط ⭐`); } else await ctx.reply('مو هذا الحيوان 😅 جرّب مرة ثانية!');
  });

  bot.catch(err => console.error('[bot-error]', err.error?.stack || err.error || err));
  return bot;
}

async function handlePendingText(ctx, pending, text) {
  const store=getStore(); const uid=userId(ctx);
  if (text === '/cancel') { delete store.pending[uid]; await saveStore(); return safeReply(ctx,'تم الإلغاء.'); }
  if (pending.type==='songTitle') { store.songs.push({title:text.trim().slice(0,100),fileId:pending.fileId,addedBy:uid,addedAt:new Date().toISOString()}); delete store.pending[uid]; await saveStore(); return safeReply(ctx,'✅ تم حفظ الأغنية بمكتبة نغنوغ.'); }
  if (pending.type==='welcomeText') { const g=store.groups[pending.groupId]; if(g) g.welcomeText=text.slice(0,1000); delete store.pending[uid]; await saveStore(); return safeReply(ctx,'✅ تم تحديث نص الترحيب.'); }
  if (pending.type==='userText') { store.users[uid].customTexts[pending.key]=text.slice(0,500); delete store.pending[uid]; await saveStore(); return safeReply(ctx,'✅ تم حفظ النص الشخصي، ويظهر إلك وحدك.'); }
  if (pending.type==='globalText') { if(!OWNER_ID || uid!==OWNER_ID) return safeReply(ctx,'⛔ هذا الإجراء للمالك فقط.'); store.globalTexts[pending.key]=text.slice(0,500); delete store.pending[uid]; await saveStore(); return safeReply(ctx,'✅ تم تحديث النص العام.'); }
  if (pending.type==='requiredChat') {
    if(!OWNER_ID || uid!==OWNER_ID) return safeReply(ctx,'⛔ هذا الإجراء للمالك فقط.');
    const input=text.trim(); if(!input.startsWith('@') && !/^-?\d+$/.test(input)) return safeReply(ctx,'أرسل @معرّف_القناة أو المعرّف الرقمي مثل -1001234567890.');
    try { const chat=await ctx.api.getChat(input); store.requiredChat={id:chat.id, title:chat.title || chat.username || input, username:chat.username || (input.startsWith('@')?input.slice(1):''), url:chat.username?`https://t.me/${chat.username}`:null}; delete store.pending[uid]; await saveStore(); return safeReply(ctx,`✅ تم ضبط الاشتراك الإجباري على: ${escapeHtml(store.requiredChat.title)}\nتأكد أن البوت يستطيع التحقق من عضوية المستخدمين.`); }
    catch { return safeReply(ctx,'ما قدرت أوصل للقناة/المجموعة. أضف البوت إليها كمسؤول ثم جرّب مرة ثانية.'); }
  }
  if (pending.type==='broadcast') {
    if(!OWNER_ID || uid!==OWNER_ID) return safeReply(ctx,'⛔ هذا الإجراء للمالك فقط.');
    delete store.pending[uid]; await saveStore(); let sent=0, failed=0;
    await safeReply(ctx,'⏳ بدأت الإذاعة. راح أرسل النتيجة بعد ما أخلص.');
    for(const id of Object.keys(store.users)) { try { await ctx.api.sendMessage(Number(id),text); sent++; } catch { failed++; } }
    return safeReply(ctx,`✅ انتهت الإذاعة.\n📨 وصل: ${sent}\n⚠️ تعذر الإرسال: ${failed}`);
  }
  if (pending.type==='decorate') { delete store.pending[uid]; await saveStore(); return safeReply(ctx,`✨ زخارف جاهزة:\n\n『 ${escapeHtml(text)} 』\n꧁ ${escapeHtml(text)} ꧂\n𓆩 ${escapeHtml(text)} 𓆪\n★彡 ${escapeHtml(text)} 彡★\n♡ ${escapeHtml(text)} ♡\n⫷ ${escapeHtml(text)} ⫸`); }
  delete store.pending[uid]; await saveStore(); return safeReply(ctx,'ما عرفت نوع الطلب، ابدأ من القائمة من جديد.');
}

async function applyWarning(ctx, bot, delta) {
  if (!ctx.message.reply_to_message?.from) return safeReply(ctx,'استخدم الأمر بالرد على رسالة العضو.');
  if (!await isAdmin(ctx)) return safeReply(ctx,'هذا الأمر للمشرفين فقط.');
  const target=ctx.message.reply_to_message.from; if(target.is_bot) return;
  const g=ensureGroup(ctx.chat); const m=g.members[String(target.id)] ||= {id:String(target.id),name:target.first_name||'عضو',messages:0,points:0,warnings:0};
  m.warnings=Math.max(0,(m.warnings||0)+delta); await saveStore();
  if(delta>0 && m.warnings>=3) { try { await bot.api.restrictChatMember(ctx.chat.id,target.id,{permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+3600}); await safeReply(ctx,`🔇 ${userMention(target)} وصل 3 تحذيرات، وتم كتمه ساعة.`); } catch { await safeReply(ctx,`⚠️ تم تحذير ${userMention(target)} (${m.warnings}/3)، لكن تعذر تطبيق الكتم. تأكد من صلاحيات نغنوغ.`); } }
  else await safeReply(ctx,delta>0?`⚠️ تم تحذير ${userMention(target)}. عدد التحذيرات: ${m.warnings}/3`:`✅ تم تعديل التحذيرات. العدد الحالي: ${m.warnings}`);
}
async function applyRestriction(ctx, bot, action) {
  const target=ctx.message.reply_to_message?.from; if(!target) return safeReply(ctx,'استخدم الأمر بالرد على رسالة العضو.');
  if(!await isAdmin(ctx)) return safeReply(ctx,'هذا الأمر للمشرفين فقط.');
  if(target.id===ctx.from.id || target.is_bot) return safeReply(ctx,'ما أگدر أطبق العقوبة على هذا الحساب.');
  try {
    if(action==='mute') await bot.api.restrictChatMember(ctx.chat.id,target.id,{permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+3600});
    if(action==='unmute') await bot.api.restrictChatMember(ctx.chat.id,target.id,{permissions:{can_send_messages:true,can_send_audios:true,can_send_documents:true,can_send_photos:true,can_send_videos:true,can_send_video_notes:true,can_send_voice_notes:true,can_send_polls:true,can_send_other_messages:true,can_add_web_page_previews:true}});
    if(action==='ban') await bot.api.banChatMember(ctx.chat.id,target.id);
    if(action==='unban') await bot.api.unbanChatMember(ctx.chat.id,target.id,{only_if_banned:true});
    await safeReply(ctx,`✅ تم تنفيذ ${({mute:'الكتم لمدة ساعة',unmute:'فك الكتم',ban:'الحظر',unban:'فك الحظر'})[action]} على ${userMention(target)}.`);
  } catch(e) { console.error('[restriction]',e.message); await safeReply(ctx,'تعذر تنفيذ العقوبة. تأكد من صلاحيات البوت وأن رتبة العضو المستهدف أقل من رتبتك.'); }
}
async function applyPin(ctx, bot, pin) {
  if(!ctx.message.reply_to_message) return safeReply(ctx,'رد على الرسالة التي تريد تثبيتها أو إلغاء تثبيتها.');
  if(!await isAdmin(ctx)) return safeReply(ctx,'هذا الأمر للمشرفين فقط.');
  try { if(pin) await bot.api.pinChatMessage(ctx.chat.id,ctx.message.reply_to_message.message_id); else await bot.api.unpinChatMessage(ctx.chat.id,ctx.message.reply_to_message.message_id); await safeReply(ctx,pin?'📌 تم تثبيت الرسالة.':'✅ تم إلغاء تثبيت الرسالة.'); }
  catch { await safeReply(ctx,'تعذر تنفيذ الأمر. تأكد أن نغنوغ يملك صلاحية تثبيت الرسائل.'); }
}
