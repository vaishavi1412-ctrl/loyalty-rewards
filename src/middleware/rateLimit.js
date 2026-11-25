// A tiny in-memory rate limiter (no extra package). Used on the login routes
// to slow down password guessing.
function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // key -> { count, resetAt }
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: message || 'Too many requests. Please wait and try again.', code: 'RATE_LIMITED' });
    }
    next();
  };
}
module.exports = { rateLimit };
