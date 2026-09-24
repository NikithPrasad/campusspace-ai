// Integration tests. Needs a running MongoDB at TEST_MONGO_URI (defaults to a local instance).
// Run: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');

process.env.JWT_SECRET = 'test_secret_for_ci_only';
process.env.NODE_ENV = 'test';
const app = require('../app');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');

const URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/campusspace_test';

const admin = request.agent(app);
const ravi = request.agent(app);
const priya = request.agent(app);
const outsider = request.agent(app);
const anon = request(app);

const future = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const localDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let resourceId;
let maintId;
let b1;
let b2;
let b3;

before(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  // make sure unique indexes exist before the duplicate-key tests run
  await Promise.all([User, Resource, Booking].map((m) => m.syncIndexes()));
  await User.create({ name: 'Admin', email: 'admin@vnrvjiet.in', password: 'Admin@123', role: 'ADMIN' });
  // an account created before the domain rule existed
  await User.create({ name: 'Old Account', email: 'old@gmail.com', password: 'Old@12345' });
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('health', async () => {
  const r = await anon.get('/api/health');
  assert.equal(r.status, 200);
});

test('register: validation, role cannot be self-assigned, duplicate email', async () => {
  let r = await anon.post('/api/auth/register').send({ name: 'R', email: 'bad', password: '123' });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.length >= 3);

  r = await anon.post('/api/auth/register').send({ name: 'Hacker', email: 'h@vnrvjiet.in', password: 'Pass1234', role: 'ADMIN' });
  assert.equal(r.status, 400, 'unknown field "role" must be rejected');

  r = await ravi.post('/api/auth/register').send({ name: 'Ravi', email: 'ravi@vnrvjiet.in', password: 'User@1234' });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.role, 'USER');
  assert.equal(r.body.user.password, undefined);
  const cookie = r.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/i);

  r = await anon.post('/api/auth/register').send({ name: 'Ravi2', email: 'ravi@vnrvjiet.in', password: 'User@1234' });
  assert.equal(r.status, 409);

  r = await priya.post('/api/auth/register').send({ name: 'Priya', email: 'priya@vnrvjiet.in', password: 'User@1234' });
  assert.equal(r.status, 201);
});

test('only @vnrvjiet.in emails can register or sign in', async () => {
  let r = await anon.post('/api/auth/register').send({ name: 'Outsider', email: 'someone@gmail.com', password: 'Pass1234' });
  assert.equal(r.status, 400);
  assert.match(r.body.errors[0].message, /vnrvjiet\.in/);

  r = await anon.post('/api/auth/register').send({ name: 'Look Alike', email: 'x@evilvnrvjiet.in', password: 'Pass1234' });
  assert.equal(r.status, 400, 'look-alike domains are rejected');

  r = await outsider.post('/api/auth/login').send({ email: 'old@gmail.com', password: 'Old@12345' });
  assert.equal(r.status, 403, 'existing non-college accounts cannot sign in');

  r = await anon.get('/api/auth/config');
  assert.equal(r.body.emailDomain, 'vnrvjiet.in');
});

test('failed-login lockout after 5 wrong passwords', async () => {
  const email = 'lockme@vnrvjiet.in';
  await User.create({ name: 'Lock Me', email, password: 'Right@123' });
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await anon.post('/api/auth/login').send({ email, password: 'wrong' })).status);
  assert.deepEqual(codes, [401, 401, 401, 401, 429]);
  const r = await anon.post('/api/auth/login').send({ email, password: 'Right@123' });
  assert.equal(r.status, 429, 'even the right password is refused while locked');
});

test('login / me / protected routes', async () => {
  let r = await anon.post('/api/auth/login').send({ email: 'admin@vnrvjiet.in', password: 'wrong' });
  assert.equal(r.status, 401);
  r = await admin.post('/api/auth/login').send({ email: 'admin@vnrvjiet.in', password: 'Admin@123' });
  assert.equal(r.status, 200);
  r = await admin.get('/api/auth/me');
  assert.equal(r.body.user.role, 'ADMIN');
  r = await anon.get('/api/resources');
  assert.equal(r.status, 401);
  r = await anon.get('/api/resources').set('Cookie', 'token=garbage');
  assert.equal(r.status, 401);
});

test('resources: RBAC + validation + CRUD', async () => {
  let r = await ravi.post('/api/resources').send({ name: 'Hall', type: 'SEMINAR_HALL', location: 'Block A' });
  assert.equal(r.status, 403);

  r = await admin.post('/api/resources').send({ name: 'Hall', type: 'POOL', location: 'Block A' });
  assert.equal(r.status, 400);

  r = await admin.post('/api/resources').send({ name: 'Seminar Hall A', type: 'SEMINAR_HALL', location: 'Main Block', capacity: 100 });
  assert.equal(r.status, 201);
  resourceId = r.body.resource._id;

  r = await admin.post('/api/resources').send({ name: 'Seminar Hall A', type: 'SEMINAR_HALL', location: 'Other block' });
  assert.equal(r.status, 409);

  r = await admin.post('/api/resources').send({ name: 'Badminton Court', type: 'SPORTS', location: 'Stadium', availabilityStatus: 'MAINTENANCE' });
  maintId = r.body.resource._id;

  r = await ravi.get('/api/resources?type=SEMINAR_HALL');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 1);

  r = await ravi.get('/api/resources/123');
  assert.equal(r.status, 400);
  r = await ravi.get('/api/resources/64b000000000000000000000');
  assert.equal(r.status, 404);

  r = await admin.patch(`/api/resources/${resourceId}`).send({ description: 'Projector + AC' });
  assert.equal(r.status, 200);
  assert.equal(r.body.resource.description, 'Projector + AC');
});

test('bookings: create rules', async () => {
  let r = await ravi.post('/api/bookings').send({ resource: resourceId, startTime: future(2, 12), endTime: future(2, 10), purpose: 'Club meeting' });
  assert.equal(r.status, 400, 'end before start');

  r = await ravi.post('/api/bookings').send({ resource: resourceId, startTime: '2020-01-01T10:00:00Z', endTime: '2020-01-01T11:00:00Z', purpose: 'Club meeting' });
  assert.equal(r.status, 400, 'past');

  r = await ravi.post('/api/bookings').send({ resource: maintId, startTime: future(2, 10), endTime: future(2, 11), purpose: 'Practice match' });
  assert.equal(r.status, 409, 'maintenance resource');

  r = await ravi.post('/api/bookings').send({ resource: resourceId, startTime: future(2, 10), endTime: future(2, 11), purpose: 'Big event', attendees: 500 });
  assert.equal(r.status, 400, 'over capacity');

  r = await ravi.post('/api/bookings').send({ resource: resourceId, startTime: future(2, 10), endTime: future(2, 12), purpose: 'Coding club orientation', attendees: 50 });
  assert.equal(r.status, 201);
  assert.equal(r.body.booking.status, 'PENDING');
  b1 = r.body.booking._id;

  r = await ravi.post('/api/bookings').send({ resource: resourceId, startTime: future(2, 11), endTime: future(2, 13), purpose: 'Duplicate request' });
  assert.equal(r.status, 409, 'own overlapping pending');

  r = await priya.post('/api/bookings').send({ resource: resourceId, startTime: future(2, 11), endTime: future(2, 12), purpose: 'AI workshop session' });
  assert.equal(r.status, 201, 'others may request the same pending slot');
  b2 = r.body.booking._id;

  r = await priya.post('/api/bookings').send({ resource: resourceId, startTime: future(3, 9), endTime: future(3, 10), purpose: 'Study group meet' });
  b3 = r.body.booking._id;
});

test('bookings: ownership isolation', async () => {
  let r = await ravi.get('/api/bookings/my');
  assert.equal(r.body.count, 1);
  r = await ravi.get(`/api/bookings/${b2}`);
  assert.equal(r.status, 403);
  r = await ravi.patch(`/api/bookings/${b2}/cancel`).send({});
  assert.equal(r.status, 403);
  r = await ravi.get('/api/bookings');
  assert.equal(r.status, 403, 'users cannot list all bookings');
  r = await ravi.patch(`/api/bookings/${b1}/review`).send({ status: 'APPROVED' });
  assert.equal(r.status, 403, 'users cannot approve');
});

test('admin review: approve auto-rejects overlapping pending, reject needs reason', async () => {
  let r = await admin.get('/api/bookings?status=PENDING');
  assert.equal(r.body.count, 3);

  r = await admin.patch(`/api/bookings/${b1}/review`).send({ status: 'REJECTED' });
  assert.equal(r.status, 400, 'reason required');

  r = await admin.patch(`/api/bookings/${b1}/review`).send({ status: 'APPROVED', adminRemark: 'OK' });
  assert.equal(r.status, 200);
  assert.equal(r.body.booking.status, 'APPROVED');
  assert.equal(r.body.autoRejected, 1);

  r = await priya.get(`/api/bookings/${b2}`);
  assert.equal(r.body.booking.status, 'REJECTED');

  r = await admin.patch(`/api/bookings/${b1}/review`).send({ status: 'REJECTED', adminRemark: 'changed mind' });
  assert.equal(r.status, 409, 'only pending can be reviewed');

  r = await priya.post('/api/bookings').send({ resource: resourceId, startTime: future(2, 11), endTime: future(2, 12), purpose: 'Try again later' });
  assert.equal(r.status, 409, 'approved slot is blocked');

  r = await ravi.get(`/api/resources/${resourceId}/availability?date=${localDate(2)}&tzOffset=${new Date().getTimezoneOffset()}`);
  assert.equal(r.status, 200);
  assert.ok(r.body.bookedSlots.length >= 1, JSON.stringify(r.body));
});

test('cancel rules + stats + delete guard', async () => {
  let r = await priya.patch(`/api/bookings/${b3}/cancel`).send({});
  assert.equal(r.status, 200);
  assert.equal(r.body.booking.status, 'CANCELLED');
  r = await priya.patch(`/api/bookings/${b3}/cancel`).send({});
  assert.equal(r.status, 409);

  r = await admin.get('/api/bookings/stats');
  assert.equal(r.status, 200);
  assert.equal(r.body.stats.bookingsByStatus.APPROVED, 1);

  r = await admin.delete(`/api/resources/${resourceId}`);
  assert.equal(r.status, 409, 'has upcoming approved booking');

  r = await admin.patch(`/api/resources/${resourceId}/availability`).send({ availabilityStatus: 'UNAVAILABLE' });
  assert.equal(r.status, 200);
  r = await priya.post('/api/bookings').send({ resource: resourceId, startTime: future(5, 9), endTime: future(5, 10), purpose: 'Seminar prep' });
  assert.equal(r.status, 409);

  r = await admin.delete(`/api/resources/${maintId}`);
  assert.equal(r.status, 200);
});

test('combined seminar hall: combine rules, linked conflicts, status board, split', async () => {
  const mk = (roomNumber, extra = {}) =>
    admin.post('/api/resources').send({ name: roomNumber, type: 'CLASSROOM', location: 'T Block, 9th Floor', building: 'T Block', floor: 9, roomNumber, capacity: 60, ...extra });
  const r1 = (await mk('T901')).body.resource;
  const r2 = (await mk('T902')).body.resource;
  const r4 = (await mk('T904')).body.resource;
  const lab = (await admin.post('/api/resources').send({ name: 'T Lab', type: 'LAB', location: 'T Block', building: 'T Block', floor: 9, roomNumber: 'T903' })).body.resource;

  let r = await ravi.post('/api/resources/combine').send({ rooms: [r1._id, r2._id] });
  assert.equal(r.status, 403, 'students cannot combine rooms');
  r = await admin.post('/api/resources/combine').send({ rooms: [r1._id, r4._id] });
  assert.equal(r.status, 400, 'rooms must be adjacent');
  r = await admin.post('/api/resources/combine').send({ rooms: [r2._id, lab._id] });
  assert.equal(r.status, 400, 'only classrooms');

  r = await admin.post('/api/resources/combine').send({ rooms: [r2._id, r1._id] });
  assert.equal(r.status, 201);
  const hall = r.body.resource;
  assert.equal(hall.type, 'SEMINAR_HALL');
  assert.equal(hall.capacity, 120);
  assert.equal(hall.roomNumber, 'T901 + T902');

  r = await admin.post('/api/resources/combine').send({ rooms: [r1._id, r2._id] });
  assert.equal(r.status, 409, 'already combined');

  // Booking a classroom blocks the hall, and approving the hall rejects the room's pending requests
  r = await ravi.post('/api/bookings').send({ resource: r1._id, startTime: future(4, 10), endTime: future(4, 11), purpose: 'Tutorial class' });
  const roomBooking = r.body.booking._id;
  r = await priya.post('/api/bookings').send({ resource: hall._id, startTime: future(4, 10), endTime: future(4, 12), purpose: 'Guest lecture' });
  assert.equal(r.status, 201, 'pending requests may compete');
  const hallBooking = r.body.booking._id;

  r = await admin.patch(`/api/bookings/${hallBooking}/review`).send({ status: 'APPROVED' });
  assert.equal(r.status, 200);
  assert.equal(r.body.autoRejected, 1, 'overlapping request on a part room is auto-rejected');
  r = await ravi.get(`/api/bookings/${roomBooking}`);
  assert.equal(r.body.booking.status, 'REJECTED');

  r = await ravi.post('/api/bookings').send({ resource: r2._id, startTime: future(4, 11), endTime: future(4, 12), purpose: 'Doubt clearing' });
  assert.equal(r.status, 409, 'room is blocked by the approved hall');
  assert.match(r.body.message, /Seminar Hall/);

  r = await ravi.get(`/api/resources/${r2._id}/availability?date=${localDate(4)}&tzOffset=${new Date().getTimezoneOffset()}`);
  assert.ok(r.body.bookedSlots.some((b) => b.via === hall.name), 'room schedule shows the hall booking');

  r = await ravi.get(`/api/resources/status?start=${future(4, 10)}&end=${future(4, 11)}`);
  assert.equal(r.body.statuses[hall._id].state, 'BOOKED');
  assert.equal(r.body.statuses[r1._id].state, 'BOOKED');
  assert.equal(r.body.statuses[r1._id].via, hall.name);
  assert.equal(r.body.statuses[r4._id].state, 'FREE');

  r = await ravi.get(`/api/resources/${r1._id}`);
  assert.equal(r.body.partOf[0].name, hall.name);

  r = await admin.delete(`/api/resources/${r1._id}`);
  assert.equal(r.status, 409, 'cannot delete a room that is part of a hall');
  r = await admin.delete(`/api/resources/${hall._id}`);
  assert.equal(r.status, 409, 'hall has an upcoming booking');

  // A classroom under maintenance makes its hall unbookable
  await admin.patch(`/api/bookings/${hallBooking}/cancel`).send({});
  await admin.patch(`/api/resources/${r2._id}/availability`).send({ availabilityStatus: 'MAINTENANCE' });
  r = await priya.post('/api/bookings').send({ resource: hall._id, startTime: future(6, 10), endTime: future(6, 11), purpose: 'Department meeting' });
  assert.equal(r.status, 409);

  r = await admin.delete(`/api/resources/${hall._id}`);
  assert.equal(r.status, 200, 'split works once the hall has no upcoming bookings');
  r = await admin.delete(`/api/resources/${r4._id}`);
  assert.equal(r.status, 200);
});

test('one room at a time: a second overlapping booking needs confirmation', async () => {
  const mk = (roomNumber, capacity, extra = {}) =>
    admin.post('/api/resources').send({ name: roomNumber, type: 'CLASSROOM', location: 'Q Block, 1st Floor', building: 'Q Block', floor: 1, roomNumber, capacity, ...extra });
  global.q = {};
  for (const [no, cap, extra] of [['Q101', 60], ['Q102', 40], ['Q103', 80], ['Q104', 60, { availabilityStatus: 'MAINTENANCE' }], ['Q105', 70]]) {
    global.q[no] = (await mk(no, cap, extra)).body.resource;
  }
  let r = await ravi.post('/api/auth/login').send({ email: 'ravi@vnrvjiet.in', password: 'User@1234' });
  assert.equal(r.status, 200);

  r = await ravi.post('/api/bookings').send({ resource: q.Q101._id, startTime: future(8, 10), endTime: future(8, 11), purpose: 'Data structures lab', attendees: 50 });
  assert.equal(r.status, 201);
  global.raviQ101 = r.body.booking._id;

  r = await ravi.post('/api/bookings').send({ resource: q.Q105._id, startTime: future(8, 10), endTime: future(8, 11), purpose: 'Second room same time', attendees: 30 });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'ALREADY_HAS_BOOKING');
  assert.equal(r.body.details.existing[0].resource.name, 'Q101');
  assert.match(r.body.message, /Are you sure/);

  r = await ravi.post('/api/bookings').send({ resource: q.Q105._id, startTime: future(8, 10), endTime: future(8, 11), purpose: 'Second room same time', attendees: 30, confirmMultiple: true });
  assert.equal(r.status, 201, 'allowed after confirming');
  global.raviQ105 = r.body.booking._id;

  r = await ravi.post('/api/bookings').send({ resource: q.Q102._id, startTime: future(8, 12), endTime: future(8, 13), purpose: 'Later the same day' });
  assert.equal(r.status, 201, 'non-overlapping bookings need no confirmation');
});

test('approving one of several requests offers the others similar free rooms', async () => {
  let r = await priya.post('/api/bookings').send({ resource: q.Q101._id, startTime: future(8, 10), endTime: future(8, 11), purpose: 'Placement talk', attendees: 55 });
  assert.equal(r.status, 201);
  const priyaQ101 = r.body.booking._id;

  r = await admin.get('/api/bookings?status=PENDING');
  const raviReq = r.body.bookings.find((b) => b._id === raviQ101);
  assert.equal(raviReq.competing, 1, 'admin sees the competing request');

  // Q105 becomes busy at that time, so it must not be suggested
  r = await admin.patch(`/api/bookings/${raviQ105}/review`).send({ status: 'APPROVED' });
  assert.equal(r.status, 200);

  r = await admin.patch(`/api/bookings/${raviQ101}/review`).send({ status: 'APPROVED' });
  assert.equal(r.status, 200);
  assert.equal(r.body.autoRejected, 1);

  r = await priya.get(`/api/bookings/${priyaQ101}`);
  assert.equal(r.body.booking.status, 'REJECTED');
  assert.equal(r.body.booking.autoRejected, true);

  r = await priya.get('/api/notifications');
  assert.ok(r.body.unread >= 1);
  const n = r.body.notifications.find((x) => x.type === 'SLOT_TAKEN');
  assert.ok(n, 'priya was notified');
  assert.equal(n.booking._id, priyaQ101);

  r = await priya.get(`/api/bookings/${priyaQ101}/alternatives`);
  assert.equal(r.status, 200);
  assert.equal(r.body.needed, 55);
  const names = r.body.suggestions.map((x) => x.resource.name);
  assert.ok(names.includes('Q103'), `Q103 (80 seats, free) should be suggested, got ${names}`);
  for (const bad of ['Q101', 'Q102', 'Q104', 'Q105']) assert.ok(!names.includes(bad), `${bad} must not be suggested`);
  for (const x of r.body.suggestions) assert.ok(x.resource.capacity >= 55, 'every suggestion has enough seats');
  const gaps = r.body.suggestions.filter((x) => !x.competing).map((x) => Math.abs(x.resource.capacity - 55));
  assert.deepEqual(gaps, [...gaps].sort((a, b) => a - b), 'closest capacity first');

  // Live re-check: once Q103 is taken at that time it disappears from the suggestions
  r = await ravi.post('/api/bookings').send({ resource: q.Q103._id, startTime: future(8, 10), endTime: future(8, 11), purpose: 'Taking Q103 too', confirmMultiple: true });
  await admin.patch(`/api/bookings/${r.body.booking._id}/review`).send({ status: 'APPROVED' });
  r = await priya.get(`/api/bookings/${priyaQ101}/alternatives`);
  assert.ok(!r.body.suggestions.some((x) => x.resource.name === 'Q103'));

  r = await ravi.get(`/api/bookings/${priyaQ101}/alternatives`);
  assert.equal(r.status, 403, "can't see someone else's alternatives");

  // Notifications are private and can be marked read
  const ravisNote = (await ravi.get('/api/notifications')).body.notifications[0];
  r = await priya.patch(`/api/notifications/${ravisNote._id}/read`).send({});
  assert.equal(r.status, 404);
  r = await priya.patch('/api/notifications/read-all').send({});
  assert.equal(r.status, 200);
  r = await priya.get('/api/notifications');
  assert.equal(r.body.unread, 0);
});

test('logout clears session; unknown route 404', async () => {
  let r = await ravi.post('/api/auth/logout');
  assert.equal(r.status, 200);
  r = await ravi.get('/api/auth/me');
  assert.equal(r.status, 401);
  r = await anon.get('/api/nope');
  assert.equal(r.status, 404);
});
