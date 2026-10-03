# ADR 0001: Separate Next.js client and standalone Express API

## Context
Section 6 of the specification lists two architectures: "Express integrated within Next.js" and
"Next.js (separate client application) + Express (separate standalone server)". The submission
instructions ask for separate frontend and backend repositories and a live backend API URL.

## Decision
Two applications: a Next.js client (doctor-tracker-web) and a standalone Express REST API
(doctor-tracker-api) backed by MongoDB. The frontend communicates with the backend only over REST.
No Server Actions or Route Handlers access the database.

## Consequences
+ Clear separation of concerns; the API can serve other clients (mobile, integrations).
+ Independent deployment and scaling (Vercel / Render).
- Cross-origin concerns for auth cookies (addressed in the authentication design).
- Validation schemas are duplicated in both repos.