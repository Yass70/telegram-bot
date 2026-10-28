import fs from 'node:fs';

// مصدر التخزين المركزي. يحافظ على اسم الملف وشكل البيانات الحاليين للتوافق.
const DATA_FILE = './bot_data.json';

export const freshGroup = () => ({
  id: '', title: '', activated: false, activatedBy: '', admins: [], activatedAt: null,
  links: false, flood: false, welcomeEnabled: true, autoReply: true,
  linksLock: false, mediaLock: false, badWordsLock: false, audioLock: false, audioClipsLock: false, forwardLock: false, contactsLock: false,
  closedMessages: false,
  welcomeText: '╭━━━〔 🐈‍⬛ نغنوغ يرحّب بيك 〕━━━╮\nأهلاً وسهلاً بـ {name} ❤️\nنورت مجموعة «{title}» بوجودك، وإن شاء الله تقضي ويانه أحلى الأوقات.\nاعتبر نفسك بين أهلك وناسك 🐾\n╰━━━━━━━━━━━━━━━━━━╯',
  badWords: [],
  stats: { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 },
  warningSettings: { enabled: false, limit: 3, action: 'mute', duration: 10 },
  warnings: {},
  userStats: {},
  knownMembers: {},
  recentMessages: [],
  warningLog: [],
  floodUsers: {},
  game: null
});

export const freshDB = () => ({
  groups: {},
  selected: {},
  protectionBack: {},
  menuBack: {},
  pending: {},
  users: [],
  privateUsers: [],
  requiredChats: [],
  points: {},
  groupPoints: {},
  activeGames: {},
  customizations: {},
  globalTextOverrides: { texts: [], buttons: [], buttonCallbacks: {} },
  globalCustomizationDefaults: {},
  touchSessions: {},
  userMeta: {},
  referrals: {},
  referralByUser: {},
  stats: { messages: 0, deletedLinks: 0, floodEvents: 0, welcomed: 0 }
});

export let db = freshDB();
export function save() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8'); }
  catch (e) { console.error('Could not save database:', e); }
}

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const old = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    db = { ...freshDB(), ...old };
    db.groups ||= {}; db.selected ||= {}; db.protectionBack ||= {}; db.menuBack ||= {}; db.pending ||= {}; db.users ||= []; db.privateUsers ||= []; db.requiredChats ||= [];
    db.stats = { ...freshDB().stats, ...(db.stats || {}) };
    db.points ||= {};
    db.groupPoints ||= {};
    db.activeGames ||= {};
    db.customizations ||= {};
    db.globalTextOverrides ||= { texts: [], buttons: [], buttonCallbacks: {} };
    db.globalTextOverrides.texts ||= [];
    db.globalTextOverrides.buttons ||= [];
    db.globalTextOverrides.buttonCallbacks ||= {};
    db.globalCustomizationDefaults ||= {};
    db.touchSessions ||= {};
    db.userMeta ||= {};
    db.referrals ||= {};
    db.referralByUser ||= {};
    for (const [id, oldGroup] of Object.entries(db.groups)) {
      const g = { ...freshGroup(), ...oldGroup };
      g.id ||= id; g.replies ||= []; g.admins ||= [];
      // الروابط لها حالة واحدة مشتركة مع الحقل القديم links للتوافق مع البيانات السابقة.
      g.linksLock = Boolean(oldGroup.linksLock === undefined ? g.links : oldGroup.linksLock);
      g.links = g.linksLock;
      // خيار الصوتيات في الواجهة موحّد؛ نحافظ على توافق الحقلين القديمين.
      const audioEnabled = Boolean(oldGroup.audioLock === undefined ? oldGroup.audioClipsLock : oldGroup.audioLock);
      g.audioLock = audioEnabled;
      g.audioClipsLock = audioEnabled;
      g.userStats ||= {};
      g.knownMembers ||= {};
      g.recentMessages ||= [];
      g.badWords ||= [];
      g.stats = { ...freshGroup().stats, ...(g.stats || {}) };
      g.floodUsers ||= {};
      g.warningSettings = { enabled: false, limit: 3, action: 'mute', duration: 10, ...(g.warningSettings || {}) };
      g.warnings ||= {};
      g.warningLog ||= [];
      db.groups[id] = g;
    }
  } catch (e) { console.error('Could not read database; starting with fresh data:', e); }
}
load();



