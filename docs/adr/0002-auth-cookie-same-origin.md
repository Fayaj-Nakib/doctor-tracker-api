# ADR 0002: JWT in httpOnly cookie, served same-origin through a Next.js rewrite

## Context
The client (Vercel) and API (Render) live on different domains. A cookie set by the API domain
would be a third-party cookie for the client: blocked by Safari, and invisible to the Next.js
route guard (proxy.ts), which runs on the client domain.

## Decision
The browser only talks to the client origin. Next.js rewrites `/api/*` to the Express API, so the
auth cookie is first-party. The JWT is stored in an httpOnly, Secure, SameSite=Lax cookie.
proxy.ts verifies the JWT signature to guard pages; the API independently verifies every request
(requireAuth) and checks the role (requireRole).

## Consequences
+ No token in JavaScript (XSS cannot read it), no CORS preflights, works in Safari.
+ Defense in depth: page guard on the client, real enforcement on the API.
- The client must know JWT_SECRET to verify signatures (server-side only, never exposed).
- One extra network hop through Vercel for API calls.