// Read/manage queries used by the factory owner's dashboard.
const { AppError } = require('../errors');
const { formatCode, normalizeCode } = require('./codes');

const PAGE_SIZE = 25;

function page(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function getStats(db) {
  const n = (sql) => db.prepare(sql).get().n;
  return {
    totalCustomers: n("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'"),
    totalCodes: n('SELECT COUNT(*) AS n FROM codes'),
    unusedCodes: n("SELECT COUNT(*) AS n FROM codes WHERE status = 'unused'"),
    disabledCodes: n("SELECT COUNT(*) AS n FROM codes WHERE status = 'disabled'"),
    redeemedCodes: n("SELECT COUNT(*) AS n FROM codes WHERE status = 'used'"),
    submittedCodes: n('SELECT COUNT(*) AS n FROM code_attempts'),
    failedAttempts: n('SELECT COUNT(*) AS n FROM code_attempts WHERE success = 0'),
    pointsAwarded: n("SELECT COALESCE(SUM(points), 0) AS n FROM transactions WHERE type = 'earn'"),
    pointsSpent: -n("SELECT COALESCE(SUM(points), 0) AS n FROM transactions WHERE type = 'spend'"),
    rewardsRedeemed: n("SELECT COUNT(*) AS n FROM transactions WHERE type = 'spend'"),
  };
}

function listCustomers(db, { q } = {}) {
  const like = `%${String(q || '').trim()}%`;
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
              COALESCE((SELECT SUM(points) FROM transactions t WHERE t.user_id = u.id), 0) AS balance,
              (SELECT COUNT(*) FROM codes c WHERE c.redeemed_by = u.id) AS codes_redeemed
       FROM users u
       WHERE u.role = 'customer' AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.id DESC`
    )
    .all(like, like);
}

function setCustomerActive(db, id, active) {
  const r = db.prepare("UPDATE users SET is_active = ? WHERE id = ? AND role = 'customer'").run(active ? 1 : 0, id);
  if (r.changes !== 1) throw new AppError('NOT_FOUND', 'Customer not found.', 404);
}

function listCodes(db, { status, q, page: p } = {}) {
  const where = [];
  const params = [];
  if (['unused', 'used', 'disabled'].includes(status)) {
    where.push('c.status = ?');
    params.push(status);
  }
  const search = normalizeCode(q);
  if (search) {
    where.push('c.code LIKE ?');
    params.push(`%${search}%`);
  }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const current = page(p);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM codes c ${clause}`).get(...params).n;
  const rows = db
    .prepare(
      `SELECT c.id, c.code, c.points_value, c.status, c.redeemed_at, c.created_at,
              b.label AS batch_label, u.name AS redeemed_by_name, u.email AS redeemed_by_email
       FROM codes c
       JOIN batches b ON b.id = c.batch_id
       LEFT JOIN users u ON u.id = c.redeemed_by
       ${clause}
       ORDER BY c.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, (current - 1) * PAGE_SIZE)
    .map((r) => ({ ...r, code: formatCode(r.code) }));
  return { rows, total, page: current, pageSize: PAGE_SIZE };
}

// Only unused codes can be disabled, and only disabled codes can be re-enabled.
// A used code can never be changed, so history stays trustworthy.
function setCodeStatus(db, id, newStatus) {
  const from = { disabled: 'unused', unused: 'disabled' }[newStatus];
  if (!from) throw new AppError('VALIDATION', 'Status must be "disabled" or "unused".');
  const r = db.prepare('UPDATE codes SET status = ? WHERE id = ? AND status = ?').run(newStatus, id, from);
  if (r.changes !== 1) {
    throw new AppError('CONFLICT', `Only ${from} codes can be changed to ${newStatus}.`, 409);
  }
}

function listBatches(db) {
  return db
    .prepare(
      `SELECT b.id, b.label, b.points_value, b.quantity, b.created_at,
              (SELECT COUNT(*) FROM codes c WHERE c.batch_id = b.id AND c.status = 'used') AS used
       FROM batches b ORDER BY b.id DESC`
    )
    .all();
}

function batchCsv(db, batchId) {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
  if (!batch) throw new AppError('NOT_FOUND', 'Batch not found.', 404);
  const rows = db.prepare('SELECT code, points_value, status FROM codes WHERE batch_id = ? ORDER BY id').all(batchId);
  const lines = ['code,points,status', ...rows.map((r) => `${formatCode(r.code)},${r.points_value},${r.status}`)];
  return { filename: `batch-${batch.id}.csv`, csv: lines.join('\n') + '\n' };
}

function listAttempts(db, { reason, page: p } = {}) {
  const current = page(p);
  const clause = reason ? 'WHERE a.reason = ?' : '';
  const params = reason ? [reason] : [];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM code_attempts a ${clause}`).get(...params).n;
  const rows = db
    .prepare(
      `SELECT a.id, a.code_entered, a.success, a.reason, a.created_at, u.name, u.email
       FROM code_attempts a JOIN users u ON u.id = a.user_id
       ${clause} ORDER BY a.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, (current - 1) * PAGE_SIZE);
  return { rows, total, page: current, pageSize: PAGE_SIZE };
}

function listAllTransactions(db, { type, page: p } = {}) {
  const current = page(p);
  const filtered = ['earn', 'spend'].includes(type);
  const clause = filtered ? 'WHERE t.type = ?' : '';
  const params = filtered ? [type] : [];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM transactions t ${clause}`).get(...params).n;
  const rows = db
    .prepare(
      `SELECT t.id, t.type, t.points, t.description, t.created_at, u.name, u.email
       FROM transactions t JOIN users u ON u.id = t.user_id
       ${clause} ORDER BY t.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, (current - 1) * PAGE_SIZE);
  return { rows, total, page: current, pageSize: PAGE_SIZE };
}

module.exports = {
  getStats, listCustomers, setCustomerActive, listCodes, setCodeStatus,
  listBatches, batchCsv, listAttempts, listAllTransactions,
};
