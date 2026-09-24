const mongoose = require('mongoose');

const NOTIFICATION_TYPES = ['APPROVED', 'REJECTED', 'SLOT_TAKEN', 'CANCELLED'];

// In-app messages for students/faculty (e.g. "your slot went to another request, here are similar rooms")
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, maxlength: 500 },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    // Rooms suggested at the time of the notification (the app re-checks them live before showing)
    suggestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
