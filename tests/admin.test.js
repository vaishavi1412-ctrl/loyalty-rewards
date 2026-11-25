// Tests for the admin dashboard queries and the customer dashboard.
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb } = require('../src/db');
const users = require('../src/services/users');
const codes = require('../src/services/codes');
const rewards = require('../src/services/rewards');
const admin = require('../src/services/admin');
const { getDashboard } = require('../src/services/customer');

function setup() {
  const db = openDb(':memory:');
  const alice = users.registerCustomer(db, { name: 'Alice', email: 'alice@example.com', password: 'password123' });
  const bob = users.registerCustomer(db, { name: 'Bob', email: 'bob@example.com', password: 'password123' });
  return { db, alice, bob };
}
const expectCode = (fn, code) => assert.throws(fn, (e) => e.code === code, `expected ${code}`);

test('dashboard stats match what really happened', () => {
  const { db, alice, bob } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'B1', quantity: 4, pointsValue: 100 });
  codes.redeemCode(db, alice.id, list[0]);
  codes.redeemCode(db, alice.id, list[1]);
  assert.throws(() => codes.redeemCode(db, bob.id, list[0])); // reuse -> failed attempt
  const rid = rewards.createReward(db, { name: 'Mug', pointsCost: 150, stock: 2 });
  rewards.redeemReward(db, alice.id, rid);

  const s = admin.getStats(db);
  assert.equal(s.totalCustomers, 2);
  assert.equal(s.totalCodes, 4);
  assert.equal(s.redeemedCodes, 2);
  assert.equal(s.unusedCodes, 2);
  assert.equal(s.submittedCodes, 3); // 2 good + 1 reuse attempt
  assert.equal(s.failedAttempts, 1);
  assert.equal(s.pointsAwarded, 200);
  assert.equal(s.pointsSpent, 150);
  assert.equal(s.rewardsRedeemed, 1);
});

test('customer dashboard shows balance, totals and history (newest first)', () => {
  const { db, alice } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'B', quantity: 2, pointsValue: 100 });
  list.forEach((c) => codes.redeemCode(db, alice.id, c));
  const rid = rewards.createReward(db, { name: 'Pen', pointsCost: 50, stock: 1 });
  rewards.redeemReward(db, alice.id, rid);
  const d = getDashboard(db, alice.id);
  assert.equal(d.balance, 150);
  assert.equal(d.totalEarned, 200);
  assert.equal(d.totalSpent, 50);
  assert.equal(d.transactions.length, 3);
  assert.equal(d.transactions[0].type, 'spend');
});

test('a customer only sees their own transactions', () => {
  const { db, alice, bob } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'B', quantity: 1, pointsValue: 100 });
  codes.redeemCode(db, alice.id, list[0]);
  assert.equal(getDashboard(db, bob.id).transactions.length, 0);
  assert.equal(getDashboard(db, bob.id).balance, 0);
});

test('admin can search customers and disable them', () => {
  const { db, alice } = setup();
  assert.equal(admin.listCustomers(db, { q: 'ali' }).length, 1);
  assert.equal(admin.listCustomers(db, {}).length, 2);
  admin.setCustomerActive(db, alice.id, false);
  expectCode(() => users.login(db, { email: 'alice@example.com', password: 'password123', role: 'customer' }), 'DISABLED');
  admin.setCustomerActive(db, alice.id, true);
  assert.equal(users.login(db, { email: 'alice@example.com', password: 'password123', role: 'customer' }).name, 'Alice');
  expectCode(() => admin.setCustomerActive(db, 9999, false), 'NOT_FOUND');
});

test('code list filters by status, searches, and shows who redeemed', () => {
  const { db, alice } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'B', quantity: 3, pointsValue: 100 });
  codes.redeemCode(db, alice.id, list[0]);
  assert.equal(admin.listCodes(db, {}).total, 3);
  const used = admin.listCodes(db, { status: 'used' });
  assert.equal(used.total, 1);
  assert.equal(used.rows[0].redeemed_by_name, 'Alice');
  assert.equal(used.rows[0].code, list[0]); // shown in printed XXXX-XXXX-XXXX form
  assert.equal(admin.listCodes(db, { q: list[1].toLowerCase() }).total, 1);
});

test('admin can disable and re-enable unused codes, but never change a used code', () => {
  const { db, alice } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'B', quantity: 2, pointsValue: 100 });
  const [c1, c2] = db.prepare('SELECT id FROM codes ORDER BY id').all();
  admin.setCodeStatus(db, c1.id, 'disabled');
  expectCode(() => codes.redeemCode(db, alice.id, list[0]), 'CODE_DISABLED');
  admin.setCodeStatus(db, c1.id, 'unused');
  assert.equal(codes.redeemCode(db, alice.id, list[0]).points, 100);
  expectCode(() => admin.setCodeStatus(db, c1.id, 'disabled'), 'CONFLICT'); // already used
  expectCode(() => admin.setCodeStatus(db, c2.id, 'unused'), 'CONFLICT'); // not disabled
  expectCode(() => admin.setCodeStatus(db, c2.id, 'banana'), 'VALIDATION');
});

test('batch list, CSV export, attempts and transactions monitoring', () => {
  const { db, alice } = setup();
  const { batchId, codes: list } = codes.generateBatch(db, { label: 'March', quantity: 2, pointsValue: 80 });
  codes.redeemCode(db, alice.id, list[0]);
  assert.throws(() => codes.redeemCode(db, alice.id, 'AAAA-BBBB-CCCC'));

  const b = admin.listBatches(db);
  assert.equal(b[0].label, 'March');
  assert.equal(b[0].used, 1);

  const { csv, filename } = admin.batchCsv(db, batchId);
  assert.equal(filename, `batch-${batchId}.csv`);
  assert.equal(csv.trim().split('\n').length, 3); // header + 2 codes
  assert.ok(csv.includes(list[1]));
  expectCode(() => admin.batchCsv(db, 9999), 'NOT_FOUND');

  assert.equal(admin.listAttempts(db, {}).total, 2);
  assert.equal(admin.listAttempts(db, { reason: 'invalid' }).total, 1);
  assert.equal(admin.listAllTransactions(db, {}).total, 1);
  assert.equal(admin.listAllTransactions(db, { type: 'spend' }).total, 0);
});
