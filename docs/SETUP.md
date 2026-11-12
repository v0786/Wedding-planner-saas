# Development and deployment setup

The application runs from the repository root with Next.js, Auth.js, Prisma, PostgreSQL and npm. The native Expo application is a separate pending phase.

## Local web setup

Use Node.js 20 or newer supported by the package lock. CI uses Node.js 20, and the current local checks ran on Node.js 24. Use a dedicated PostgreSQL development database.

```bash
npm ci
cp .env.example .env
```

Fill the gitignored `.env` with the development `DATABASE_URL`, a generated `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` and `NEXT_PUBLIC_APP_URL`. Keep Preview and Production databases separate. Then run the actual package scripts.

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

The current container cannot execute Prisma's schema-engine migration command reliably. Local verification applies the tracked SQL migrations directly to a disposable PostgreSQL database, then generates Prisma Client. Verify normal `npm run db:deploy` in staging before release. Do not silently apply a schema-engine workaround to production.

## Lifecycle

A wedding dated 10 December in Asia/Kolkata becomes read-only at 11 December 00:00. Deletion is scheduled for 18 December 00:00 after seven complete local calendar days. Date/timezone changes reschedule the job and its reminder records transactionally. Early deletion requires the owner to enter the exact wedding name. Completed jobs retain hashed identifiers and aggregate counts while payment history survives.

The daily cron remains a dry run until `WEDDING_RETENTION_DELETE_ENABLED=true`. Reminder sends require `WEDDING_REMINDER_SEND_ENABLED=true` and configured email delivery. Reminders target verified owner emails seven and three days before deletion. The worker leases jobs and uses stable provider delivery keys. Its email batch is bounded, so monitor queue depth and increase authorized worker frequency/capacity when traffic requires it. Verify staged delivery and provider retry behavior before enabling sends. Backup retention and uploaded asset cleanup require separate infrastructure acceptance.

## Before release

Populate the platform business details, obtain legal review of the draft policies, provision an admin explicitly, configure strong admin authentication, and verify credentials and providers on staging. Review Supabase Data API access/RLS and storage permissions for the Prisma server access model. Run device/camera, accessibility, backup restore, monitoring and a consented pilot. Current local results are in `implementation-tracker.md`.
