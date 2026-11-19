# Hospital Bed Management API

Node.js + Express + PostgreSQL backend foundation. **Not production-ready**: no authentication, RBAC, patient workflows or deployed server yet. Use synthetic data only.

## Setup
1. Install Node.js 20+ and PostgreSQL 15+.
2. Create a local database and user, then copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `npm install`.
4. Apply `sql/001_init.sql` then `sql/002_demo_seed.sql` using `psql -d hospital_beds -f sql/001_init.sql` and `psql -d hospital_beds -f sql/002_demo_seed.sql` (configure credentials as needed).
5. Run `npm run dev`.
6. Test `GET http://localhost:4000/api/health`, `/api/dashboard`, `/api/departments`, `/api/rooms` and `/api/beds`.

## Security
Mutation routes are intentionally **disabled** unless `ENABLE_UNSAFE_DEMO_WRITES=true` in a non-production environment. This flag is for isolated local testing only. Never expose the prototype to a public network or real hospital data. Full authentication, authorization, audit logging, reservation workflows and server deployment are pending.

## API
- `GET /api/health` - database readiness
- `GET /api/dashboard` - counts by bed status
- `GET /api/departments` - departments
- `GET /api/rooms?departmentId=<uuid>` - rooms
- `GET /api/beds?departmentId=<uuid>` - beds
- `POST /api/beds` - local prototype only
- `PATCH /api/beds/:id/status` - local prototype only
