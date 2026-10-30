// نظام أرباح الإحالات والمكافآت — منفصل عن نقاط الألعاب وعن رصيد ستار التاريخي.
export function ensureEarnings(db) {
  db.earnings ||= {};
  db.earnings.settings ||= { enabled: true, pointsPerReferral: 1 };
  db.earnings.wallets ||= {};
  db.earnings.linkUsers ||= {};
  db.earnings.referralRecords ||= {};
  db.earnings.rewards ||= {};
  db.earnings.redemptionRequests ||= {};
  db.earnings.ledger ||= [];
  db.earnings.settings.enabled = db.earnings.settings.enabled !== false;
  const rate = Number(db.earnings.settings.pointsPerReferral);
  db.earnings.settings.pointsPerReferral = Number.isSafeInteger(rate) && rate > 0 ? rate : 1;
  return db.earnings;
}

export function earningsBalance(db, userId) {
  const e = ensureEarnings(db);
  return Math.max(0, Number(e.wallets[String(userId)]?.balance) || 0);
}

export function addEarningsLedger(db, userId, amount, type, details = {}) {
  const e = ensureEarnings(db);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  e.ledger.push({ id, userId: String(userId), amount: Number(amount), type, details, createdAt: Date.now() });
  return id;
}

export function awardReferral(db, referrerId, invitedId) {
  const e = ensureEarnings(db);
  const referrer = String(referrerId), invited = String(invitedId);
  if (!/^\d+$/.test(referrer) || !/^\d+$/.test(invited) || referrer === invited) return { ok: false, reason: 'invalid' };
  if (e.settings.enabled === false) return { ok: false, reason: 'disabled' };
  if (e.referralRecords[invited] || db.referralByUser?.[invited]) return { ok: false, reason: 'duplicate' };
  const points = Number(e.settings.pointsPerReferral);
  if (!Number.isSafeInteger(points) || points < 1) return { ok: false, reason: 'invalid_rate' };
  e.wallets[referrer] ||= { balance: 0, earned: 0, spent: 0, successfulReferrals: 0 };
  const wallet = e.wallets[referrer];
  wallet.balance = Math.max(0, Number(wallet.balance) || 0) + points;
  wallet.earned = Math.max(0, Number(wallet.earned) || 0) + points;
  wallet.successfulReferrals = Math.max(0, Number(wallet.successfulReferrals) || 0) + 1;
  e.referralRecords[invited] = { referrerId: referrer, invitedId: invited, points, createdAt: Date.now() };
  db.referralByUser ||= {};
  db.referralByUser[invited] = referrer;
  db.referrals ||= {};
  db.referrals[referrer] ||= { joinedCount: 0, rewardPoints: 0 };
  db.referrals[referrer].joinedCount = Math.max(0, Number(db.referrals[referrer].joinedCount) || 0) + 1;
  // rewardPoints remains the historical Star balance and is intentionally untouched.
  addEarningsLedger(db, referrer, points, 'referral', { invitedId: invited, note: 'دعوة مستخدم جديد' });
  return { ok: true, points };
}

export function addManualEarnings(db, userId, amount, type, reason, adminId) {
  const e = ensureEarnings(db), id = String(userId), value = Number(amount);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(value) || value <= 0) return { ok: false };
  e.wallets[id] ||= { balance: 0, earned: 0, spent: 0, successfulReferrals: 0 };
  const w = e.wallets[id];
  if (type === 'manual_add') { w.balance = (Number(w.balance) || 0) + value; w.earned = (Number(w.earned) || 0) + value; }
  else { if ((Number(w.balance) || 0) < value) return { ok: false, insufficient: true, balance: Number(w.balance) || 0 }; w.balance -= value; w.spent = (Number(w.spent) || 0) + value; }
  addEarningsLedger(db, id, type === 'manual_add' ? value : -value, type, { reason: String(reason || '').slice(0, 300), adminId: String(adminId) });
  return { ok: true, balance: w.balance };
}

export function redeemReward(db, userId, requestId) {
  const e = ensureEarnings(db), uid = String(userId), req = e.redemptionRequests[String(requestId)];
  if (!req || req.userId !== uid || req.status !== 'pending') return { ok: false, reason: 'used' };
  const reward = e.rewards[String(req.rewardId)];
  if (!reward || !reward.active) return { ok: false, reason: 'unavailable' };
  const wallet = e.wallets[uid] || { balance: 0, spent: 0 };
  const price = Number(reward.price);
  if (!Number.isSafeInteger(price) || price < 1) return { ok: false, reason: 'unavailable' };
  if ((Number(wallet.balance) || 0) < price) return { ok: false, reason: 'insufficient', needed: price - (Number(wallet.balance) || 0) };
  // Mark request before returning; Node's single-threaded callback execution plus synchronous state mutation prevents repeated callbacks.
  req.status = 'completed'; req.completedAt = Date.now();
  wallet.balance -= price; wallet.spent = (Number(wallet.spent) || 0) + price; e.wallets[uid] = wallet;
  addEarningsLedger(db, uid, -price, 'redemption', { rewardId: String(reward.id), rewardName: reward.name });
  return { ok: true, reward, balance: wallet.balance };
}
