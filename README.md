# CampusSpace AI: Campus Resource Booking (P04)

Classrooms, seminar halls, labs, auditoriums and sports courts are shared across a college, and booking them usually means paper forms and phone calls. CampusSpace replaces that for **VNR VJIET** with a REST API and a React UI. Students check a live floor plan of E Block, see which rooms are free, and send a booking request. Admins approve or reject requests, control which spaces can be booked, and can join two neighbouring classrooms into a seminar hall.

Only college accounts ending in **@vnrvjiet.in** can register or sign in.

**Stack:** Node.js, Express 5, MongoDB with Mongoose, JWT in an HTTP-only cookie, bcrypt, Zod validation. The frontend is React (Vite) with Tailwind.

---

## Quick start

You need Node 18 or newer and a MongoDB connection string (Atlas or local).

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # then fill in MONGO_URI and JWT_SECRET
npm run seed                # sample data + test accounts (wipes the DB)
npm run dev                 # http://localhost:5000

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test credentials (after `npm run seed`)

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| ADMIN | admin@vnrvjiet.in   | Admin@123 |
| USER  | ravi@vnrvjiet.in    | User@1234 |
| USER  | priya@vnrvjiet.in   | User@1234 |
| USER  | arjun@vnrvjiet.in   | User@1234 |
| USER (faculty) | suresh@vnrvjiet.in | User@1234 |

The seed creates:

- **E Block:** 5 floors × 10 classrooms, **E101–E110** on the 1st floor up to **E501–E510** on the 5th. E207 is under maintenance and E402 is unavailable.
- **5 combined seminar halls**, one per floor (E109 + E110, E209 + E210, …).
- **5 other facilities:** two labs, the auditorium and two courts.
- **16 bookings** covering every status. A few are timed around the moment you seed, so the floor plan shows rooms in use straight away. Two requests compete for E204, so you can demo the suggestions, and Ravi already has a "slot went to another request" notification waiting.

---

## Project structure

```
campusspace-ai/
├── backend/
│   ├── config/db.js              Mongoose connection
│   ├── models/                   User, Resource, Booking
│   ├── validators/schemas.js     Zod schemas for every request
│   ├── middleware/
│   │   ├── auth.js               protect (token + college-domain check) + authorize (role check)
│   │   ├── validate.js           runs Zod schemas on body/params/query
│   │   ├── rateLimit.js          failed-login lockout + request limits (no extra packages)
│   │   └── errorHandler.js       one place that turns errors into JSON + status codes
│   ├── utils/
│   │   ├── emailPolicy.js        the @vnrvjiet.in rule
│   │   └── linkedResources.js    which rooms/halls block each other
│   ├── controllers/              auth, resource, booking logic
│   ├── routes/                   URL → middleware → controller
│   ├── scripts/seed.js
│   ├── tests/api.test.js         integration tests (node:test + supertest)
│   ├── app.js                    Express app (no listen, so tests can import it)
│   └── server.js                 connects DB, then starts listening
├── frontend/                     React + Vite + Tailwind
└── postman/CampusSpace-AI.postman_collection.json
```

---

## Data model

**User**: `name`, `email` (unique), `password` (bcrypt hash, never returned), `role` (`USER` | `ADMIN`, default `USER`), `department`, `designation` (`STUDENT` | `FACULTY` | `STAFF`, a label only, so both students and faculty keep the USER role)

**Resource**: `name` (unique), `type` (`SEMINAR_HALL` `LAB` `SPORTS` `AUDITORIUM` `CLASSROOM` `OTHER`), `location`, `availabilityStatus` (`AVAILABLE` `UNAVAILABLE` `MAINTENANCE`), `capacity`, `amenities[]`, `description`, `building`, `floor`, `roomNumber`, `combinedFrom[] → Resource`, `createdBy → User`

A **combined seminar hall** is a Resource whose `combinedFrom` lists the two classrooms it is made of. The hall and its rooms block each other: a booking on the hall blocks both rooms, and a booking on either room blocks the hall.

**Booking**: `user → User`, `resource → Resource`, `startTime`, `endTime`, `purpose`, `attendees`, `status` (`PENDING` `APPROVED` `REJECTED` `CANCELLED`), `adminRemark`, `autoRejected`, `reviewedBy → User`, `reviewedAt`, `cancelledAt`

**Notification**: `user → User`, `type` (`APPROVED` `REJECTED` `SLOT_TAKEN` `CANCELLED`), `title`, `message`, `booking → Booking`, `suggestions[] → Resource`, `read`

One user has many bookings and one resource has many bookings. The booking document sits between the two, with the time window and the approval state.

---

## API

All routes except register, login, logout, config and health need a logged-in user, and that user's email must end in `@vnrvjiet.in`. The token is read from the `token` cookie (an `Authorization: Bearer` header also works).

### Auth

| Method | Route                | Access | Notes |
|--------|----------------------|--------|-------|
| POST   | /api/auth/register   | Public | `@vnrvjiet.in` emails only (400 otherwise). Always creates a `USER`. Sending `role` is rejected with 400 |
| POST   | /api/auth/login      | Public | `@vnrvjiet.in` only (403). 5 wrong passwords lock that email for 15 minutes (429). Sets the HTTP-only cookie |
| GET    | /api/auth/config     | Public | `{ emailDomain }` so the UI can show the allowed domain |
| POST   | /api/auth/logout     | Public | Clears the cookie |
| GET    | /api/auth/me         | Logged in | Current user |

### Resources

| Method | Route                              | Access | Notes |
|--------|------------------------------------|--------|-------|
| GET    | /api/resources                     | USER, ADMIN | Filters: `type`, `status`, `search`, `building`, `floor` |
| GET    | /api/resources/status              | USER, ADMIN | `?start=ISO&end=ISO`. State of every space for that window (`FREE` `REQUESTED` `BOOKED` `MAINTENANCE` `UNAVAILABLE`, plus `via` when a linked room/hall causes it). Powers the floor plan |
| GET    | /api/resources/:id                 | USER, ADMIN | Also returns `partOf`: the halls a classroom belongs to |
| GET    | /api/resources/:id/availability    | USER, ADMIN | `?date=YYYY-MM-DD&tzOffset=-330`. Taken slots for that day, including ones blocked through a linked hall/room. Never shows who booked them |
| POST   | /api/resources                     | ADMIN | |
| POST   | /api/resources/combine             | ADMIN | `{ rooms: [id, id], name? }`. Two neighbouring classrooms on the same floor → one seminar hall |
| PATCH  | /api/resources/:id                 | ADMIN | Partial update |
| PATCH  | /api/resources/:id/availability    | ADMIN | `{ availabilityStatus }` |
| DELETE | /api/resources/:id                 | ADMIN | Deleting a hall splits it back into rooms. Refused (409) while upcoming bookings exist, or for a room that is still part of a hall |

### Bookings

| Method | Route                       | Access | Notes |
|--------|-----------------------------|--------|-------|
| POST   | /api/bookings               | USER, ADMIN | Creates a `PENDING` request. If you already hold a room at an overlapping time you get `409` with `code: "ALREADY_HAS_BOOKING"`; send again with `"confirmMultiple": true` to confirm |
| GET    | /api/bookings/:id/alternatives | Owner or ADMIN | Similar spaces **free for exactly the same time** with **capacity ≥ attendees**, best fit first |
| GET    | /api/bookings/my            | USER, ADMIN | Only the caller's bookings. `?status=` |
| GET    | /api/bookings/:id           | Owner or ADMIN | |
| PATCH  | /api/bookings/:id/cancel    | Owner or ADMIN | |
| GET    | /api/bookings               | ADMIN | Filters: `status`, `resource`, `user`, `from`, `to`. Pending requests include `competing` (how many others want the same slot) |
| PATCH  | /api/bookings/:id/review    | ADMIN | `{ status: "APPROVED" \| "REJECTED", adminRemark }` |
| GET    | /api/bookings/stats         | ADMIN | Counts for the dashboard |

### Notifications

| Method | Route                          | Access | Notes |
|--------|--------------------------------|--------|-------|
| GET    | /api/notifications             | Logged in | Your latest 30 notifications + `unread` count |
| PATCH  | /api/notifications/:id/read    | Owner | Someone else's notification → 404 |
| PATCH  | /api/notifications/read-all    | Logged in | |

Every error comes back in the same shape:

```json
{ "success": false, "message": "Validation failed", "errors": [{ "field": "endTime", "message": "endTime must be after startTime" }] }
```

---

## Business rules and how they're enforced

| Rule | Where |
|------|-------|
| Resource has name, type, location, availability status | Mongoose schema + Zod |
| Booking has date/time and purpose | Mongoose schema + Zod |
| `endTime` after `startTime`, start in the future, max 12 hours | Zod (`createBooking`) + schema `pre('validate')` |
| Can't book a resource that isn't `AVAILABLE` | `createBooking` → 409 |
| Attendees can't exceed capacity | `createBooking` → 400 |
| Can't book a slot that overlaps an approved booking | overlap query → 409 |
| Can't send two overlapping pending requests for the same resource | overlap query → 409 |
| A user can't view or manage someone else's booking | ownership check → 403 |
| Only admins approve/reject | `authorize('ADMIN')` → 403 |
| Only `PENDING` bookings can be reviewed | `reviewBooking` → 409 |
| Rejecting requires a reason | Zod refine → 400 |
| Approving a slot auto-rejects other pending requests that overlap it | `reviewBooking` |
| Only `PENDING`/`APPROVED` bookings that haven't started can be cancelled | `cancelBooking` → 409 |
| Users can't make themselves admin at signup | strict Zod schema → 400 |
| Only `@vnrvjiet.in` emails can register (look-alikes such as `evilvnrvjiet.in` are rejected) | Zod refine → 400 |
| Only `@vnrvjiet.in` accounts can sign in or use a session | `login` → 403, `protect` → 403 |
| 5 wrong passwords lock that email (from that IP) for 15 minutes | `rateLimit.js` → 429 |
| A hall and the two rooms it's made of block each other | `linkedIds()` in the overlap checks → 409 |
| Approving a hall auto-rejects overlapping pending requests on its rooms (and the other way round) | `reviewBooking` |
| A hall can't be booked while one of its rooms is under maintenance or unavailable | `createBooking` / `reviewBooking` → 409 |
| Only two neighbouring classrooms on the same floor can be combined, and a room can be in only one hall | `combineRooms` → 400 / 409 |
| **One room at a time:** a second booking that overlaps one you already hold needs explicit confirmation | `createBooking` → 409 `ALREADY_HAS_BOOKING` unless `confirmMultiple: true` |
| When the admin approves one of several competing requests, the others are auto-rejected and **notified with similar rooms** | `reviewBooking` → `Notification` (`SLOT_TAKEN`) |
| Suggested rooms are free for the **exact same time** (no approved booking on them or on a linked hall/room, not under maintenance) and have **seats ≥ attendees**. They're re-checked live every time they're shown | `utils/availability.js` → `findAlternatives()` |
| Students/faculty are notified when their request is approved, rejected, or cancelled by an admin | `Notification` |

Two time ranges overlap when `existing.start < new.end` and `existing.end > new.start`. That single condition catches every overlap case: partial overlap at either end, one range inside the other, and exact matches.

### Status codes used

`200` OK · `201` created · `400` validation / bad input · `401` not logged in or bad token · `403` wrong role, not the owner, or not a college account · `404` not found · `409` conflict with current state (slot taken, duplicate, wrong status) · `429` too many attempts · `500` unexpected

### Security

- Passwords are hashed with bcrypt and never returned.
- The JWT is kept in an **HTTP-only** cookie (`secure` + `SameSite=None` in production).
- **College-only access:** `@vnrvjiet.in` is enforced at register, at login, and on every protected request.
- **Brute-force protection:** failed-login lockout, plus request caps on login and register.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `X-Powered-By` removed.
- All input is validated with strict Zod schemas, so unknown fields such as `role` are rejected.

---

## Testing

**Postman:** import `postman/CampusSpace-AI.postman_collection.json`, run `npm run seed`, then run the whole collection in order with the Collection Runner. It has 105 requests in 11 folders covering the success and failure cases above, including the college-email rule, the login lockout, combining/splitting halls, the one-room-at-a-time confirmation, and similar-room suggestions. It cleans up after itself, so you can run it again without reseeding. Postman keeps the login cookie between requests, so each folder starts by logging in as the right person. Booking times are generated a few days ahead on every run, so the collection doesn't go stale.

**Automated:** `npm test` in `backend/` runs 14 integration tests against the database in `TEST_MONGO_URI` (default `mongodb://127.0.0.1:27017/campusspace_test`). It drops that test database when it finishes, so never point it at your real one.

---

## Demo script (about 6 minutes)

1. On the login page, try `someone@gmail.com`. It's refused: only `@vnrvjiet.in` accounts get in.
2. Log in as **ravi**. A pop-up appears straight away: *E301 went to another request*. It lists similar rooms that are free at the same time with at least 58 seats.
3. Click **Request** on the best match. Ravi already has E101 at an overlapping time, so the app asks: *"You already have a room at this time. Are you sure you want to book another?"* Confirm it. (In Postman the same request returns `409 ALREADY_HAS_BOOKING`.)
4. Show the **floor plan**: 50 rooms live, green free, red in use, amber requested. Type *Seats needed: 100* and only the halls stay lit. Click a free room and its form is already filled in with that time.
5. Press **Ctrl + K**, type `E204`, and press Enter.
6. Log in as **admin**. In the Overview queue, the E204 request shows *Competes with 1*. Approve it. The app warns that the other request will be rejected and offered similar rooms.
7. Log in as **priya**. Her pop-up offers E202, E203 and more for the same time. Book one in a single click.
8. **Spaces → Combine rooms**: join E105 + E106 into a hall, then split it again.
9. Run the Postman collection and show that all tests pass.
