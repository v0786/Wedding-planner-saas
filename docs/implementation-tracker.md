# Implementation Tracker — Wedding Guest Manager

Updated 12 November 2026. This tracker follows the full supplied product scope. Source files show implementation presence, while executed checks establish only the behavior exercised at that checkpoint. The latest local combined verification passed. Production/provider acceptance and the remaining product phases are listed below.

## Inspection and decisions

The fresh inspection covered the root application, `app/`, `components/`, `lib/`, Prisma schema and migrations, tests, CI, configuration, screenshots and product document folders. The product-document inventory contains 53 Markdown files with 27 distinct bodies. Every numbered `inbox/*-1.md` duplicates its unnumbered counterpart. Reference copies remain available in `inbox/`.

- The owner selected a dark gold visual design on 12 November 2026. Landing, account, dashboard and guest screens use the dark palette; paper exports retain light backgrounds. Future authorized changes are pushed to GitHub main and the existing Vercel Git integration automatically redeploys.
- The user's approved prices are Basic ₹499, Pro ₹999 and Prime ₹1,999, one time per wedding. Guest counts remain unlimited.
- The current Prisma and Auth.js stack is retained under `docs/Rules.md` and `docs/SUPABASE_MIGRATION_PLAN.md`. Supabase Auth remains a separately planned migration.
- The source of truth is the latest user instruction, then the canonical requirements in `docs/`. The API document describes a proposed contract. Existing working routes should retain compatibility while their actual behavior is documented.
- The latest private-link requirement binds a private invitation or RSVP to a browser, supports reopening saved changes, rejects another browser and provides an explicit transfer flow. Shared wedding invitations continue to serve multiple guests.
- Earlier statements that the repository had no scaffold, that all documented scope was complete, or that browsers could never run locally were stale. README and architecture now describe the actual web application.

## Requirement map

“Present” means source exists. The local verification below covers exercised paths, while row-specific acceptance remains explicit. “Partial” identifies a documented gap. “External acceptance” requires configured services or target-environment evidence.

| Requirement and source | Current source evidence | State and acceptance still needed |
|---|---|---|
| Credentials signup, login, workspace provisioning — PRD 6/14 | `auth.ts`, `app/api/register/route.ts`, `lib/auth-login.ts`, registration/auth unit tests | Present. Recheck policy acceptance, transactions, login limits and session flow in the combined gate. |
| Google login and password recovery — FEATURES 1 | `auth.ts`, `lib/password-reset.ts`, `lib/email.ts`, forgot/reset routes and account recovery integration tests | Present optional verified Google sign-in and expiring single-use password reset. Reset invalidates earlier sessions. Google/Resend configuration and staging delivery remain external acceptance. |
| Admin trust boundary — AUTH_SECURITY 9 | `lib/subscriptions/admin-access.ts`, `lib/subscriptions/admin.ts`, admin policy tests | Explicit `isAdmin` or verified allowlisted account. Strong admin authentication/MFA and sensitive-operation review remain incomplete. |
| Multi-wedding setup — PRD 9 | `app/dashboard/weddings/`, new/edit forms, `lib/validation.ts` | Present basic setup and saved records. Full guided save/resume onboarding still needs acceptance. |
| Timezone, locale, privacy and public field choices — PRD 9/13 | `lib/wedding-settings.ts`, `lib/public-wedding.ts`, setup fields and migration `20261111130000_wedding_setup` | Partial. Verify every public projection, form and export respects the saved choices. Expanded translations/currencies are later scope. |
| Event CRUD, order and advanced details — PRD 9 | Wedding events API, `components/wedding/event-manager.tsx`, Event schema | Present core CRUD/order. Advanced map/address/dress-code/public field controls and their public rendering need the combined check. |
| Guests, side/category, dietary/accommodation/transport — PRD 10 | Guest schema, `lib/validation.ts`, `components/wedding/guest-manager.tsx`, guest API, migration `20261111010000_guest_details` | Present source additions. Verify filtering, edits, legacy records, privacy and imported values together. |
| CSV preview, validation, duplicates and commit — FEATURES 5 | `lib/csv.ts`, guests import route, preview/confirm UI, `guest-management.test.ts` | Present CSV path with revalidation. Durable `GuestImport` records make same-key retries idempotent, including blank phone rows. Native XLSX remains incomplete. |
| Shared and unique invitations — PRD 11 | Public invitation pages, `lib/group-invitations.ts`, claim/transfer/reissue/revoke handlers | Present. Earlier five-browser checkpoint covered first-open binding, forwarding denial, network change, saved response and transfer. The latest six browser journeys revalidated the combined flow. |
| One wedding-wide invitation design and downloads — PRD 9/11 | `lib/invitation-design.ts`, design/setup components, host invitation print page and PNG button | Present plan-aware themes, accents, cover/couple image URLs, safe public projection, browser PDF and PNG. Uploaded storage remains unimplemented. PNG images require HTTPS and CORS permission from their host. |
| OTP and CAPTCHA — PRD 11; AUTH_SECURITY 2 | `lib/rsvp-otp.ts`, `lib/rsvp-phone.ts`, `lib/captcha.ts`, phone request/verify routes, verification UI | Present adapters. Configure Twilio Verify and Turnstile, then verify provider delivery/challenge acceptance on staging. Local mocks cannot establish provider delivery. |
| Scoped, one-use phone proof — AUTH_SECURITY 2/3 | RSVP proof validation and transactional proof-use record in `lib/rsvp-service.ts`; OTP/unit/integration tests | Present. Recheck replay, transaction rollback and normal retry paths in the combined gate. |
| Party size, Accept/Decline/Maybe, email, questions and review — PRD 11 | `lib/validation.ts`, RSVP form, `lib/rsvp-attendance.ts`, migration `20261111230000_rsvp_party_size` | Present additions. Verify persistence and initial/edit form wiring, legacy fallback, review and downstream counts. |
| RSVP idempotency and deadlines — TESTING 3/6 | `lib/rsvp-service.ts`, phone identity lock, compound guest keys, RSVP integration tests | Present. New regressions cover closed-event preservation, proof reuse and transfer A→B→A credential revival. Local integration and browser gates passed. |
| Wedding-specific purchase, upgrade and verified activation — PRD 7 | `lib/subscriptions/payments.ts`, service, checkout/verify/webhook routes, `wedding-payments.test.ts` | Present source. Existing covered weddings retain explicit migrated grants with their original expiry. Newly created weddings never inherit workspace paid access. A real Razorpay sandbox checkout/webhook and final target verification remain required. |
| GST config and immutable tax amounts — master prompt 5 | `lib/settings.ts`, Payment snapshot fields, admin settings, `platform-settings.test.ts` | Present with GST disabled by default. Verify checkout totals and snapshots after admin changes. Business/legal configuration and production activation remain operator decisions. |
| Plan-aware advertisements — master prompt 9 | `lib/settings.ts`, `components/ui/advertisement.tsx`, admin settings | Eligibility/settings architecture present, ads disabled by default. Confirm placement integration, Prime exclusion and public RSVP exclusion in the combined gate. |
| Real dashboard and report totals — PRD 13 | `lib/dashboard-metrics.ts`, dashboard charts, `lib/wedding-report.ts`, attendance/report tests | Present. Verify accepted party-weighted counts, Maybe/Pending separation and zero declined expected attendance across dashboard, report and export. |
| Reports, privacy, PDF and spreadsheet export — PRD 13 | Report pages, report CSV, guest/RSVP CSV, print controls and formula escaping | Present selectable CSV columns and status/group/diet/event filters with server-enforced contact privacy. CSV and browser PDF are available. Native XLSX remains unimplemented. |
| Authorized group QR check-in — PRD 12 | `lib/check-in-qr.ts`, group manager/scanner, check-in API, group integration and browser tests | Present. Earlier browser checkpoint covered manual code and duplicate check-in. Physical camera/device testing remains external acceptance. |
| Expiry/read-only and public disable — PRD 8 | `lib/wedding-lifecycle.ts`, `requireOpenWeddingAccess`, public/host routes and lifecycle tests | Present. Recheck every mutation, exact local midnight and historical export access in the combined gate. |
| Seven complete local days of retention — PRD 8 | `lib/wedding-retention.ts`, cron route, `vercel.json`, retention unit tests | Present durable deletion jobs and safe completion results, explicit-confirmation early deletion, transactional rescheduling and leased 7/3-day email reminders. Scheduled deletion and reminder sends default off. Provider delivery, asset cleanup and backup purge require operational acceptance. |
| Broad platform administration and audit — PRD 14 | Protected admin overview/resource pages, `lib/admin-overview.ts`, `PlatformAdminAudit`, plans/settings APIs and wedding audit log | Present paginated read-only customer/wedding/payment/retention/audit lists with explicit access purposes and durable audit. MFA, destructive admin overrides and independent security acceptance remain incomplete. |
| Terms, privacy and consent audit — master prompt 12–14 | `/terms`, `/privacy`, `lib/policies.ts`, `lib/policy-service.ts`, policy acceptance API/model and tests | Present draft policy content and versioned user acceptance. Verify unchecked registration consent and legacy-user acceptance before creation/checkout. Complete business details and legal review remain required. |
| Tenant and storage isolation — AUTH_SECURITY 5 | Server membership guards and cross-workspace tests; Prisma migrations | Server guards present. Production Supabase Data API/RLS review and private storage isolation remain incomplete. No production database acceptance is claimed. |
| Notifications and support — PRD 13/16 | Manual WhatsApp link sharing and FAQ | Resend adapter supports account recovery and opt-in lifecycle reminders with stable delivery keys and retry leases. Real email acceptance remains external. Official WhatsApp automation and general campaign notifications remain V2. |
| Native apps and expanded localization — PRD 15; PLAN 8 | Web locale/timezone settings only; no Expo app directory | Deferred product phase. Native implementation, Android/iOS release, language content and additional payment currencies remain unimplemented. |
| Release assurance — PLAN 9; TESTING 12 | Unit/integration/smoke/Playwright suites and CI workflow | Latest local combined gate passed. Staging provider checks, device/accessibility testing, monitoring, dependency review, restore drill and consented pilot remain required. |

## Executed verification

Verified on 12 November 2026 against isolated PostgreSQL data and loopback provider fixtures.

| Check | Observed result |
|---|---|
| ESLint | Passed, with the image optimization warning recorded in the log |
| TypeScript | Passed |
| Unit tests | 107 tests passed across 22 suites |
| PostgreSQL integration | 50 tests passed across 13 suites, including latest reminder scheduling/eligibility source |
| Production build | Passed on the latest source |
| HTTP smoke | 96 checks passed |
| Playwright | All 6 browser journeys passed |
| Diff whitespace | Passed |

The current browser run covers host login/list/report access and PNG download, public RSVP submit/review/edit, private-link denial in another browser, a network-IP change in the authorized browser, one-time transfer/replay, group first-open/replacement/check-in, reopening a saved group RSVP after transfer, and fresh registration with unchecked explicit policy choices followed by a private draft wedding.

The integration gate covers token/proof replay, transfer A→B→A without reviving an old edit link, closed-event response preservation, same-workspace wedding-payment isolation, migrated legacy grants, import retry idempotency, hidden-contact preservation, tax snapshots, account reset/session invalidation, policy audit, deletion confirmation/retry and reminder scheduling/dry-run/concurrent delivery.

An HTML form failure was fixed with strict-origin referrer policy while Origin validation continues to reject null and foreign origins. The local headless browser uses multiple processes so closing one browser context does not terminate another. A new report filter created a test locator ambiguity, which was corrected by targeting the metric paragraph.

Provider mocks validate application contracts without establishing live Twilio, Turnstile, Resend, Google or Razorpay acceptance. The normal Prisma migration-engine command remains unverified in staging because this container uses direct application of tracked SQL migrations to disposable test databases. No deployment, real message delivery, payment or production deletion was performed.

## Verification commands

Commands are taken from the actual package manifest.

```bash
npm run db:generate
npm run db:deploy
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run test:integration
npm run build
npm run test:smoke
npm run test:e2e
```

Use isolated development/test data. The HTTP and browser commands require a seeded test database and running production build, plus the local verification provider when exercising SMS/CAPTCHA fixtures. The tests must complete real assertions rather than skipping failed journeys.

In this container the Prisma schema-engine migration command has failed. The executed local checks applied each tracked SQL migration to a disposable PostgreSQL database and generated the Prisma client. This establishes SQL application in that database; the normal migration command still needs verification in staging.

## Completion gates

1. Configure staging providers and complete real OAuth, SMS/CAPTCHA, email and captured-payment/webhook checks.
2. Verify the ordinary Prisma migration command, Supabase Data API/RLS and storage permissions with the production access model.
3. Complete business/legal details, strong admin authentication/MFA, monitoring, asset/backup cleanup and a restore drill.
4. Finish native XLSX and the deferred native-app/localization phases according to the product release sequence. General WhatsApp/email campaigns remain V2.
5. Run physical mobile/camera, accessibility and consented pilot acceptance before production release.

Historical GitHub billing, token-scope, database and deployment statements from the 2026-10-31 tracker were not reverified in this inspection. They are not current completion evidence. No live SMS, real payment, production data operation or deployment is established by this tracker.

## Dark gold frontend checkpoint — 12 November 2026

Implemented an editorial landing page, shared account layout, dark navigation,
pricing cards, dashboard surfaces, guest tools and public invitation styling.
Gold controls use dark text. Named/custom invitation accents adapt for readable
dark web screens while PDF/PNG retain the paper palette. Print status colours
remain readable. Reduced motion and mobile navigation are preserved.

Verification: lint and TypeScript passed; 107 unit cases and 50 database cases
passed in the isolated full run. Three added custom-accent contrast cases also
passed (five invitation-theme cases total). The production build, 96 HTTP checks
and six browser journeys passed. Responsive visual inspection covers the landing,
pricing, login, public invite and dashboard. Browser checks exercise saved RSVP
changes, forwarded-link rejection, device transfer and registration.

Deployment: GitHub main is linked to automatic Vercel production builds. The
existing deployment fails with Prisma P1001 because the configured Supabase
direct endpoint is IPv6-only. The exact project pooler host is required from
Supabase Connect; the dashboard currently has no authenticated session. Existing
integration connection strings belong to a different project and are not used.
Prisma now separates runtime DATABASE_URL from migration DIRECT_URL. Production
Auth.js secret, canonical application URLs and trusted-host config were added
securely in Vercel. Provider staging and prior documented product gaps remain.
