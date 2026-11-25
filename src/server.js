// Starts the app:  npm start
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Node 22+ can read the .env file by itself (no "dotenv" package needed).
try { process.loadEnvFile(); } catch { /* no .env file: use real environment variables */ }

const { openDb } = require('./db');
const { ensureAdmin } = require('./services/users');
const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const dbFile = process.env.DB_FILE || './data/loyalty.db';
let secret = process.env.SESSION_SECRET;
if (!secret || secret.startsWith('replace-with')) {
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: SESSION_SECRET is not set in .env. Using a temporary one (everyone is logged out on restart).');
}

fs.mkdirSync(path.dirname(path.resolve(dbFile)), { recursive: true });
const db = openDb(dbFile);

try {
  ensureAdmin(db, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
} catch (err) {
  console.error('Setup problem: ' + err.message + '\nCopy .env.example to .env and fill in the values.');
  process.exit(1);
}

createApp(db, { sessionSecret: secret, secureCookies: process.env.NODE_ENV === 'production' })
  .listen(port, () => console.log(`Loyalty Rewards running at http://localhost:${port}`));
