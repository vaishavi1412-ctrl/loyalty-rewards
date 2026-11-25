// Builds the Express app. Kept separate from server.js so it is easy to test.
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
const { AppError } = require('./errors');
const { requireRole, requireCustomHeader } = require('./middleware/auth');

function createApp(db, { sessionSecret, secureCookies = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '50kb' }));

  // Basic security headers
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'same-origin');
    next();
  });

  app.use(
    session({
      name: 'loyalty.sid',
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', secure: secureCookies, maxAge: 2 * 60 * 60 * 1000 },
    })
  );

  app.use('/api', requireCustomHeader);
  app.use('/api/auth', require('./routes/auth')(db));
  app.use('/api/customer', requireRole(db, 'customer'), require('./routes/customer')(db));
  app.use('/api/admin', requireRole(db, 'admin'), require('./routes/admin')(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // Serve the built React app (created by "npm run build").
  const dist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // One place that turns errors into friendly JSON messages.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: err.message, code: err.code });
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}

module.exports = { createApp };
