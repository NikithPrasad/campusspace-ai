const router = require('express').Router();
const ctrl = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');

router.use(protect);

// ADMIN — declared before "/:id" so "stats" isn't treated as an id
router.get('/', authorize('ADMIN'), validate({ query: s.bookingQuery }), ctrl.listAllBookings);
router.get('/stats', authorize('ADMIN'), ctrl.stats);
router.patch(
  '/:id/review',
  authorize('ADMIN'),
  validate({ params: s.idParam, body: s.reviewBooking }),
  ctrl.reviewBooking
);

// USER (admins may use these too)
router.post('/', authorize('USER', 'ADMIN'), validate({ body: s.createBooking }), ctrl.createBooking);
router.get('/my', validate({ query: s.bookingQuery.pick({ status: true }) }), ctrl.myBookings);
router.get('/:id', validate({ params: s.idParam }), ctrl.getBooking);
router.get('/:id/alternatives', validate({ params: s.idParam }), ctrl.alternatives);
router.patch('/:id/cancel', validate({ params: s.idParam, body: s.cancelBooking }), ctrl.cancelBooking);

module.exports = router;
