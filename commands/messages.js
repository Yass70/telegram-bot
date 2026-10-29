import { canonicalGroupCommand } from './moderation.js';
import { InlineKeyboard } from 'grammy';
import { findAutoReply } from '../autoReplies.js';
import { groupSettingsKeyboard } from '../keyboards.js';
import { makeNameBatch, touchesBatchKeyboard, touchesBatchText } from '../touches.js';
import { handleGroupGameMessage } from '../games/messageHandler.js';
import { parseBaghdadDay, parseBaghdadTime } from '../reminders.js';
import { downloadSocialVideo, cleanupDownloadedVideo, validateSocialVideoUrl } from '../videoDownloader.js';
import { InputFile } from 'grammy';
import { stat } from 'node:fs/promises';
import path from 'node:path';

export function registerMessages(bot, shared) {
  const {
    db, isOwner, isPrivate, isGroup, userKey, save, ensureUser, groupFor,
    selectedGroup, setSelected, getCustomization, customText, getHomeKeyboard,
    HELP_TEXT, safeEdit, answer, userIsAdmin, userCanManage, subscriptionGate,
    selectedGroupKeyboard, showGroups, showGroupSettings, showGroupStats,
    showReplyList, pending, clearPending, ownerRequiredMenu, showRequiredList,
    showProfileCard, handleViolation, showOwnerPanel, uiText, PROFILE_PHRASES,
    inferMenuBack, rememberMenuBack, menuBackTarget, normalizeAnswer,
    groupScores, leaderboardText, protectionBackTarget, protectionKeyboard,
    ensureReferralData, referralLinkFor, referralStatsFor, referralMenuKeyboard,
    referralLinkKeyboard, showReferralLink, publicCommandsKeyboard,
    QUESTIONS_DB, SHUAR_LIST, PERSONAL_QUESTIONS_LIST, N_PHRASES
  } = shared;

  bot.on('message', async ctx => {
    ensureUser(ctx);
    const msg = ctx.message;
    const rawText = msg.text?.trim() || '';
    const text = isGroup(ctx) ? canonicalGroupCommand(rawText) : rawText;
    const protectionText = [msg.text, msg.caption].filter(Boolean).join('\n');

    if (isGroup(ctx)) {
      const g = groupFor(ctx.chat);
      if (!g.activated) return;

      const isAdmin = (await userIsAdmin(ctx.chat.id, ctx.from.id)) || (g.admins || []).includes(String(ctx.from.id)) || isOwner(ctx);
      const uid = userKey(ctx);
      // اشتراك الدردشة: إعداد مستقل لكل مجموعة، مع استثناء المشرفين والمالك.
      const chatSub = db.chatSubscriptions?.[String(ctx.chat.id)];
      if (chatSub?.enabled && chatSub.requiredChatId && !isAdmin && !isOwner(ctx)) {
        let subscribed = false;
        let membershipCheckFailed = false;
        try { const member = await ctx.api.getChatMember(/^-?\d+$/.test(String(chatSub.requiredChatId)) ? Number(chatSub.requiredChatId) : chatSub.requiredChatId, msg.from.id); subscribed = ['member','administrator','creator'].includes(member.status) || (member.status === 'restricted' && member.is_member); }
        catch (err) { membershipCheckFailed = true; console.warn('[chat-subscription] membership check failed; allowing message to avoid a false lock:', err?.description || err?.message || err); }
        if (membershipCheckFailed) { /* A failed API check must not lock the whole group by mistake. */ }
        else if (!subscribed) {
          try { await ctx.api.deleteMessage(ctx.chat.id, msg.message_id); } catch {}
          const kb = new InlineKeyboard(); if (chatSub.url) kb.url('📣 اشترك الآن', chatSub.url).row();
          kb.text('✅ تحقّق من الاشتراك', `chatsubverify:${ctx.chat.id}`);
          try { await ctx.api.sendMessage(ctx.chat.id, `🔒 حتى تگدر تراسل هنا، اشترك أولاً في «${chatSub.title || 'القناة/المجموعة المطلوبة'}».`, { reply_markup: kb }); } catch {}
          return;
        }
      }
      g.userStats ||= {};
      g.userStats[uid] ||= { messages: 0 };
      g.knownMembers ||= {};
      g.knownMembers[uid] = { id: msg.from.id, name: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || 'عضو', username: msg.from.username || '', seenAt: Date.now() };
      // حفظ معرّفات الرسائل التي شاهدها البوت؛ Telegram Bot API لا يوفّر جلب سجل المجموعة عشوائياً.
      g.recentMessages ||= [];
      if (!g.recentMessages.some(entry => Number(entry.message_id) === Number(msg.message_id))) {
        g.recentMessages.push({ message_id: Number(msg.message_id), date: Date.now(), user_id: Number(msg.from.id) });
        if (g.recentMessages.length > 300) g.recentMessages = g.recentMessages.slice(-300);
      }
      g.userStats[uid].messages = Number(g.userStats[uid].messages || 0) + 1;
      g.stats ||= { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 };
      g.stats.messages = Number(g.stats.messages || 0) + 1;
      db.stats ||= { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 };
      db.stats.messages = Number(db.stats.messages || 0) + 1;
      db.pointNames ||= {};
      db.pointNames[uid] = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || `عضو ${uid}`;
      save();

      // حماية السبام: أكثر من 6 رسائل خلال 8 ثوانٍ من العضو نفسه تُعامل كإغراق.
      if (g.flood && !isAdmin && !isOwner(ctx)) {
        g.floodUsers ||= {};
        const now = Date.now();
        const recent = (g.floodUsers[uid] || []).filter(ts => now - ts < 8000);
        recent.push(now);
        g.floodUsers[uid] = recent;
        if (recent.length > 6) {
          try { await ctx.deleteMessage(); g.stats.floodEvents = Number(g.stats.floodEvents || 0) + 1; save(); } catch {}
          await handleViolation(ctx, g, 'إغراق الرسائل / سبام');
          return;
        }
      }

      // الحماية التلقائية[cite: 4]
      if (!isAdmin && !isOwner(ctx)) {
        if (g.linksLock && /(https?:\/\/|www\.|t\.me\/)/i.test(protectionText)) {
          try { await ctx.deleteMessage(); } catch {}
          await handleViolation(ctx, g, 'نشر رابط ممنوع');
          return;
        }
        if (g.mediaLock && (msg.photo || msg.video || msg.document || msg.sticker || msg.animation || msg.video_note)) {
          try { await ctx.deleteMessage(); } catch {}
          await handleViolation(ctx, g, 'إرسال وسائط ممنوعة');
          return;
        }
        if (g.badWordsLock && (g.badWords || []).some(word => word && protectionText.toLocaleLowerCase('ar').includes(String(word).toLocaleLowerCase('ar')))) {
          try { await ctx.deleteMessage(); } catch {}
          await handleViolation(ctx, g, 'استخدام كلمة ممنوعة');
          return;
        }
        if (g.audioLock && msg.voice) {
          try { await ctx.deleteMessage(); } catch {}
          await handleViolation(ctx, g, 'إرسال رسالة صوتية ممنوعة');
          return;
        }
        if (g.audioClipsLock && msg.audio) {
          try { await ctx.deleteMessage(); } catch {}
          await handleViolation(ctx, g, 'إرسال ملف صوتي ممنوع');
          return;
        }
        if (g.forwardLock && (msg.forward_from || msg.forward_from_chat || msg.forward_origin)) {
          try { await ctx.deleteMessage(); } catch {}
          await handleViolation(ctx, g, 'إعادة توجيه ممنوعة');
          return;
        }
        if (g.contactsLock && (msg.contact || /@[A-Za-z0-9_]{4,}/i.test(protectionText) || /\+?[0-9]{10,}/.test(protectionText))) {
          try { await ctx.deleteMessage(); } catch {}
          await handleViolation(ctx, g, 'نشر معرف أو رقم ممنوع');
          return;
        }
      }

      const isAdminCommand = /^(كتم(?:\s+\d+)?|فتح\s+الكتم(?:\s+@?\w+)?|طرد(?:\s+@?\w+)?|قفل\s+(?:الرسائل|المجموعة)|افتح\s+(?:الرسائل|المجموعة)|امسح(?:\s+\d+)?|حذف\s+الرسائل(?:\s+\d+)?|المسح\s+جميع\s+الرسائل|احذف\s+جميع\s+الرسائل|تفعيل\s+الحماية|ايقاف\s+الحماية|إيقاف\s+الحماية|تشغيل\s+الانذارات|ايقاف\s+الانذارات|اضف\s+مشرفا?\s+@?\w+|اضف\s+\d+(?:\s+@?\w+)?|معلومات(?:\s+@?\w+)?|مجموعتي|ايقاف\s+المحادث(?:ة|ه)|إيقاف\s+المحادث(?:ة|ه)|تشغيل\s+المحادث(?:ة|ه)|ايقاف\s+الروابط|إيقاف\s+الروابط|تشغيل\s+الروابط|ايقاف\s+السبام|إيقاف\s+السبام|تشغيل\s+السبام|ايقاف\s+الوسائط|إيقاف\s+الوسائط|تشغيل\s+الوسائط|تشغيل\s+الفشار|ايقاف\s+الفشار|إيقاف\s+الفشار|ايقاف\s+الصوتيات|إيقاف\s+الصوتيات|تشغيل\s+الصوتيات|ايقاف\s+توجيه\s+الرسائل|إيقاف\s+توجيه\s+الرسائل|تشغيل\s+توجيه\s+الرسائل|ايقاف\s+(?:المعرفات|اليوزرات)|إيقاف\s+(?:المعرفات|اليوزرات)|تشغيل\s+(?:المعرفات|اليوزرات)|تثبيت|الغاء\s+التثبيت|إلغاء\s+التثبيت|فك\s+التثبيت)$/i.test(text);


      if (/^ذكرني$/i.test(text)) {
        const botUsername = ctx.me?.username;
        const kb = new InlineKeyboard();
        if (botUsername) kb.url('⏰ فتح قسم ذكّرني', `https://t.me/${botUsername}?start=reminder`).row();
        kb.url('👨🏻‍💻 المطوّر', 'https://t.me/llll6llll6');
        const alreadyStarted = (db.privateUsers || []).map(String).includes(String(msg.from.id));
        const body = alreadyStarted
          ? '⏰ *قسم ذكّرني من نغنوغ*\n\nتگدر تحفظ الشي اللي تريد تتذكره، وتحدد اليوم والساعة، وراح أراسلك بالخاص بموعده.\n\nاضغط الزر بالأسفل لفتح القسم.'
          : '⏰ *حتى تستخدم ميزة ذكّرني*\n\nلازم تفتح بوت نغنوغ بالخاص وتضغط Start أولاً، حتى يگدر يراسلك بالتذكير بوقته. بعدها ارجع واضغط الزر وافتح قسم ذكّرني.';
        return ctx.reply(body, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown', reply_markup: kb });
      }

      // عدّ السحكات للرسائل العادية فقط، واستثناء كل الأوامر النصية وأوامر الألعاب.
      const sakhakaCommandAliases = new Set(['ا', 'ش', 'ن', 'نغنوغ', 'كت', 'توب', 'ب', '.ب', 'اختيارات', 'رياضيات', 'حيوان', 'معاني', 'عكس', 'تفكيك', 'س', 'العاب', 'ألعاب', 'الالعاب', 'الألعاب', 'انهاء اللعبة', 'إنهاء اللعبة', 'ذكرني']);
      const isSakhakaCommand = text.startsWith('/') || isAdminCommand || sakhakaCommandAliases.has(text.trim());
      if (text && !isSakhakaCommand) {
        g.userStats[uid].sakhakat = Number(g.userStats[uid].sakhakat || 0) + 1;
        save();
      }
      if (isAdminCommand && !isAdmin && !isOwner(ctx)) {
        await ctx.reply('الأمر غير مخصص إلك', { reply_to_message_id: msg.message_id });
        return;
      }

      // أوامر الحماية النصية: تعمل للمشرفين فقط، وتحدّث الإعداد المحفوظ للمجموعة.
      if (isAdmin || isOwner(ctx) || (g.admins || []).includes(uid)) {
        if (text === 'تشغيل الانذارات' || text === 'ايقاف الانذارات') {
          g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 };
          g.warningSettings.enabled = text === 'تشغيل الانذارات'; save();
          return ctx.reply(`⚠️ ${g.warningSettings.enabled ? '🟢 تم تفعيل' : '⚪ تم إيقاف'} نظام الإنذارات لهذه المجموعة.`, { reply_to_message_id: msg.message_id });
        }
        const protectionCommands = [
          [/^(?:ايقاف|إيقاف) الروابط$/i, 'linksLock', false], [/^تشغيل الروابط$/i, 'linksLock', true],
          [/^(?:ايقاف|إيقاف) السبام$/i, 'flood', false], [/^تشغيل السبام$/i, 'flood', true],
          [/^(?:ايقاف|إيقاف) الوسائط$/i, 'mediaLock', false], [/^تشغيل الوسائط$/i, 'mediaLock', true],
          [/^(?:ايقاف|إيقاف) الفشار$/i, 'badWordsLock', false], [/^تشغيل الفشار$/i, 'badWordsLock', true],
          [/^(?:ايقاف|إيقاف) الصوتيات$/i, 'audioLock', false], [/^تشغيل الصوتيات$/i, 'audioLock', true],
          [/^(?:ايقاف|إيقاف) توجيه الرسائل$/i, 'forwardLock', false], [/^تشغيل توجيه الرسائل$/i, 'forwardLock', true],
          [/^(?:ايقاف|إيقاف) (?:المعرفات|اليوزرات)$/i, 'contactsLock', false], [/^تشغيل (?:المعرفات|اليوزرات)$/i, 'contactsLock', true]
        ];
        const matchedProtection = protectionCommands.find(([re]) => re.test(text));
        if (matchedProtection) {
          const [, field, enabled] = matchedProtection;
          g[field] = enabled;
          if (field === 'linksLock') g.links = enabled;
          if (field === 'audioLock') g.audioClipsLock = enabled;
          save();
          return ctx.reply(`🛡️ ${enabled ? '🟢 تم تفعيل' : '⚪ تم إيقاف'} ${({ linksLock: 'حماية الروابط', flood: 'منع السبام', mediaLock: 'حماية الوسائط والملفات', badWordsLock: 'حماية كلمات الفشار', audioLock: 'حماية الصوتيات', forwardLock: 'منع توجيه الرسائل', contactsLock: 'منع المعرفات والأرقام' })[field]} بنجاح.`, { reply_to_message_id: msg.message_id });
        }
        if (/^(?:ايقاف|إيقاف) المحادث(?:ة|ه)$/i.test(text) || /^تشغيل المحادث(?:ة|ه)$/i.test(text)) {
          const close = /^(?:ايقاف|إيقاف)/i.test(text);
          try {
            await ctx.api.setChatPermissions(ctx.chat.id, close
              ? { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false }
              : { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true });
            g.closedMessages = close; save();
            return ctx.reply(`🛡️ ${close ? '🔒 تم قفل المحادثة' : '🔓 تم تشغيل المحادثة'} بنجاح.`, { reply_to_message_id: msg.message_id });
          } catch { return ctx.reply('❌ ما كدرت أغيّر صلاحيات المجموعة. تأكد أن البوت مشرف وعنده صلاحية تقييد الأعضاء.'); }
        }
        if (/^تفعيل الحماية$/i.test(text) || /^(?:ايقاف|إيقاف) الحماية$/i.test(text)) {
          const enabled = /^تفعيل/.test(text);
          for (const field of ['linksLock', 'flood', 'mediaLock', 'badWordsLock', 'audioLock', 'audioClipsLock', 'forwardLock', 'contactsLock']) g[field] = enabled;
          g.links = enabled; g.warningSettings ||= { enabled: false, limit: 3, action: 'mute', duration: 10 }; g.warningSettings.enabled = enabled; save();
          return ctx.reply(`🛡️ ${enabled ? '🟢 تم تفعيل جميع ميزات الحماية' : '⚪ تم إيقاف جميع ميزات الحماية'} بنجاح.`, { reply_to_message_id: msg.message_id });
        }

        const memberByUsername = username => {
          const clean = String(username || '').replace(/^@/, '').toLowerCase();
          return Object.values(g.knownMembers || {}).find(m => String(m.username || '').toLowerCase() === clean);
        };
        const addAdminMatch = text.match(/^اضف\s+مشرفا?\s+(@?[A-Za-z0-9_]{4,})$/i);
        if (addAdminMatch) {
          const target = memberByUsername(addAdminMatch[1]);
          if (!target) return ctx.reply('❌ ما لكيت هذا المستخدم ضمن الأعضاء اللي شافهم البوت سابقاً. خليه يرسل رسالة بالمجموعة أولاً.');
          try {
            const targetStatus = await ctx.api.getChatMember(ctx.chat.id, Number(target.id));
            if (targetStatus.status === 'creator') return ctx.reply('👑 هذا المستخدم هو مالك المجموعة أصلاً.');
            if (targetStatus.status !== 'administrator') {
              await ctx.api.promoteChatMember(ctx.chat.id, Number(target.id), {
                can_manage_chat: true,
                can_delete_messages: true,
                can_manage_video_chats: false,
                can_restrict_members: true,
                can_promote_members: false,
                can_change_info: false,
                can_invite_users: true,
                can_pin_messages: true,
                can_manage_topics: false
              });
            }
            g.admins ||= [];
            if (!g.admins.includes(String(target.id))) g.admins.push(String(target.id));
            save();
            return ctx.reply(`✅ تم ترقية ${target.name || '@' + target.username} إلى مشرف في المجموعة وإضافة صلاحياته إلى نغنوغ.`);
          } catch {
            return ctx.reply('❌ ما كدرت أضيفه مشرفاً. لازم يكون البوت مشرفاً وعنده صلاحية «إضافة مشرفين» (can_promote_members)، وتكون صلاحياته كافية للترقية.');
          }
        }
        const kickMatch = text.match(/^طرد\s+(@?[A-Za-z0-9_]{4,})$/i);
        if (kickMatch && !msg.reply_to_message) {
          const target = memberByUsername(kickMatch[1]);
          if (!target) return ctx.reply('ما لكيت المستخدم ضمن الأعضاء اللي رصدهم البوت سابقاً.');
          try {
            const targetMember = await ctx.api.getChatMember(ctx.chat.id, Number(target.id));
            if (['administrator', 'creator'].includes(targetMember.status)) return ctx.reply('❌ ما أگدر أطرد مشرف أو مالك المجموعة.');
            await ctx.api.banChatMember(ctx.chat.id, Number(target.id));
            await ctx.api.unbanChatMember(ctx.chat.id, Number(target.id));
            return ctx.reply(`🚪 تم طرد ${target.name || '@' + target.username} من المجموعة.`);
          } catch { return ctx.reply('❌ تعذر طرد العضو. تحقق من صلاحيات البوت.'); }
        }
        const addPointsMatch = text.match(/^اضف\s+(\d+)(?:\s+(@?[A-Za-z0-9_]{4,}))?$/i);
        if (addPointsMatch) {
          const amount = Number(addPointsMatch[1]);
          const target = addPointsMatch[2] ? memberByUsername(addPointsMatch[2]) : msg.reply_to_message?.from;
          if (!target) return ctx.reply('اكتب «اضف 5 @username» أو ردّ على رسالة العضو واكتب «اضف 5».');
          if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) return ctx.reply('حدد نقاطاً من 1 إلى 100000.');
          const scores = groupScores(ctx.chat.id); scores[String(target.id)] = Number(scores[String(target.id)] || 0) + amount;
          db.points ||= {}; db.points[String(target.id)] = Number(db.points[String(target.id)] || 0) + amount;
          db.pointNames ||= {}; db.pointNames[String(target.id)] = [target.first_name, target.last_name].filter(Boolean).join(' ') || target.username || `عضو ${target.id}`;
          save(); return ctx.reply(`⭐ تمت إضافة ${amount} نقطة إلى ${target.first_name || target.username || 'العضو'} بنجاح.`);
        }
        if (/^مجموعتي$/i.test(text)) {
          let chat = null, count = 'غير متاح', admins = [], photoId = null;
          try {
            chat = await ctx.api.getChat(ctx.chat.id);
            const chatPhoto = chat?.photo || ctx.chat?.photo;
            photoId = chatPhoto?.big_file_id || chatPhoto?.small_file_id || null;
          } catch (err) { console.warn('[group-info] getChat failed:', err?.description || err?.message || err); }
          try { count = String(await ctx.api.getChatMemberCount(ctx.chat.id)); }
          catch (err) { console.warn('[group-info] getChatMemberCount failed:', err?.description || err?.message || err); }
          try { admins = await ctx.api.getChatAdministrators(ctx.chat.id); }
          catch (err) { console.warn('[group-info] getChatAdministrators failed:', err?.description || err?.message || err); }
          const creator = admins.find(a => a.status === 'creator');
          const known = Object.values(g.knownMembers || {});
          const list = known.slice(0, 60).map(m => `• ${m.name || 'عضو'} — ${m.username ? '@' + m.username : 'بدون يوزر'} — ${m.id}`).join('\n') || 'لا توجد أسماء محفوظة بعد.';
          const caption = `🏘️ معلومات المجموعة — نغنوغ\n\n📌 الاسم: ${chat?.title || ctx.chat.title}\n🆔 الآيدي: ${ctx.chat.id}\n👥 عدد الأعضاء: ${count}\n🛡️ عدد المشرفين: ${admins.length}\n👑 المالك: ${creator ? `${creator.user.first_name} (${creator.user.id})` : 'غير متاح'}\n📝 وصف المجموعة: ${chat?.description || 'ماكو وصف'}`;
          if (photoId) {
            try { await ctx.replyWithPhoto(photoId, { caption }); }
            catch (err) {
              console.warn('[group-info] Sending group photo failed:', err?.description || err?.message || err);
              await ctx.reply(`🖼️ تعذر إرسال صورة المجموعة من تيليگرام، وهذه المعلومات بدلاً منها:\n\n${caption}`);
            }
          } else {
            await ctx.reply(`🖼️ لم يُرجع تيليگرام صورة للمجموعة عبر Bot API.\n\n${caption}`);
          }
          return ctx.reply(`📋 الأعضاء الذين رصدهم البوت (${known.length} معروف؛ تيليگرام ما يسمح للبوت بجلب قائمة كل الأعضاء تلقائياً):\n${list}`.slice(0, 4000));
        }
        const infoMatch = text.match(/^معلومات(?:\s+(@?[A-Za-z0-9_]{4,}))?$/i);
        if (infoMatch) {
          let target = msg.reply_to_message?.from;
          if (!target && infoMatch[1]) target = memberByUsername(infoMatch[1]);
          if (!target) return ctx.reply('ردّ على رسالة العضو واكتب «معلومات»، أو اكتب «معلومات @username» إذا كان البوت قد رصد العضو سابقاً.');
          return showProfileCard(ctx, g, target);
        }
        const openMuteMatch = text.match(/^فتح\s+الكتم\s+(@?[A-Za-z0-9_]{4,})$/i);
        if (openMuteMatch && !msg.reply_to_message) {
          const target = memberByUsername(openMuteMatch[1]);
          if (!target) return ctx.reply('ما لكيت المستخدم ضمن الأعضاء المعروفين.');
          try {
            const unrestricted = {
              can_send_messages: true, can_send_audios: true, can_send_documents: true,
              can_send_photos: true, can_send_videos: true, can_send_video_notes: true,
              can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true,
              can_add_web_page_previews: true
            };
            await ctx.api.restrictChatMember(ctx.chat.id, Number(target.id), unrestricted);
            const after = await ctx.api.getChatMember(ctx.chat.id, Number(target.id));
            if (after.status === 'restricted' && after.is_member && after.can_send_messages === false) {
              throw new Error('Member still restricted after unmute.');
            }
            return ctx.reply(`🔊 تم فك الكتم عن ${target.name || target.username} وإعادة صلاحيات المجموعة الافتراضية إليه.`);
          } catch { return ctx.reply('❌ تعذر فك الكتم. تأكد من صلاحيات البوت وأن العضو ليس مشرفاً.'); }
        }
      }

      // أوامر المشرفين السريعة بالرد[cite: 4]
      if (msg.reply_to_message && (isAdmin || isOwner(ctx) || (g.admins || []).includes(uid))) {
        const target = msg.reply_to_message.from;
        const targetId = target?.id;
        const targetName = target?.first_name || 'العضو';

        if (/^كتم\s+(\d+)$/i.test(text)) {
          const match = text.match(/^كتم\s+(\d+)$/i);
          const mins = Number(match[1]);
          if (!Number.isInteger(mins) || mins < 1 || mins > 10080) {
            await ctx.reply('حدد مدة صحيحة من دقيقة إلى 10080 دقيقة.');
            return;
          }
          if (targetId && !await userIsAdmin(ctx.chat.id, targetId) && !target.is_bot) {
            const until = Math.floor(Date.now() / 1000) + (mins * 60);
            try {
              await ctx.api.restrictChatMember(ctx.chat.id, targetId,
                { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false },
                { until_date: until });
              await ctx.reply(`🔇 تم كتم العضو ${targetName} لمدة **${mins}** دقيقة بنجاح.`, { parse_mode: 'Markdown' });
            } catch { await ctx.reply("❌ عذراً، لا أملك صلاحية كتم هذا المستخدم."); }
          }
          return;
        }

        if (/^طرد$/i.test(text)) {
          if (targetId && !await userIsAdmin(ctx.chat.id, targetId)) {
            try {
              await ctx.api.banChatMember(ctx.chat.id, targetId);
              await ctx.api.unbanChatMember(ctx.chat.id, targetId);
              await ctx.reply(`🚪 تم طرد العضو ${targetName} من المجموعة بنجاح.`);
            } catch { await ctx.reply("❌ عذراً، لا أملك صلاحية طرد هذا المستخدم."); }
          }
          return;
        }
      }

      if (/^فتح\s+الكتم$/i.test(text)) {
        const target = msg.reply_to_message?.from;
        if (!target) {
          await ctx.reply('ردّ على رسالة العضو واكتب «فتح الكتم».');
          return;
        }
        try {
          const targetMember = await ctx.api.getChatMember(ctx.chat.id, target.id);
          if (['administrator', 'creator'].includes(targetMember.status)) {
            await ctx.reply('لا يمكن فك قيود مشرف بهذه الطريقة.');
            return;
          }
          const unrestricted = {
            can_send_messages: true, can_send_audios: true, can_send_documents: true,
            can_send_photos: true, can_send_videos: true, can_send_video_notes: true,
            can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true,
            can_add_web_page_previews: true
          };
          await ctx.api.restrictChatMember(ctx.chat.id, target.id, unrestricted);
          const after = await ctx.api.getChatMember(ctx.chat.id, target.id);
          if (after.status === 'restricted' && after.is_member && after.can_send_messages === false) {
            throw new Error('Member is still restricted by Telegram after unmute.');
          }
          await ctx.reply(`🔊 تم فك الكتم عن ${target.first_name || 'العضو'} وإعادة صلاحيات المجموعة الافتراضية إليه.`);
        } catch { await ctx.reply('❌ تعذر فك الكتم. تحقق من صلاحيات البوت.'); }
        return;
      }

      if (/^قفل\s+(?:الرسائل|المجموعة)$/i.test(text) && (isAdmin || isOwner(ctx))) {
        try {
          await ctx.api.setChatPermissions(ctx.chat.id, { can_send_messages: false });
          g.closedMessages = true; save();
          await ctx.reply(`🔒 تم قفل دردشة المجموعة بنجاح.`);
        } catch { await ctx.reply("❌ لا أملك صلاحية تعديل صلاحيات الشات."); }
        return;
      }

      if (/^افتح\s+(?:الرسائل|المجموعة)$/i.test(text) && (isAdmin || isOwner(ctx))) {
        try {
          await ctx.api.setChatPermissions(ctx.chat.id, { 
            can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true 
          });
          g.closedMessages = false; save();
          await ctx.reply(`🔓 تم فتح دردشة المجموعة بنجاح.`);
        } catch { await ctx.reply("❌ لا أملك صلاحية تعديل صلاحيات الشات."); }
        return;
      }

      if (/^تثبيت$/i.test(text)) {
        if (!msg.reply_to_message) { await ctx.reply('ردّ على الرسالة التي تريد تثبيتها ثم اكتب «تثبيت».'); return; }
        try { await ctx.api.pinChatMessage(ctx.chat.id, msg.reply_to_message.message_id); await ctx.reply('📌 تم تثبيت الرسالة.'); }
        catch { await ctx.reply('❌ تعذر تثبيت الرسالة. تحقق من صلاحيات البوت.'); }
        return;
      }
      if (/^(?:الغاء التثبيت|إلغاء التثبيت|فك التثبيت)$/i.test(text)) {
        if (!msg.reply_to_message) { await ctx.reply('ردّ على الرسالة المثبتة ثم اكتب «إلغاء التثبيت».'); return; }
        try { await ctx.api.unpinChatMessage(ctx.chat.id, msg.reply_to_message.message_id); await ctx.reply('📌 تم إلغاء تثبيت الرسالة.'); }
        catch { await ctx.reply('❌ تعذر إلغاء التثبيت. تحقق من صلاحيات البوت.'); }
        return;
      }

      if (/^(?:امسح|حذف الرسائل)\s+(\d+)$/i.test(text)) {
        const count = Number(text.match(/^(?:امسح|حذف الرسائل)\s+(\d+)$/i)[1]);
        if (!Number.isInteger(count) || count < 1 || count > 100) {
          await ctx.reply('حدد عدداً من 1 إلى 100 رسالة.');
          return;
        }
        const history = (g.recentMessages || [])
          .filter(entry => Number(entry.message_id) < Number(msg.message_id))
          .sort((a, b) => Number(a.message_id) - Number(b.message_id));
        const targets = history.slice(-count).reverse();
        if (!targets.length) return ctx.reply('⚠️ ما عندي رسائل مسجلة للمسح بعد. خلي البوت يراقب رسائل المجموعة ثم جرّب مجدداً.');
        let deleted = 0, failed = 0;
        for (const entry of targets) {
          try { await ctx.api.deleteMessage(ctx.chat.id, Number(entry.message_id)); deleted++; }
          catch { failed++; }
        }
        const removed = new Set(targets.map(entry => Number(entry.message_id)));
        g.recentMessages = (g.recentMessages || []).filter(entry => !removed.has(Number(entry.message_id)));
        save();
        try { await ctx.reply(`🗑️ انتهت عملية المسح: حذف ${deleted} من ${targets.length} رسالة، وتعذر حذف ${failed}.\n\nملاحظة: لا يستطيع تيليگرام حذف رسالة قديمة أو رسالة لا يملك البوت صلاحية حذفها.`); } catch {}
        return;
      }

      if (/^(?:المسح|احذف)\s+جميع\s+الرسائل$/i.test(text)) {
        db.pending ||= {};
        db.pending[`clearall:${String(ctx.chat.id)}`] = { createdAt: Date.now(), messageIds: (g.recentMessages || []).filter(entry => Number(entry.message_id) < Number(msg.message_id)).slice(-100).map(entry => Number(entry.message_id)) };
        save();
        const kb = new InlineKeyboard().text('🗑️ تأكيد الحذف آخر 100 رسالة', 'clearall_confirm')
          .row().text('❌ إلغاء', 'clearall_cancel');
        await ctx.reply('⚠️ تأكيد عملية الحذف\nسيحاول البوت حذف آخر 100 رسالة فقط قبل أمر التأكيد. قد تمنع قيود تيليگرام حذف بعض الرسائل القديمة. هل تريد المتابعة؟', { reply_markup: kb });
        return;
      }

      if (/^تفعيل\s+الحماية$/i.test(text)) {
        for (const field of ['linksLock', 'flood', 'mediaLock', 'badWordsLock', 'audioLock', 'audioClipsLock', 'forwardLock', 'contactsLock']) g[field] = true;
        g.links = true;
        save();
        let canDelete = false;
        try {
          const me = await ctx.api.getChatMember(ctx.chat.id, bot.botInfo.id);
          canDelete = me.status === 'creator' || (me.status === 'administrator' && me.can_delete_messages === true);
        } catch {}
        const status = canDelete
          ? 'تم حفظ وتفعيل جميع إعدادات الحماية. البوت يملك صلاحية حذف الرسائل المخالفة.'
          : 'تم حفظ إعدادات الحماية، لكن البوت لا يملك حالياً صلاحية حذف الرسائل. امنحه صلاحية حذف الرسائل من إعدادات المشرفين حتى تعمل الحماية تلقائياً.';
        await ctx.reply(`🛡️ ${status}`);
        return;
      }

      // الأوامر التفاعلية للأعضاء[cite: 4]
      if (text === 'ا') {
        await showProfileCard(ctx, g);
        const praise = PROFILE_PHRASES[Math.floor(Math.random() * PROFILE_PHRASES.length)];
        await ctx.reply(praise || 'نورت المجموعة يا بطل 🐾❤️', { reply_to_message_id: msg.message_id });
        return;
      }

      if (['العاب', 'ألعاب', 'الالعاب', 'الألعاب'].includes(text)) {
        const gamesKeyboard = new InlineKeyboard()
          .text('🎮 الألعاب', 'gamesmenu').row()
          .text('💬 الأوامر التفاعلية', 'interactive_menu').row()
          .text('🎁 خدمات حصرية', 'exclusive_services');
        await ctx.reply('🐈‍⬛ مركز نغنوغ\nاختَر القسم اللي تريده من الأزرار أدناه.', { reply_markup: gamesKeyboard, reply_to_message_id: msg.message_id });
        return;
      }

      if (text === 'ب' || text === '.ب') {
        const bios = [
          'هادئ بطبعي، عميق بتفاصيلي، وما يشبهني غير نفسي ✨',
          'أعيش ببساطة، وأحلم بأشياء أكبر من الكلام 🤍',
          'مو كل سكوت ضعف، مرات الهدوء أبلغ جواب 🖤',
          'أختار راحتي، وأمشي بطريقي، والباقي تفاصيل 🌿',
          'أثر طيب، نية صافية، وقلب ما يحب التصنّع 🫶🏻',
          'أتعلم من الأمس، أعيش اليوم، وأتفاءل بالباچر 🌙',
          'قليل كلام، كثير إحساس، وأحب الأشياء الصادقة 🕊️',
          'مو كامل، بس كل يوم أحاول أصير أفضل من قبل 💫',
          'أحب الهدوء، الأماكن البسيطة، والناس اللي تشبه الأمان ☁️',
          'أمشي على مبدأ: كرامتي أولاً وقلبي يبقى أبيض 🤍'
        ];
        return ctx.reply(bios[Math.floor(Math.random() * bios.length)], { reply_to_message_id: msg.message_id });
      }

      if (text === 'كت') {
        const randomPersonalQuestion = PERSONAL_QUESTIONS_LIST[Math.floor(Math.random() * PERSONAL_QUESTIONS_LIST.length)];
        await ctx.reply(`🎯 **كت — سؤال شخصي:**\n\n${randomPersonalQuestion}\n\n💬 جاوب عليه إذا تحب، وخلي الأعضاء يشاركونك آراءهم.`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      if (text === 'توب') {
        await ctx.reply(leaderboardText(ctx.chat.id), { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
        return;
      }

      if (text === 'ش') {
        const randomPoem = SHUAR_LIST[Math.floor(Math.random() * SHUAR_LIST.length)];
        await ctx.reply(`📜 **أبيات شعرية:**\n\n${randomPoem}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      if (text === 'ن' || text === 'نغنوغ') {
        const randomN = N_PHRASES[Math.floor(Math.random() * N_PHRASES.length)];
        await ctx.reply(`🐱 **نغنوغ:**\n\n${randomN}`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' });
        return;
      }

      const gameHandled = await handleGroupGameMessage(ctx, shared, { g, isAdmin, uid, msg, text });
      if (gameHandled) return;

      if (g.autoReply && text) {
        const normalizedMessage = normalizeAnswer(text);
        const customReply = (g.replies || []).find(item => normalizeAnswer(item.trigger) === normalizedMessage)?.response;
        const automaticReply = customReply || findAutoReply(text);
        if (automaticReply) {
          await ctx.reply(automaticReply, { reply_to_message_id: msg.message_id });
          return;
        }
      }

    } else {
      // معالجة المحادثات الخاصة والبيانات المعلقة[cite: 4, 5]
      const p = db.pending[userKey(ctx)];
      if (p?.action === 'video-download-link') {
        if (!isPrivate(ctx)) { clearPending(ctx); return ctx.reply('📥 أرسل رابط الفيديو بالخاص فقط.'); }
        if (/^\/cancel(?:@\w+)?$/i.test(text)) {
          clearPending(ctx);
          return ctx.reply('❌ تم إلغاء تحميل الفيديو.', { reply_markup: new InlineKeyboard().text('📥 تحميل فيديو', 'touchesdownload').row().text('↩️ لمسات نغنوغ', 'touchesmenu') });
        }
        const linkMatch = text.match(/https?:\/\/[^\s<>]+/i);
        const videoUrl = linkMatch?.[0]?.replace(/[),.!؟،]+$/, '') || '';
        if (!videoUrl) return ctx.reply('❌ دزلي رابط الفيديو برسالة نصية، أو اكتب /cancel للإلغاء.');
        if (!validateSocialVideoUrl(videoUrl)) return ctx.reply('❌ التحميل متاح حالياً من Instagram فقط. أرسل رابط إنستغرام عاماً، أو اكتب /cancel للإلغاء.');
        const status = await ctx.reply('✅ *تم استلام الرابط بنجاح.*\n🎬 جارٍ معالجة الفيديو وتجهيزه، يُرجى الانتظار قليلًا…', { parse_mode: 'Markdown' });
        let downloaded;
        try {
          downloaded = await downloadSocialVideo(videoUrl);
          const size = (await stat(downloaded.path)).size;
          if (size > 45 * 1024 * 1024) throw new Error('حجم الفيديو أكبر من الحد المسموح (45 ميغابايت).');
          const filename = path.basename(downloaded.path);
          if (/\.mp4$/i.test(filename)) {
            await ctx.replyWithVideo(new InputFile(downloaded.path, filename), { caption: '✅ تم تجهيز الفيديو بنجاح!\n🎬 إليك الفيديو من نغنوغ 🐾' });
          } else {
            await ctx.replyWithDocument(new InputFile(downloaded.path, filename), { caption: '✅ تم تجهيز الفيديو بنجاح!\n🎬 إليك الفيديو من نغنوغ 🐾' });
          }
          try { await ctx.api.deleteMessage(ctx.chat.id, status.message_id); } catch {}
          clearPending(ctx);
          return ctx.reply('📥 *هل ترغب بتحميل فيديو آخر؟*', { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('📥 نعم، فيديو آخر', 'touchesdownload').row().text('↩️ لمسة نغنوغ', 'touchesmenu').text('🏠 الرئيسية', 'home') });
        } catch (error) {
          const message = String(error?.message || 'تعذر تحميل الفيديو.');
          try { await ctx.api.editMessageText(ctx.chat.id, status.message_id, `❌ ${message}`); }
          catch { try { await ctx.reply(`❌ ${message}`); } catch {} }
          clearPending(ctx);
          return ctx.reply('تگدر تجرب رابطاً آخر من إحدى المنصات المدعومة.', { reply_markup: new InlineKeyboard().text('🔄 جرّب رابطاً آخر', 'touchesdownload').row().text('↩️ لمسات نغنوغ', 'touchesmenu') });
        } finally {
          if (downloaded) await cleanupDownloadedVideo(downloaded);
        }
      }
      if (p) {
        if (/^\/cancel(?:@\w+)?$/i.test(text) && ['reminder-text', 'reminder-day', 'reminder-time', 'global-ui-old', 'global-ui-new', 'global-ui-confirm', 'global-catalog-new', 'chat-sub-set'].includes(p.action)) {
          clearPending(ctx);
          const cancelledReminder = ['reminder-text', 'reminder-day', 'reminder-time'].includes(p.action);
          const cancelledChatSub = p.action === 'chat-sub-set';
          const replyMarkup = cancelledReminder
            ? new InlineKeyboard().text('⏰ قائمة ذكّرني', 'remindermenu').text('🏠 الرئيسية', 'home')
            : cancelledChatSub
              ? new InlineKeyboard().text('💬 اشتراك الدردشة', 'chatsubmenu').row().text('💳 الاشتراكات', 'subscriptionsmenu')
              : new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu').row().text('👑 لوحة المالك', 'ownerpanel');
          return ctx.reply(cancelledReminder ? '❌ تم إلغاء إنشاء التذكير.' : cancelledChatSub ? '❌ تم إلغاء إعداد جهة الاشتراك.' : '❌ تم إلغاء تحرير نصوص القوائم.', { reply_markup: replyMarkup });
        }
        if (p.action === 'reminder-text') {
          if (!isPrivate(ctx)) { clearPending(ctx); return ctx.reply('إنشاء التذكير متاح من الخاص فقط.'); }
          const reminderText = String(text || '').trim();
          if (!reminderText) return ctx.reply('اكتب نص التذكير برسالة نصية حتى أحفظه.');
          if ([...reminderText].length > 700) return ctx.reply('التذكير طويل. اختصره إلى 700 حرف أو أقل.');
          pending(ctx, { action: 'reminder-day', text: reminderText });
          return ctx.reply(`📝 التذكير: ${reminderText}\n\n📅 بأي يوم تريد أذكّرك؟\nأرسل «اليوم» أو «باچر»، أو اكتب التاريخ مثل 30/10/2026.\n\nاكتب /cancel للإلغاء.`);
        }
        if (p.action === 'reminder-day') {
          if (!isPrivate(ctx)) { clearPending(ctx); return ctx.reply('إنشاء التذكير متاح من الخاص فقط.'); }
          const day = parseBaghdadDay(text);
          if (!day.ok) return ctx.reply(`❌ ${day.error}\n\nأرسل «اليوم» أو «باچر» أو تاريخاً مثل 30/10/2026.`);
          pending(ctx, { action: 'reminder-time', text: String(p.text), day });
          return ctx.reply(`📅 تمام، حفظت اليوم ${String(day.day).padStart(2,'0')}/${String(day.month).padStart(2,'0')}/${day.year}.\n\n⏰ هسه كم الساعة تريد التذكير؟\nأرسل الوقت بصيغة ساعة:دقيقة، مثال 18:45 أو 9:05.`);
        }
        if (p.action === 'reminder-time') {
          if (!isPrivate(ctx)) { clearPending(ctx); return ctx.reply('إنشاء التذكير متاح من الخاص فقط.'); }
          const parsed = parseBaghdadTime(p.day, text);
          if (!parsed.ok) return ctx.reply(`❌ ${parsed.error}\n\nأرسل الوقت بصيغة ساعة:دقيقة، مثال 18:45.`);
          db.reminders = Array.isArray(db.reminders) ? db.reminders : [];
          const reminder = { id: `${userKey(ctx)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId: String(ctx.from.id), chatId: String(ctx.from.id), text: String(p.text), dueAt: parsed.timestamp, status: 'pending', createdAt: Date.now(), attempts: 0 };
          db.reminders.push(reminder);
          save();
          clearPending(ctx);
          const date = new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad', dateStyle: 'full' }).format(new Date(reminder.dueAt));
          const time = new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(reminder.dueAt));
          return ctx.reply(`✅ تم حفظ تذكيرك بنجاح!\n\n📝 ${reminder.text}\n📅 ${date}\n⏰ ${time} بتوقيت بغداد\n\nراح توصلك رسالة خاصة بوقتها، ويظل التذكير بسجلك لحد ما ينرسل ثم ينحذف تلقائياً.`, { reply_markup: new InlineKeyboard().text('➕ تذكير جديد', 'remindercreate').row().text('📋 تذكيراتي الحالية', 'reminderlist').row().text('↩️ قائمة ذكّرني', 'remindermenu').text('🏠 الرئيسية', 'home') });
        }
        if (/^\/cancel(?:@\w+)?$/i.test(text) && ['global-ui-old', 'global-ui-new', 'global-ui-confirm', 'global-catalog-new'].includes(p.action)) {
          clearPending(ctx);
          return ctx.reply('❌ تم إلغاء تحرير نصوص القوائم.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu').row().text('👑 لوحة المالك', 'ownerpanel') });
        }
        if (p.action === 'global-catalog-new') {
          if (!isOwner(ctx) || !isPrivate(ctx)) { clearPending(ctx); return ctx.reply('هذا الإجراء خاص بمالك البوت من الخاص فقط.'); }
          if (p.kind === 'button') { clearPending(ctx); return ctx.reply('تم إيقاف تعديل أسماء الأزرار. محرر المالك مخصص لنصوص القوائم فقط.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu') }); }
          const newValue = String(text || '').trim();
          if (!newValue) return ctx.reply('❌ القيمة الجديدة فارغة. أرسل نصاً يحتوي على أحرف.');
          const isButton = p.kind === 'button';
          if (newValue.length > (isButton ? 60 : 1800)) return ctx.reply(isButton ? '❌ اسم الزر طويل. اختَر اسماً أقصر.' : '❌ النص طويل للمعاينة؛ الحد هنا 1800 حرف.');
          if (isButton && Buffer.byteLength(newValue, 'utf8') > 64) return ctx.reply('❌ اسم الزر يتجاوز حد تيليگرام البالغ 64 بايت. اختَر اسماً أقصر.');
          if (newValue === String(p.from || '')) return ctx.reply('ماكو تغيير للحفظ لأن القيمة الجديدة مطابقة للحالية. أرسل قيمة مختلفة أو ألغِ العملية.');
          pending(ctx, { ...p, action: 'global-ui-confirm', kind: isButton ? 'button' : 'text', to: newValue });
          const preview = `👁️ معاينة تعديل من فهرس نغنوغ\n\nالقسم: ${p.catalogCategory || 'غير محدد'}\nالمصدر: ${p.catalogIndex != null ? 'العنصر رقم ' + (Number(p.catalogIndex) + 1) : 'غير محدد'}\n\n━━━━━━━━━━━━\nقبل:\n${String(p.from || '').slice(0, 1400)}\n\n━━━━━━━━━━━━\nبعد:\n${newValue.slice(0, 1400)}\n━━━━━━━━━━━━\n\nهل تعتمد التغيير للجميع؟`;
          return ctx.reply(preview, { reply_markup: new InlineKeyboard().text('✅ اعتماد التعديل للجميع', 'globaltextsave').row().text('✏️ تعديل القيمة الجديدة', 'globaltextbacktonew').row().text('❌ إلغاء', 'globaltextcancel') });
        }

        if (p.action === 'global-ui-old') {
          if (!isOwner(ctx) || !isPrivate(ctx)) { clearPending(ctx); return ctx.reply('هذا الإجراء خاص بمالك البوت من الخاص فقط.'); }
          if (p.kind === 'button') { clearPending(ctx); return ctx.reply('تم إيقاف تعديل أسماء الأزرار. محرر المالك مخصص لنصوص القوائم فقط.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu') }); }
          const oldValue = String(text || '').trim();
          if (!oldValue) return ctx.reply('❌ النص فارغ. أرسل النص القديم أو اسم الزر مرة ثانية.');
          if (oldValue.length > 1800) return ctx.reply('❌ النص طويل للمعاينة. أرسل العبارة المطلوبة أو جزءاً واضحاً منها (1800 حرف كحد أقصى).');
          pending(ctx, { action: 'global-ui-new', kind: p.kind === 'button' ? 'button' : 'text', from: oldValue });
          return ctx.reply(p.kind === 'button'
            ? `🔘 الزر قبل التعديل:\n${oldValue}\n\nهسه أرسل اسم الزر الجديد. ما راح يتغير شي قبل ما تشوف المعاينة وتضغط «اعتماد التعديل».`
            : `📝 النص قبل التعديل:\n\n${oldValue}\n\nهسه أرسل النص الجديد. راح أعرض لك القديم والجديد للمراجعة، وما ينحفظ أي تغيير قبل ضغط «اعتماد التعديل».`,
            { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'globaltextcancel') });
        }

        if (p.action === 'global-ui-new') {
          if (!isOwner(ctx) || !isPrivate(ctx)) { clearPending(ctx); return ctx.reply('هذا الإجراء خاص بمالك البوت من الخاص فقط.'); }
          if (p.kind === 'button') { clearPending(ctx); return ctx.reply('تم إيقاف تعديل أسماء الأزرار. محرر المالك مخصص لنصوص القوائم فقط.', { reply_markup: new InlineKeyboard().text('📝 تحرير نصوص القوائم', 'globaltextmenu') }); }
          const newValue = String(text || '').trim();
          if (!newValue) return ctx.reply('❌ النص الجديد فارغ. أرسله مرة ثانية.');
          if (newValue.length > (p.kind === 'button' ? 64 : 1800)) return ctx.reply(p.kind === 'button' ? '❌ اسم الزر طويل جداً. أرسل اسماً أقصر.' : '❌ النص الجديد طويل للمعاينة. اختصره إلى 1800 حرف أو أقل.');
          if (p.kind === 'button' && Buffer.byteLength(newValue, 'utf8') > 64) return ctx.reply('❌ اسم الزر يتجاوز حد تيليگرام البالغ 64 بايت. اختَر اسماً أقصر.');
          const from = String(p.from || '').trim();
          if (!from || from === newValue) return ctx.reply('ماكو تغيير للحفظ لأن النص القديم والجديد متطابقان. أرسل نصاً جديداً مختلفاً أو اضغط إلغاء.');
          pending(ctx, { ...p, action: 'global-ui-confirm', kind: p.kind === 'button' ? 'button' : 'text', from, to: newValue });
          const title = p.kind === 'button' ? '🔘 معاينة اسم الزر' : '📝 معاينة النص أو الوصف';
          const preview = `${title}\n\n━━━━━━━━━━━━\nقبل:\n${from}\n\n━━━━━━━━━━━━\nبعد:\n${newValue}\n━━━━━━━━━━━━\n\nهل تريد اعتماد هذا التغيير لكل مستخدمي نغنوغ؟`;
          return ctx.reply(preview, { reply_markup: new InlineKeyboard().text('✅ اعتماد التعديل للجميع', 'globaltextsave').row().text('✏️ تعديل النص الجديد', 'globaltextbacktonew').row().text('❌ إلغاء', 'globaltextcancel') });
        }

        if (p.action === 'global-ui-confirm') {
          if (!isOwner(ctx) || !isPrivate(ctx)) { clearPending(ctx); return ctx.reply('هذا الإجراء خاص بمالك البوت من الخاص فقط.'); }
          return ctx.reply('👀 عندك معاينة جاهزة للقديم والجديد. استخدم الأزرار أدناه لاعتماد التغيير أو تعديل النص الجديد أو الإلغاء.', { reply_markup: new InlineKeyboard().text('✅ اعتماد التعديل للجميع', 'globaltextsave').row().text('✏️ تعديل النص الجديد', 'globaltextbacktonew').row().text('❌ إلغاء', 'globaltextcancel') });
        }

        if (p.action === 'touches-name') {
          if (!text) return ctx.reply('❌ دزلي الاسم كنص حتى أگدر أزخرفه.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'touchescancel') });
          if ([...text].length > 40) return ctx.reply('❌ خلي الاسم 40 حرف أو أقل حتى تطلع الزخارف مرتبة. دز الاسم مرة ثانية.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'touchescancel') });
          const name = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
          if (!name) return ctx.reply('❌ الاسم فارغ، دزلي الاسم مرة ثانية.', { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'touchescancel') });
          const language = p.language === 'en' ? 'en' : 'ar';
          clearPending(ctx);
          const results = makeNameBatch(name, language, []);
          db.touchSessions ||= {};
          db.touchSessions[userKey(ctx)] = { name, language, used: [...results], batchNumber: 1 };
          save();
          return ctx.reply(touchesBatchText(name, language, results, 1), { reply_markup: touchesBatchKeyboard(results) });
        }

        if (p.action === 'broadcast-message') {
          if (!isOwner(ctx) || !isPrivate(ctx)) { clearPending(ctx); return ctx.reply('الإذاعة متاحة للمالك من الخاص فقط.'); }
          const draft = String(text || '').trim();
          if (!draft) return ctx.reply('أرسل نص الإذاعة أو اضغط إلغاء.');
          pending(ctx, { action: 'broadcast-confirm', text: draft });
          return ctx.reply(`📢 معاينة الإذاعة — لن يُرسل شيء بعد\n\n${draft}\n\nعدد المستخدمين المسجلين حالياً: ${(db.privateUsers || []).length}\n\nإذا النص صحيح اضغط «إرسال الإذاعة الآن».`, { reply_markup: new InlineKeyboard().text('✅ إرسال الإذاعة الآن', 'broadcastsend').row().text('❌ إلغاء الإذاعة', 'broadcastcancel') });
        }

        if (p.action === 'broadcast-confirm') {
          return ctx.reply('📢 توجد إذاعة بانتظار التأكيد. اضغط إرسال الإذاعة الآن أو إلغاء الإذاعة من الأزرار أعلاه.');
        }

        if (p.action === 'chat-sub-set') {
          if (!isOwner(ctx) || !isPrivate(ctx)) { clearPending(ctx); return ctx.reply('هذا الإجراء خاص بمالك البوت من الخاص فقط.'); }
          const ids = (Array.isArray(p.groupIds) ? p.groupIds : [p.groupId]).map(String).filter(Boolean);
          const parts = String(text || '').split('|').map(v => v.trim());
          const targetRef = parts[0] || '';
          const suppliedUrl = parts[1] || '';
          if (!targetRef) return ctx.reply('أرسل @channel أو آيدي جهة الاشتراك.');
          let targetChat;
          try { targetChat = await ctx.api.getChat(/^-?\d+$/.test(targetRef) ? Number(targetRef) : targetRef); }
          catch { return ctx.reply('❌ ما كدرت أوصل لجهة الاشتراك. تأكد من الآيدي/المعرف وأن نغنوغ موجود ومشرف بها.'); }
          let botMember;
          try { botMember = await ctx.api.getChatMember(targetChat.id, bot.botInfo.id); }
          catch { return ctx.reply('❌ تعذر فحص صلاحية نغنوغ داخل جهة الاشتراك. أضفه مشرفاً ثم أعد المحاولة.'); }
          if (!['administrator','creator'].includes(botMember.status)) return ctx.reply('❌ لازم يكون نغنوغ مشرفاً في جهة الاشتراك حتى يتحقق من العضوية.');
          const url = targetChat.username ? `https://t.me/${targetChat.username}` : (/^https:\/\/t\.me\//i.test(suppliedUrl) ? suppliedUrl : '');
          if (!url) return ctx.reply('الجهة خاصة أو ما إلها معرف عام. أرسلها هكذا: -1001234567890 | https://t.me/+رابط_الدعوة');
          db.chatSubscriptions ||= {};
          for (const groupId of ids) {
            db.chatSubscriptions[groupId] = { ...(db.chatSubscriptions[groupId] || {}), requiredChatId: String(targetChat.id), title: targetChat.title || targetChat.username || String(targetChat.id), url, updatedAt: Date.now() };
          }
          clearPending(ctx); save();
          return ctx.reply(`✅ تم حفظ جهة الاشتراك «${targetChat.title || targetChat.username || targetChat.id}» للمجموعات المحددة (${ids.length}).\nالتشغيل والإيقاف من لوحة اشتراك الدردشة.`, { reply_markup: new InlineKeyboard().text('💬 اشتراك الدردشة', 'chatsubmenu').row().text('💳 الاشتراكات', 'subscriptionsmenu') });
        }

        if (p.action === 'add-required-chat') {
          clearPending(ctx);
          let title = text;
          let id = text;
          let url = text.startsWith('@') ? `https://t.me/${text.replace('@', '')}` : '';
          db.requiredChats ||= [];
          db.requiredChats.push({ id, title, url });
          save();
          return answer(ctx, `✅ تم إضافة القناة أو المجموعة للاشتراك الإجباري بنجاح!`, { reply_markup: new InlineKeyboard().text('🔐 إدارة الاشتراك الإجباري', 'requiredmenu') });
        }

        if (p.action === 'edit-welcome') {
          const g = db.groups[p.groupId];
          if (g && await userCanManage(ctx, g)) {
            g.welcomeText = text;
            save();
            clearPending(ctx);
            return answer(ctx, `✅ تم تحديث رسالة الترحيب بنجاح!`, { reply_markup: groupSettingsKeyboard(g) });
          }
        }

        if (['custom-start', 'custom-description', 'custom-reply', 'custom-label', 'custom-help'].includes(p.action)) {
          if (!text) return ctx.reply('❌ النص فارغ. أرسل نصاً يحتوي على أحرف.');
          const c = getCustomization(ctx);
          if (p.action === 'custom-start') c.startText = text;
          if (p.action === 'custom-help') c.helpText = text;
          if (p.action === 'custom-label') {
            const allowedLabels = ['groups', 'addBot', 'management', 'profile', 'customize', 'help', 'back', 'home', 'cancel'];
            if (!allowedLabels.includes(p.key)) { clearPending(ctx); return ctx.reply('اسم الزر غير معروف.'); }
            if (text.length > 50) return ctx.reply('❌ خلي اسم الزر 50 حرف أو أقل. جرّب مرة ثانية.');
            c.labels ||= {}; c.labels[p.key] = text;
          }
          if (p.action === 'custom-description') {
            c.descriptions ||= {};
            if (!['settings', 'groups', 'account', 'replies'].includes(p.key)) { clearPending(ctx); return ctx.reply('القسم غير معروف.'); }
            c.descriptions[p.key] = text;
          }
          if (p.action === 'custom-reply') {
            c.replies ||= {};
            if (!['account', 'replies', 'nogroups'].includes(p.key)) { clearPending(ctx); return ctx.reply('القسم غير معروف.'); }
            c.replies[p.key] = text;
          }
          save();
          clearPending(ctx);
          return ctx.reply('✅ تم حفظ التعديل الخاص بيك بنجاح ❤️', {
            reply_markup: new InlineKeyboard().text('🎨 قائمة التخصيص', 'custommenu').row().text('🏠 القائمة الرئيسية', 'home')
          });
        }
        if (p.action === 'reply-trigger') {
          const g = db.groups[p.groupId];
          if (!g || !await userCanManage(ctx, g)) { clearPending(ctx); return ctx.reply('عيني، ما عندك صلاحية تعدّل ردود هالمجموعة.'); }
          if (!text.trim()) return ctx.reply('أرسل عبارة نصية حتى أستخدمها كمحفّز للرد.');
          pending(ctx, { action: 'reply-response', groupId: p.groupId, trigger: text.trim() });
          return ctx.reply(`تمام عيني، هسه أرسل الرد اللي تريد نغنوغ يكتبه من يقره «${text.trim()}».`, { reply_markup: new InlineKeyboard().text('❌ إلغاء', 'repliesmenu') });
        }
        if (p.action === 'reply-response') {
          const g = db.groups[p.groupId];
          if (!g || !await userCanManage(ctx, g)) { clearPending(ctx); return ctx.reply('عيني، ما عندك صلاحية تعدّل ردود هالمجموعة.'); }
          if (!text.trim()) return ctx.reply('الرد فارغ، أرسل نصاً حتى ينحفظ.');
          g.replies ||= [];
          const trigger = String(p.trigger || '').trim();
          if (!trigger) { clearPending(ctx); return ctx.reply('ما لكيت عبارة الرد. جرّب الإضافة مرة ثانية.'); }
          const existing = g.replies.findIndex(r => String(r.trigger).toLocaleLowerCase('ar') === trigger.toLocaleLowerCase('ar'));
          const entry = { trigger, response: text.trim() };
          if (existing >= 0) g.replies[existing] = entry; else g.replies.push(entry);
          save(); clearPending(ctx);
          return ctx.reply('تمام عيني، انحفظ الرد بنجاح 🐾', { reply_markup: new InlineKeyboard().text('📋 قائمة الردود', 'replylist').row().text('💬 إدارة الردود', 'repliesmenu') });
        }

        if (p.action === 'badwordadd') {
          const g = db.groups[p.groupId];
          if (g && await userCanManage(ctx, g)) {
            g.badWords ||= [];
            g.badWords.push(text);
            save();
            clearPending(ctx);
            return answer(ctx, `✅ تم إضافة الكلمة "${text}" إلى قائمة الممنوعات بنجاح!`, { reply_markup: new InlineKeyboard().text('🚫 الكلمات الممنوعة', 'badwordsmenu') });
          }
        }
      }

      const showHomeFunc = async (cCtx) => {
        const c = getCustomization(cCtx);
        await safeEdit(cCtx, c.startText, getHomeKeyboard(cCtx));
      };
      return showHomeFunc(ctx);
    }
  });
}
