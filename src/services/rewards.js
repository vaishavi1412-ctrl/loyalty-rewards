// Rewards catalogue and spending points on rewards.
const { AppError } = require('../errors');
const { getBalance } = require('./codes');

const MAX_VALUE = 1000000; // sanity limit so absurd numbers cannot break the totals

function positiveInt(value, label, min) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > MAX_VALUE) {
    throw new AppError('VALIDATION', `${label} must be a whole number from ${min} to ${MAX_VALUE}.`);
  }
  return n;
}

function createReward(db, { name, description, pointsCost, stock }) {
  name = String(name || '').trim();
  if (!name) throw new AppError('VALIDATION', 'Please enter a reward name.');
  const cost = positiveInt(pointsCost, 'Points cost', 1);
  const qty = positiveInt(stock, 'Stock', 0);
  const r = db
    .prepare('INSERT INTO rewards (name, description, points_cost, stock, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(name, String(description || '').trim(), cost, qty, new Date().toISOString());
  return Number(r.lastInsertRowid);
}

function updateReward(db, id, { name, description, pointsCost, stock, isActive }) {
  name = String(name || '').trim();
  if (!name) throw new AppError('VALIDATION', 'Please enter a reward name.');
  const cost = positiveInt(pointsCost, 'Points cost', 1);
  const qty = positiveInt(stock, 'Stock', 0);
  const r = db
    .prepare('UPDATE rewards SET name = ?, description = ?, points_cost = ?, stock = ?, is_active = ? WHERE id = ?')
    .run(name, String(description || '').trim(), cost, qty, isActive ? 1 : 0, id);
  if (r.changes !== 1) throw new AppError('NOT_FOUND', 'Reward not found.', 404);
}

function listRewards(db, { activeOnly = false } = {}) {
  const sql = activeOnly
    ? 'SELECT * FROM rewards WHERE is_active = 1 ORDER BY points_cost'
    : 'SELECT * FROM rewards ORDER BY id DESC';
  return db.prepare(sql).all();
}

// Spends the customer's points on a reward. One transaction: check, reduce stock, write ledger.
function redeemReward(db, userId, rewardId) {
  let failure = null;
  let result = null;
  db.exec('BEGIN IMMEDIATE');
  try {
    const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(rewardId);
    if (!reward || !reward.is_active) {
      failure = new AppError('NOT_FOUND', 'This reward is not available.', 404);
    } else if (reward.stock < 1) {
      failure = new AppError('OUT_OF_STOCK', 'Sorry, this reward is out of stock.', 409);
    } else if (getBalance(db, userId) < reward.points_cost) {
      failure = new AppError('NOT_ENOUGH_POINTS', 'You do not have enough points for this reward.', 400);
    } else {
      const upd = db
        .prepare('UPDATE rewards SET stock = stock - 1 WHERE id = ? AND stock > 0')
        .run(reward.id);
      if (upd.changes !== 1) {
        failure = new AppError('OUT_OF_STOCK', 'Sorry, this reward is out of stock.', 409);
      } else {
        db.prepare(
          `INSERT INTO transactions (user_id, type, points, description, reward_id, created_at)
           VALUES (?, 'spend', ?, ?, ?, ?)`
        ).run(userId, -reward.points_cost, `Redeemed reward: ${reward.name}`, reward.id, new Date().toISOString());
        result = { reward: reward.name, spent: reward.points_cost, balance: getBalance(db, userId) };
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  if (failure) throw failure;
  return result;
}

module.exports = { createReward, updateReward, listRewards, redeemReward };
