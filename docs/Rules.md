# Project Rules --- Wedding Guest Manager

- Mobile-first responsive web app
- Shared and unique invitation/RSVP links per wedding
- No guest-category-specific forms or links
- Guest flow: link → phone OTP (or enabled Google path) → form → submit
- OTP required for phone-based RSVP; never stored/logged in plaintext
- Server-side authorization on every protected operation
- Tenant isolation enforced (workspace membership checked on every private route)
- Database: Supabase PostgreSQL via Prisma ORM; `DATABASE_URL` must point to production DB, never localhost
- Secrets: never commit or print real secrets; `.env` is gitignored; `.env.example` uses placeholders only
- Architecture: Prisma ORM + NextAuth v5 (temporary); Supabase Auth migration requires separate plan + owner approval
