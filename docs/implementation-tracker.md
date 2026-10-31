# Implementation Tracker — Wedding Guest Manager

**Last updated:** 2026-10-31

## Overall Status
Implementation complete for the scoped SaaS. Core flows verified against a real
PostgreSQL database with unit, integration, and HTTP end-to-end smoke tests.
Subscription/payment flows were audited on 2026-10-31; live Razorpay payments are
still unverified because no credentials or published prices exist in this
environment. Browser-based Playwright E2E is not runnable in this container (see
limitations).

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
- [x] Rate limiting (PostgreSQL-backed `RateLimit` table, shared across instances; in-memory store for tests)
- [x] Tenant/workspace isolation on every private route
- [x] CSRF origin defence in depth
- [x] UX: not-found, error, loading/empty states; hydration-safe invite manager
- [x] TypeScript compiles (PASS with `NODE_OPTIONS=--max-old-space-size=4096`)
- [x] Prisma schema valid
- [x] ESLint configured and passing (one pre-existing `<img>` warning; no errors)
- [x] Unit tests (10 suites, 65 tests) passing
- [x] Integration tests (2 suites, 26 tests) passing against `wedding_guest_manager_test`
- [x] HTTP smoke test (79 checks) passing against a running production build
- [x] Production build (PASS, including trace collection after excluding sharp/detect-libc)
- [x] `.env.example` aligned with Auth.js v5 (`AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`)
- [x] Docs updated (README, tracker, agent-tooling)
- [x] Subscription plans FREE / PRO / PRIME with one central config (`lib/subscriptions/config.ts`)
- [x] Plan pricing, billing duration, availability, features and limits stored in the `Plan` table and editable by an admin at `/dashboard/admin/plans`
- [x] No invented prices: every default price is `null`, rendered as “Coming Soon”; checkout is refused until an admin sets a price
- [x] Server-side entitlement enforcement on weddings, guests (single + CSV import), events, custom questions, reports and CSV export (`402 LIMIT_REACHED`, `403 FEATURE_NOT_AVAILABLE` with current/max/upgradeUrl)
- [x] Razorpay orders over REST + HMAC verification (no new npm dependency), signed webhook `/api/webhooks/razorpay`, activation only after verified payment, idempotent retries
- [x] Subscription lifecycle: immediate upgrades, same-plan renewals, cancellation and the move to Free at period end via `cancelAtPeriodEnd` + `pendingPlanCode`, resume, expiry settlement, payment history
- [x] Usage meters on the dashboard and billing page; client managers surface the upgrade link from API errors
- [x] Subscription migrations applied: `20261030120000_public_wedding_content`, `20261030130000_subscriptions`, `20261030140000_payment_billing_snapshot`
- [x] Subscription tests: 3 unit suites (19 tests) + 1 integration suite (20 tests)

## QA Results
- TypeScript: PASS
- Prisma Validation: PASS
- Lint: PASS (only the pre-existing `<img>` warning in `app/invite/[token]/page.tsx`; no errors)
- Unit Tests: 10 suites / 65 tests PASS (includes subscription config, Razorpay signatures/amount checks and admin policy)
- Integration Tests: 2 suites / 26 tests PASS (includes 20 subscription tests)
- HTTP Smoke Test: 79 checks PASS
- Production Build: PASS (static + dynamic routes generated, including `/pricing`, `/dashboard/billing`, `/dashboard/admin/plans`)
- Playwright E2E: NOT RUN locally (Chromium/Firefox cannot launch under gVisor in this container). CI workflow added at `.github/workflows/ci.yml` in commit `a4c78c7`; push verified blocked (2026-10-29): gh token scopes are `admin:public_key, gist, read:org, repo` — `workflow` scope missing, and the token is the credential for the HTTPS remote; SSH fallback unavailable (`Permission denied (publickey)`). GitHub refuses pushes that add `.github/workflows/*` without the `workflow` scope. CI has therefore not been triggered. Remedy: run `gh auth refresh -s workflow` (interactive device code), then push `a4c78c7` and run `gh workflow run ci.yml`.

## Subscription system (2026-10-30)
- Central source of truth: `lib/subscriptions/config.ts` (plan codes, features, limits, labels, price formatting, upgrade/downgrade rank rules).
- Database: `Plan`, `Subscription`, `Payment`, `UsageRecord`; `User.isAdmin`. Migrations `20261030130000_subscriptions`, `20261030140000_payment_billing_snapshot`.
- Prices are `null` by default → “Coming Soon”. An admin sets price/billing days/limits/features/availability at `/dashboard/admin/plans`; nothing requires a deploy.
- Enforcement: `lib/subscriptions/service.ts` (`getEntitlements`, `assertFeature`, `assertWorkspaceLimit`, `assertWeddingLimit`, `settleSubscription`). All checks run server-side in API routes; UI gates are informational only.
- Payments: `lib/subscriptions/razorpay.ts` + `lib/subscriptions/payments.ts`. Order created server-side, checkout signature verified with HMAC-SHA256, then the payment is fetched from Razorpay and checked against the stored amount/currency before activation. Webhook `/api/webhooks/razorpay` verifies `x-razorpay-signature` against the raw body and is idempotent.
- Lifecycle: upgrades and same-plan renewals apply immediately after verification (renewals extend from the paid-through date); cancellation and the move to Free are scheduled at period end; expiry settles lazily on the next request; no refunds. Paid-to-paid downgrades are refused because they would otherwise grant a plan without payment.
- UI: `/pricing`, dashboard plan/usage card, `/dashboard/billing`, `/dashboard/billing/checkout`, `/dashboard/admin/plans`, `UpgradeRequired`, sidebar `Billing`/`Pricing`.
- Tests: `__tests__/unit/subscription-config.test.ts` (8), `__tests__/unit/razorpay.test.ts` (7), `__tests__/unit/subscription-admin.test.ts` (4), `__tests__/integration/subscription.test.ts` (20).
- Required env: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, optional `RAZORPAY_CURRENCY`, `ADMIN_EMAILS` (see `.env.example`). Missing keys disable checkout instead of failing.

## Production-readiness audit (2026-10-31)
Scope: every subscription/payment API, Razorpay integration, webhook, entitlement check, admin authorization, pricing surface and lifecycle path.

Fixed:
1. **Free paid downgrade** — settlement no longer activates a `pendingPlanCode` paid plan without payment; paid-to-paid downgrades are refused, and only a scheduled move to FREE is honored.
2. **Payment amount integrity** — checkout activation now fetches the Razorpay payment and rejects amount/currency/order mismatches; webhooks validate the amount/currency in the signed payload against the stored order before activation.
3. **Webhook-only deployments** — `RAZORPAY_WEBHOOK_SECRET` verification no longer depends on the REST API key pair.
4. **Concurrent activation** — payments are claimed atomically and the workspace row is locked, so verify/webhook/retry races cannot extend a period twice or lose a renewal.
5. **Renewals** — an active same-plan purchase is now a renewal that extends from the paid-through date instead of being rejected.
6. **Billing snapshot** — `Payment.billingPeriodDays` freezes the purchased duration; later admin duration/price changes cannot alter an existing payment.
7. **Settlement race** — expiry uses a conditional update, so a renewal landing at the same moment is not overwritten.
8. **Failed-payment race** — failure notifications cannot overwrite an already-paid row.
9. **Quota races** — wedding/guest/import/event/question creation run the count-then-create pair under a PostgreSQL advisory transaction lock.
10. **Plan seeding cost** — plan rows are seeded once per process instead of three upserts on every entitlement lookup.
11. **Admin policy** — the allowlist rule is a pure, unit-tested helper used by both the page and the API.
12. **Pricing UI** — lower-ranked paid plans no longer offer a checkout that the server refuses.

Verification: TypeScript PASS; unit tests 10 suites / 65 tests PASS; integration tests 2 suites / 26 tests PASS (PostgreSQL `wedding_guest_manager_test`); HTTP smoke test 79 checks PASS against the production build; lint PASS except the pre-existing `<img>` warning; production build PASS. Migration `20261030140000_payment_billing_snapshot` was applied to both databases with `psql` because Prisma's migration engine crashes natively in this container.

Not production-ready yet (external blockers, no code claim):
- No Razorpay credentials or published prices exist in this environment, so no live/sandbox payment has been completed. Checkout correctly returns “not configured” until the operator sets real keys and prices.
- Browser Playwright E2E still cannot run in this container; CI remains blocked by the GitHub billing lock.
- WhatsApp/branding features are advertised in plan config but have no dedicated enforcement surface yet because the corresponding edit endpoints do not exist. This does not grant paid privileges; it only means those feature flags are currently unused.

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
- Commit `a4c78c7` pushed 2026-10-29 after `workflow` scope granted. GitHub Actions CI triggered (run 40975568009) but **job not started** due to GitHub account billing lock; `gh` token scopes are `admin:public_key, gist, read:org, repo` — `workflow` scope missing, and the token is the credential for the HTTPS remote; SSH fallback unavailable (`Permission denied (publickey)`). GitHub refuses pushes that add `.github/workflows/*` without the `workflow` scope. CI has therefore not been triggered. Remedy: run `gh auth refresh -s workflow` (interactive device code), then push and run `gh workflow run ci.yml`. All audit work is now committed (`68a91a9`, `0175f21`) and pushed to `main`.

## Test Commands
- `npm test` — 10 suites / 65 tests PASS
- `npm run test:integration` — 2 suites / 26 tests PASS (uses `TEST_DATABASE_URL` or `wedding_guest_manager_test`)
- `npm run test:smoke` — 79 checks PASS (requires running server + seeded DB)
- `npm run lint` — PASS (one pre-existing `<img>` warning)
- `npx tsc --noEmit` (with `NODE_OPTIONS=--max-old-space-size=4096`) — PASS
- `npm run build` (with increased heap) — PASS
- `npm run test:e2e` — NOT RUN locally (browser unavailable in this container); CI workflow added at `.github/workflows/ci.yml`; CI execution blocked by GitHub account billing lock.

## Environment note (Prisma)
`prisma migrate dev|deploy` crashes in this container with a native engine error
(`Could not parse schema engine response … free(): invalid pointer`). The
migrations in `prisma/migrations/` were applied with `psql -f` instead and
`prisma generate` works. Use `npx prisma migrate deploy` normally outside this
container.
