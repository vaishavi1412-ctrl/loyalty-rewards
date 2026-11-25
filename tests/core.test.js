// Automated tests for the core logic: codes, fraud prevention, points and rewards.
// Run with:  npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb } = require('../src/db');
const users = require('../src/services/users');
const codes = require('../src/services/codes');
const rewards = require('../src/services/rewards');

// Each test gets a fresh in-memory database, so tests never affect each other.
function setup() {
  const db = openDb(':memory:');
  const alice = users.registerCustomer(db, { name: 'Alice', email: 'alice@example.com', password: 'password123' });
  const bob = users.registerCustomer(db, { name: 'Bob', email: 'bob@example.com', password: 'password123' });
  return { db, alice, bob };
}
const expectCode = (fn, code) =>
  assert.throws(fn, (err) => err.code === code, `expected error code ${code}`);

// ---------- Users ----------
test('registration stores a hashed password, not plain text', () => {
  const { db } = setup();
  const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('alice@example.com');
  assert.notEqual(row.password_hash, 'password123');
  assert.ok(row.password_hash.includes(':'));
});

test('registration rejects duplicate email, bad email and short password', () => {
  const { db } = setup();
  expectCode(() => users.registerCustomer(db, { name: 'X', email: 'ALICE@example.com', password: 'password123' }), 'EMAIL_TAKEN');
  expectCode(() => users.registerCustomer(db, { name: 'X', email: 'nope', password: 'password123' }), 'VALIDATION');
  expectCode(() => users.registerCustomer(db, { name: 'X', email: 'x@example.com', password: 'short' }), 'VALIDATION');
});

test('login works with the right password and fails with the wrong one', () => {
  const { db } = setup();
  const u = users.login(db, { email: 'Alice@Example.com', password: 'password123', role: 'customer' });
  assert.equal(u.name, 'Alice');
  expectCode(() => users.login(db, { email: 'alice@example.com', password: 'wrongpass', role: 'customer' }), 'BAD_LOGIN');
  expectCode(() => users.login(db, { email: 'nobody@example.com', password: 'password123', role: 'customer' }), 'BAD_LOGIN');
});

test('a customer cannot log in as admin, and the admin is created from env values', () => {
  const { db } = setup();
  expectCode(() => users.login(db, { email: 'alice@example.com', password: 'password123', role: 'admin' }), 'BAD_LOGIN');
  users.ensureAdmin(db, 'boss@example.com', 'adminpass123');
  users.ensureAdmin(db, 'boss@example.com', 'adminpass123'); // calling twice must not duplicate
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n, 1);
  assert.equal(users.login(db, { email: 'boss@example.com', password: 'adminpass123', role: 'admin' }).role, 'admin');
});

// ---------- Code generation ----------
test('a batch generates the requested number of unique, well-formed codes', () => {
  const { db } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'Test', quantity: 500, pointsValue: 100 });
  assert.equal(list.length, 500);
  assert.equal(new Set(list).size, 500);
  for (const c of list) assert.match(c, /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM codes').get().n, 500);
});

test('batch validation rejects bad input', () => {
  const { db } = setup();
  expectCode(() => codes.generateBatch(db, { label: '', quantity: 5, pointsValue: 100 }), 'VALIDATION');
  expectCode(() => codes.generateBatch(db, { label: 'A', quantity: 0, pointsValue: 100 }), 'VALIDATION');
  expectCode(() => codes.generateBatch(db, { label: 'A', quantity: 5000, pointsValue: 100 }), 'VALIDATION');
  expectCode(() => codes.generateBatch(db, { label: 'A', quantity: 5, pointsValue: 0 }), 'VALIDATION');
});

test('the database itself refuses two identical codes', () => {
  const { db } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 100 });
  const plain = codes.normalizeCode(list[0]);
  assert.throws(() =>
    db.prepare("INSERT INTO codes (code, batch_id, points_value, created_at) VALUES (?, 1, 100, 'x')").run(plain)
  );
});

// ---------- Redeeming codes (fraud prevention) ----------
test('a valid code awards points and shows in the history', () => {
  const { db, alice } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 150 });
  const r = codes.redeemCode(db, alice.id, list[0]);
  assert.equal(r.points, 150);
  assert.equal(r.balance, 150);
  const tx = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(alice.id);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].type, 'earn');
});

test('lowercase and no-dash input is accepted', () => {
  const { db, alice } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 100 });
  const typed = list[0].toLowerCase().replace(/-/g, ' ');
  assert.equal(codes.redeemCode(db, alice.id, typed).points, 100);
});

test('the same customer cannot reuse a code', () => {
  const { db, alice } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 100 });
  codes.redeemCode(db, alice.id, list[0]);
  expectCode(() => codes.redeemCode(db, alice.id, list[0]), 'ALREADY_USED');
  assert.equal(codes.getBalance(db, alice.id), 100);
});

test('a different customer cannot use a code that is already used', () => {
  const { db, alice, bob } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 100 });
  codes.redeemCode(db, alice.id, list[0]);
  expectCode(() => codes.redeemCode(db, bob.id, list[0]), 'ALREADY_USED');
  assert.equal(codes.getBalance(db, bob.id), 0);
});

test('invalid codes give an error and award nothing', () => {
  const { db, alice } = setup();
  expectCode(() => codes.redeemCode(db, alice.id, 'AAAA-BBBB-CCCC'), 'INVALID_CODE'); // well-formed but not real
  expectCode(() => codes.redeemCode(db, alice.id, 'hello'), 'INVALID_CODE');
  expectCode(() => codes.redeemCode(db, alice.id, ''), 'INVALID_CODE');
  assert.equal(codes.getBalance(db, alice.id), 0);
});

test('a disabled code cannot be redeemed', () => {
  const { db, alice } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 100 });
  db.prepare("UPDATE codes SET status = 'disabled' WHERE code = ?").run(codes.normalizeCode(list[0]));
  expectCode(() => codes.redeemCode(db, alice.id, list[0]), 'CODE_DISABLED');
});

test('the database blocks a second flip of a used code (the WHERE status guard)', () => {
  const { db, alice, bob } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 100 });
  codes.redeemCode(db, alice.id, list[0]);
  const again = db
    .prepare("UPDATE codes SET status = 'used', redeemed_by = ? WHERE code = ? AND status = 'unused'")
    .run(bob.id, codes.normalizeCode(list[0]));
  assert.equal(Number(again.changes), 0);
  // And the ledger index refuses a second 'earn' row for the same code.
  const codeId = db.prepare('SELECT id FROM codes').get().id;
  assert.throws(() =>
    db.prepare("INSERT INTO transactions (user_id, type, points, description, code_id, created_at) VALUES (?, 'earn', 100, 'x', ?, 'x')").run(bob.id, codeId)
  );
});

test('5 wrong attempts lock the customer out, even for a real code', () => {
  const { db, alice, bob } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 100 });
  for (let i = 0; i < codes.MAX_FAILED_ATTEMPTS; i++) {
    expectCode(() => codes.redeemCode(db, alice.id, 'WRONG-CODE-0000'), 'INVALID_CODE');
  }
  expectCode(() => codes.redeemCode(db, alice.id, list[0]), 'LOCKED');
  // The lock belongs to Alice only; Bob is not affected.
  assert.equal(codes.redeemCode(db, bob.id, list[0]).points, 100);
});

test('every attempt, good or bad, is logged', () => {
  const { db, alice } = setup();
  const { codes: list } = codes.generateBatch(db, { label: 'T', quantity: 1, pointsValue: 100 });
  expectCode(() => codes.redeemCode(db, alice.id, 'AAAA-BBBB-CCCC'), 'INVALID_CODE');
  codes.redeemCode(db, alice.id, list[0]);
  const rows = db.prepare('SELECT success, reason FROM code_attempts ORDER BY id').all();
  assert.deepEqual(rows.map((r) => r.reason), ['invalid', 'ok']);
});

// ---------- Rewards ----------
function richCustomer() {
  const ctx = setup();
  const { codes: list } = codes.generateBatch(ctx.db, { label: 'T', quantity: 3, pointsValue: 100 });
  list.forEach((c) => codes.redeemCode(ctx.db, ctx.alice.id, c)); // 300 points
  return ctx;
}

test('redeeming a reward reduces points and stock and is recorded', () => {
  const { db, alice } = richCustomer();
  const id = rewards.createReward(db, { name: 'Mug', description: 'A mug', pointsCost: 200, stock: 5 });
  const r = rewards.redeemReward(db, alice.id, id);
  assert.equal(r.balance, 100);
  assert.equal(db.prepare('SELECT stock FROM rewards WHERE id = ?').get(id).stock, 4);
  const last = db.prepare('SELECT * FROM transactions ORDER BY id DESC LIMIT 1').get();
  assert.equal(last.type, 'spend');
  assert.equal(last.points, -200);
});

test('rewards cannot be redeemed without enough points, stock, or when inactive', () => {
  const { db, alice, bob } = richCustomer();
  const big = rewards.createReward(db, { name: 'Bike', pointsCost: 1000, stock: 1 });
  expectCode(() => rewards.redeemReward(db, alice.id, big), 'NOT_ENOUGH_POINTS');
  const empty = rewards.createReward(db, { name: 'Gone', pointsCost: 10, stock: 0 });
  expectCode(() => rewards.redeemReward(db, alice.id, empty), 'OUT_OF_STOCK');
  const off = rewards.createReward(db, { name: 'Off', pointsCost: 10, stock: 5 });
  rewards.updateReward(db, off, { name: 'Off', pointsCost: 10, stock: 5, isActive: false });
  expectCode(() => rewards.redeemReward(db, alice.id, off), 'NOT_FOUND');
  expectCode(() => rewards.redeemReward(db, bob.id, big), 'NOT_ENOUGH_POINTS'); // bob has 0
  assert.equal(codes.getBalance(db, alice.id), 300); // nothing was spent
});

test('reward validation and active-only listing', () => {
  const { db } = setup();
  expectCode(() => rewards.createReward(db, { name: '', pointsCost: 10, stock: 1 }), 'VALIDATION');
  expectCode(() => rewards.createReward(db, { name: 'A', pointsCost: -5, stock: 1 }), 'VALIDATION');
  expectCode(() => rewards.createReward(db, { name: 'A', pointsCost: 5, stock: -1 }), 'VALIDATION');
  rewards.createReward(db, { name: 'Visible', pointsCost: 10, stock: 1 });
  const hidden = rewards.createReward(db, { name: 'Hidden', pointsCost: 10, stock: 1 });
  rewards.updateReward(db, hidden, { name: 'Hidden', pointsCost: 10, stock: 1, isActive: false });
  assert.deepEqual(rewards.listRewards(db, { activeOnly: true }).map((r) => r.name), ['Visible']);
  assert.equal(rewards.listRewards(db).length, 2);
});

// ---------- Regression tests for problems found in the AI's own code review ----------
test('login for an unknown email is not instantly fast (no timing leak of registered emails)', () => {
  const { db } = setup();
  const t0 = process.hrtime.bigint();
  assert.throws(() => users.login(db, { email: 'nobody@example.com', password: 'whatever123', role: 'customer' }));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms > 5, `unknown-email login took only ${ms}ms; it should still run the slow password check`);
});

test('absurdly large point values are rejected', () => {
  const { db } = setup();
  expectCode(() => codes.generateBatch(db, { label: 'x', quantity: 1, pointsValue: 1e300 }), 'VALIDATION');
  expectCode(() => codes.generateBatch(db, { label: 'x', quantity: 1, pointsValue: codes.MAX_POINTS + 1 }), 'VALIDATION');
  expectCode(() => rewards.createReward(db, { name: 'x', pointsCost: 1e300, stock: 1 }), 'VALIDATION');
  expectCode(() => rewards.createReward(db, { name: 'x', pointsCost: 10, stock: 1e300 }), 'VALIDATION');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM codes').get().n, 0);
});
