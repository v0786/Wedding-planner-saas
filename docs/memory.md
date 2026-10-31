# Project Memory --- Wedding Guest Manager

**Last updated:** 2026-10-31  
**Stage:** Production backend integration (Prisma + NextAuth v5 + Supabase PostgreSQL)

## Current snapshot
- Product: Wedding Guest Manager SaaS
- Stack: Next.js 15 + TypeScript (web); Prisma ORM v6; NextAuth v5 (Auth.js v5, credentials provider, JWT sessions); Supabase PostgreSQL (production database via `DATABASE_URL`); Razorpay payments
- Database: Supabase PostgreSQL configured via `DATABASE_URL` in production; local PostgreSQL for development
- Migrations: 5 Prisma migrations applied (`20261029144901_init`, `20261029202020_add_rate_limit`, `20261030120000_public_wedding_content`, `20261030130000_subscriptions`, `20261030140000_payment_billing_snapshot`)
- Authentication: NextAuth v5 (temporary — will migrate to Supabase Auth in a future phase requiring separate approval)
- Auth routes: `app/api/auth/[...nextauth]/route.ts`
- Payment provider: Razorpay (REST + HMAC, no SDK dependency)
- Plans: FREE / PRO / PRIME (central config + `Plan` table); prices null by default ("Coming Soon")
- Verification: TypeScript PASS; Unit tests 10 suites / 65 tests PASS; Integration tests 2 suites / 26 tests PASS; Lint PASS (one pre-existing warning); Production build PASS
- Deployment: Vercel configured (`vercel.json`, `vercel-build.sh`); production deployment pending environment variable configuration in Vercel dashboard
- Migration plan: `docs/SUPABASE_MIGRATION_PLAN.md` documents the path from local PostgreSQL → Supabase PostgreSQL → future Supabase Auth migration

## Key decisions
- Prisma ORM + NextAuth v5 preserved temporarily (no rewrite without migration plan + approval)
- Supabase PostgreSQL used as production database via Prisma `DATABASE_URL`
- Supabase client-side URL and public key exposed in `.env.example` for future Supabase Storage/Realtime use
- `SUPABASE_SERVICE_ROLE_KEY` must be set server-side only in production (never committed)
