// Registration, login and password handling.
// Passwords are hashed with scrypt (built into Node) and never stored as plain text.
const crypto = require('node:crypto');
const { AppError } = require('../errors');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return salt.toString('hex') + ':' + hash.toString('hex');
}

function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return crypto.timingSafeEqual(expected, actual);
}

// Used when the email does not exist, so a login for an unknown email still does the
// same slow password check. Otherwise response time would reveal which emails are registered.
const DUMMY_HASH = hashPassword('not-a-real-password');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registerCustomer(db, { name, email, password }) {
  name = String(name || '').trim();
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');
  if (!name) throw new AppError('VALIDATION', 'Please enter your name.');
  if (!EMAIL_RE.test(email)) throw new AppError('VALIDATION', 'Please enter a valid email address.');
  if (password.length < 8) throw new AppError('VALIDATION', 'Password must be at least 8 characters.');

  try {
    const r = db
      .prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, hashPassword(password), 'customer', new Date().toISOString());
    return { id: Number(r.lastInsertRowid), name, email, role: 'customer' };
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw new AppError('EMAIL_TAKEN', 'An account with this email already exists.', 409);
    }
    throw err;
  }
}

// role is 'customer' or 'admin' so an admin cannot log in on the customer page and vice versa.
function login(db, { email, password, role }) {
  email = String(email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, role);
  // Same message for "no such user" and "wrong password" so attackers learn nothing.
  const passwordOk = verifyPassword(String(password || ''), user ? user.password_hash : DUMMY_HASH);
  if (!user || !passwordOk) {
    throw new AppError('BAD_LOGIN', 'Incorrect email or password.', 401);
  }
  if (!user.is_active) {
    throw new AppError('DISABLED', 'This account has been disabled. Please contact the factory.', 403);
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Creates the one admin account from .env values if it does not exist yet.
function ensureAdmin(db, email, password) {
  email = String(email || '').trim().toLowerCase();
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  const exists = db.prepare("SELECT id FROM users WHERE role = 'admin' AND email = ?").get(email);
  if (exists) return;
  db.prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
    .run('Factory Owner', email, hashPassword(password), 'admin', new Date().toISOString());
}

module.exports = { hashPassword, verifyPassword, registerCustomer, login, ensureAdmin };
