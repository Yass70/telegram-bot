import { InlineKeyboard } from 'grammy';

export function mainKeyboard(ctx, bot) {
  const botUsername = bot.botInfo?.username || 'YZ_VIDbot';

  return new InlineKeyboard()
    .url(
      '➕ أضفني للمجموعة',
      `https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+pin_messages`
    )
    .text('⚙️ إعدادات المجموعة', 'groupsettings')
    .text('👥 مجموعاتي', 'mygroups')
    .row()
    .text('🛡️ أوامر الحماية', 'protectionmenu')
    .text('👑 أوامر المشرفين', 'adminpanel')
    .row()
    .text('🎮 الألعاب والتحديات', 'gamesmenu')
    .text('👤 معلومات حسابي', 'accountinfo')
    .row()
    .text('🎨 تخصيص البوت', 'custommenu')
    .row()
    .text('📖 المساعدة', 'help');
}

export function customizationKeyboard() {
  return new InlineKeyboard()
    .text('👋 تعديل مقدمة /start', 'customstart')
    .row()
    .text('🔘 تعديل شرح الأزرار', 'customdescmenu')
    .row()
    .text('💬 تعديل ردود البوت', 'customreplymenu')
    .row()
    .text('♻️ استعادة النصوص الأصلية', 'customreset')
    .row()
    .text('🔙 رجوع للقائمة الرئيسية', 'home');
}

export function customizationDescriptionsKeyboard() {
  return new InlineKeyboard()
    .text('⚙️ شرح إعدادات المجموعة', 'customdesc:settings')
    .row()
    .text('👥 شرح مجموعاتي', 'customdesc:groups')
    .row()
    .text('👤 شرح معلومات حسابي', 'customdesc:account')
    .row()
    .text('💬 شرح الردود التلقائية', 'customdesc:replies')
    .row()
    .text('🔙 رجوع للتخصيص', 'custommenu');
}

export function customizationRepliesKeyboard() {
  return new InlineKeyboard()
    .text('👤 رسالة معلومات الحساب', 'customreply:account')
    .row()
    .text('💬 رسالة قسم الردود التلقائية', 'customreply:replies')
    .row()
    .text('👥 رسالة عدم وجود مجموعات', 'customreply:nogroups')
    .row()
    .text('🔙 رجوع للتخصيص', 'custommenu');
}

export function helpKeyboard() {
  return new InlineKeyboard()
    .text('👥 إدارة المجموعات', 'mygroups')
    .row()
    .text('🏠 القائمة الرئيسية', 'home')
    .url('👤 حساب المطوّر', 'https://t.me/llll6llll6');
}

export function ownerKeyboard() {
  return new InlineKeyboard()
    .text('📊 إحصائيات البوت', 'botstats')
    .row()
    .text('👥 المجموعات المفعّلة', 'activatedgroups')
    .row()
    .text('📢 إذاعة عامة (للمستخدمين)', 'broadcastmenu')
    .row()
    .text('⚙️ إعدادات البوت', 'botsettings')
    .row()
    .text('🛡️ إعدادات الحماية العامة', 'globalprotection')
    .row()
    .text('📢 إدارة الاشتراك الإجباري', 'requiredmenu')
    .row()
    .text('🔙 القائمة الرئيسية', 'home');
}

export function warningsKeyboard(g) {
  const w = g.warningSettings || {
    enabled: false,
    limit: 3,
    action: 'mute',
    duration: 10
  };

  const actionNames = {
    none: 'بدون إجراء',
    mute: 'كتم',
    kick: 'طرد',
    ban: 'حظر'
  };

  return new InlineKeyboard()
    .text(
      `${w.enabled ? '🟢' : '⚪'} نظام التحذيرات: ${w.enabled ? 'مفعّل' : 'متوقف'}`,
      'warningstoggle'
    )
    .row()
    .text(`🔢 عدد التحذيرات: ${w.limit}`, 'warningslimit')
    .row()
    .text(`⚖️ العقوبة: ${actionNames[w.action] || 'كتم'}`, 'warningsaction')
    .row()
    .text(`⏱️ مدة الكتم: ${w.duration} دقيقة`, 'warningsduration')
    .row()
    .text('🚫 إدارة الكلمات الممنوعة', 'badwordsmenu')
    .row()
    .text('📋 سجل التحذيرات', 'warningslog')
    .row()
    .text('🧹 تصفير تحذيرات عضو', 'warningsclear')
    .row()
    .text('🔙 رجوع لإعدادات المجموعة', 'groupsettings');
}

export function groupSettingsKeyboard(g) {
  return new InlineKeyboard()
    .text('👋 تعديل رسالة الترحيب', 'welcomeedit')
    .row()
    .text(
      `${g.links ? '🟢' : '⚪'} منع الروابط: ${g.links ? 'مفعّل' : 'متوقف'}`,
      'togglelinks'
    )
    .row()
    .text(
      `${g.flood ? '🟢' : '⚪'} منع السبام: ${g.flood ? 'مفعّل' : 'متوقف'}`,
      'toggleflood'
    )
    .row()
    .text(
      `${g.autoReply ? '🟢' : '⚪'} الردود التلقائية: ${g.autoReply ? 'مفعّلة' : 'متوقفة'}`,
      'togglereplies'
    )
    .row()
    .text('🛡️ التحذيرات والعقوبات', 'warningsmenu')
    .row()
    .text('💬 إدارة الردود التلقائية', 'repliesmenu')
    .row()
    .text('📊 إحصائيات المجموعة', 'groupstats')
    .row()
    .text('🔙 رجوع', 'home');
}

export function repliesKeyboard() {
  return new InlineKeyboard()
    .text('➕ إضافة رد', 'replyadd')
    .row()
    .text('📋 عرض الردود', 'replylist')
    .row()
    .text('🗑️ حذف رد', 'replydelete')
    .row()
    .text('🔙 رجوع لإعدادات المجموعة', 'groupsettings');
}
