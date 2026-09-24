const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { isAllowedEmail, domainMessage, allowedDomain } = require('../utils/emailPolicy');
const { checkLoginLock, recordLoginFailure, clearLoginFailures } = require('../middleware/rateLimit');

const COOKIE_NAME = 'token';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // JS in the browser can't read it
    secure: prod, // HTTPS only in production
    sameSite: prod ? 'none' : 'lax',
    maxAge: SEVEN_DAYS,
    path: '/',
  };
}

function sendToken(res, user, status) {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.status(status).json({ success: true, user });
}

// POST /api/auth/register  (public) — always creates a USER, never an ADMIN
async function register(req, res) {
  const { name, email, password, department, designation } = req.valid.body;
  const exists = await User.findOne({ email });
  if (exists) throw new AppError('An account with this email already exists', 409);

  const user = await User.create({ name, email, password, department, designation, role: 'USER' });
  sendToken(res, user, 201);
}

// POST /api/auth/login  (public)
async function login(req, res) {
  const { email, password } = req.valid.body;

  // College accounts only — rejected before touching the database
  if (!isAllowedEmail(email)) throw new AppError(domainMessage(), 403);

  // Locked out after too many wrong passwords
  checkLoginLock(req, email);

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    const left = recordLoginFailure(req, email);
    throw new AppError(
      left > 0 ? 'Invalid email or password' : 'Too many failed attempts. Try again in 15 minutes.',
      left > 0 ? 401 : 429
    );
  }

  clearLoginFailures(req, email);
  sendToken(res, user, 200);
}

// GET /api/auth/config  (public) — lets the frontend show the allowed domain
function config(req, res) {
  res.json({ success: true, emailDomain: allowedDomain() });
}

// POST /api/auth/logout
function logout(req, res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
  res.json({ success: true, message: 'Logged out' });
}

// GET /api/auth/me  (protected)
function me(req, res) {
  res.json({ success: true, user: req.user });
}

module.exports = { register, login, logout, me, config };
