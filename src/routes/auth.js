const express = require('express');
const users = require('../services/users');
const { loadUser } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

function startSession(req, res, next, user) {
  // regenerate() gives a brand-new session id at login (prevents session fixation)
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ user });
  });
}

module.exports = function authRoutes(db) {
  const router = express.Router();
  const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many login attempts. Please wait 15 minutes.',
  });

  router.post('/register', loginLimit, (req, res, next) => {
    const user = users.registerCustomer(db, req.body || {});
    startSession(req, res, next, user);
  });

  router.post('/login', loginLimit, (req, res, next) => {
    const user = users.login(db, { ...(req.body || {}), role: 'customer' });
    startSession(req, res, next, user);
  });

  router.post('/admin/login', loginLimit, (req, res, next) => {
    const user = users.login(db, { ...(req.body || {}), role: 'admin' });
    startSession(req, res, next, user);
  });

  router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('loyalty.sid');
      res.json({ ok: true });
    });
  });

  // The React app calls this on load to find out who is logged in.
  router.get('/me', (req, res) => {
    const role = req.session && req.session.role;
    const user = role ? loadUser(db, req, role) : null;
    res.json({ user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null });
  });

  return router;
};
