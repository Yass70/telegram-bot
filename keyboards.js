import { InlineKeyboard } from 'grammy';

export function mainKeyboard(ctx, bot, ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  const botUsername = bot.botInfo?.username || 'YZ_VIDbot';
  // واجهة الخاص الأساسية موحّدة للمالك والمستخدم، مع أزرار المالك الإضافية من index.js.
  const kb = new InlineKeyboard()
    .text(label('groups', '👥 مجموعاتي'), 'mygroups')
    .url(label('addBot', '➕ أضفني للمجموعة'), `https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+pin_messages`).row()
    .text(label('management', '⚙️ الإدارة'), 'managementmenu').row()
    .text(label('profile', '👤 ملفي الشخصي'), 'accountinfo').row()
    .text('⭐ ستار', 'starmenu').row()
    .text('🔥🐈‍⬛ لمسات', 'touchesmenu').row()
    .text(label('customize', '🎨 تخصيص نغنوغ'), 'custommenu')
    .text(label('help', '📖 المساعدة'), 'help');
  return kb;
}

export function customizationKeyboard(ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  return new InlineKeyboard()
    .text('👋 تعديل رسالة البداية', 'customstart')
    .row()
    .text('📝 تعديل شروحات الأقسام', 'customdescmenu')
    .row()
    .text('🔘 تعديل أسماء أزرار القوائم', 'customuimenu')
    .row()
    .text('📖 تعديل نص المساعدة', 'customhelp')
    .row()
    .text('♻️ استعادة النصوص الافتراضية', 'customreset')
    .row()
    .text(label('home', '↩️ العودة إلى القائمة الرئيسية'), 'home');
}

export function customizationUILabelsKeyboard(ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  return new InlineKeyboard()
    .text('👥 زر مجموعاتي', 'customlabel:groups').row()
    .text('➕ زر إضافة البوت', 'customlabel:addBot').row()
    .text('⚙️ زر الإدارة', 'customlabel:management').row()
    .text('👤 زر الملف الشخصي', 'customlabel:profile').row()
    .text('🎨 زر التخصيص', 'customlabel:customize').row()
    .text('📖 زر المساعدة', 'customlabel:help').row()
    .text('↩️ زر الرجوع', 'customlabel:back').row()
    .text('🏠 زر الرئيسية', 'customlabel:home').row()
    .text('❌ زر الإلغاء', 'customlabel:cancel').row()
    .text(label('back', '↩️ العودة إلى التخصيص'), 'custommenu');
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

export function helpKeyboard(ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  return new InlineKeyboard()
    .text(label('groups', '👥 مجموعاتي'), 'mygroups')
    .row()
    .text(label('home', '🏠 الرئيسية'), 'home').row()
    .url('👨🏻‍💻 المطوّر', 'https://t.me/llll6llll6');
}

export function ownerKeyboard() {
  // لوحة المالك تعرض أدوات الإدارة المركزية فقط؛ الحماية وإعدادات البوت لها مدخل مستقل.
  return new InlineKeyboard()
    .text('📊 إحصائيات نغنوغ', 'botstats')
    .text('👥 المجموعات النشطة', 'activatedgroups').row()
    .text('📢 إرسال إشعار عام', 'broadcastmenu')
    .text('🔐 الاشتراك الإجباري', 'requiredmenu').row()
    .text('📝 توحيد النصوص', 'globaltextmenu').row()
    .text('🔙 القائمة الرئيسية', 'home');
}

const WARNING_ACTION_NAMES = Object.freeze({
  none: 'بدون إجراء',
  mute: 'كتم',
  kick: 'طرد',
  ban: 'حظر'
});

export function warningsKeyboard(g = {}, back = 'groupsettings') {
  const settings = g?.warningSettings || {};
  const enabled = settings.enabled === true;
  const limit = Number.isInteger(Number(settings.limit)) && Number(settings.limit) > 0
    ? Number(settings.limit)
    : 3;
  const action = Object.hasOwn(WARNING_ACTION_NAMES, settings.action)
    ? settings.action
    : 'mute';
  const duration = Number.isInteger(Number(settings.duration)) && Number(settings.duration) > 0
    ? Number(settings.duration)
    : 10;

  return new InlineKeyboard()
    .text(
      `${enabled ? '🟢' : '⚪'} نظام التحذيرات: ${enabled ? 'مفعّل' : 'متوقف'}`,
      'warningstoggle'
    )
    .row()
    .text(`🔢 عدد التحذيرات: ${limit}`, 'warningslimit')
    .row()
    .text(`⚖️ العقوبة: ${WARNING_ACTION_NAMES[action]}`, 'warningsaction')
    .row()
    .text(`⏱️ مدة الكتم: ${duration} دقيقة`, 'warningsduration')
    .row()
    .text('🚫 الكلمات الممنوعة', 'badwordsmenu')
    .row()
    .text('📋 سجل التحذيرات', 'warningslog')
    .row()
    .text('🧹 تصفير جميع التحذيرات', 'warningsclear')
    .row()
    .text(back === 'managementmenu' ? '↩️ العودة إلى الإدارة' : back === 'ownerpanel' ? '↩️ العودة إلى لوحة المالك' : back === 'publiccommands' ? '↩️ العودة إلى مركز الأوامر' : '↩️ العودة إلى إعدادات المجموعة', back);
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

export function repliesKeyboard(back = 'groupsettings') {
  return new InlineKeyboard()
    .text('➕ إضافة رد تلقائي', 'replyadd')
    .row()
    .text('📋 قائمة الردود', 'replylist')
    .row()
    .text('🗑️ حذف رد تلقائي', 'replydelete')
    .row()
    .text(back === 'managementmenu' ? '↩️ العودة إلى الإدارة' : back === 'ownerpanel' ? '↩️ العودة إلى لوحة المالك' : back === 'publiccommands' ? '↩️ العودة إلى مركز الأوامر' : '↩️ العودة إلى إعدادات المجموعة', back);
}
