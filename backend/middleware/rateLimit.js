// Small in-memory rate limiters (no extra packages needed).
// Good enough for a single server; use Redis-backed limits if you scale out.

const AppError = require('../utils/AppError');

const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

// Generic "max N requests per window per IP"
function limitRequests({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();
    const now = Date.now();
    const key = clientIp(req);
    const entry = hits.get(key);
    if (!entry || now > entry.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.reset - now) / 1000));
      throw new AppError(message, 429);
    }
    next();
  };
}

// Failed-login lockout: 5 wrong passwords for the same email from the same IP
// locks that combination for 15 minutes. A successful login clears it.
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map();

const failKey = (req, email) => `${clientIp(req)}|${String(email).toLowerCase()}`;

function checkLoginLock(req, email) {
  const entry = failures.get(failKey(req, email));
  if (!entry) return;
  if (Date.now() > entry.reset) {
    failures.delete(failKey(req, email));
    return;
  }
  if (entry.count >= MAX_FAILS) {
    const mins = Math.ceil((entry.reset - Date.now()) / 60000);
    throw new AppError(`Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`, 429);
  }
}

function recordLoginFailure(req, email) {
  const key = failKey(req, email);
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || now > entry.reset) failures.set(key, { count: 1, reset: now + LOCK_MS });
  else entry.count += 1;

  // keep the map from growing forever
  if (failures.size > 5000) {
    for (const [k, v] of failures) if (now > v.reset) failures.delete(k);
  }
  const left = MAX_FAILS - failures.get(key).count;
  return left > 0 ? left : 0;
}

function clearLoginFailures(req, email) {
  failures.delete(failKey(req, email));
}

module.exports = { limitRequests, checkLoginLock, recordLoginFailure, clearLoginFailures };
