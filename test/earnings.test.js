import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureEarnings, earningsBalance, awardReferral, addManualEarnings, redeemReward, setRedemptionStatus, prepareRedemptionRequest } from '../earnings.js';

function makeDb() {
  return { referrals: { '10': { joinedCount: 4, rewardPoints: 17 } }, referralByUser: {}, earnings: { settings: { enabled: true, pointsPerReferral: 5 }, wallets: {}, referralRecords: {}, rewards: {}, redemptionRequests: {}, ledger: [] } };
}

test('referral awards configurable earnings points once and leaves legacy Star balance untouched', () => {
  const db = makeDb();
  const result = awardReferral(db, '10', '20');
  assert.deepEqual(result, { ok: true, points: 5 });
  assert.equal(earningsBalance(db, '10'), 5);
  assert.equal(db.referrals['10'].joinedCount, 5);
  assert.equal(db.referrals['10'].rewardPoints, 17);
  assert.equal(awardReferral(db, '10', '20').reason, 'duplicate');
  assert.equal(awardReferral(db, '20', '20').reason, 'invalid');
  assert.equal(earningsBalance(db, '10'), 5);
});

test('disabled referrals do not award points', () => {
  const db = makeDb(); ensureEarnings(db).settings.enabled = false;
  assert.equal(awardReferral(db, '10', '21').reason, 'disabled');
  assert.equal(earningsBalance(db, '10'), 0);
});

test('manual balance changes require valid amount and retain reason', () => {
  const db = makeDb();
  assert.equal(addManualEarnings(db, '30', 12, 'manual_add', 'مكافأة', '1').balance, 12);
  assert.equal(addManualEarnings(db, '30', 5, 'manual_deduct', 'تصحيح', '1').balance, 7);
  assert.equal(addManualEarnings(db, '30', 9, 'manual_deduct', 'خصم', '1').insufficient, true);
  assert.equal(db.earnings.ledger[1].details.reason, 'تصحيح');
});

test('reward redemption deducts exactly once and refuses insufficient balance', () => {
  const db = makeDb();
  addManualEarnings(db, '40', 20, 'manual_add', 'اختبار', '1');
  db.earnings.rewards.r1 = { id: 'r1', name: 'هدية', price: 15, active: true };
  db.earnings.redemptionRequests.req1 = { userId: '40', rewardId: 'r1', status: 'pending' };
  assert.equal(redeemReward(db, '40', 'req1').ok, true);
  assert.equal(earningsBalance(db, '40'), 5);
  assert.equal(db.earnings.redemptionRequests.req1.status, 'awaiting_delivery');
  assert.equal(redeemReward(db, '40', 'req1').reason, 'used');
  db.earnings.redemptionRequests.req2 = { userId: '40', rewardId: 'r1', status: 'pending' };
  assert.equal(redeemReward(db, '40', 'req2').reason, 'insufficient');
  assert.equal(earningsBalance(db, '40'), 5);
});


test('failed manual delivery refunds points once and records refund ledger', () => {
  const db = makeDb();
  addManualEarnings(db, '50', 30, 'manual_add', 'اختبار', '1');
  db.earnings.rewards.r2 = { id: 'r2', name: 'خدمة', price: 12, active: true, deliveryType: 'manual' };
  db.earnings.redemptionRequests.req3 = { userId: '50', rewardId: 'r2', status: 'pending' };
  const redeemed = redeemReward(db, '50', 'req3');
  assert.equal(redeemed.ok, true);
  assert.equal(earningsBalance(db, '50'), 18);
  assert.equal(setRedemptionStatus(db, 'req3', 'failed', '1', 'تعذر التسليم').ok, true);
  assert.equal(earningsBalance(db, '50'), 30);
  assert.equal(db.earnings.redemptionRequests.req3.status, 'failed');
  assert.equal(db.earnings.ledger.at(-1).type, 'redemption_refund');
  assert.equal(setRedemptionStatus(db, 'req3', 'failed', '1').reason, 'closed');
  assert.equal(earningsBalance(db, '50'), 30);
});

test('automatic reward requires a delivery payload before deducting', () => {
  const db = makeDb();
  addManualEarnings(db, '60', 20, 'manual_add', 'اختبار', '1');
  db.earnings.rewards.r3 = { id: 'r3', name: 'كود', price: 10, active: true, deliveryType: 'code' };
  db.earnings.redemptionRequests.req4 = { userId: '60', rewardId: 'r3', status: 'pending' };
  assert.equal(redeemReward(db, '60', 'req4').reason, 'no_delivery');
  assert.equal(earningsBalance(db, '60'), 20);
  db.earnings.rewards.r3.deliveryPayload = 'ABC-123';
  assert.equal(redeemReward(db, '60', 'req4').ok, true);
  assert.equal(db.earnings.redemptionRequests.req4.status, 'delivering');
  assert.equal(earningsBalance(db, '60'), 10);
});


test('out of stock reward is rejected without deducting points', () => {
  const db = makeDb();
  addManualEarnings(db, '70', 20, 'manual_add', 'اختبار', '1');
  db.earnings.rewards.r4 = { id: 'r4', name: 'هدية نفدت', price: 10, active: true, stock: 0 };
  db.earnings.redemptionRequests.req5 = { userId: '70', rewardId: 'r4', status: 'pending' };
  assert.equal(redeemReward(db, '70', 'req5').reason, 'out_of_stock');
  assert.equal(earningsBalance(db, '70'), 20);
});

test('legacy rewards migrate into a visible legacy category without changing wallets or requests', () => {
  const db = { earnings: { wallets: { '8': { balance: 77, earned: 77, spent: 0 } }, rewards: { old: { id: 'old', name: 'قديم', price: 10, active: true } }, redemptionRequests: { oldReq: { userId: '8', rewardId: 'old', status: 'delivered' } }, ledger: [{ id: 'keep', amount: 77 }] } };
  ensureEarnings(db);
  assert.equal(db.earnings.rewards.old.categoryId, 'legacy-default');
  assert.equal(db.earnings.categories['legacy-default'].name, 'المكافآت السابقة');
  assert.equal(earningsBalance(db, '8'), 77);
  assert.equal(db.earnings.redemptionRequests.oldReq.status, 'delivered');
  assert.equal(db.earnings.ledger[0].id, 'keep');
});

test('categories can be created, toggled externally, and cannot be deleted while rewards remain', async () => {
  const { createEarningsCategory, deleteEarningsCategory, moveEarningsReward } = await import('../earnings.js');
  const db = makeDb();
  const a = createEarningsCategory(db, 'المتابعون', '👥');
  const b = createEarningsCategory(db, 'الرصيد', '💳');
  assert.equal(a.ok, true); assert.equal(b.ok, true);
  db.earnings.rewards.r1 = { id: 'r1', name: '100 متابع', price: 10, active: true, categoryId: a.category.id };
  assert.equal(deleteEarningsCategory(db, a.category.id).reason, 'has_rewards');
  assert.equal(moveEarningsReward(db, 'r1', b.category.id).ok, true);
  assert.equal(db.earnings.rewards.r1.categoryId, b.category.id);
  assert.equal(deleteEarningsCategory(db, a.category.id).ok, true);
});

test('redemption retains category snapshot and failed delivery still refunds exactly once', () => {
  const db = makeDb();
  ensureEarnings(db).categories.c1 = { id: 'c1', name: 'المتابعون', emoji: '👥', active: true };
  addManualEarnings(db, '90', 30, 'manual_add', 'اختبار', '1');
  db.earnings.rewards.r5 = { id: 'r5', name: '100 متابع', price: 10, active: true, categoryId: 'c1' };
  db.earnings.redemptionRequests.rq5 = { userId: '90', rewardId: 'r5', status: 'pending' };
  const result = redeemReward(db, '90', 'rq5');
  assert.equal(result.ok, true);
  assert.equal(result.request.categoryId, 'c1');
  assert.equal(result.request.categoryName, 'المتابعون');
  assert.equal(setRedemptionStatus(db, 'rq5', 'failed', '1').ok, true);
  assert.equal(earningsBalance(db, '90'), 30);
});

test('disabled category blocks redemption and cancelled unconfirmed requests cannot be refunded', () => {
  const db = makeDb();
  ensureEarnings(db).categories.c2 = { id: 'c2', name: 'الرصيد', active: false };
  addManualEarnings(db, '91', 40, 'manual_add', 'اختبار', '1');
  db.earnings.rewards.r6 = { id: 'r6', name: 'رصيد', price: 10, active: true, categoryId: 'c2' };
  db.earnings.redemptionRequests.rq6 = { userId: '91', rewardId: 'r6', status: 'pending' };
  assert.equal(redeemReward(db, '91', 'rq6').reason, 'unavailable');
  db.earnings.redemptionRequests.rq6.status = 'cancelled';
  assert.equal(setRedemptionStatus(db, 'rq6', 'failed', '1').reason, 'not_redeemed');
  assert.equal(earningsBalance(db, '91'), 40);
});


test('repeated reward taps reuse one pending request instead of creating duplicates', () => {
  const db = makeDb();
  addManualEarnings(db, '92', 50, 'manual_add', 'اختبار', '1');
  db.earnings.rewards.r7 = { id: 'r7', name: 'هدية', price: 20, active: true };
  const first = prepareRedemptionRequest(db, '92', 'r7');
  const second = prepareRedemptionRequest(db, '92', 'r7');
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.reused, true);
  assert.equal(second.requestId, first.requestId);
  assert.equal(Object.values(db.earnings.redemptionRequests).filter(r => r.rewardId === 'r7').length, 1);
  assert.equal(earningsBalance(db, '92'), 50);
});
