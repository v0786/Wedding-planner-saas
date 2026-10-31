# Supabase PostgreSQL Migration Plan

**Status:** Proposed — requires owner approval before execution  
**Architecture:** Prisma ORM + NextAuth v5 (temporary) → Supabase Auth (future)  
**Database:** Supabase PostgreSQL via Prisma `DATABASE_URL`

## 1. Current Architecture (Temporary)

| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL (via Prisma ORM) |
| Auth | NextAuth v5 (`@auth/prisma-adapter`, credentials provider) |
| ORM | Prisma Client v6 |
| Session | JWT (NextAuth v5) |
| Host | Vercel |

The application uses Prisma to connect to PostgreSQL. The `DATABASE_URL` environment variable points to the database. Currently this is `localhost` for development.

## 2. Target Production Configuration

| Environment | `DATABASE_URL` | Purpose |
|-------------|---------------|---------|
| Local development | `postgresql://postgres@localhost:5432/wedding_guest_manager` | Local PostgreSQL |
| Vercel production | `postgresql://postgres.<ref>:<password>@db.<ref>.supabase.co:5432/postgres?sslmode=require` | Supabase PostgreSQL |

## 3. Required Environment Variables

### Local (`.env` — gitignored, never committed)
```
DATABASE_URL="postgresql://postgres@localhost:5432/wedding_guest_manager"
AUTH_SECRET="<local-dev-secret>"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Vercel Production (set in Vercel project settings dashboard)
```
DATABASE_URL="postgresql://postgres.<SUPABASE_PROJECT_REF>:<SUPABASE_DB_PASSWORD>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"
AUTH_SECRET="<production-auth-secret>"
AUTH_URL="https://<vercel-app>.vercel.app"
NEXT_PUBLIC_APP_URL="https://<vercel-app>.vercel.app"
```

### Client-side (`.env.example` — safe to commit)
```
NEXT_PUBLIC_SUPABASE_URL="https://<SUPABASE_PROJECT_REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
```

## 4. Migration Steps (Require Approval)

### Step 1: Provision Supabase PostgreSQL
- Create a Supabase project
- Note the Project Ref and Database password from Settings → Database
- Construct the `DATABASE_URL` connection string

### Step 2: Apply Schema to Supabase
- Run `npx prisma migrate deploy` against the Supabase `DATABASE_URL`
- Verify all 21 tables exist in Supabase
- Run `npx prisma db seed` to populate plan data

### Step 3: Configure Vercel
- Link GitHub repo to Vercel project
- Set all production environment variables in Vercel dashboard
- Set `DATABASE_URL` to the Supabase connection string
- Set `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL` to production values
- Trigger deployment

### Step 4: Verify Production
- Test registration, login, session creation
- Test workspace and wedding CRUD
- Test guest management, RSVP, dashboard
- Test Razorpay webhook endpoint
- Test subscription plan lifecycle

## 5. Future: Supabase Auth Migration (NOT IN SCOPE NOW)

A future migration will replace NextAuth v5 with Supabase Auth:

| Component | Current (NextAuth v5) | Future (Supabase Auth) |
|-----------|----------------------|----------------------|
| Auth provider | `@auth/prisma-adapter` + credentials | `@supabase/auth-helpers-nextjs` |
| User table | Prisma `User` + `Account` + `Session` | Supabase `auth.users` |
| Session | JWT cookie | Supabase session cookie |
| Routes | `app/api/auth/[...nextauth]/route.ts` | Supabase Auth callbacks |

**This migration requires a separate plan and owner approval.** The current task preserves NextAuth v5 + Prisma and only changes the database host to Supabase PostgreSQL.

## 6. Verification Checklist

- [ ] Prisma Client generates against Supabase schema
- [ ] `prisma migrate deploy` succeeds on Supabase
- [ ] `prisma db seed` populates plans correctly
- [ ] Registration creates user + workspace + membership atomically
- [ ] Login creates valid JWT session
- [ ] Wedding CRUD works with tenant isolation
- [ ] Guest management (CRUD, import, export) works
- [ ] RSVP submission and edit work
- [ ] Dashboard statistics calculate correctly
- [ ] Subscription plans (FREE/PRO/PRIME) load correctly
- [ ] Razorpay webhook verifies signature and activates plan
- [ ] Wedding expiry/read-only logic works
- [ ] All secrets remain server-side (not in client bundles)
- [ ] Local and production env vars are separate
