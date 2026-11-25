// What a customer sees on their own dashboard.
const { getBalance } = require('./codes');

function getDashboard(db, userId) {
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN type = 'earn' THEN points END), 0) AS earned,
              COALESCE(-SUM(CASE WHEN type = 'spend' THEN points END), 0) AS spent
       FROM transactions WHERE user_id = ?`
    )
    .get(userId);
  const transactions = db
    .prepare(
      `SELECT id, type, points, description, created_at
       FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 100`
    )
    .all(userId);
  return { balance: getBalance(db, userId), totalEarned: totals.earned, totalSpent: totals.spent, transactions };
}

module.exports = { getDashboard };
