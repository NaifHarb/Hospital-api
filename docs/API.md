# API foundation — demo only

Base URL: `http://localhost:4000`

## Read
- `GET /api/health` — database connectivity
- `GET /api/departments` — list departments
- `GET /api/rooms` — list rooms
- `GET /api/beds` — list beds and statuses
- `GET /api/dashboard` — bed counts and occupancy percentage
- `GET /api/reservations` — demo reservation references; **not suitable for public deployment**

## Local-only writes
Writes require `ENABLE_UNSAFE_DEMO_WRITES=true` and non-production `NODE_ENV`. Never enable on a publicly reachable server.
- `POST /api/reservations` with `{"bedId":"<uuid>","referenceCode":"DEMO-001"}`
- `POST /api/reservations/<uuid>/cancel` — cancels active reservation
- `POST /api/beds` — create bed
- `PATCH /api/beds/<uuid>/status` — demo administrative status changes

Reservation creation and cancellation lock the bed row in a database transaction, avoiding simultaneous double booking. Real patient details, authorization, admissions, transfers, audit attribution, and security review are not implemented.

## Canonical database migrations
Use `sql/001_init.sql`, `sql/002_demo_seed.sql`, then `sql/003_reservations.sql`. The older `db/` prototype schema uses numeric IDs and is incompatible with the API's UUID model; **do not run files under db/**.
