// Resets the database and inserts sample data + test accounts.
// Usage: npm run seed
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

const at = (daysFromNow, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
};
// Relative to right now, so the floor plan always has something live to show
const fromNow = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

const ORDINAL = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];
const FLOORS = 5;
const ROOMS_PER_FLOOR = 10;
const BLOCK = 'E Block';

function eBlockRooms(adminId) {
  const rooms = [];
  for (let f = 1; f <= FLOORS; f++) {
    for (let n = 1; n <= ROOMS_PER_FLOOR; n++) {
      const roomNumber = `E${f}${String(n).padStart(2, '0')}`; // E101 … E510
      const corner = n === 1 || n === ROOMS_PER_FLOOR;
      const amenities = ['Projector', 'Whiteboard'];
      if (f >= 3) amenities.push('AC');
      if (n % 3 === 0) amenities.push('Smart board');
      rooms.push({
        name: roomNumber,
        type: 'CLASSROOM',
        building: BLOCK,
        floor: f,
        roomNumber,
        location: `${BLOCK}, ${ORDINAL[f]} Floor`,
        capacity: corner ? 72 : 60,
        amenities,
        description: `Classroom on the ${ORDINAL[f].toLowerCase()} floor of ${BLOCK}.`,
        createdBy: adminId,
      });
    }
  }
  return rooms;
}

async function seed() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Resource.deleteMany({}), Booking.deleteMany({}), Notification.deleteMany({})]);
  await Promise.all([User.syncIndexes(), Resource.syncIndexes(), Booking.syncIndexes()]);

  // create() (not insertMany) so the password-hashing hook runs
  const admin = await User.create({
    name: 'Campus Admin',
    email: 'admin@vnrvjiet.in',
    password: 'Admin@123',
    role: 'ADMIN',
    department: 'Administration',
  });
  const [ravi, priya, arjun, suresh] = await Promise.all([
    User.create({ name: 'Ravi Kumar', email: 'ravi@vnrvjiet.in', password: 'User@1234', department: 'CSE', designation: 'STUDENT' }),
    User.create({ name: 'Priya Sharma', email: 'priya@vnrvjiet.in', password: 'User@1234', department: 'IT', designation: 'STUDENT' }),
    User.create({ name: 'Arjun Reddy', email: 'arjun@vnrvjiet.in', password: 'User@1234', department: 'ECE', designation: 'STUDENT' }),
    User.create({ name: 'Dr. Suresh Rao', email: 'suresh@vnrvjiet.in', password: 'User@1234', department: 'CSE', designation: 'FACULTY' }),
  ]);

  // ---- E Block: 5 floors × 10 classrooms ----
  const roomDocs = eBlockRooms(admin._id);
  roomDocs.find((r) => r.roomNumber === 'E207').availabilityStatus = 'MAINTENANCE';
  roomDocs.find((r) => r.roomNumber === 'E402').availabilityStatus = 'UNAVAILABLE';
  const rooms = await Resource.insertMany(roomDocs);
  const room = (no) => rooms.find((r) => r.roomNumber === no);

  // ---- One combined seminar hall per floor: E_09 + E_10 ----
  const halls = [];
  for (let f = 1; f <= FLOORS; f++) {
    const a = room(`E${f}09`);
    const b = room(`E${f}10`);
    halls.push(
      await Resource.create({
        name: `Seminar Hall ${a.roomNumber} + ${b.roomNumber}`,
        type: 'SEMINAR_HALL',
        building: BLOCK,
        floor: f,
        roomNumber: `${a.roomNumber} + ${b.roomNumber}`,
        location: a.location,
        capacity: a.capacity + b.capacity,
        amenities: [...new Set([...a.amenities, ...b.amenities, 'Movable partition', 'Mic'])],
        description: `Made by opening the partition between ${a.roomNumber} and ${b.roomNumber}. Booking the hall reserves both classrooms.`,
        combinedFrom: [a._id, b._id],
        createdBy: admin._id,
      })
    );
  }
  const hall = (f) => halls[f - 1];

  // ---- Other campus facilities ----
  const others = await Resource.insertMany(
    [
      { name: 'Computer Lab 1', type: 'LAB', location: 'IT Block, Ground Floor', capacity: 60, amenities: ['60 PCs', 'Projector', 'Wi-Fi'] },
      { name: 'Electronics Lab', type: 'LAB', location: 'ECE Block, 1st Floor', capacity: 40, amenities: ['Oscilloscopes', 'Soldering stations'] },
      { name: 'Main Auditorium', type: 'AUDITORIUM', location: 'Central Campus', capacity: 800, amenities: ['Stage', 'Sound system', 'AC'], description: 'The main venue for fests, convocations and guest lectures.' },
      { name: 'Basketball Court', type: 'SPORTS', location: 'Sports Complex', capacity: 30, amenities: ['Floodlights'] },
      { name: 'Badminton Court', type: 'SPORTS', location: 'Indoor Stadium', capacity: 8, amenities: ['Wooden flooring'], availabilityStatus: 'MAINTENANCE' },
    ].map((r) => ({ ...r, createdBy: admin._id }))
  );
  const other = (name) => others.find((r) => r.name === name);

  const reviewed = { reviewedBy: admin._id, reviewedAt: new Date() };

  const bookings = await Booking.insertMany([
    // Happening right now, so the floor plan shows live bookings
    { user: ravi._id, resource: room('E102')._id, startTime: fromNow(-30), endTime: fromNow(90), purpose: 'DBMS tutorial for section B', attendees: 55, status: 'APPROVED', ...reviewed },
    { user: priya._id, resource: room('E203')._id, startTime: fromNow(-15), endTime: fromNow(105), purpose: 'Coding club weekly meetup', attendees: 40, status: 'APPROVED', ...reviewed },
    { user: arjun._id, resource: hall(3)._id, startTime: fromNow(-20), endTime: fromNow(100), purpose: 'IEEE student branch talk', attendees: 110, status: 'APPROVED', ...reviewed },
    { user: ravi._id, resource: room('E405')._id, startTime: fromNow(-10), endTime: fromNow(80), purpose: 'Placement aptitude practice', attendees: 50, status: 'APPROVED', ...reviewed },
    { user: priya._id, resource: room('E504')._id, startTime: fromNow(20), endTime: fromNow(80), purpose: 'Project review with guide', attendees: 12, status: 'PENDING' },

    // Upcoming requests
    { user: ravi._id, resource: room('E101')._id, startTime: at(2, 10), endTime: at(2, 12), purpose: 'Coding club orientation session', attendees: 60, status: 'APPROVED', ...reviewed },
    { user: arjun._id, resource: room('E110')._id, startTime: at(2, 10), endTime: at(2, 11), purpose: 'ECE lab viva preparation', attendees: 30, status: 'APPROVED', ...reviewed },
    { user: priya._id, resource: hall(1)._id, startTime: at(2, 14), endTime: at(2, 16), purpose: 'AI workshop by IT department', attendees: 120, status: 'PENDING' },
    { user: arjun._id, resource: room('E204')._id, startTime: at(3, 9), endTime: at(3, 11), purpose: 'Mini project discussion', attendees: 35, status: 'PENDING' },
    // Two requests competing for E204 — approving one will offer the other similar rooms
    { user: priya._id, resource: room('E204')._id, startTime: at(3, 9, 30), endTime: at(3, 10, 30), purpose: 'Web dev club session', attendees: 45, status: 'PENDING' },
    { user: suresh._id, resource: hall(4)._id, startTime: at(5, 14), endTime: at(5, 16), purpose: 'Faculty development programme', attendees: 110, status: 'PENDING' },
    { user: ravi._id, resource: hall(2)._id, startTime: at(3, 15), endTime: at(3, 17), purpose: 'Hackathon kickoff and team formation', attendees: 130, status: 'PENDING' },
    { user: priya._id, resource: other('Main Auditorium')._id, startTime: at(7, 10), endTime: at(7, 13), purpose: 'Annual tech fest opening ceremony', attendees: 600, status: 'PENDING' },

    // History
    { user: ravi._id, resource: other('Basketball Court')._id, startTime: at(1, 17), endTime: at(1, 19), purpose: 'Inter-department basketball practice', attendees: 20, status: 'REJECTED', adminRemark: 'Court reserved for varsity trials', ...reviewed },
    { user: arjun._id, resource: room('E305')._id, startTime: at(4, 11), endTime: at(4, 12), purpose: 'Club committee meeting', attendees: 25, status: 'CANCELLED', cancelledAt: new Date() },

    // Faculty got E301; Ravi's overlapping request was auto-rejected (he'll see suggestions when he logs in)
    { user: suresh._id, resource: room('E301')._id, startTime: at(2, 11), endTime: at(2, 12), purpose: 'Compiler design guest lecture', attendees: 65, status: 'APPROVED', ...reviewed },
    { user: ravi._id, resource: room('E301')._id, startTime: at(2, 11), endTime: at(2, 12), purpose: 'Coding contest practice', attendees: 58, status: 'REJECTED', autoRejected: true, adminRemark: 'Auto-rejected: this time was given to another request (E301)', ...reviewed },
  ]);

  const lost = bookings.find((b) => b.autoRejected);
  await Notification.create([
    {
      user: ravi._id,
      type: 'SLOT_TAKEN',
      title: 'E301 went to another request',
      message: 'Your request for the same time could not be approved. Similar rooms are free then with enough seats.',
      booking: lost._id,
    },
    {
      user: ravi._id,
      type: 'APPROVED',
      title: 'E101 is booked for you',
      message: 'Coding club orientation session',
      booking: bookings.find((b) => String(b.resource) === String(room('E101')._id))._id,
      read: true,
    },
  ]);

  console.log('\nSeed complete');
  console.log(`  ${rooms.length} classrooms (E101–E510), ${halls.length} combined seminar halls, ${others.length} other facilities`);
  console.log('  ADMIN  admin@vnrvjiet.in / Admin@123');
  console.log('  USER   ravi@vnrvjiet.in  / User@1234');
  console.log('  USER   priya@vnrvjiet.in / User@1234');
  console.log('  USER   arjun@vnrvjiet.in / User@1234');
  console.log('  USER   suresh@vnrvjiet.in / User@1234  (faculty)\n');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
