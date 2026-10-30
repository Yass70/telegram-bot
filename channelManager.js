import { InlineKeyboard } from 'grammy';
import { resolveTelegramChatTarget } from './chatTarget.js';

const uid = ctx => String(ctx.from?.id || '');
const emptyUser = () => ({ channels: [], drafts: [], scheduled: [], posts: [], templates: [], settings: { enabled: true } });
const kbHome = () => new InlineKeyboard()
  .text('📂 قنواتي', 'chmgr:channels').text('➕ إضافة قناة', 'chmgr:add').row()
  .text('✍️ إنشاء منشور', 'chmgr:compose').text('📅 جدولة المنشورات', 'chmgr:schedule').row()
  .text('🗂️ المسودات', 'chmgr:drafts').text('📌 إدارة المنشورات', 'chmgr:posts').row()
  .text('📊 الإحصائيات', 'chmgr:stats').text('⚙️ إعدادات القنوات', 'chmgr:settings').row()
  .text('❓ المساعدة', 'chmgr:help').row().text('↩️ لمسة نغنوغ', 'touchesmenu');
const back = () => new InlineKeyboard().text('↩️ إدارة القنوات', 'chmgr:home').text('❌ إلغاء', 'chmgr:cancel');

export function registerChannelManager(bot, { db, save, isOwner }) {
  db.channelManager ||= { users: {}, jobs: {}, counters: { published: 0, failed: 0 } };
  db.channelManager.users ||= {}; db.channelManager.jobs ||= {}; db.channelManager.counters ||= { published: 0, failed: 0 };
  // لا نعيد إرسال مهمة كانت قيد الإرسال عند توقف مفاجئ؛ نعلّمها غير مؤكدة لتجنب التكرار.
  for (const u of Object.values(db.channelManager.users)) for (const job of (u.scheduled || [])) if (job.status === 'sending') job.status = 'uncertain';
  save();
  const data = id => { const u = (db.channelManager.users[id] ||= emptyUser()); u.channels ||= []; u.drafts ||= []; u.scheduled ||= []; u.posts ||= []; u.templates ||= []; u.settings ||= { enabled: true }; return u; };
  const session = id => (db.pending ||= {})[id];
  const clear = id => { db.pending ||= {}; delete db.pending[id]; save(); };
  const reply = (ctx, text, markup = kbHome()) => ctx.reply(text, { reply_markup: markup });
  const isPrivate = ctx => ctx.chat?.type === 'private';
  const ownerOnly = ctx => isOwner?.(ctx) === true;
  let schedulerBusy = false;
  const scheduler = setInterval(async () => {
    if (schedulerBusy) return; schedulerBusy = true;
    try {
      for (const [userId, u] of Object.entries(db.channelManager.users)) {
        for (const job of (u.scheduled || [])) {
          if (job.status !== 'queued' || Date.parse(job.sendAt) > Date.now()) continue;
          const channel = (u.channels || []).find(c => c.id === job.channelId); if (!channel) { job.status='failed'; job.error='القناة غير مرتبطة'; save(); continue; }
          job.status='sending'; job.startedAt=new Date().toISOString(); save();
          try { let sent; if(job.photo) sent=await bot.api.sendPhoto(channel.id,job.photo,{caption:job.caption||undefined}); else if(job.video) sent=await bot.api.sendVideo(channel.id,job.video,{caption:job.caption||undefined}); else if(job.document) sent=await bot.api.sendDocument(channel.id,job.document,{caption:job.caption||undefined}); else sent=await bot.api.sendMessage(channel.id,job.text); const msgs=Array.isArray(sent)?sent:[sent]; u.posts.push({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,channelId:channel.id,messageIds:msgs.map(m=>m.message_id),text:job.text||job.caption||'',createdAt:new Date().toISOString()}); job.status='sent'; job.sentAt=new Date().toISOString(); db.channelManager.counters.published++; }
          catch(e){job.status='failed';job.error=String(e.description||e.message||'تعذر الإرسال').slice(0,200);db.channelManager.counters.failed++;} save();
        }
      }
    } finally { schedulerBusy=false; }
  }, 15000);
  scheduler.unref?.();

  // Handles only this feature; all unrelated updates continue to existing handlers.
  bot.use(async (ctx, next) => {
    const id = uid(ctx);
    const cb = ctx.callbackQuery?.data || '';
    if (cb.startsWith('chmgr:')) {
      if (!isPrivate(ctx)) { try { await ctx.answerCallbackQuery({ text: 'افتح نغنوغ بالخاص حتى تستخدم إدارة القنوات.', show_alert: true }); } catch {} return; }
      const action = cb.slice(6);
      try { await ctx.answerCallbackQuery(); } catch {}
      if (action === 'cancel') { clear(id); return ctx.reply('❌ تم الإلغاء.', { reply_markup: kbHome() }); }
      if (action === 'home') return reply(ctx, '📢 إدارة القنوات\nاختَر الخدمة المطلوبة:', kbHome());
      const u = data(id);
      if (!u.settings.enabled && !['settings','toggle','help','home'].includes(action)) return reply(ctx, 'خدمة إدارة القنوات متوقفة من إعدادات حسابك. افتح الإعدادات لتشغيلها.', kbHome());
      if (action === 'channels') {
        const kb = new InlineKeyboard();
        for (const c of u.channels) kb.text(`📢 ${String(c.title).slice(0, 35)}`, `chmgr:channel:${c.id}`).row();
        kb.text('➕ إضافة قناة', 'chmgr:add').row().text('↩️ رجوع', 'chmgr:home');
        return reply(ctx, u.channels.length ? `📂 قنواتك المرتبطة (${u.channels.length}):\n${u.channels.map((c,i)=>`${i+1}. ${c.title} — ${c.username ? '@'+c.username : c.id}`).join('\n')}` : 'ما ضفت أي قناة لحد الآن.', kb);
      }
      if (action === 'add') {
        db.pending[id] = { action: 'chmgr-add-channel' }; save();
        return reply(ctx, '➕ إضافة قناة\nأرسل @username أو رابط t.me/username أو telegram.me/username أو Chat ID رقمي. للجهة الخاصة: Chat ID | رابط الدعوة. أضف نغنوغ مشرفاً بصلاحية النشر.\nلن يتم النشر قبل تأكيدك.', back());
      }
      if (action.startsWith('channel:')) {
        const cid = action.slice(8); const c = u.channels.find(x => x.id === cid);
        if (!c) return reply(ctx, 'القناة غير موجودة ضمن حسابك.', kbHome());
        const kb = new InlineKeyboard().text('✍️ إنشاء منشور', `chmgr:compose:${cid}`).row().text('📌 المنشورات', `chmgr:channelposts:${cid}`).row().text('🗑️ إزالة القناة', `chmgr:remove:${cid}`).row().text('↩️ قنواتي', 'chmgr:channels');
        return reply(ctx, `📢 ${c.title}\nالمعرّف: ${c.id}\nالرابط: ${c.url || 'غير متوفر'}\nحالة التحقق: تم التحقق من صلاحيات المشرف والنشر وقت الربط.`, kb);
      }
      if (action.startsWith('remove:')) {
        const cid = action.slice(7); u.channels = u.channels.filter(c => c.id !== cid); save();
        return reply(ctx, '🗑️ تمت إزالة القناة من قائمتك. لم يتم حذف أي منشور من تيليگرام.', kbHome());
      }
      if (action === 'compose' || action.startsWith('compose:')) {
        const cid = action.includes(':') ? action.slice(8) : '';
        if (!u.channels.length) return reply(ctx, 'أضف قناة أولاً حتى تنشئ منشوراً.', kbHome());
        if (!cid) {
          const kb = new InlineKeyboard(); for (const c of u.channels) kb.text(c.title.slice(0,35), `chmgr:compose:${c.id}`).row(); kb.text('↩️ رجوع', 'chmgr:home');
          return reply(ctx, 'اختَر القناة التي تريد النشر فيها:', kb);
        }
        if (!u.channels.some(c=>c.id===cid)) return reply(ctx, 'القناة غير مرتبطة بحسابك.', kbHome());
        db.pending[id] = { action: 'chmgr-compose', channelId: cid }; save();
        return reply(ctx, '✍️ أرسل نص المنشور الآن. يمكنك إرسال صورة أو فيديو مع وصف أيضاً. بعد الاستلام أعرض معاينة وتأكيداً قبل النشر.', back());
      }
      if (action === 'drafts') {
        const kb = new InlineKeyboard(); u.drafts.forEach((d,i)=>kb.text(`🗂️ ${String(d.text||d.caption||'وسائط').slice(0,25)}`, `chmgr:draft:${d.id}`).row()); kb.text('↩️ رجوع','chmgr:home');
        return reply(ctx, u.drafts.length ? `🗂️ المسودات المحفوظة: ${u.drafts.length}` : 'ما عندك مسودات محفوظة.', kb);
      }
      if (action.startsWith('draft:')) {
        const d=u.drafts.find(x=>x.id===action.slice(6)); if(!d) return reply(ctx,'المسودة غير موجودة.',kbHome());
        return reply(ctx, `🗂️ ${d.text || d.caption || 'مسودة وسائط'}\n\nتقدر تنشرها بعد اختيار القناة من إنشاء منشور.`, new InlineKeyboard().text('🗑️ حذف المسودة',`chmgr:draftdel:${d.id}`).row().text('↩️ المسودات','chmgr:drafts'));
      }
      if (action.startsWith('draftdel:')) { u.drafts=u.drafts.filter(x=>x.id!==action.slice(9)); save(); return reply(ctx,'تم حذف المسودة.',kbHome()); }
      if (action === 'schedule') { const jobs=u.scheduled||[]; const kb=new InlineKeyboard(); for(const j of jobs.slice(-15).reverse())kb.text(`${j.status==='queued'?'⏳':j.status==='sent'?'✅':j.status==='uncertain'?'⚠️':'❌'} ${j.sendAt.slice(0,16)} — ${(j.text||j.caption||'منشور وسائط').slice(0,15)}`,`chmgr:job:${j.id}`).row(); kb.text('➕ جدولة مسودة','chmgr:schedule-pick').row().text('↩️ رجوع','chmgr:home'); return reply(ctx,jobs.length?'📅 منشوراتك المجدولة وحالاتها:':'ما عندك منشورات مجدولة.',kb); }
      if(action==='schedule-pick'){const kb=new InlineKeyboard(); for(const d of u.drafts)kb.text(String(d.text||d.caption||'مسودة وسائط').slice(0,28),`chmgr:schedraft:${d.id}`).row(); kb.text('↩️ رجوع','chmgr:schedule'); return reply(ctx,u.drafts.length?'اختَر مسودة لجدولتها:':'احفظ منشوراً كمسودة أولاً.',kb);}
      if(action.startsWith('schedraft:')){const d=u.drafts.find(x=>x.id===action.slice(9));if(!d)return reply(ctx,'المسودة غير موجودة.',kbHome());db.pending[id]={action:'chmgr-schedule-time',draftId:d.id};save();return reply(ctx,`أرسل موعد النشر بصيغة ISO مع المنطقة الزمنية، مثال: 2026-11-01T18:30:00+03:00\nيجب أن يكون الموعد في المستقبل. اكتب /cancel للإلغاء.`,back());}
      if(action.startsWith('job:')){const j=u.scheduled.find(x=>x.id===action.slice(4));if(!j)return reply(ctx,'المهمة غير موجودة.',kbHome());const kb=new InlineKeyboard();if(j.status==='queued')kb.text('🗑️ إلغاء الجدولة',`chmgr:jobcancel:${j.id}`).row();kb.text('↩️ الجدولة','chmgr:schedule');return reply(ctx,`📅 حالة المهمة: ${j.status}
الموعد: ${j.sendAt}
${j.error||''}`,kb);}
      if(action.startsWith('jobcancel:')){const j=u.scheduled.find(x=>x.id===action.slice(10));if(!j||j.status!=='queued')return reply(ctx,'لا يمكن إلغاء هذه المهمة بعد بدء الإرسال.',kbHome());j.status='cancelled';save();return reply(ctx,'تم إلغاء الجدولة.',kbHome());}
      if (action === 'posts' || action.startsWith('channelposts:')) {
        const posts=u.posts.slice(-20).reverse(); const kb=new InlineKeyboard();
        for(const post of posts) { const c=u.channels.find(x=>x.id===post.channelId); kb.text(`📌 ${(c?.title||post.channelId).slice(0,18)} — ${String(post.text||'منشور وسائط').slice(0,18)}`,`chmgr:post:${post.id}`).row(); }
        kb.text('↩️ رجوع','chmgr:home');
        return reply(ctx, posts.length?`📌 منشورات نغنوغ المسجّلة (${posts.length}):`:'لا توجد منشورات مسجّلة حتى الآن.',kb);
      }
      if(action.startsWith('post:')) { const post=u.posts.find(x=>x.id===action.slice(5)); if(!post)return reply(ctx,'المنشور غير موجود.',kbHome()); const kb=new InlineKeyboard().text('📍 تثبيت','chmgr:pin:'+post.id).text('📌 إلغاء التثبيت','chmgr:unpin:'+post.id).row().text('🗑️ حذف','chmgr:delete:'+post.id).row().text('📤 نسخ لقناة أخرى','chmgr:copy:'+post.id).row().text('↩️ المنشورات','chmgr:posts'); return reply(ctx,`📌 ${post.text||'منشور وسائط'}
القناة: ${post.channelId}
معرّفات الرسائل: ${post.messageIds.join(', ')}`,kb); }
      if(['pin','unpin','delete'].some(k=>action.startsWith(k+':'))) { const [op,pid]=action.split(':'); const post=u.posts.find(x=>x.id===pid); if(!post)return reply(ctx,'المنشور غير موجود.',kbHome()); try { for(const mid of post.messageIds) { if(op==='pin') await ctx.api.pinChatMessage(post.channelId,mid,{disable_notification:true}); if(op==='unpin') await ctx.api.unpinChatMessage(post.channelId,mid); if(op==='delete') await ctx.api.deleteMessage(post.channelId,mid); } if(op==='delete')u.posts=u.posts.filter(x=>x.id!==pid); save(); return reply(ctx,op==='pin'?'📍 تم تثبيت المنشور.':op==='unpin'?'📌 تم إلغاء التثبيت.':'🗑️ تم حذف المنشور.',kbHome()); } catch(e){return reply(ctx,`تعذّر تنفيذ العملية. تحقق من صلاحيات نغنوغ.
${String(e.description||e.message||'').slice(0,180)}`,kbHome());} }
      if(action.startsWith('copy:')) { const post=u.posts.find(x=>x.id===action.slice(5)); if(!post)return reply(ctx,'المنشور غير موجود.',kbHome()); const kb=new InlineKeyboard(); for(const c of u.channels.filter(c=>c.id!==post.channelId))kb.text(c.title.slice(0,30),'chmgr:copyto:'+post.id+':'+c.id).row(); kb.text('↩️ رجوع','chmgr:posts'); return reply(ctx,'اختَر القناة المستهدفة:',kb); }
      if(action.startsWith('copyto:')) { const [,pid,cid]=action.split(':'); const post=u.posts.find(x=>x.id===pid); const dest=u.channels.find(x=>x.id===cid); if(!post||!dest)return reply(ctx,'القناة أو المنشور غير موجود.',kbHome()); try{ for(const mid of post.messageIds) await ctx.api.copyMessage(dest.id,post.channelId,mid); return reply(ctx,'✅ تمت محاولة نسخ المنشور إلى القناة المحددة.',kbHome()); }catch(e){return reply(ctx,`تعذّر النسخ: ${String(e.description||e.message||'').slice(0,180)}`,kbHome());} }
      if (action === 'stats') return reply(ctx, `📊 إحصائيات خدمة إدارة القنوات\nالقنوات المرتبطة بحسابك: ${u.channels.length}\nالمسودات: ${u.drafts.length}\nالمنشورات المجدولة: ${u.scheduled.length}\nالمنشورات المسجلة: ${u.posts.length}\nهذه أرقام تشغيلية من بيانات نغنوغ وليست مشاهدات أو وصول تيليگرام.`, kbHome());
      if (action === 'settings') return reply(ctx, `⚙️ إعدادات القنوات\nحالة الخدمة: ${u.settings.enabled ? 'مفعّلة' : 'متوقفة'}\nكل قناة ومسوداتها محفوظة ضمن حسابك بشكل منفصل.`, new InlineKeyboard().text(u.settings.enabled?'🔴 إيقاف الخدمة':'🟢 تشغيل الخدمة','chmgr:toggle').row().text('↩️ رجوع','chmgr:home'));
      if (action === 'toggle') { u.settings.enabled=!u.settings.enabled; save(); return reply(ctx, `تم ${u.settings.enabled?'تشغيل':'إيقاف'} الخدمة لحسابك.`,kbHome()); }
      if (action === 'help') return reply(ctx, '❓ مساعدة إدارة القنوات\n1) أضف القناة. 2) اجعل نغنوغ مشرفاً مع صلاحية نشر الرسائل. 3) أنشئ منشوراً وراجع المعاينة. 4) لا يتم النشر إلا بعد ضغط تأكيد.\nتيليگرام لا يتيح للبوت إثبات أن المستخدم هو المالك الأصلي؛ نتحقق من كونه مشرفاً ومن صلاحيات البوت.', kbHome());
      if (action === 'save-draft') {
        const p=session(id); if(!p || p.action!=='chmgr-confirm') return reply(ctx,'انتهت صلاحية المسودة.',kbHome());
        u.drafts.push({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,channelId:p.channelId,text:p.text||'',caption:p.caption||'',photo:p.photo||'',video:p.video||'',document:p.document||'',createdAt:new Date().toISOString()});
        clear(id); save(); return reply(ctx,'🗂️ تم حفظ المنشور كمسودة خاصة بحسابك.',kbHome());
      }
      if (action === 'confirm') {
        const p=session(id); if(!p || p.action!=='chmgr-confirm') return reply(ctx,'انتهت صلاحية المعاينة. أنشئ المنشور من جديد.',kbHome());
        const channel=u.channels.find(c=>c.id===p.channelId); if(!channel){clear(id);return reply(ctx,'القناة لم تعد مرتبطة.',kbHome());}
        try {
          let sent;
          if(p.photo) sent=await ctx.api.sendPhoto(channel.id,p.photo,{caption:p.caption||undefined});
          else if(p.video) sent=await ctx.api.sendVideo(channel.id,p.video,{caption:p.caption||undefined});
          else if(p.document) sent=await ctx.api.sendDocument(channel.id,p.document,{caption:p.caption||undefined});
          else sent=await ctx.api.sendMessage(channel.id,p.text,{disable_web_page_preview:false});
          const msgs=Array.isArray(sent)?sent:[sent];
          u.posts.push({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,channelId:channel.id,messageIds:msgs.map(m=>m.message_id),text:p.text||p.caption||'',createdAt:new Date().toISOString()});
          db.channelManager.counters.published++; clear(id); save();
          return reply(ctx,'✅ تم نشر المنشور وتسجيله بنجاح.',kbHome());
        } catch(e) { db.channelManager.counters.failed++; save(); return reply(ctx,`❌ تعذر النشر. تأكد من صلاحية نغنوغ بالنشر.\nالسبب: ${String(e.description||e.message||'خطأ غير معروف').slice(0,250)}`,kbHome()); }
      }
      return reply(ctx, 'هذا الخيار غير متاح حالياً.', kbHome());
    }

    if (ctx.message && isPrivate(ctx)) {
      const p = session(id);
      if (p?.action === 'chmgr-add-channel') {
        const raw = String(ctx.message.text||'').trim(); if(!raw) return ctx.reply('أرسل @username أو رابطاً عاماً من t.me/telegram.me أو Chat ID رقمي.');
        try {
          const chat = await resolveTelegramChatTarget(ctx, raw, {
            botId: ctx.me?.id || bot.botInfo?.id,
            allowedTypes: ['channel'],
            requireBotPost: true,
            requireUserAdmin: true,
          });
          const u=data(id); if(u.channels.some(c=>c.id===String(chat.id))){clear(id);return ctx.reply('القناة مضافة مسبقاً.',{reply_markup:kbHome()});}
          const channel={id:String(chat.id),title:chat.title,username:chat.username,url:chat.url,addedAt:new Date().toISOString()};
          u.channels.push(channel); clear(id); save();
          return ctx.reply(`✅ تمت إضافة القناة: ${channel.title}\nتم التحقق من صلاحية إشرافك ومن صلاحية نغنوغ على النشر.${chat.privateInviteSupplied ? '\nتنبيه: تعذّر على Telegram Bot API إثبات أن رابط الدعوة الخاص يعود إلى Chat ID؛ تأكد من صحة الرابط.' : ''}`,{reply_markup:kbHome()});
        } catch(e) { return ctx.reply(`❌ لم أستطع إضافة القناة.\nالسبب: ${String(e.description||e.message||'خطأ غير معروف').slice(0,240)}\nأصلح السبب ثم أعد الإرسال أو اضغط إلغاء.`,{reply_markup:back()}); }
      }
      if (p?.action === 'chmgr-compose') {
        const u=data(id); const channel=u.channels.find(c=>c.id===p.channelId); if(!channel){clear(id);return ctx.reply('القناة غير مرتبطة.');}
        const m=ctx.message; const draft={channelId:p.channelId,text:m.text||'',caption:m.caption||'',photo:m.photo?.at(-1)?.file_id||'',video:m.video?.file_id||'',document:m.document?.file_id||'',createdAt:new Date().toISOString()};
        if(!draft.text&&!draft.caption&&!draft.photo&&!draft.video&&!draft.document) return ctx.reply('حالياً أرسل نصاً أو صورة أو فيديو مع وصف.');
        const preview=draft.text||draft.caption||(draft.photo?'[صورة مرفقة]':draft.video?'[فيديو مرفق]':'[ملف مرفق]');
        db.pending[id]={action:'chmgr-confirm',...draft}; save();
        return ctx.reply(`👁️ معاينة المنشور إلى «${channel.title}»\n\n${preview}\n\nهل تؤكد النشر؟`,{reply_markup:new InlineKeyboard().text('✅ تأكيد النشر','chmgr:confirm').row().text('🗂️ حفظ كمسودة','chmgr:save-draft').text('❌ إلغاء','chmgr:cancel')});
      }
      if (p?.action?.startsWith('chmgr-') && ctx.message.text === '/cancel') { clear(id); return ctx.reply('تم إلغاء العملية.',{reply_markup:kbHome()}); }
      if (p?.action === 'chmgr-schedule-time') { const value=String(ctx.message.text||'').trim(); const time=Date.parse(value); if(!Number.isFinite(time)||time<=Date.now())return ctx.reply('❌ الموعد غير صحيح أو ليس في المستقبل. أرسل ISO مع المنطقة الزمنية، أو /cancel.'); const d=data(id).drafts.find(x=>x.id===p.draftId);if(!d){clear(id);return ctx.reply('المسودة غير موجودة.');} const job={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,channelId:d.channelId,sendAt:new Date(time).toISOString(),status:'queued',text:d.text,caption:d.caption,photo:d.photo,video:d.video,document:d.document,createdAt:new Date().toISOString()};data(id).scheduled.push(job);clear(id);save();return ctx.reply('✅ تمت جدولة المنشور. سيحاول نغنوغ إرساله في الموعد المحدد ما دام البوت يعمل.',{reply_markup:kbHome()});}
    }
    return next();
  });
}
