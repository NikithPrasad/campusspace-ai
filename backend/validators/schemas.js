const { z } = require('zod');
const { RESOURCE_TYPES, AVAILABILITY } = require('../models/Resource');
const { BOOKING_STATUS } = require('../models/Booking');
const { isAllowedEmail, domainMessage } = require('../utils/emailPolicy');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });

// ---------- auth ----------
const collegeEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .refine(isAllowedEmail, { message: domainMessage() });

const register = z.object({
  name: z.string().trim().min(2).max(60),
  email: collegeEmail,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
  department: z.string().trim().max(80).optional(),
  designation: z.enum(['STUDENT', 'FACULTY', 'STAFF']).optional(),
}).strict();

const login = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required'),
});

// ---------- resources ----------
const resourceBase = {
  name: z.string().trim().min(2).max(100),
  type: z.enum(RESOURCE_TYPES),
  location: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  capacity: z.coerce.number().int().min(1).max(5000).optional(),
  amenities: z.array(z.string().trim().min(1)).max(30).optional(),
  availabilityStatus: z.enum(AVAILABILITY).optional(),
  building: z.string().trim().min(1).max(60).optional(),
  floor: z.coerce.number().int().min(0).max(50).optional(),
  roomNumber: z
    .string()
    .trim()
    .max(30)
    .regex(/^[A-Za-z0-9 +\-]+$/, 'Room number can only use letters, numbers, spaces, + and -')
    .optional(),
};

const createResource = z.object(resourceBase).strict();
const updateResource = z
  .object(resourceBase)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');

const availability = z.object({ availabilityStatus: z.enum(AVAILABILITY) }).strict();

const resourceQuery = z.object({
  type: z.enum(RESOURCE_TYPES).optional(),
  status: z.enum(AVAILABILITY).optional(),
  search: z.string().trim().max(100).optional(),
  building: z.string().trim().max(60).optional(),
  floor: z.coerce.number().int().min(0).max(50).optional(),
});

// Combine two neighbouring classrooms into one seminar hall
const combineRooms = z
  .object({
    rooms: z.array(objectId).length(2, 'Pick exactly two classrooms'),
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((b) => b.rooms[0] !== b.rooms[1], { message: 'Pick two different classrooms', path: ['rooms'] });

// Live status of every space for a time window (floor plan / free-room finder)
const statusQuery = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  })
  .refine((q) => q.end > q.start, { message: 'end must be after start', path: ['end'] })
  .refine((q) => q.end - q.start <= 24 * 3600 * 1000, { message: 'Window cannot exceed 24 hours', path: ['end'] });

const availabilityQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  // Client's Date.getTimezoneOffset() in minutes (IST = -330). Defaults to the server's timezone.
  tzOffset: z.coerce.number().int().min(-840).max(840).optional(),
});

// ---------- bookings ----------
const MAX_HOURS = 12;

const createBooking = z
  .object({
    resource: objectId,
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    purpose: z.string().trim().min(5).max(300),
    attendees: z.coerce.number().int().min(1).optional(),
    // Set to true after the user confirms they really want a second room at the same time
    confirmMultiple: z.boolean().optional(),
  })
  .strict()
  .refine((b) => b.endTime > b.startTime, { message: 'endTime must be after startTime', path: ['endTime'] })
  .refine((b) => b.startTime > new Date(), { message: 'startTime must be in the future', path: ['startTime'] })
  .refine((b) => b.endTime - b.startTime <= MAX_HOURS * 3600 * 1000, {
    message: `A booking cannot exceed ${MAX_HOURS} hours`,
    path: ['endTime'],
  });

const bookingQuery = z.object({
  status: z.enum(BOOKING_STATUS).optional(),
  resource: objectId.optional(),
  user: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const reviewBooking = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    adminRemark: z.string().trim().max(300).optional(),
  })
  .strict()
  .refine((b) => b.status !== 'REJECTED' || (b.adminRemark && b.adminRemark.length >= 3), {
    message: 'A reason (adminRemark) is required when rejecting a booking',
    path: ['adminRemark'],
  });

const cancelBooking = z.object({ reason: z.string().trim().max(300).optional() }).strict();

module.exports = {
  idParam,
  register,
  login,
  createResource,
  updateResource,
  availability,
  resourceQuery,
  availabilityQuery,
  combineRooms,
  statusQuery,
  createBooking,
  bookingQuery,
  reviewBooking,
  cancelBooking,
};
