# Architecture --- Wedding Planner SaaS

**Status:** Implemented (MVP)  
**Version:** 1.1

## 1. Architecture goals
Mobile-first experience, simple deployment, safe multi-tenancy, accurate RSVP calculations.

## 2. Stack
- Web app: Next.js 15 + TypeScript
- UI: Tailwind CSS
- Database: PostgreSQL
- Authentication: NextAuth.js v5 (credentials)
- ORM: Prisma
- Hosting: Vercel or compatible

## 3. High-level modules
1. Web UI (App Router)
2. API layer (Route Handlers)
3. Auth/workspace layer
4. Data layer (Prisma + PostgreSQL)
5. Public RSVP service
6. Reporting

## 4. Implementation
Implemented with modular monolith structure. See prisma/schema.prisma for models.
