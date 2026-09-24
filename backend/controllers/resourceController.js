const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');
const { linkedIds, roomSequence } = require('../utils/linkedResources');
const { statesForWindow } = require('../utils/availability');

const { ACTIVE_STATUSES } = Booking;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/resources?type=LAB&status=AVAILABLE&search=hall&building=E%20Block&floor=2
async function listResources(req, res) {
  const { type, status, search, building, floor } = req.valid.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.availabilityStatus = status;
  if (building) filter.building = building;
  if (floor !== undefined) filter.floor = floor;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { location: rx }, { description: rx }, { roomNumber: rx }];
  }
  const resources = await Resource.find(filter)
    .populate('combinedFrom', 'name roomNumber availabilityStatus')
    .sort({ building: 1, floor: 1, roomNumber: 1, name: 1 });
  res.json({ success: true, count: resources.length, resources });
}

// GET /api/resources/:id  — includes the halls a classroom belongs to
async function getResource(req, res) {
  const resource = await Resource.findById(req.valid.params.id).populate(
    'combinedFrom',
    'name roomNumber availabilityStatus capacity'
  );
  if (!resource) throw new AppError('Resource not found', 404);
  const partOf = await Resource.find({ combinedFrom: resource._id }).select('name roomNumber availabilityStatus capacity');
  res.json({ success: true, resource, partOf });
}

// GET /api/resources/:id/availability?date=YYYY-MM-DD&tzOffset=-330
// Slots taken on that day, including slots blocked through a linked room/hall.
// Never exposes who booked them.
async function getAvailability(req, res) {
  const resource = await Resource.findById(req.valid.params.id);
  if (!resource) throw new AppError('Resource not found', 404);

  const { date, tzOffset } = req.valid.query;
  const dayStart =
    tzOffset === undefined
      ? new Date(`${date}T00:00:00`)
      : new Date(Date.parse(`${date}T00:00:00Z`) + tzOffset * 60 * 1000);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

  const ids = await linkedIds(resource);
  const taken = await Booking.find({
    resource: { $in: ids },
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: dayEnd },
    endTime: { $gt: dayStart },
  })
    .select('startTime endTime status resource')
    .populate('resource', 'name')
    .sort({ startTime: 1 });

  const bookedSlots = taken.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    ...(String(b.resource?._id) !== String(resource._id) && { via: b.resource?.name }),
  }));

  res.json({
    success: true,
    resource: { _id: resource._id, name: resource.name, availabilityStatus: resource.availabilityStatus },
    date,
    bookable: resource.availabilityStatus === 'AVAILABLE',
    bookedSlots,
  });
}

// GET /api/resources/status?start=ISO&end=ISO
// State of every space for a time window: FREE, REQUESTED, BOOKED, MAINTENANCE or UNAVAILABLE.
// Powers the floor plan and the "find a free room" search.
async function statusBoard(req, res) {
  const { start, end } = req.valid.query;
  const { statuses } = await statesForWindow(start, end);
  res.json({ success: true, start, end, statuses });
}

// POST /api/resources  (ADMIN)
async function createResource(req, res) {
  const resource = await Resource.create({ ...req.valid.body, createdBy: req.user._id });
  res.status(201).json({ success: true, resource });
}

// POST /api/resources/combine  (ADMIN)
// Joins two neighbouring classrooms on the same floor into one seminar hall.
async function combineRooms(req, res) {
  const { rooms, name, description } = req.valid.body;
  const docs = await Resource.find({ _id: { $in: rooms } });
  if (docs.length !== 2) throw new AppError('One or both classrooms were not found', 404);

  const [a, b] = docs.sort((x, y) => roomSequence(x.roomNumber) - roomSequence(y.roomNumber));

  if (a.type !== 'CLASSROOM' || b.type !== 'CLASSROOM') {
    throw new AppError('Only classrooms can be combined into a seminar hall', 400);
  }
  if (!a.building || a.building !== b.building || a.floor !== b.floor) {
    throw new AppError('Both classrooms must be on the same floor of the same block', 400);
  }
  if (Math.abs(roomSequence(a.roomNumber) - roomSequence(b.roomNumber)) !== 1) {
    throw new AppError(`${a.roomNumber} and ${b.roomNumber} are not next to each other`, 400);
  }
  const existing = await Resource.findOne({ combinedFrom: { $in: [a._id, b._id] } });
  if (existing) {
    throw new AppError(`One of these rooms is already part of ${existing.name}. Split it first.`, 409);
  }

  const hall = await Resource.create({
    name: name || `Seminar Hall ${a.roomNumber} + ${b.roomNumber}`,
    type: 'SEMINAR_HALL',
    location: a.location,
    building: a.building,
    floor: a.floor,
    roomNumber: `${a.roomNumber} + ${b.roomNumber}`,
    capacity: (a.capacity || 0) + (b.capacity || 0) || undefined,
    amenities: [...new Set([...(a.amenities || []), ...(b.amenities || []), 'Movable partition'])],
    description:
      description ||
      `Made by opening the partition between ${a.roomNumber} and ${b.roomNumber}. Booking the hall reserves both classrooms.`,
    combinedFrom: [a._id, b._id],
    createdBy: req.user._id,
  });
  await hall.populate('combinedFrom', 'name roomNumber availabilityStatus');
  res.status(201).json({ success: true, resource: hall });
}

// PATCH /api/resources/:id  (ADMIN)
async function updateResource(req, res) {
  const resource = await Resource.findByIdAndUpdate(req.valid.params.id, req.valid.body, {
    new: true,
    runValidators: true,
  });
  if (!resource) throw new AppError('Resource not found', 404);
  res.json({ success: true, resource });
}

// PATCH /api/resources/:id/availability  (ADMIN)
async function setAvailability(req, res) {
  const resource = await Resource.findByIdAndUpdate(
    req.valid.params.id,
    { availabilityStatus: req.valid.body.availabilityStatus },
    { new: true, runValidators: true }
  );
  if (!resource) throw new AppError('Resource not found', 404);
  res.json({ success: true, resource });
}

// DELETE /api/resources/:id  (ADMIN)
// Deleting a combined hall splits it back into its two classrooms.
// Refused while there are upcoming pending/approved bookings, or if a classroom is still part of a hall.
async function deleteResource(req, res) {
  const resource = await Resource.findById(req.valid.params.id);
  if (!resource) throw new AppError('Resource not found', 404);

  const hall = await Resource.findOne({ combinedFrom: resource._id });
  if (hall) {
    throw new AppError(`${resource.name} is part of ${hall.name}. Split the hall first.`, 409);
  }

  const upcoming = await Booking.countDocuments({
    resource: resource._id,
    status: { $in: ACTIVE_STATUSES },
    endTime: { $gt: new Date() },
  });
  if (upcoming > 0) {
    throw new AppError(
      `${resource.name} has ${upcoming} upcoming booking(s). Cancel/reject them or mark it UNAVAILABLE instead.`,
      409
    );
  }

  await resource.deleteOne();
  res.json({
    success: true,
    message: resource.combinedFrom?.length ? 'Hall split back into separate classrooms' : 'Resource deleted',
  });
}

module.exports = {
  listResources,
  getResource,
  getAvailability,
  statusBoard,
  createResource,
  combineRooms,
  updateResource,
  setAvailability,
  deleteResource,
};
