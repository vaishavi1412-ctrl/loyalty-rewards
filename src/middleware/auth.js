// Login checks. The user is re-loaded from the database on every request, so if the
// owner disables a customer, they are locked out immediately.
function loadUser(db, req, role) {
  const id = req.session && req.session.userId;
  if (!id || req.session.role !== role) return null;
  const user = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ? AND role = ?').get(id, role);
  return user && user.is_active ? user : null;
}

function requireRole(db, role) {
  return (req, res, next) => {
    const user = loadUser(db, req, role);
    if (!user) return res.status(401).json({ error: 'Please log in to continue.', code: 'AUTH_REQUIRED' });
    req.user = user;
    next();
  };
}

// Simple protection against cross-site requests: every change (POST/PATCH/PUT/DELETE)
// must carry a custom header. Other websites cannot add it without our permission.
function requireCustomHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'fetch') {
    return res.status(403).json({ error: 'Request blocked.', code: 'BAD_REQUEST_ORIGIN' });
  }
  next();
}

module.exports = { loadUser, requireRole, requireCustomHeader };
