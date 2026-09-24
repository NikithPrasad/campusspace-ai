const mongoose = require('mongoose');

const BOOKING_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
// Bookings in these states hold (or may soon hold) the time slot
const ACTIVE_STATUSES = ['PENDING', 'APPROVED'];

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    purpose: { type: String, required: true, trim: true, minlength: 5, maxlength: 300 },
    attendees: { type: Number, min: 1, default: 1 },
    status: { type: String, enum: BOOKING_STATUS, default: 'PENDING' },
    adminRemark: { type: String, trim: true, maxlength: 300 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    // true when rejected automatically because another request for the same slot was approved
    autoRejected: { type: Boolean, default: false },
    cancelledAt: Date,
  },
  { timestamps: true }
);

bookingSchema.pre('validate', function () {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate('endTime', 'endTime must be after startTime');
  }
});

bookingSchema.index({ resource: 1, startTime: 1, endTime: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.BOOKING_STATUS = BOOKING_STATUS;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
