const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');

router.use(protect);

// Every user only ever sees their own notifications
router.get('/', ctrl.list);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', validate({ params: s.idParam }), ctrl.markRead);

module.exports = router;
