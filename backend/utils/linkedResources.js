const Resource = require('../models/Resource');

// Every resource whose bookings affect this one:
//   - the resource itself
//   - if it is a combined hall: the classrooms it is made of
//   - if it is a classroom: any combined hall it is part of
async function linkedIds(resource) {
  const ids = [resource._id];
  if (resource.combinedFrom?.length) ids.push(...resource.combinedFrom);
  const halls = await Resource.find({ combinedFrom: resource._id }).select('_id');
  ids.push(...halls.map((h) => h._id));
  return ids;
}

// For a combined hall, the first part that is not bookable (or null if all are fine)
async function unavailablePart(resource) {
  if (!resource.combinedFrom?.length) return null;
  const parts = await Resource.find({ _id: { $in: resource.combinedFrom } }).select('name availabilityStatus');
  return parts.find((p) => p.availabilityStatus !== 'AVAILABLE') || null;
}

// "E109" -> 109, used to check that two rooms are next to each other
function roomSequence(roomNumber = '') {
  const m = String(roomNumber).match(/(\d+)\s*$/);
  return m ? Number(m[1]) : NaN;
}

module.exports = { linkedIds, unavailablePart, roomSequence };
