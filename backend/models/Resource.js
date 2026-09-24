const mongoose = require('mongoose');

const RESOURCE_TYPES = ['SEMINAR_HALL', 'LAB', 'SPORTS', 'AUDITORIUM', 'CLASSROOM', 'OTHER'];
const AVAILABILITY = ['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE'];

const resourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
    type: { type: String, required: true, enum: RESOURCE_TYPES },
    location: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000 },
    capacity: { type: Number, min: 1, max: 5000 },
    amenities: [{ type: String, trim: true }],
    availabilityStatus: { type: String, enum: AVAILABILITY, default: 'AVAILABLE' },

    // Where the space is, for block/floor views (e.g. E Block, floor 1, room E101)
    building: { type: String, trim: true, maxlength: 60 },
    floor: { type: Number, min: 0, max: 50 },
    roomNumber: { type: String, trim: true, uppercase: true, maxlength: 30 },

    // A seminar hall made by joining two classrooms. Booking the hall blocks
    // both rooms, and booking either room blocks the hall.
    combinedFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

resourceSchema.index({ type: 1, availabilityStatus: 1 });
resourceSchema.index({ building: 1, floor: 1 });
resourceSchema.index({ combinedFrom: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
module.exports.RESOURCE_TYPES = RESOURCE_TYPES;
module.exports.AVAILABILITY = AVAILABILITY;
