// نظام أرباح الإحالات والمكافآت — منفصل عن نقاط الألعاب وعن رصيد ستار التاريخي.
export function ensureEarnings(db) {
  db.earnings ||= {};
  db.earnings.settings ||= { enabled: true, pointsPerReferral: 1 };
  db.earnings.wallets ||= {};
  db.earnings.linkUsers ||= {};
  db.earnings.referralRecords ||= {};
  db.earnings.rewards ||= {};
  db.earnings.categories ||= {};
  db.earnings.redemptionRequests ||= {};
  db.earnings.ledger ||= [];
  db.earnings.settings.enabled = db.earnings.settings.enabled !== false;
  const rate = Number(db.earnings.settings.pointsPerReferral);
  db.earnings.settings.pointsPerReferral = Number.isSafeInteger(rate) && rate > 0 ? rate : 1;
  // ترحيل آمن: الجوائز القديمة تبقى ظاهرة داخل قسم قديم تلقائياً.
  const rewards = Object.values(db.earnings.rewards);
  if (rewards.some(r => r && (!r.categoryId || !db.earnings.categories[String(r.categoryId)]))) {
    const legacyId = 'legacy-default';
    db.earnings.categories[legacyId] ||= { id: legacyId, name: 'المكافآت السابقة', emoji: '🎁', active: true, legacy: true, createdAt: Date.now() };
    for (const reward of rewards) if (reward && (!reward.categoryId || !db.earnings.categories[String(reward.categoryId)])) reward.categoryId = legacyId;
  }
  for (const category of Object.values(db.earnings.categories)) {
    if (!category || typeof category !== 'object') continue;
    category.id ||= Object.keys(db.earnings.categories).find(id => db.earnings.categories[id] === category) || `category-${Date.now()}`;
    category.name = String(category.name || 'قسم');
    category.emoji = String(category.emoji || '🎁');
    category.active = category.active !== false;
  }
  return db.earnings;
}


export function createEarningsCategory(db, name, emoji = '🎁') {
  const e = ensureEarnings(db), cleanName = String(name || '').trim(), cleanEmoji = String(emoji || '🎁').trim();
  if (!cleanName || cleanName.length > 45 || cleanEmoji.length > 8) return { ok: false, reason: 'invalid' };
  const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  e.categories[id] = { id, name: cleanName, emoji: cleanEmoji || '🎁', active: true, createdAt: Date.now(), updatedAt: Date.now() };
  return { ok: true, category: e.categories[id] };
}

export function deleteEarningsCategory(db, categoryId) {
  const e = ensureEarnings(db), id = String(categoryId), category = e.categories[id];
  if (!category) return { ok: false, reason: 'missing' };
  if (Object.values(e.rewards).some(r => String(r?.categoryId || '') === id)) return { ok: false, reason: 'has_rewards' };
  if (Object.values(e.redemptionRequests).some(r => String(r?.categoryId || e.rewards[String(r?.rewardId)]?.categoryId || '') === id)) return { ok: false, reason: 'has_requests' };
  delete e.categories[id];
  return { ok: true };
}

export function moveEarningsReward(db, rewardId, categoryId) {
  const e = ensureEarnings(db), reward = e.rewards[String(rewardId)], category = e.categories[String(categoryId)];
  if (!reward || !category || category.active === false) return { ok: false, reason: 'unavailable' };
  reward.categoryId = String(categoryId); reward.updatedAt = Date.now();
  return { ok: true, reward, category };
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


export function prepareRedemptionRequest(db, userId, rewardId) {
  const e = ensureEarnings(db), uid = String(userId), id = String(rewardId), reward = e.rewards[id];
  if (!reward || !reward.active || (reward.categoryId && e.categories[String(reward.categoryId)]?.active === false)) return { ok: false, reason: 'unavailable' };
  const price = Number(reward.price);
  if (!Number.isSafeInteger(price) || price < 1) return { ok: false, reason: 'unavailable' };
  const balance = earningsBalance(db, uid);
  if (balance < price) return { ok: false, reason: 'insufficient', balance, needed: price - balance, price };
  const existing = Object.entries(e.redemptionRequests).find(([, req]) => req && req.userId === uid && req.rewardId === id && req.status === 'pending');
  if (existing) return { ok: true, requestId: existing[0], request: existing[1], reused: true, balance, price };
  const requestId = `${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const request = e.redemptionRequests[requestId] = { userId: uid, rewardId: id, status: 'pending', createdAt: Date.now() };
  return { ok: true, requestId, request, reused: false, balance, price };
}

export function redeemReward(db, userId, requestId) {
  const e = ensureEarnings(db), uid = String(userId), req = e.redemptionRequests[String(requestId)];
  if (!req || req.userId !== uid || req.status !== 'pending') return { ok: false, reason: 'used' };
  const reward = e.rewards[String(req.rewardId)];
  if (!reward || !reward.active || (reward.categoryId && e.categories[String(reward.categoryId)]?.active === false)) return { ok: false, reason: 'unavailable' };
  const wallet = e.wallets[uid] || { balance: 0, spent: 0 };
  const price = Number(reward.price);
  if (!Number.isSafeInteger(price) || price < 1) return { ok: false, reason: 'unavailable' };
  if (reward.stock !== undefined && reward.stock !== null && Number.isFinite(Number(reward.stock)) && Number(reward.stock) <= 0) return { ok: false, reason: 'out_of_stock' };
  if ((Number(wallet.balance) || 0) < price) return { ok: false, reason: 'insufficient', needed: price - (Number(wallet.balance) || 0) };
  const deliveryType = ['manual', 'text', 'link', 'code', 'feature'].includes(reward.deliveryType) ? reward.deliveryType : 'manual';
  if (deliveryType !== 'manual' && !String(reward.deliveryPayload || reward.featureKey || '').trim()) return { ok: false, reason: 'no_delivery' };
  req.status = deliveryType === 'manual' ? 'awaiting_delivery' : 'delivering';
  req.operationId ||= `NG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  req.deliveryType = deliveryType; req.rewardName = String(reward.name || 'مكافأة'); req.price = price; req.categoryId = String(reward.categoryId || ''); req.categoryName = String(e.categories[String(reward.categoryId)]?.name || '');
  req.redeemedAt = Date.now(); req.deliveryPayload = String(reward.deliveryPayload || ''); req.featureKey = String(reward.featureKey || '');
  if (reward.stock !== undefined && reward.stock !== null && Number.isFinite(Number(reward.stock))) { reward.stock = Number(reward.stock) - 1; req.stockReserved = true; }
  wallet.balance -= price; wallet.spent = (Number(wallet.spent) || 0) + price; e.wallets[uid] = wallet;
  addEarningsLedger(db, uid, -price, 'redemption', { requestId: String(requestId), operationId: req.operationId, rewardId: String(reward.id), rewardName: req.rewardName, status: req.status });
  return { ok: true, reward, request: req, balance: wallet.balance };
}

export function setRedemptionStatus(db, requestId, status, actorId, reason = '') {
  const e = ensureEarnings(db), req = e.redemptionRequests[String(requestId)];
  if (!req) return { ok: false, reason: 'missing' };
  if (req.status === 'pending' || req.status === 'cancelled') return { ok: false, reason: 'not_redeemed' };
  if (!['delivered', 'failed', 'preparing'].includes(status)) return { ok: false, reason: 'invalid_status' };
  if (['delivered', 'failed'].includes(req.status)) return { ok: false, reason: 'closed' };
  if (status === 'failed' && !req.refundedAt) {
    if (req.stockReserved && !req.stockRestored) { const reward = e.rewards[String(req.rewardId)]; if (reward && reward.stock !== undefined && reward.stock !== null && Number.isFinite(Number(reward.stock))) reward.stock = Number(reward.stock) + 1; req.stockRestored = true; }
    const wallet = e.wallets[String(req.userId)] ||= { balance: 0, earned: 0, spent: 0, successfulReferrals: 0 };
    wallet.balance = (Number(wallet.balance) || 0) + Number(req.price || 0);
    wallet.spent = Math.max(0, (Number(wallet.spent) || 0) - Number(req.price || 0));
    req.refundedAt = Date.now();
    addEarningsLedger(db, req.userId, Number(req.price || 0), 'redemption_refund', { requestId: String(requestId), operationId: req.operationId, reason: String(reason || 'تعذر التسليم'), actorId: String(actorId) });
  }
  req.status = status; req.statusUpdatedAt = Date.now(); req.statusUpdatedBy = String(actorId);
  if (reason) req.statusReason = String(reason).slice(0, 300);
  if (status === 'delivered') req.deliveredAt = Date.now();
  return { ok: true, request: req, balance: earningsBalance(db, req.userId) };
}
