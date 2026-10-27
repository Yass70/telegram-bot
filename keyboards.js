import { InlineKeyboard } from 'grammy';

export function mainKeyboard(ctx, bot) {
  const botUsername = bot.botInfo?.username || 'YZ_VIDbot';
  // واجهة الخاص الأساسية موحّدة للمالك والمستخدم، مع أزرار المالك الإضافية من index.js.
  const kb = new InlineKeyboard()
    .text('👥 مجموعاتي', 'mygroups')
    .url('➕ أضفني للمجموعة', `https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+pin_messages`).row()
    .text('⚙️ الإدارة', 'managementmenu').row()
    .text('👤 ملفي الشخصي', 'accountinfo').row()
    .text('🎨 تخصيص نغنوغ', 'custommenu')
    .text('📖 المساعدة', 'help');
  return kb;
}

export function customizationKeyboard() {
  return new InlineKeyboard()
    .text('👋 تعديل رسالة البداية', 'customstart')
    .row()
    .text('📝 تعديل شروحات الأزرار', 'customdescmenu')
    .row()
    .text('💬 تخصيص ردود نغنوغ', 'customreplymenu')
    .row()
    .text('♻️ استعادة النصوص الافتراضية', 'customreset')
    .row()
    .text('↩️ العودة إلى القائمة الرئيسية', 'home');
}

export function customizationDescriptionsKeyboard() {
  return new InlineKeyboard()
    .text('⚙️ شرح إعدادات المجموعة', 'customdesc:settings')
    .row()
    .text('👥 شرح قسم مجموعاتي', 'customdesc:groups')
    .row()
    .text('👤 شرح الملف الشخصي', 'customdesc:account')
    .row()
    .text('💬 شرح الردود التلقائية', 'customdesc:replies')
    .row()
    .text('↩️ العودة إلى التخصيص', 'custommenu');
}

export function customizationRepliesKeyboard() {
  return new InlineKeyboard()
    .text('👤 نص الملف الشخصي', 'customreply:account')
    .row()
    .text('💬 نص الردود التلقائية', 'customreply:replies')
    .row()
    .text('👥 نص عدم وجود مجموعات', 'customreply:nogroups')
    .row()
    .text('↩️ العودة إلى التخصيص', 'custommenu');
}

export function helpKeyboard() {
  return new InlineKeyboard()
    .text('👥 مجموعاتي', 'mygroups')
    .row()
    .text('🏠 الرئيسية', 'home').row()
    .url('👨🏻‍💻 المطوّر', 'https://t.me/llll6llll6');
}

export function ownerKeyboard() {
  return new InlineKeyboard()
    .text('📊 إحصائيات نغنوغ', 'botstats')
    .row()
    .text('👥 المجموعات النشطة', 'activatedgroups')
    .row()
    .text('📢 إرسال إشعار عام', 'broadcastmenu')
    .row()
    .text('⚙️ إعدادات البوت العامة', 'botsettings')
    .row()
    .text('🛡️ حماية المجموعة المحددة', 'globalprotection')
    .row()
    .text('🔐 الاشتراك الإجباري', 'requiredmenu')
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
    .text(`⚖️ العقوبة: ${actionNamesw.action || 'كتم'}`, 'warningsaction')
    .row()
    .text(`⏱️ مدة الكتم: ${w.duration} دقيقة`, 'warningsduration')
    .row()
    .text('🚫 الكلمات الممنوعة', 'badwordsmenu')
    .row()
    .text('📋 سجل التحذيرات', 'warningslog')
    .row()
    .text('🧹 تصفير تحذيرات عضو', 'warningsclear')
    .row()
    .text('↩️ العودة إلى إعدادات المجموعة', 'groupsettings');
}

export function groupSettingsKeyboard(g) {
  return new InlineKeyboard()
    .text('👋 رسالة الترحيب', 'welcomeedit')
    .row()
    .text('🛡️ الحماية الموحدة', 'protectionmenu')
    .row()
    .text('⚠️ التحذيرات والعقوبات', 'warningsmenu')
    .row()
    .text('💬 الردود التلقائية', 'repliesmenu')
    .row()
    .text('📊 إحصائيات المجموعة', 'groupstats')
    .row()
    .text('🔙 العودة للمجموعة', 'groupoverview');
}

export function repliesKeyboard() {
  return new InlineKeyboard()
    .text('➕ إضافة رد تلقائي', 'replyadd')
    .row()
    .text('📋 قائمة الردود', 'replylist')
    .row()
    .text('🗑️ حذف رد تلقائي', 'replydelete')
    .row()
    .text('↩️ العودة إلى إعدادات المجموعة', 'groupsettings');
}
