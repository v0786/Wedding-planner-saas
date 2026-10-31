# Wedding Guest Manager

A wedding guest-management platform for families, wedding planners, and
event-management companies. Manage multiple weddings, guests and groups,
digital invitations, verified RSVPs, event attendance, reports, and QR
group check-in.

> **Status:** Documentation and product definition only. No
> implementation, repository scaffold, deployment, or tests are
> confirmed by this pack.

## Capabilities

-   Multiple weddings per account; one independent subscription per
    wedding.
-   Basic ₹499, Pro ₹999, Prime ₹1,999, one-time per wedding; unlimited
    guests on every plan.
-   Individual guests, families/groups, bride/groom sides, categories,
    imports, dietary/accommodation/transport data.
-   Shared and unique invitation links; one wedding-wide design;
    PDF/image downloads.
-   Guest phone OTP, optional Google path, name/email/party size/diet,
    Accept/Decline/Maybe and event selection.
-   RSVP deadlines, updates, dashboard, event/family reports, custom
    exports.
-   One QR per invitation/group; group-level arrival check-in.
-   Email and official WhatsApp notifications in phases.
-   Read-only after expiry; deletion scheduled seven days after wedding.
-   Separate platform-owner super-admin dashboard.

## Technology direction

Next.js + TypeScript web; React Native + Expo mobile; Supabase
PostgreSQL/Auth/Storage; Razorpay and Cashfree adapters; hybrid managed
hosting. See `ARCHITECTURE.md`.

## Documentation

`PRD.md`, `DESIGN.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`,
`AGENTS.md`, `README.md`, `PLAN.md`, `SETUP.md`, `FEATURES.md`,
`AUTH_SECURITY.md`, `MCP.md`, `INTEGRATIONS.md`, `TESTING.md`,
`DEBUGGING.md`.

## Quick start

No verified package manifest, lockfile, migrations, or app scaffold was
supplied. Do not run invented commands. Once scaffold exists: (1)
inspect actual manifests; (2) pin runtimes/package manager; (3)
configure `.env` from `.env.example`; (4) apply reviewed Supabase
migrations; (5) run only scripts verified in manifests.

## Environment variables

See `INTEGRATIONS.md`. Use placeholders in `.env.example`; never commit
real credentials.

## Scripts and folder structure

Not yet available because implementation has not been scaffolded. See
proposed target structure in `ARCHITECTURE.md`; inspect any existing
repo before modifying it. Add actual scripts after verifying
`package.json` and native manifests.

## Contribution

Read `AGENTS.md`, follow source-of-truth docs, work in small reviewed
changes, add tests, update migrations/docs, and never commit secrets or
real guest data.

## License

Not selected. Add approved license before public distribution.
