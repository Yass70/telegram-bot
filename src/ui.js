import { InlineKeyboard } from 'grammy';
import { getStore } from './store.js';

export const DEFAULT_TEXTS = {
  welcome: 'شُبيك لُبيك، نغنوغ بين إيديك 🐈‍⬛🐾',
  subtitle: 'إدارة مجموعتك، حماية وترفيه وإضافات بمكان واحد ✨',
  ownerPanel: '👑 لوحة المالك',
  userPanel: '⚙️ لوحة المستخدم',
  groups: '👥 مجموعاتي',
  stats: '📊 الإحصائيات',
  help: '📖 المساعدة',
  customize: '🎨 تخصيص النصوص',
  protection: '🛡️ إدارة المجموعة والحماية',
  games: '🎮 الألعاب والنقاط',
  decorate: '✨ زخرفة الأسماء',
  music: '🎵 الأغاني',
  warnings: '⚠️ التحذيرات والعقوبات',
  broadcast: '📣 إذاعة رسالة',
  globalTexts: '📝 تخصيص نصوص البوت للجميع',
  forceJoin: '🔐 الاشتراك الإجباري',
  userCount: '👤 عدد المستخدمين',
  back: '⬅️ رجوع',
  cancel: '❌ إلغاء'
};

export function textFor(key, userId = null) {
  const store = getStore();
  if (userId && store.users[String(userId)]?.customTexts?.[key]) return store.users[String(userId)].customTexts[key];
  return store.globalTexts[key] || DEFAULT_TEXTS[key] || key;
}

export function mainKeyboard(userId, isOwner) {
  const k = new InlineKeyboard()
    .text(textFor('protection', userId), 'menu:protection').row()
    .text(textFor('games', userId), 'menu:games').text(textFor('decorate', userId), 'menu:decorate').row()
    .text(textFor('music', userId), 'menu:music').text(textFor('warnings', userId), 'menu:warnings').row()
    .text(textFor('groups', userId), 'menu:groups').text(textFor('stats', userId), 'menu:stats').row()
    .text(textFor('customize', userId), 'menu:customize').text(textFor('help', userId), 'menu:help');
  if (isOwner) k.row().text(textFor('ownerPanel', userId), 'owner:home');
  return k;
}

export function ownerKeyboard() {
  return new InlineKeyboard()
    .text('📊 إحصائيات البوت', 'owner:stats').text('👤 عدد المستخدمين', 'owner:users').row()
    .text('📣 إذاعة رسالة', 'owner:broadcast').text('📝 تخصيص نصوص البوت للجميع', 'owner:texts').row()
    .text('🔐 الاشتراك الإجباري', 'owner:force').row()
    .text('👥 مجموعاتي', 'menu:groups').text('⚙️ القائمة الرئيسية', 'menu:home');
}

export function backKeyboard(target = 'menu:home') { return new InlineKeyboard().text(textFor('back'), target); }

export function groupSettingsKeyboard(group) {
  const s = group.settings;
  return new InlineKeyboard()
    .text(`${s.links ? '🟢' : '⚪️'} منع الروابط`, `toggle:${group.id}:links`).text(`${s.flood ? '🟢' : '⚪️'} مكافحة السبام`, `toggle:${group.id}:flood`).row()
    .text(`${s.welcome ? '🟢' : '⚪️'} الترحيب`, `toggle:${group.id}:welcome`).text(`${s.autoReplies ? '🟢' : '⚪️'} الردود`, `toggle:${group.id}:autoReplies`).row()
    .text(`${s.warnings ? '🟢' : '⚪️'} نظام التحذيرات`, `toggle:${group.id}:warnings`).row()
    .text('✏️ تعديل الترحيب', `welcomeedit:${group.id}`).row()
    .text('⬅️ رجوع', 'menu:groups');
}
