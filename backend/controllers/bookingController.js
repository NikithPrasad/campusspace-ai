const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { linkedIds, unavailablePart } = require('../utils/linkedResources');
const { findAlternatives } = require('../utils/availability');

const { ACTIVE_STATUSES } = Booking;

// Two intervals overlap when A starts before B ends AND A ends after B starts.
// resourceIds can be one id or a list (a room plus its linked hall/rooms).
function overlapFilter(resourceIds, startTime, endTime, statuses) {
  return {
    resource: Array.isArray(resourceIds) ? { $in: resourceIds } : resourceIds,
    status: { $in: statuses },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
}

function isOwner(booking, user) {
  const ownerId = booking.user._id ? booking.user._id : booking.user;
  return ownerId.toString() === user._id.toString();
}

const when = (b) =>
  `${new Date(b.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}, ` +
  `${new Date(b.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}–` +
  `${new Date(b.endTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}`;

// POST /api/bookings  (USER/ADMIN)
async function createBooking(req, res) {
  const { resource: resourceId, startTime, endTime, purpose, attendees, confirmMultiple } = req.valid.body;

  const resource = await Resource.findById(resourceId);
  if (!resource) throw new AppError('Resource not found', 404);
  if (resource.availabilityStatus !== 'AVAILABLE') {
    throw new AppError(`Resource is currently ${resource.availabilityStatus} and cannot be booked`, 409);
  }
  const badPart = await unavailablePart(resource);
  if (badPart) {
    throw new AppError(`${badPart.name} (part of this hall) is ${badPart.availabilityStatus} and cannot be booked`, 409);
  }
  if (attendees && resource.capacity && attendees > resource.capacity) {
    throw new AppError(`Attendees (${attendees}) exceed resource capacity (${resource.capacity})`, 400);
  }

  // A combined hall and its classrooms block each other
  const linked = await linkedIds(resource);
  const approvedClash = await Booking.findOne(overlapFilter(linked, startTime, endTime, ['APPROVED'])).populate(
    'resource',
    'name'
  );
  if (approvedClash) {
    const viaOther = String(approvedClash.resource?._id) !== String(resource._id);
    throw new AppError(
      viaOther
        ? `This time is blocked: ${approvedClash.resource.name} is already booked then`
        : 'This time slot is already booked for the selected resource',
      409,
      { code: 'SLOT_TAKEN', conflictingSlot: { startTime: approvedClash.startTime, endTime: approvedClash.endTime } }
    );
  }

  const ownClash = await Booking.findOne({
    ...overlapFilter(resource._id, startTime, endTime, ['PENDING']),
    user: req.user._id,
  });
  if (ownClash) {
    throw new AppError('You already have a pending request for this resource in this time slot', 409);
  }

  // One room at a time: a second overlapping booking needs explicit confirmation
  if (!confirmMultiple) {
    const mine = await Booking.find({
      user: req.user._id,
      status: { $in: ACTIVE_STATUSES },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    })
      .populate('resource', 'name roomNumber')
      .sort({ startTime: 1 });
    if (mine.length) {
      const first = mine[0];
      throw new AppError(
        `You already have ${first.resource?.name || 'a room'} ${first.status === 'APPROVED' ? 'booked' : 'requested'} for ${when(first)}. Are you sure you want to book another room at the same time?`,
        409,
        {
          code: 'ALREADY_HAS_BOOKING',
          existing: mine.map((b) => ({
            _id: b._id,
            resource: b.resource && { _id: b.resource._id, name: b.resource.name },
            startTime: b.startTime,
            endTime: b.endTime,
            status: b.status,
          })),
        }
      );
    }
  }

  const booking = await Booking.create({
    user: req.user._id,
    resource: resource._id,
    startTime,
    endTime,
    purpose,
    attendees,
  });
  await booking.populate('resource', 'name type location roomNumber floor');
  res.status(201).json({ success: true, booking });
}

// GET /api/bookings/my?status=PENDING  (USER/ADMIN) — only the caller's bookings
async function myBookings(req, res) {
  const filter = { user: req.user._id };
  if (req.valid.query.status) filter.status = req.valid.query.status;
  const bookings = await Booking.find(filter)
    .populate('resource', 'name type location availabilityStatus roomNumber floor building capacity')
    .sort({ startTime: -1 });
  res.json({ success: true, count: bookings.length, bookings });
}

// GET /api/bookings/:id — owner or ADMIN
async function getBooking(req, res) {
  const booking = await Booking.findById(req.valid.params.id)
    .populate('resource', 'name type location roomNumber floor capacity')
    .populate('user', 'name email department designation');
  if (!booking) throw new AppError('Booking not found', 404);
  if (req.user.role !== 'ADMIN' && !isOwner(booking, req.user)) {
    throw new AppError('You can only view your own bookings', 403);
  }
  res.json({ success: true, booking });
}

// GET /api/bookings/:id/alternatives — owner or ADMIN
// Similar spaces that are free for exactly the same time and big enough for the request.
async function alternatives(req, res) {
  const booking = await Booking.findById(req.valid.params.id).populate('resource');
  if (!booking) throw new AppError('Booking not found', 404);
  if (req.user.role !== 'ADMIN' && !isOwner(booking, req.user)) {
    throw new AppError('You can only view your own bookings', 403);
  }
  const { needed, suggestions, reason } = await findAlternatives(booking, { limit: 4 });
  res.json({
    success: true,
    booking: {
      _id: booking._id,
      status: booking.status,
      purpose: booking.purpose,
      attendees: booking.attendees,
      startTime: booking.startTime,
      endTime: booking.endTime,
      resource: booking.resource && {
        _id: booking.resource._id,
        name: booking.resource.name,
        type: booking.resource.type,
        capacity: booking.resource.capacity,
        roomNumber: booking.resource.roomNumber,
      },
    },
    needed,
    suggestions,
    ...(reason && { reason }),
  });
}

// PATCH /api/bookings/:id/cancel — owner (or ADMIN); only PENDING/APPROVED bookings that haven't started
async function cancelBooking(req, res) {
  const booking = await Booking.findById(req.valid.params.id).populate('resource', 'name');
  if (!booking) throw new AppError('Booking not found', 404);
  const owner = isOwner(booking, req.user);
  if (req.user.role !== 'ADMIN' && !owner) {
    throw new AppError("You cannot manage another user's booking", 403);
  }
  if (!ACTIVE_STATUSES.includes(booking.status)) {
    throw new AppError(`A ${booking.status} booking cannot be cancelled`, 409);
  }
  if (booking.startTime <= new Date()) {
    throw new AppError('Bookings that have already started cannot be cancelled', 409);
  }

  booking.status = 'CANCELLED';
  booking.cancelledAt = new Date();
  if (req.valid.body?.reason) booking.adminRemark = req.valid.body.reason;
  await booking.save();

  // Let the owner know when an admin cancels their booking
  if (!owner) {
    await Notification.create({
      user: booking.user,
      type: 'CANCELLED',
      title: `Your booking of ${booking.resource?.name} was cancelled`,
      message: `${when(booking)}${booking.adminRemark ? ` · ${booking.adminRemark}` : ''}`,
      booking: booking._id,
    });
  }
  res.json({ success: true, booking });
}

// ---------------- ADMIN ----------------

// GET /api/bookings?status=&resource=&user=&from=&to=
// Pending requests also get `competing`: how many other pending requests want the same slot
// (including through a linked hall/room).
async function listAllBookings(req, res) {
  const { status, resource, user, from, to } = req.valid.query;
  const filter = {};
  if (status) filter.status = status;
  if (resource) filter.resource = resource;
  if (user) filter.user = user;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = from;
    if (to) filter.startTime.$lte = to;
  }
  const [bookings, allPending, spaces] = await Promise.all([
    Booking.find(filter)
      .populate('resource', 'name type location roomNumber floor building capacity')
      .populate('user', 'name email department designation')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    Booking.find({ status: 'PENDING' }).select('resource startTime endTime').lean(),
    Resource.find().select('combinedFrom').lean(),
  ]);

  const links = {};
  const link = (a, b) => ((links[a] ||= new Set()).add(b), (links[b] ||= new Set()).add(a));
  for (const hall of spaces) for (const p of hall.combinedFrom || []) link(String(hall._id), String(p));

  for (const b of bookings) {
    if (b.status !== 'PENDING' || !b.resource) continue;
    const rid = String(b.resource._id);
    const related = new Set([rid, ...(links[rid] || [])]);
    b.competing = allPending.filter(
      (o) => String(o._id) !== String(b._id) && related.has(String(o.resource)) && o.startTime < b.endTime && o.endTime > b.startTime
    ).length;
  }
  res.json({ success: true, count: bookings.length, bookings });
}

// PATCH /api/bookings/:id/review  { status: APPROVED|REJECTED, adminRemark }
async function reviewBooking(req, res) {
  const { status, adminRemark } = req.valid.body;
  const booking = await Booking.findById(req.valid.params.id).populate('resource');
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'PENDING') {
    throw new AppError(`Only PENDING bookings can be reviewed (this one is ${booking.status})`, 409);
  }

  let linked = [];
  if (status === 'APPROVED') {
    if (!booking.resource) throw new AppError('The booked resource no longer exists', 409);
    if (booking.resource.availabilityStatus !== 'AVAILABLE') {
      throw new AppError(`Resource is ${booking.resource.availabilityStatus}; cannot approve`, 409);
    }
    const badPart = await unavailablePart(booking.resource);
    if (badPart) throw new AppError(`${badPart.name} (part of this hall) is ${badPart.availabilityStatus}; cannot approve`, 409);
    if (booking.startTime <= new Date()) {
      throw new AppError('Cannot approve a booking whose start time has passed', 409);
    }
    linked = await linkedIds(booking.resource);
    const clash = await Booking.findOne({
      ...overlapFilter(linked, booking.startTime, booking.endTime, ['APPROVED']),
      _id: { $ne: booking._id },
    }).populate('resource', 'name');
    if (clash) {
      throw new AppError(`${clash.resource?.name || 'Another booking'} is already approved for an overlapping time`, 409);
    }
  }

  booking.status = status;
  booking.adminRemark = adminRemark;
  booking.reviewedBy = req.user._id;
  booking.reviewedAt = new Date();
  await booking.save();

  await Notification.create({
    user: booking.user,
    type: status,
    title: status === 'APPROVED' ? `${booking.resource?.name} is booked for you` : `Your request for ${booking.resource?.name} was rejected`,
    message: `${when(booking)}${adminRemark && status === 'REJECTED' ? ` · Reason: ${adminRemark}` : ''}`,
    booking: booking._id,
  });

  // Once a slot is approved, overlapping pending requests can no longer be granted.
  // Each of those students/faculty is told why and offered similar rooms that are free then.
  let autoRejected = 0;
  if (status === 'APPROVED') {
    const losers = await Booking.find({
      ...overlapFilter(linked, booking.startTime, booking.endTime, ['PENDING']),
      _id: { $ne: booking._id },
    }).populate('resource');

    if (losers.length) {
      await Booking.updateMany(
        { _id: { $in: losers.map((l) => l._id) } },
        {
          status: 'REJECTED',
          autoRejected: true,
          adminRemark: `Auto-rejected: this time was given to another request (${booking.resource.name})`,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        }
      );
      autoRejected = losers.length;

      for (const lost of losers) {
        const { suggestions } = await findAlternatives(lost, { limit: 4 });
        await Notification.create({
          user: lost.user,
          type: 'SLOT_TAKEN',
          title: `${lost.resource?.name} went to another request`,
          message: suggestions.length
            ? `${when(lost)}. ${suggestions.length} similar room${suggestions.length > 1 ? 's are' : ' is'} free at that time with enough seats.`
            : `${when(lost)}. No similar room is free at that exact time. Try another time.`,
          booking: lost._id,
          suggestions: suggestions.map((s) => s.resource._id),
        });
      }
    }
  }

  await booking.populate('user', 'name email');
  res.json({ success: true, booking, autoRejected });
}

// GET /api/bookings/stats  — dashboard counts
async function stats(req, res) {
  const [byStatus, resources, upcoming] = await Promise.all([
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Resource.aggregate([{ $group: { _id: '$availabilityStatus', count: { $sum: 1 } } }]),
    Booking.countDocuments({ status: 'APPROVED', startTime: { $gt: new Date() } }),
  ]);
  const toObj = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.count]));
  res.json({
    success: true,
    stats: { bookingsByStatus: toObj(byStatus), resourcesByStatus: toObj(resources), upcomingApproved: upcoming },
  });
}

module.exports = {
  createBooking,
  myBookings,
  getBooking,
  alternatives,
  cancelBooking,
  listAllBookings,
  reviewBooking,
  stats,
};
