const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { limitRequests } = require('../middleware/rateLimit');
const s = require('../validators/schemas');

const registerLimit = limitRequests({ windowMs: 60 * 60 * 1000, max: 50, message: 'Too many sign-ups from this network. Try again later.' });
const loginLimit = limitRequests({ windowMs: 15 * 60 * 1000, max: 300, message: 'Too many login requests. Slow down and try again shortly.' });

router.get('/config', ctrl.config);
router.post('/register', registerLimit, validate({ body: s.register }), ctrl.register);
router.post('/login', loginLimit, validate({ body: s.login }), ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);

module.exports = router;
