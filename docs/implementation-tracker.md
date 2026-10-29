# Implementation Tracker — Wedding Guest Manager

**Last updated:** 2026-10-29

## Overall Status
Implementation complete for the scoped SaaS. Core flows verified against a real
PostgreSQL database with unit, integration, and HTTP end-to-end smoke tests.
Browser-based Playwright E2E is not runnable in this container (see limitations).

## Completed
- [x] Authentication & workspaces (NextAuth v5, bcrypt, transactional registration)
- [x] Wedding & event management (CRUD, publish/unpublish, ordering)
- [x] Guest management (CRUD, search/filter/pagination, CSV import/export)
- [x] One shared invitation link per wedding
- [x] Public RSVP with family members and per-event responses
- [x] Custom questions rendered and saved
- [x] RSVP edit tokens (hash-only storage, stable on edit)
- [x] RSVP deadlines (wedding- and event-level, enforced server-side)
- [x] Dashboard with reports summary
- [x] Reports (counts, headcount, dietary, groups, event attendance, CSV export)
- [x] Audit logging
- [x] Rate limiting (process-local, documented as not multi-instance safe)
- [x] Tenant/workspace isolation on every private route
- [x] CSRF origin defence in depth
- [x] UX: not-found, error, loading/empty states; hydration-safe invite manager
- [x] TypeScript compiles (PASS with `NODE_OPTIONS=--max-old-space-size=4096`)
- [x] Prisma schema valid
- [x] ESLint configured and passing (no warnings)
- [x] Unit tests (6 suites, 42 tests) passing
- [x] Integration tests (6 tests) passing against `wedding_guest_manager_test`
- [x] HTTP smoke test (28 checks) passing against a running production build
- [x] Production build (PASS, including trace collection after excluding sharp/detect-libc)
- [x] `.env.example` aligned with Auth.js v5 (`AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`)
- [x] Docs updated (README, tracker, agent-tooling)

## QA Results
- TypeScript: PASS
- Prisma Validation: PASS
- Lint: PASS (no warnings)
- Unit Tests: 6 suites / 42 tests PASS
- Integration Tests: 6 tests PASS
- HTTP Smoke Test: 78 checks PASS
- Production Build: PASS (15 static pages generated; trace collection passes)
- Playwright E2E: NOT RUN (browser cannot launch in this container; see limitations)

## Security fixes (initial findings)
1. Undefined `status` reference in `components/rsvp/rsvp-form.tsx` — fixed (removed unused state).
2. Missing `app/auth/register/page.tsx` — implemented.
3. Broken links and missing `/onboarding`, events, guests, reports routes — implemented.
4. Unsafe RSVP API when `mobile`/`fullName` absent — Zod validation + mobile required.
5. Missing wedding/publish validation — Zod schemas + `publishSchema`.
6. Non-transactional registration — `prisma.$transaction` wraps user/workspace/membership.
7. Tracker claims corrected (this document).
8. In-place mutation in family-member state — immutable `map` update.
9. Custom questions fetched but not rendered/saved — rendered in form; answers saved.
10. Invitation URLs from `window.location.origin` during SSR — computed after mount.
11. Edit token not surfaced safely — thank-you page shows private edit link with warning.
12. Route protection/authorization consistency — `requireUserId` + `requireWeddingAccess` on every private route.
13. Rate limiting/abuse controls — 5 req/15 min register, 10 req/10 min RSVP, process-local (documented).
14. Dependencies — verified; no unused direct imports remain in app code.
15. `.env.example` Auth.js mismatch — fixed.
16. Placeholder tests — replaced with behaviour-driven tests.

## Remaining Blockers
- Playwright browser automation does not run in this container (Chromium/Firefox fail to start under gVisor; both error at process launch). The core journey is instead verified by the HTTP smoke test (`npm run test:smoke`), which exercises the real API and page renders.
- Rate limiter is now PostgreSQL-backed and shared across instances (fixed-window, table `RateLimit`). In-memory store remains available for tests.
- Custom questions now have full host management (API + UI) and are covered by the smoke test.
- Latest changes committed and pushed to `main` after verification.

## Test Commands
- `npm test` — 6 suites / 42 tests PASS
- `npm run test:integration` — 6 tests PASS
- `npm run test:smoke` — 78 checks PASS (requires running server + seeded DB)
- `npm run lint` — PASS (no warnings/errors)
- `npx tsc --noEmit` (with `NODE_OPTIONS=--max-old-space-size=4096`) — PASS
- `npm run build` (with increased heap) — PASS
- `npm run test:e2e` — NOT RUN (browser unavailable in this container)
