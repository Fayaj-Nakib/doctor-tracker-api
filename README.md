# Doctor Tracker API

[![CI](https://github.com/Fayaj-Nakib/doctor-tracker-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Fayaj-Nakib/doctor-tracker-api/actions/workflows/ci.yml)

REST API for **Doctor Tracker**, an admin portal for managing doctors and their patients. Express 5 + TypeScript + MongoDB (Mongoose), validated with Zod, secured with JWT in httpOnly cookies.

- **Live:** https://doctor-tracker-api-trq4.onrender.com/api/v1/health
- **Frontend + full documentation** (architecture, technical decisions, screenshots): https://github.com/Fayaj-Nakib/doctor-tracker-web

## Description

The API owns all business logic and data access for Doctor Tracker: authentication and role-based authorization, doctor and patient management with search, filtering and pagination, and a dashboard endpoint that computes every metric in a single aggregation. Every list endpoint is served by a compound index shaped to its query, verified with `explain()`.

## Setup Guide

Requires **Node.js 20.9+** and a MongoDB connection (Atlas M0 or local).

```bash
npm install
cp .env.example .env     # fill in the values below
npm run seed             # 60 doctors + 5,000 patients across the last 12 months
npm run dev              # http://localhost:4000/api/v1/health
```

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Database connection string (include the database name, e.g. `/doctor_tracker`) |
| `JWT_SECRET` | 64+ random hex characters; must match the frontend's `JWT_SECRET` |
| `JWT_EXPIRES_IN` | Session length in seconds (default `86400`) |
| `CORS_ORIGINS` | Allowed browser origins, comma-separated |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created on first start |

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with reload |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run lint` / `npm run typecheck` | Checks run by CI |
| `npm run seed` | Reset doctors and patients with deterministic sample data, and sync indexes |
| `npm run explain` | Print MongoDB execution plans for the hottest queries |

## System Architecture

```
src/
  config/       env (validated at boot), db connection
  models/       Mongoose schemas + query-shaped indexes
  modules/      one folder per resource: routes → controller → service (+ Zod schema)
    auth/  doctors/  patients/  stats/  meta/
  middleware/   requireAuth, requireRole, validateBody, notFound, errorHandler
  utils/        ApiError, query helpers (pagination, date ranges), search tokens
  scripts/      seed, explain
```

### Endpoints (prefix `/api/v1`)

All routes except `health` and `auth/*` require a session **and** the `admin` role.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/auth/login` · `/auth/logout` | Sets / clears the httpOnly `dt_token` cookie; login rate-limited |
| GET | `/auth/me` | Current user |
| GET | `/doctors` | `search` (name or email), `specialization`, `hospital`, `from`, `to`, `sort`, `page`, `limit` |
| POST | `/doctors` | 201; 409 on duplicate email |
| GET | `/doctors/:id` | Includes `patientCount` |
| GET · POST | `/doctors/:id/patients` | That doctor's patients (same filters as `/patients`) · add a patient |
| GET | `/patients` | `search`, `condition`, `gender`, `doctorId`, `from`, `to`, `sort`, `page`, `limit` |
| GET · PATCH · DELETE | `/patients/:id` | 200 · 200 · 204 |
| GET | `/stats/overview` | Whole dashboard in one `$facet` aggregation; optional `from`, `to` |
| GET | `/meta/options` | Specializations, hospitals, conditions, genders for dropdowns |

**Lists** return `{ data: [...], meta: { page, limit, total, totalPages } }`.
**Errors** return `{ error: { code, message, details? } }` with 400 (validation, with per-field details), 401, 403, 404, 409 or 500 (no stack trace in production).

## Technical Decisions

See the [frontend README](https://github.com/Fayaj-Nakib/doctor-tracker-web#technical-decisions) for the full write-up. In short:

1. **Query-shaped compound indexes** (`filter → sort → _id`), verified with `npm run explain`. Every filtered page reads exactly the documents it returns, with no in-memory sort.
2. **Patients reference their doctor** instead of being embedded ([ADR 0003](docs/adr/0003-reference-patients.md)): safe growth past the 16 MB document limit, and direct indexed queries for the all-patients page.

Also see [ADR 0001](docs/adr/0001-separate-backend.md) (separate API) and [ADR 0002](docs/adr/0002-auth-cookie-same-origin.md) (cookie auth).