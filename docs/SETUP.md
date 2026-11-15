# Development and deployment setup

The application runs from the repository root with Next.js, Auth.js, Prisma, PostgreSQL and npm. The native Expo application is a separate pending phase.

## Local web setup

Use Node.js 20 or newer supported by the package lock. CI uses Node.js 20, and the current local checks ran on Node.js 24. Use a dedicated PostgreSQL development database.

```bash
npm ci
cp .env.example .env
```

Fill the gitignored `.env` with the development `DATABASE_URL` and `DIRECT_URL` (same local database), a generated `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` and `NEXT_PUBLIC_APP_URL`. Keep Preview and Production databases separate. Then run the actual package scripts.

```bash
npm run db:generate
npm run db:deploy
npm run dev
```

The dev server prints its local URL. `npm run db:seed` creates synthetic demo records and credentials, so run it only in development/test. A fresh demo user must explicitly accept current policies before creating a new wedding.

## Services

| Capability | Required configuration | Local verification |
|---|---|---|
| Phone verification | `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET` | Loopback OTP provider fixture |
| Human verification | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, valid `AUTH_URL` | Loopback CAPTCHA fixture |
| Wedding checkout | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Mock order/capture and signed webhook tests |
| Google sign-in | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, configured callback | Provisioning/session tests. Real OAuth remains a staging check |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` | Mock delivery and password-reset tests |
| Scheduled lifecycle | `CRON_SECRET` | Authenticated dry-run/test database |

Configure secrets in the Vercel project settings for each environment. Provider operations fail closed when required configuration is missing. Loopback provider overrides require local app and database hosts and are rejected on Vercel. Configure the Google callback at `/api/auth/callback/google` and Razorpay webhook at `/api/webhooks/razorpay` for the intended deployment.

## Test and build

```bash
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run test:integration
npm run build
```

Some tests under the unit directory use the database. Always use an isolated test database. `TEST_DATABASE_URL` selects integration data. The CI workflow provides a local PostgreSQL service and mock CAPTCHA/OTP provider. HTTP and browser checks need a seeded database and the running production build.

```bash
npm run start
npm run test:smoke
npm run test:e2e
```

The 15 November verification successfully ran normal `npm run db:deploy` on a fresh disposable PostgreSQL database. Historical schema-engine failures no longer apply to this runtime. Verify the same command against the intended staging database before a production migration.

## Lifecycle

A wedding dated 10 December in Asia/Kolkata becomes read-only at 11 December 00:00. Deletion is scheduled for 18 December 00:00 after seven complete local calendar days. Date/timezone changes reschedule the job and its reminder records transactionally. Early deletion requires the owner to enter the exact wedding name. Completed jobs retain hashed identifiers and aggregate counts while payment history survives.

The daily cron remains a dry run until `WEDDING_RETENTION_DELETE_ENABLED=true`. Reminder sends require `WEDDING_REMINDER_SEND_ENABLED=true` and configured email delivery. Reminders target verified owner emails seven and three days before deletion. The worker leases jobs and uses stable provider delivery keys. Its email batch is bounded, so monitor queue depth and increase authorized worker frequency/capacity when traffic requires it. Verify staged delivery and provider retry behavior before enabling sends. Backup retention and uploaded asset cleanup require separate infrastructure acceptance.

## Before release

Populate the platform business details, obtain legal review of the draft policies, provision an admin explicitly, configure strong admin authentication, and verify credentials and providers on staging. Review Supabase Data API access/RLS and storage permissions for the Prisma server access model. Run device/camera, accessibility, backup restore, monitoring and a consented pilot. Current local results are in `implementation-tracker.md`.

## Supabase connection modes

For project `qdyesqugohaeebcqlqql`, obtain the **exact pooler host** from
Supabase → Connect. Set `DATABASE_URL` to the transaction pooler on port 6543
with `pgbouncer=true&sslmode=require`; set `DIRECT_URL` to the session pooler
on port 5432 with `sslmode=require`. Use the `postgres.<PROJECT_REF>` user and
percent-encode the password. Prisma uses `DIRECT_URL` only for migrations and
introspection. Do not run demo seeding on production.

The direct database endpoint is IPv6-only and previously caused Vercel P1001.
An existing Vercel Supabase integration points at a different project; its
connection strings must not be substituted for this project's credentials.
GitHub `main` pushes already trigger production builds in the linked Vercel
project. A successful build and live-flow verification are still required.

### Administrator authenticator setup

Apply the tracked Prisma migrations, including `20261115110000_admin_mfa`,
before enabling platform administration. Keep a strong stable `AUTH_SECRET`
(at least 32 characters) in the server environment and encrypted backup secrets.
An explicitly provisioned administrator visiting `/dashboard/admin` is redirected
to `/dashboard/admin-access` to enroll an authenticator using their account
password. Save the eight one-use recovery codes in a password manager. A
Google-only administrator can set a password via the account recovery flow.
Platform access requires a fresh second factor every 15 minutes and after a
new sign-in. Do not rotate the encryption secret without planning MFA
re-enrollment or a controlled encrypted-credential migration.


### Private image uploads

Set `SUPABASE_STORAGE_URL` to the wedding database project's HTTPS API origin,
`SUPABASE_SERVICE_ROLE_KEY` server-only, and `SUPABASE_ASSET_BUCKET` (default
`wedding-assets`). Create a private bucket restricted to PNG/JPEG/WebP with a
4 MB object limit. The application refuses public buckets. These credentials
must belong to the same intended project; unrelated Vercel integration keys
must not be substituted. Auth.js authorizes uploads and owner previews; guests
can fetch only the currently selected, published, unexpired, approved images.
The proxy exposes no service key or signed storage URL. Supabase Data API access
to Prisma tables is disabled by RLS and explicit privilege revocation.

Deletion cleanup runs for completed, authorized wedding deletion jobs and retries
provider failures. Existing remote URL images are never deleted by the application.
Production storage/RLS/provider behavior still requires staged acceptance.

### Guest spreadsheets and setup

Guided setup is `/onboarding/setup`; drafts persist per signed-in account and
are cleared of duplicate personal content on completion. Existing quick-create
remains available. Apply both new onboarding/admin migrations and the Data API
lockdown migration before running this release.

Guest import accepts CSV or one visible XLSX sheet, at most 2,000 guest rows per
upload. All plans retain unlimited overall guests. Preview before confirmation;
legacy `.xls`, formulas, links, dates, macros and embedded files are rejected.
Exports offer native Excel or CSV while preserving the wedding's contact privacy.

### Health monitoring

`GET /api/health` is minimal public liveness. Configure an independent strong
`HEALTH_CHECK_SECRET`; `GET /api/health/ready` requires its Bearer authorization
and returns 200 only after database/schema checks, otherwise sanitized 503.
Configure your uptime monitor securely; never put its credential in a URL.
Backup restore and infrastructure alert delivery remain operational acceptance.
