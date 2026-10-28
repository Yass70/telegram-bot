import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.resolve(process.env.DATA_DIR || '.', 'bot_data.json');
const DEFAULTS = {
  schemaVersion: 1,
  users: {},
  groups: {},
  globalTexts: {},
  songs: [],
  pending: {},
  createdAt: new Date().toISOString()
};
let data = structuredClone(DEFAULTS);
let writeQueue = Promise.resolve();

function normalize(raw) {
  const next = { ...structuredClone(DEFAULTS), ...(raw && typeof raw === 'object' ? raw : {}) };
  for (const key of ['users', 'groups', 'globalTexts', 'pending']) {
    if (!next[key] || typeof next[key] !== 'object' || Array.isArray(next[key])) next[key] = {};
  }
  if (!Array.isArray(next.songs)) next.songs = [];
  return next;
}

export async function loadStore() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    data = normalize(JSON.parse(raw));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[store] تعذر قراءة قاعدة البيانات:', error.message);
      throw error;
    }
    data = structuredClone(DEFAULTS);
    await saveStore();
  }
  console.log(`[store] تم تحميل البيانات من ${DATA_PATH}`);
  return data;
}

export function getStore() { return data; }
export function saveStore() {
  const snapshot = JSON.stringify(data, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    const temp = `${DATA_PATH}.tmp`;
    await fs.writeFile(temp, snapshot, 'utf8');
    await fs.rename(temp, DATA_PATH);
  });
  return writeQueue;
}

export function ensureUser(user) {
  if (!user?.id) return null;
  const id = String(user.id);
  if (!data.users[id]) data.users[id] = { id, firstName: user.first_name || 'مستخدم', username: user.username || '', joinedAt: new Date().toISOString(), points: 0, messages: 0, customTexts: {}, lastSeenAt: new Date().toISOString() };
  Object.assign(data.users[id], { firstName: user.first_name || data.users[id].firstName, username: user.username || data.users[id].username || '', lastSeenAt: new Date().toISOString() });
  return data.users[id];
}

export function ensureGroup(chat) {
  if (!chat?.id) return null;
  const id = String(chat.id);
  if (!data.groups[id]) data.groups[id] = { id, title: chat.title || 'مجموعة', type: chat.type, active: false, settings: { links: false, flood: false, welcome: true, autoReplies: true, warnings: true }, welcomeText: 'أهلاً بيك {name} ❤️ نورت مجموعة {title}', members: {}, warnings: {}, messageCount: 0, createdAt: new Date().toISOString() };
  Object.assign(data.groups[id], { title: chat.title || data.groups[id].title, type: chat.type || data.groups[id].type });
  return data.groups[id];
}
