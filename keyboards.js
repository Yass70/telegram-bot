import { InlineKeyboard } from 'grammy';

export function mainKeyboard(ctx, bot, ui = {}) {
  const label = (key, fallback) => typeof ui?.labels?.[key] === 'string' && ui.labels[key].trim() ? ui.labels[key] : fallback;
  return new InlineKeyboard()
    .text(label('profile', '👤 ملفي الشخصي'), 'accountinfo')
    .text('💰 أرباحي', 'earningsmenu').row()
    .text(label('help', '📖 المساعدة'), 'help')
    .text('باقي الخدمات🧩', 'remainingservicesmenu');
}

export function remainingServicesKeyboard(bot) {
  return new InlineKeyboard()
    .text('👥 إدارة مجموعاتي', 'groupmanagementmenu').row()
    .text('🎧 فصل الصوت عن الموسيقى', 'touchesvocal').row()
    .text('✨ زخرفة الأسماء', 'touchesdecorate').row()
    .text('▦ إنشاء رمز QR', 'qrmenu').row()
    .text('📥 تحميل فيديوهات', 'touchesdownload').row()
    .text('⏰ ذكّرني', 'remindermenu').row()
    .text('🏠 القائمة الرئيسية', 'home');
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
    .text('💳 الاشتراكات', 'subscriptionsmenu').row()
    .text('📝 تحرير نصوص القوائم', 'globaltextmenu').row()
    .text('💰 إدارة الأرباح والمكافآت', 'earningsadmin').row()
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
