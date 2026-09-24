const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

// GET /api/notifications — the caller's latest notifications + unread count
async function list(req, res) {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate({ path: 'booking', select: 'startTime endTime attendees purpose status autoRejected resource', populate: { path: 'resource', select: 'name roomNumber capacity type' } })
      .populate('suggestions', 'name roomNumber capacity type floor building'),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, unread, notifications });
}

// PATCH /api/notifications/:id/read
async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate({ _id: req.valid.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) throw new AppError('Notification not found', 404);
  res.json({ success: true, notification: n });
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res) {
  const r = await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, updated: r.modifiedCount });
}

module.exports = { list, markRead, markAllRead };
