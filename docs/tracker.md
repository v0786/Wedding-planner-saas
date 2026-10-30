# Project Tracker — Wedding Planner SaaS

**Last updated:** 2026-10-29
**Overall status:** MVP features locally verified; CI/Playwright E2E blocked by GitHub account billing lock

## Completed
- [x] Authentication & workspaces (NextAuth v5 / Auth.js v5, bcrypt)
- [x] Wedding & event management (CRUD, publish/unpublish, ordering)
- [x] Guest management with CSV import/export
- [x] One shared invitation link per wedding
- [x] Public RSVP with family members
- [x] Event selection (per-event responses)
- [x] Dashboard & reports (counts, dietary, groups, events, RSVP CSV export)
- [x] WhatsApp sharing (invite link)
- [x] RSVP edit tokens (hash-only storage, stable on edit)
- [x] Rate limiting (PostgreSQL-backed, shared across instances; in-memory store for tests)
- [x] Tenant isolation (workspace membership enforced on every private route)
- [x] TypeScript compiles (PASS with `NODE_OPTIONS=--max-old-space-size=4096`)
- [x] Prisma schema valid (PASS)
- [x] ESLint configured and passing (PASS, no warnings)
- [x] Unit tests (7 suites / 46 tests) PASS
- [x] Integration tests (6 tests) PASS
- [x] HTTP smoke test (78 checks) PASS
- [x] Production build PASS (including trace collection)

## QA Results
- TypeScript: PASS
- Prisma Validation: PASS
- Lint: PASS (no warnings)
- Unit Tests: PASS (46 tests)
- Integration Tests: PASS (6 tests)
- HTTP Smoke Test: PASS (78 checks)
- E2E Tests: NOT RUN locally (browser cannot launch in this container); CI workflow added but execution blocked by GitHub account billing lock
- Production Build: PASS (including trace collection)

## Remaining
- [ ] Browser-based Playwright E2E — never run anywhere yet (browsers cannot launch in this container). `.github/workflows/ci.yml` (commit `a4c78c7`, pushed to `main`) runs it in CI; HTTP smoke (78 checks) covers the core journey meanwhile.
- [x] Management UI/API for custom RSVP questions — completed in commit `9f414f1` (API `app/api/weddings/[id]/questions/`, host UI page, smoke coverage).
- [x] Multi-instance-safe rate limiter — completed in commit `5301190` (PostgreSQL `RateLimit` table, migration `20261029202020_add_rate_limit`; in-memory store retained for tests).
- [x] Commit/push — `a4c78c7` committed and pushed to `main` after `workflow` scope granted. GitHub Actions CI triggered (run 40975568009) but **job not started** due to GitHub account billing lock. CI/Playwright E2E remain NOT RUN.
- [ ] `.env.example` still shows `NEXTAUTH_URL`/`NEXTAUTH_SECRET` (v4 names) — actual implementation uses `AUTH_URL`/`AUTH_SECRET`/`AUTH_TRUST_HOST` (Auth.js v5). Correction pending approval.
- [ ] Vercel deployment — not started; checklist prepared, awaiting approval.
