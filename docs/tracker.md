# Project Tracker — Wedding Planner SaaS

**Last updated:** 2026-10-31
**Overall status:** MVP + subscription billing verified locally; live payments not yet verified (no Razorpay credentials or published prices); CI/Playwright E2E blocked by GitHub account billing lock

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
- [x] ESLint configured and passing (PASS, one pre-existing `<img>` warning)
- [x] Unit tests (10 suites / 65 tests) PASS
- [x] Integration tests (2 suites / 26 tests) PASS
- [x] HTTP smoke test (79 checks) PASS
- [x] Production build PASS (including trace collection)
- [x] Subscription plans FREE / PRO / PRIME (central config + `Plan` table)
- [x] Admin pricing/limits editor at `/dashboard/admin/plans`
- [x] Razorpay checkout, signature verification, signed webhook, payment history
- [x] Payment amount/currency verified against Razorpay before activation (checkout and webhook)
- [x] Server-side entitlement enforcement with current/max/upgrade URL errors
- [x] Upgrades, same-plan renewals, scheduled move to Free, cancellation/resume, expiry settlement
- [x] Concurrency-safe activation, settlement and quota checks (row/advisory locks)
- [x] `Payment.billingPeriodDays` snapshot isolates existing purchases from later plan price/duration changes
- [x] Paid-to-paid downgrades refused (no unpaid plan grants); only the move to Free is scheduled

## QA Results
- TypeScript: PASS
- Prisma Validation: PASS
- Lint: PASS (one pre-existing `<img>` warning)
- Unit Tests: PASS (10 suites / 65 tests)
- Integration Tests: PASS (2 suites / 26 tests, includes 20 subscription tests)
- HTTP Smoke Test: PASS (79 checks)
- E2E Tests: NOT RUN locally (browser cannot launch in this container); CI workflow added but execution blocked by GitHub account billing lock
- Production Build: PASS (including trace collection)

## Remaining
- [ ] Configure Razorpay keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) and set the webhook URL to `/api/webhooks/razorpay`.
- [ ] Publish real PRO/PRIME prices and billing durations via `/dashboard/admin/plans` (defaults stay “Coming Soon” on purpose).
- [ ] Complete at least one sandbox Razorpay payment (checkout signature, captured amount, webhook delivery) before claiming production readiness.
- [ ] Set admin access (`User.isAdmin` or `ADMIN_EMAILS`).
- [ ] Browser-based Playwright E2E — never run anywhere yet (browsers cannot launch in this container). `.github/workflows/ci.yml` (commit `a4c78c7`, pushed to `main`) runs it in CI; HTTP smoke (79 checks) covers the core journey meanwhile.
- [x] Management UI/API for custom RSVP questions — completed in commit `9f414f1` (API `app/api/weddings/[id]/questions/`, host UI page, smoke coverage).
- [x] Multi-instance-safe rate limiter — completed in commit `5301190` (PostgreSQL `RateLimit` table, migration `20261029202020_add_rate_limit`; in-memory store retained for tests).
- [x] Commit/push — `0175f21` committed and pushed to `main` (includes prior uncommitted work + subscription audit). GitHub Actions CI triggered (run 40975568009) but **job not started** due to GitHub account billing lock; `gh` token lacks `workflow` scope and SSH fallback unavailable. CI/Playwright E2E remain NOT RUN.
- [x] `.env.example` now uses the Auth.js v5 names (`AUTH_URL`/`AUTH_SECRET`/`AUTH_TRUST_HOST`) and includes the Razorpay/admin variables.
- [ ] Vercel deployment — not started; checklist prepared, awaiting approval.
