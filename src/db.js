// Opens the SQLite database and creates the tables if they do not exist.
// node:sqlite is built into Node.js, so nothing extra is installed.
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  label        TEXT NOT NULL,
  points_value INTEGER NOT NULL CHECK (points_value > 0),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  created_at   TEXT NOT NULL
);

-- One row per printed box code. UNIQUE stops two boxes sharing a code.
-- The CHECK at the bottom says: a code is "used" if and only if it has an owner.
CREATE TABLE IF NOT EXISTS codes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  code         TEXT NOT NULL UNIQUE,
  batch_id     INTEGER NOT NULL REFERENCES batches(id),
  points_value INTEGER NOT NULL CHECK (points_value > 0),
  status       TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used','disabled')),
  redeemed_by  INTEGER REFERENCES users(id),
  redeemed_at  TEXT,
  created_at   TEXT NOT NULL,
  CHECK ((status = 'used') = (redeemed_by IS NOT NULL))
);

-- Every attempt to submit a code (good or bad) is logged here.
CREATE TABLE IF NOT EXISTS code_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  code_entered TEXT NOT NULL,
  success      INTEGER NOT NULL,
  reason       TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock       INTEGER NOT NULL CHECK (stock >= 0),
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

-- The points ledger. Balance = sum of a customer's rows. 'earn' is +, 'spend' is -.
CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK (type IN ('earn','spend')),
  points      INTEGER NOT NULL CHECK (points <> 0),
  description TEXT NOT NULL,
  code_id     INTEGER REFERENCES codes(id),
  reward_id   INTEGER REFERENCES rewards(id),
  created_at  TEXT NOT NULL
);

-- Second safety net: one code can produce at most ONE earn transaction.
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_code
  ON transactions(code_id) WHERE code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS ix_attempts_user ON code_attempts(user_id, created_at);
`;

function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDb };
