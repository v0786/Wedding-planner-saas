# Wedding Guest Manager

A mobile-first SaaS for Indian families, couples, and professional wedding planners to manage wedding guests, invitations, RSVPs, family members, and event attendance.

## Features

- **Authentication & Workspaces**: Secure registration, login, workspace management with strict tenant isolation
- **Wedding & Event Management**: Create weddings with multiple events (Haldi, Mehendi, Wedding, Reception)
- **Guest Management**: Add guests, organize by groups, search and filter
- **One Shared Invitation Link**: Single shareable link per wedding, no category-specific links
- **Public RSVP**: Mobile-friendly RSVP without account creation, add family members individually
- **Event Selection**: Guests can select which events they'll attend
- **Dashboard & Reports**: Track RSVPs, event-wise attendance, dietary preferences
- **WhatsApp Sharing**: Easy sharing via WhatsApp

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Validation**: Zod

## Getting Started

1. Copy `.env.example` to `.env` and configure your database and auth secrets
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Apply migrations: `npm run db:deploy` (creates the schema; run `npm run db:migrate` during development)
5. Seed demo data: `npm run db:seed` (optional; creates `demo@example.com` / `demo1234`)
6. Run development server: `npm run dev`

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (use `NODE_OPTIONS=--max-old-space-size=4096` in small containers)
- `npm run start` — serve the production build
- `npm run lint` — ESLint
- `npm test` — unit tests
- `npm run test:integration` — integration tests against `TEST_DATABASE_URL`/`wedding_guest_manager_test`
- `npm run test:smoke` — real HTTP end-to-end smoke test against a running server
- `npm run test:e2e` — Playwright (browser automation is environment-limited in this container)
- `npm run db:seed` — demo seed

## Environment Variables

See `.env.example` for required variables. `AUTH_SECRET` (Auth.js v5) is required; generate with `npx auth secret`.

## Documentation

See `docs/` folder for architecture, PRD, design, and other documentation.
