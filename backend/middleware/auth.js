const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { isAllowedEmail, domainMessage } = require('../utils/emailPolicy');

// Verifies the JWT stored in the HTTP-only "token" cookie and attaches req.user
async function protect(req, res, next) {
  let token = req.cookies?.token;

  // Fallback for API clients that send "Authorization: Bearer <token>"
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) throw new AppError('Not authenticated. Please log in.', 401);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError('Session is invalid or has expired. Please log in again.', 401);
  }

  const user = await User.findById(payload.id);
  if (!user) throw new AppError('User for this session no longer exists.', 401);
  // Defence in depth: even an old session can't be used by a non-college account
  if (!isAllowedEmail(user.email)) throw new AppError(domainMessage(), 403);

  req.user = user;
  next();
}

// Role verification: authorize('ADMIN') or authorize('USER', 'ADMIN')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action.', 403);
    }
    next();
  };
}

module.exports = { protect, authorize };
