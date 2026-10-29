import { InlineKeyboard } from 'grammy';

export function mainKeyboard(ctx, bot, ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  const botUsername = bot.botInfo?.username || 'YZ_VIDbot';
  // واجهة الخاص الأساسية موحّدة للمالك والمستخدم، مع أزرار المالك الإضافية من index.js.
  const kb = new InlineKeyboard()
    .text(label('groups', '👥 مجموعاتي'), 'mygroups')
    .url(label('addBot', '➕ أضف نغنوغ'), `https://t.me/${botUsername}?startgroup=true&admin=delete_messages+restrict_members+pin_messages`).row()
    .text(label('management', '⚙️ الإدارة'), 'managementmenu')
    .text(label('profile', '👤 ملفي الشخصي'), 'accountinfo').row()
    .text('⭐ ستار', 'starmenu')
    .text('✨ لمسات نغنوغ', 'touchesmenu').row()
    .text(label('customize', '🎨 تخصيص نغنوغ'), 'custommenu')
    .text(label('help', '📖 المساعدة'), 'help');
  return kb;
}

export function customizationKeyboard(ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  return new InlineKeyboard()
    .text('👋 رسالة البداية', 'customstart')
    .text('📝 شروحات الأقسام', 'customdescmenu').row()
    .text('🔘 أسماء الأزرار', 'customuimenu')
    .text('📖 نص المساعدة', 'customhelp').row()
    .text('♻️ استعادة الافتراضي', 'customreset').row()
    .text(label('home', '↩️ القائمة الرئيسية'), 'home');
}

export function customizationUILabelsKeyboard(ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  return new InlineKeyboard()
    .text('👥 مجموعاتي', 'customlabel:groups')
    .text('➕ إضافة البوت', 'customlabel:addBot').row()
    .text('⚙️ الإدارة', 'customlabel:management')
    .text('👤 الملف الشخصي', 'customlabel:profile').row()
    .text('🎨 التخصيص', 'customlabel:customize')
    .text('📖 المساعدة', 'customlabel:help').row()
    .text('↩️ الرجوع', 'customlabel:back')
    .text('🏠 الرئيسية', 'customlabel:home').row()
    .text('❌ الإلغاء', 'customlabel:cancel').row()
    .text(label('back', '↩️ العودة إلى التخصيص'), 'custommenu');
}

export function customizationDescriptionsKeyboard() {
  return new InlineKeyboard()
    .text('⚙️ إعدادات المجموعة', 'customdesc:settings')
    .text('👥 مجموعاتي', 'customdesc:groups').row()
    .text('👤 الملف الشخصي', 'customdesc:account')
    .text('💬 الردود التلقائية', 'customdesc:replies').row()
    .text('↩️ العودة إلى التخصيص', 'custommenu');
}

export function customizationRepliesKeyboard() {
  return new InlineKeyboard()
    .text('👤 نص الملف الشخصي', 'customreply:account')
    .text('💬 نص الردود التلقائية', 'customreply:replies').row()
    .text('👥 نص عدم وجود مجموعات', 'customreply:nogroups').row()
    .text('↩️ العودة إلى التخصيص', 'custommenu');
}

export function helpKeyboard(ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  return new InlineKeyboard()
    .text(label('groups', '👥 مجموعاتي'), 'mygroups')
    .text(label('home', '🏠 الرئيسية'), 'home').row()
    .url('👨🏻‍💻 المطوّر', 'https://t.me/llll6llll6');
}

export function ownerKeyboard() {
  // لوحة المالك تعرض أدوات الإدارة المركزية فقط؛ الحماية وإعدادات البوت لها مدخل مستقل.
  return new InlineKeyboard()
    .text('📊 الإحصائيات', 'botstats')
    .text('👥 المجموعات النشطة', 'activatedgroups').row()
    .text('📢 الإشعار العام', 'broadcastmenu')
    .text('🔐 الاشتراك الإجباري', 'requiredmenu').row()
    .text('📝 تحرير نصوص القوائم', 'globaltextmenu').row()
    .text('🏠 القائمة الرئيسية', 'home');
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
      `${enabled ? '🟢' : '⚪'} التحذيرات: ${enabled ? 'مفعّلة' : 'متوقفة'}`,
      'warningstoggle'
    ).row()
    .text(`🔢 عدد التحذيرات: ${limit}`, 'warningslimit')
    .text(`⚖️ العقوبة: ${WARNING_ACTION_NAMES[action]}`, 'warningsaction').row()
    .text(`⏱️ مدة الكتم: ${duration} دقيقة`, 'warningsduration')
    .text('🚫 الكلمات الممنوعة', 'badwordsmenu').row()
    .text('📋 سجل التحذيرات', 'warningslog')
    .text('🧹 تصفير التحذيرات', 'warningsclear').row()
    .text(back === 'managementmenu' ? '↩️ الإدارة' : back === 'ownerpanel' ? '↩️ لوحة المالك' : back === 'publiccommands' ? '↩️ مركز الأوامر' : back === 'groupoverview' ? '↩️ بطاقة المجموعة' : '↩️ إعدادات المجموعة', back);
}

export function groupSettingsKeyboard(g) {
  return new InlineKeyboard()
    .text('👋 الترحيب', 'welcomeedit')
    .text('🛡️ الحماية', 'protectionmenu').row()
    .text('💬 الردود التلقائية', 'repliesmenu').row()
    .text('📊 إحصائيات المجموعة', 'groupstats').row()
    .text('↩️ العودة للمجموعة', 'groupoverview');
}

export function repliesKeyboard(back = 'groupsettings') {
  return new InlineKeyboard()
    .text('➕ إضافة رد', 'replyadd')
    .text('📋 قائمة الردود', 'replylist').row()
    .text('🗑️ حذف رد', 'replydelete').row()
    .text(back === 'managementmenu' ? '↩️ الإدارة' : back === 'ownerpanel' ? '↩️ لوحة المالك' : back === 'publiccommands' ? '↩️ مركز الأوامر' : back === 'groupoverview' ? '↩️ بطاقة المجموعة' : '↩️ إعدادات المجموعة', back);
}
