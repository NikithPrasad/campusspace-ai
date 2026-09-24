const router = require('express').Router();
const ctrl = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');

router.use(protect);

// USER + ADMIN  ("/status" is declared before "/:id" so it isn't treated as an id)
router.get('/', validate({ query: s.resourceQuery }), ctrl.listResources);
router.get('/status', validate({ query: s.statusQuery }), ctrl.statusBoard);
router.get('/:id', validate({ params: s.idParam }), ctrl.getResource);
router.get(
  '/:id/availability',
  validate({ params: s.idParam, query: s.availabilityQuery }),
  ctrl.getAvailability
);

// ADMIN only
router.post('/', authorize('ADMIN'), validate({ body: s.createResource }), ctrl.createResource);
router.post('/combine', authorize('ADMIN'), validate({ body: s.combineRooms }), ctrl.combineRooms);
router.patch(
  '/:id',
  authorize('ADMIN'),
  validate({ params: s.idParam, body: s.updateResource }),
  ctrl.updateResource
);
router.patch(
  '/:id/availability',
  authorize('ADMIN'),
  validate({ params: s.idParam, body: s.availability }),
  ctrl.setAvailability
);
router.delete('/:id', authorize('ADMIN'), validate({ params: s.idParam }), ctrl.deleteResource);

module.exports = router;
