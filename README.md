# Wedding Guest Manager

A Next.js application for wedding setup, guests, invitations, phone-verified RSVPs, reports, and group check-in.

The latest local build, type/lint, 107 unit tests, 50 database tests, 96 HTTP checks and six browser journeys passed. The full product requirements and the current gaps are mapped in [the implementation tracker](docs/implementation-tracker.md). A passing local build does not establish production or provider acceptance.

## Current stack

Next.js 15, React 19, TypeScript, Tailwind, Auth.js v5 credentials and optional Google sessions, Prisma 6, and PostgreSQL. Supabase PostgreSQL is the production database target. The current application retains Prisma and Auth.js as documented in [the migration plan](docs/SUPABASE_MIGRATION_PLAN.md).

Basic ₹499, Pro ₹999, and Prime ₹1,999 are one-time purchases for an individual wedding. Guest counts are unlimited. Razorpay checkout and webhook code verifies payment evidence server-side. Live payment acceptance requires the configured provider sandbox.

## Local setup

Use a separate development PostgreSQL database. The package lock is managed by npm.

```bash
npm ci
cp .env.example .env
```

Fill the development database and application settings in the gitignored `.env`. Then run the tracked migrations and start the app.

```bash
npm run db:deploy
npm run dev
```

`npm run db:seed` creates synthetic demo data, including `demo@example.com` with password `demo1234`. Run it only in a dedicated development or test database. The demo invitation is `/invite/demo-invitation-token`.

## Verification

The manifest contains these quality commands.

```bash
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run test:integration
npm run build
```

Some tests in the unit directory exercise the real registration database. Use an isolated test database for the complete suite. Integration tests read `TEST_DATABASE_URL`, falling back to the local `wedding_guest_manager_test` database. The smoke and browser suites require a built running app and seeded test database.

```bash
npm run test:smoke
npm run test:e2e
```

The CI workflow provides a PostgreSQL service and loopback verification provider. Its configuration is in [the workflow](.github/workflows/ci.yml). See [the tracker](docs/implementation-tracker.md) for executed verification and remaining release requirements.

## Services and deployment

Guest SMS uses Twilio Verify, with Turnstile before requesting a verification code. Checkout uses Razorpay. These integrations refuse operations when required configuration is absent. Local provider overrides are restricted to loopback test environments.

Set production and Preview environment variables separately in Vercel. The Vercel build applies migrations to its configured database. Review [setup](docs/SETUP.md), [integrations](docs/INTEGRATIONS.md), and the [architecture](docs/architecture.md) before deployment.

## Documentation

- [Product requirements](docs/prd.md)
- [Design](docs/design.md)
- [Architecture](docs/architecture.md)
- [Implementation and verification tracker](docs/implementation-tracker.md)
- [Security requirements](docs/AUTH_SECURITY.md)
- [Agent tooling](docs/agent-tooling.md)

The `inbox/` directory preserves supplied reference copies. Many of those files duplicate the canonical documents in `docs/`. Runtime claims must be checked against code and executed tests.

## License

An application license has not been selected. The third-party ECC tooling has its own MIT license.
