const Resource = require('../models/Resource');
const Booking = require('../models/Booking');

const { ACTIVE_STATUSES } = Booking;

// Which kinds of space can stand in for each other when suggesting alternatives
const FAMILY = {
  CLASSROOM: 'TEACHING',
  SEMINAR_HALL: 'TEACHING',
  AUDITORIUM: 'TEACHING',
  LAB: 'LAB',
  SPORTS: 'SPORTS',
  OTHER: 'OTHER',
};

/**
 * State of every space for [start, end):
 *   FREE | REQUESTED | BOOKED | MAINTENANCE | UNAVAILABLE   (+ `via` when a linked hall/room causes it)
 * A combined hall and its two classrooms affect each other.
 * Also returns how many pending requests compete for each space in that window.
 */
async function statesForWindow(start, end, { ignoreBookingIds = [] } = {}) {
  const [resources, bookings] = await Promise.all([
    Resource.find().populate('combinedFrom', 'name roomNumber availabilityStatus'),
    Booking.find({
      status: { $in: ACTIVE_STATUSES },
      startTime: { $lt: end },
      endTime: { $gt: start },
      ...(ignoreBookingIds.length && { _id: { $nin: ignoreBookingIds } }),
    }).select('resource status'),
  ]);

  const direct = {}; // resourceId -> APPROVED | PENDING (strongest)
  const pendingCount = {};
  for (const b of bookings) {
    const id = String(b.resource);
    if (direct[id] !== 'APPROVED') direct[id] = b.status;
    if (b.status === 'PENDING') pendingCount[id] = (pendingCount[id] || 0) + 1;
  }

  const byId = Object.fromEntries(resources.map((r) => [String(r._id), r]));
  const hallsOf = {};
  for (const r of resources) {
    for (const p of r.combinedFrom || []) (hallsOf[String(p._id || p)] ||= []).push(String(r._id));
  }

  const statuses = {};
  for (const r of resources) {
    const id = String(r._id);
    const parts = (r.combinedFrom || []).map((p) => String(p._id || p));
    const linked = [...parts, ...(hallsOf[id] || [])];
    const competing = [id, ...linked].reduce((n, l) => n + (pendingCount[l] || 0), 0);

    let st;
    if (r.availabilityStatus !== 'AVAILABLE') st = { state: r.availabilityStatus };
    else {
      const badPart = parts.find((p) => byId[p] && byId[p].availabilityStatus !== 'AVAILABLE');
      const linkedBooked = linked.find((l) => direct[l] === 'APPROVED');
      const linkedPending = linked.find((l) => direct[l] === 'PENDING');
      if (badPart) st = { state: 'UNAVAILABLE', via: byId[badPart].name };
      else if (direct[id] === 'APPROVED') st = { state: 'BOOKED' };
      else if (linkedBooked) st = { state: 'BOOKED', via: byId[linkedBooked]?.name };
      else if (direct[id] === 'PENDING') st = { state: 'REQUESTED' };
      else if (linkedPending) st = { state: 'REQUESTED', via: byId[linkedPending]?.name };
      else st = { state: 'FREE' };
    }
    statuses[id] = { ...st, competing };
  }
  return { resources, byId, hallsOf, statuses };
}

/**
 * Similar spaces that are genuinely free for the booking's exact time window
 * and have at least as many seats as it needs.
 *  - time: no approved booking on the space or on a linked hall/room, space and hall parts AVAILABLE
 *  - capacity: capacity >= attendees (or the original room's size when attendees wasn't given)
 *  - ranked: no competing requests first, then closest capacity, same block, same floor
 */
async function findAlternatives(booking, { limit = 4 } = {}) {
  const original = booking.resource;
  const start = booking.startTime;
  const end = booking.endTime;
  const needed = booking.attendees || original?.capacity || 1;

  if (start <= new Date()) return { needed, suggestions: [], reason: 'This time has already started.' };

  const { resources, hallsOf, statuses } = await statesForWindow(start, end, { ignoreBookingIds: [booking._id] });

  const originalId = original ? String(original._id) : null;
  const blocked = new Set([originalId]);
  if (original) {
    (original.combinedFrom || []).forEach((p) => blocked.add(String(p._id || p)));
    (hallsOf[originalId] || []).forEach((h) => blocked.add(h));
  }

  const family = FAMILY[original?.type] || 'OTHER';
  const target = booking.attendees || original?.capacity || needed;

  const suggestions = resources
    .filter((r) => !blocked.has(String(r._id)))
    .filter((r) => (FAMILY[r.type] || 'OTHER') === family || family === 'OTHER')
    .filter((r) => (r.capacity || 0) >= needed)
    .map((r) => ({ r, st: statuses[String(r._id)] }))
    .filter(({ st }) => st.state === 'FREE' || st.state === 'REQUESTED')
    .sort((a, b) => {
      const key = (x) => [
        x.st.competing > 0 ? 1 : 0,
        Math.abs((x.r.capacity || 0) - target),
        x.r.building && x.r.building === original?.building ? 0 : 1,
        x.r.floor !== undefined && x.r.floor === original?.floor ? 0 : 1,
      ];
      const ka = key(a);
      const kb = key(b);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return String(a.r.roomNumber || a.r.name).localeCompare(String(b.r.roomNumber || b.r.name));
    })
    .slice(0, limit)
    .map(({ r, st }) => ({
      resource: {
        _id: r._id,
        name: r.name,
        type: r.type,
        location: r.location,
        building: r.building,
        floor: r.floor,
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        amenities: r.amenities,
        combinedFrom: (r.combinedFrom || []).map((p) => ({ _id: p._id, name: p.name, roomNumber: p.roomNumber })),
      },
      competing: st.competing,
      sameFloor: r.floor !== undefined && r.floor === original?.floor && r.building === original?.building,
    }));

  return { needed, suggestions };
}

module.exports = { statesForWindow, findAlternatives };
