// The core fraud-prevention logic: generating codes and redeeming them safely.
const crypto = require('node:crypto');
const { AppError } = require('../errors');

// No 0/O/1/I/L so codes are easy to read and type from a printed box.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const MAX_BATCH_SIZE = 1000;
const MAX_POINTS = 1000000; // sanity limit so absurd numbers cannot break the totals

function randomCode() {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s;
}

// What the customer types may include spaces, dashes or lowercase. Clean it up.
function normalizeCode(input) {
  return String(input || '').toUpperCase().replace(/[\s-]/g, '');
}

// Printed form: XXXX-XXXX-XXXX
function formatCode(code) {
  return code.match(/.{1,4}/g).join('-');
}

function generateBatch(db, { label, quantity, pointsValue }) {
  label = String(label || '').trim();
  quantity = Number(quantity);
  pointsValue = Number(pointsValue);
  if (!label) throw new AppError('VALIDATION', 'Please give the batch a label.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BATCH_SIZE) {
    throw new AppError('VALIDATION', `Quantity must be a whole number from 1 to ${MAX_BATCH_SIZE}.`);
  }
  if (!Number.isInteger(pointsValue) || pointsValue < 1 || pointsValue > MAX_POINTS) {
    throw new AppError('VALIDATION', `Points per code must be a whole number from 1 to ${MAX_POINTS}.`);
  }

  const now = new Date().toISOString();
  const insertCode = db.prepare(
    'INSERT OR IGNORE INTO codes (code, batch_id, points_value, created_at) VALUES (?, ?, ?, ?)'
  );
  db.exec('BEGIN IMMEDIATE');
  try {
    const batch = db
      .prepare('INSERT INTO batches (label, points_value, quantity, created_at) VALUES (?, ?, ?, ?)')
      .run(label, pointsValue, quantity, now);
    const batchId = Number(batch.lastInsertRowid);
    const codes = [];
    while (codes.length < quantity) {
      const code = randomCode();
      // INSERT OR IGNORE skips the (extremely unlikely) case of a random clash.
      if (insertCode.run(code, batchId, pointsValue, now).changes === 1) codes.push(formatCode(code));
    }
    db.exec('COMMIT');
    return { batchId, codes };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function recentFailures(db, userId) {
  const since = new Date(Date.now() - LOCK_MINUTES * 60 * 1000).toISOString();
  return db
    .prepare(
      `SELECT COUNT(*) AS n FROM code_attempts
       WHERE user_id = ? AND success = 0 AND reason <> 'locked' AND created_at >= ?`
    )
    .get(userId, since).n;
}

function logAttempt(db, userId, codeEntered, success, reason) {
  db.prepare(
    'INSERT INTO code_attempts (user_id, code_entered, success, reason, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, String(codeEntered).slice(0, 32), success ? 1 : 0, reason, new Date().toISOString());
}

// Returns { points, balance } on success, or throws an AppError.
// Everything happens inside ONE transaction, so two people can never both claim a code.
function redeemCode(db, userId, rawCode) {
  const code = normalizeCode(rawCode);
  let failure = null;
  let success = null;

  db.exec('BEGIN IMMEDIATE');
  try {
    if (recentFailures(db, userId) >= MAX_FAILED_ATTEMPTS) {
      logAttempt(db, userId, code, false, 'locked');
      failure = new AppError(
        'LOCKED',
        `Too many wrong attempts. Please try again in ${LOCK_MINUTES} minutes.`,
        429
      );
    } else if (code.length !== CODE_LENGTH || ![...code].every((c) => ALPHABET.includes(c))) {
      logAttempt(db, userId, code, false, 'invalid');
      failure = new AppError('INVALID_CODE', 'That code is not valid. Please check it and try again.');
    } else {
      const row = db.prepare('SELECT * FROM codes WHERE code = ?').get(code);
      if (!row) {
        logAttempt(db, userId, code, false, 'invalid');
        failure = new AppError('INVALID_CODE', 'That code is not valid. Please check it and try again.');
      } else if (row.status === 'used') {
        logAttempt(db, userId, code, false, 'already_used');
        failure = new AppError('ALREADY_USED', 'This code has already been used.', 409);
      } else if (row.status === 'disabled') {
        logAttempt(db, userId, code, false, 'disabled');
        failure = new AppError('CODE_DISABLED', 'This code has been disabled. Please contact the factory.', 403);
      } else {
        const now = new Date().toISOString();
        // "WHERE status = 'unused'" means only ONE caller can ever flip it to used.
        const upd = db
          .prepare(
            "UPDATE codes SET status = 'used', redeemed_by = ?, redeemed_at = ? WHERE id = ? AND status = 'unused'"
          )
          .run(userId, now, row.id);
        if (upd.changes !== 1) {
          logAttempt(db, userId, code, false, 'already_used');
          failure = new AppError('ALREADY_USED', 'This code has already been used.', 409);
        } else {
          db.prepare(
            `INSERT INTO transactions (user_id, type, points, description, code_id, created_at)
             VALUES (?, 'earn', ?, ?, ?, ?)`
          ).run(userId, row.points_value, 'Product code redeemed', row.id, now);
          logAttempt(db, userId, code, true, 'ok');
          success = { points: row.points_value, balance: getBalance(db, userId) };
        }
      }
    }
    db.exec('COMMIT'); // failed attempts are saved too, so they count toward the lockout
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  if (failure) throw failure;
  return success;
}

function getBalance(db, userId) {
  return db.prepare('SELECT COALESCE(SUM(points), 0) AS balance FROM transactions WHERE user_id = ?').get(userId)
    .balance;
}

module.exports = {
  ALPHABET, CODE_LENGTH, MAX_FAILED_ATTEMPTS, LOCK_MINUTES, MAX_POINTS,
  randomCode, normalizeCode, formatCode, generateBatch, redeemCode, getBalance,
};
