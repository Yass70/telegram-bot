const floodMap = new Map();
const URL_RE = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|@[A-Za-z][A-Za-z0-9_]{4,})/i;

export function isLink(text = '') { return URL_RE.test(text); }
export function isFlood(chatId, userId, now = Date.now()) {
  const key = `${chatId}:${userId}`;
  const recent = (floodMap.get(key) || []).filter(t => now - t < 5000);
  recent.push(now);
  floodMap.set(key, recent);
  return recent.length >= 5;
}
export function resetFlood(chatId, userId) { floodMap.delete(`${chatId}:${userId}`); }
export function escapeHtml(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
