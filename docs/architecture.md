# System Architecture --- Wedding Guest Manager

**Version:** 2.0 \| **Status:** Production-ready (temporary stack)  
**Style:** Modular monolith with managed services and provider adapters.

## 1. Goals

Support web, Android, and iOS with shared business rules; Supabase
PostgreSQL as production database; strict tenant isolation; independent
wedding subscriptions; replaceable providers; reliable expiry/deletion;
no AI or microservices dependency.

## 2. Stack (Current — Temporary)

  -----------------------------------------------------------------------
  Layer                   Technology              Reason
  ----------------------- ----------------------- -----------------------
  Web                     Next.js 15 + TypeScript Mature server-rendered
                                                  React web platform (App Router)

  Mobile                  React Native + Expo +   Shared Android/iOS app
                          TypeScript              

  Database                Supabase PostgreSQL     Production database via
                                                  Prisma ORM (temporary)

  Auth                    NextAuth v5 (Auth.js)   Email/password credentials
                          (prisma adapter)        provider; JWT sessions;
                                                  temporary until Supabase
                                                  Auth migration

  ORM                     Prisma Client v6        Type-safe database access;
                                                  migrations via prisma migrate

  Storage                 Supabase Storage        Invitation assets and
                                                  private exports

  Server logic            Next.js server          Privileged logic stays
                          routes/actions +        server-side
                          Supabase Edge Functions 
                          where suitable          

  Hosting                 Vercel                  Low operations burden;
                                                  managed web hosting

  Payments                Razorpay + Cashfree     Provider portability
                          adapters                

  Tests                   Vitest, React Native    Unit/component/E2E
                          Testing Library,        
                          Playwright              
  -----------------------------------------------------------------------

## 2b. Target Stack (Future — Requires Separate Migration Plan)

  -----------------------------------------------------------------------
  Layer                   Technology              Reason
  ----------------------- ----------------------- -----------------------
  Auth                    Supabase Auth           Email/password + Google
                                                  OAuth; replaces NextAuth v5
                                                  (migration requires owner
                                                  approval)

  ORM                     Prisma Client v6        Retained; connects to
                                                  Supabase PostgreSQL
  -----------------------------------------------------------------------

Hybrid means managed web hosting (Vercel) + managed Supabase PostgreSQL
+ secure worker/functions, not a self-hosted production database. Exact
vendors and worker runtime require approval before launch.

## 3. Migration Path (Planned)

The current stack uses **Prisma ORM + NextAuth v5** connected to
**Supabase PostgreSQL** via `DATABASE_URL`. A future migration will
replace NextAuth v5 with **Supabase Auth** while retaining Prisma ORM.
This migration requires a separate plan and owner approval.

See `docs/SUPABASE_MIGRATION_PLAN.md` for the detailed migration plan.

## 4. Modules

Identity/accounts; weddings/events; plans/subscriptions/payments;
guests/groups/import; invitations/tokens; OTP/abuse protection;
RSVP/deadlines; reports/exports; QR check-in; notifications;
lifecycle/deletion; super-admin/audit.

## 5. Data flow

``` mermaid
flowchart TD
 WEB[Next.js Web] --> API[Server Application Layer]
 MOB[Expo Mobile] --> API
 PUB[Public Invitation / RSVP] --> API
 ADM[Super Admin] --> API
 API --> AUTH[NextAuth v5 (JWT sessions)]
 API --> DB[(Supabase PostgreSQL via Prisma)]
 API --> STORE[Supabase Storage]
 API --> PAY[Payment Adapter]
 PAY --> R[Razorpay]
 PAY --> C[Cashfree]
 API --> OTP[OTP / CAPTCHA]
 API --> MSG[Email / WhatsApp]
 JOB[Scheduled Worker] --> DB
 JOB --> MSG
```

## 6. Tenant model

One authenticated owner maps to one customer account. An account owns
multiple weddings. Every wedding owns events, guest groups, guests,
invitation links, RSVPs, reports, and exactly one current subscription
entitlement plus history. Every server operation resolves ownership from
auth identity and database relationships. Tenant isolation is enforced
server-side on every API route. Public token endpoints return
allowlisted fields only.

## 7. Authentication and trust (Temporary — NextAuth v5)

NextAuth v5 manages host sessions with email/password credentials and
JWT sessions. Guest phone OTP is a separate short-lived challenge; no
full guest account is required. Optional Google guest sign-in may be
enabled but must still validate the invitation token. CAPTCHA/rate
limiting protect public endpoints. Super-admin uses a separate guard
and strong auth. Payment success is verified server-side.

## 8. Entitlement service

Plan entitlements live in versioned plan configuration. Central service
answers active/read-only/expired state, feature access, and configured
limits. Guest count is unlimited for every plan. Never scatter
Basic/Pro/Prime conditionals through UI components.

## 9. Lifecycle

``` mermaid
stateDiagram-v2
 [*] --> AwaitingPayment
 AwaitingPayment --> Active: Verified payment
 Active --> Active: Upgrade difference paid
 Active --> ReadOnly: 00:00 day after wedding
 ReadOnly --> DeletionScheduled: retention window
 DeletionScheduled --> Deleted: scheduled timestamp
```

Example wedding 10 Dec Asia/Kolkata: expires 11 Dec 00:00; deletion 18
Dec 00:00. At expiry host can view/export, cannot edit; public
invitation/RSVP disabled.

## 10. RSVP and attendance

Shared and unique invitation tokens are separate records. Store token
hashes where practical. Unique links bind to an invitation group. Phone
OTP is verified before phone-based RSVP. RSVP captures name, email,
party size, diet, overall status, event selections, and configured
answers. Updates are transactional and idempotent. Deadline checks use
server time. QR is one per group and marks group arrival, not individual
family-member arrival.

## 11. Payments and notifications

Payment interface: create order, verify payment, handle webhook, get
status. Use idempotency and validate amount/currency/wedding. Failed
upgrade preserves current plan. Email and official WhatsApp are
adapters; queue/retry delivery after data commit. Messaging must not
block RSVP.

## 12. Deletion

Persist wedding date, timezone, subscription expiry, and scheduled
deletion. A trusted worker sends 7-day/3-day reminders and processes due
jobs idempotently. Remove dependent DB records and assets; separately
enforce backup expiry. Keep minimal non-personal deletion audit result.

## 13. Proposed repository tree

``` text
wedding-guest-manager/
├── apps/web/{app,components,features}
├── apps/mobile/{app,components,features,services}
├── packages/{domain,validation,api-client,design-tokens,config}
├── supabase/{migrations,functions,seed.sql}
├── services/{worker,notification-adapters}
├── tests/
├── docs/
├── .env.example
├── AGENTS.md
└── README.md
```

This is a target, not proof of existing files. Inspect any existing
repository before changing its structure.

## 14. State, errors, performance

Use typed server/API boundaries; keep transient UI state local. Validate
all external input. Use stable error codes, correlation IDs, safe logs,
and retries only for idempotent operations. Index wedding-scoped
queries; paginate guests; queue large exports and notifications; cache
only public-safe invitation content and invalidate on
edit/unpublish/expiry. Start modular; split services only when measured
load requires it.

## 15. Environment categories

Supabase URL/public key, server-only service role, payment credentials,
OTP, CAPTCHA, email, WhatsApp, monitoring, and worker auth. Exact names
are in `INTEGRATIONS.md`. No secrets in client bundles.


## 3. Modules

Identity/accounts; weddings/events; plans/subscriptions/payments;
guests/groups/import; invitations/tokens; OTP/abuse protection;
RSVP/deadlines; reports/exports; QR check-in; notifications;
lifecycle/deletion; super-admin/audit.

## 4. Data flow

``` mermaid
flowchart TD
 WEB[Next.js Web] --> API[Server Application Layer]
 MOB[Expo Mobile] --> API
 PUB[Public Invitation / RSVP] --> API
 ADM[Super Admin] --> API
 API --> AUTH[Supabase Auth]
 API --> DB[(Supabase PostgreSQL)]
 API --> STORE[Supabase Storage]
 API --> PAY[Payment Adapter]
 PAY --> R[Razorpay]
 PAY --> C[Cashfree]
 API --> OTP[OTP / CAPTCHA]
 API --> MSG[Email / WhatsApp]
 JOB[Scheduled Worker] --> DB
 JOB --> MSG
```

## 5. Tenant model

One authenticated owner maps to one customer account. An account owns
multiple weddings. Every wedding owns events, guest groups, guests,
invitation links, RSVPs, reports, and exactly one current subscription
entitlement plus history. Every server operation resolves ownership from
auth identity and database relationships. RLS protects all tenant
tables. Public token endpoints return allowlisted fields only.

## 6. Authentication and trust

Supabase Auth manages host sessions. Guest phone OTP is a separate
short-lived challenge; no full guest account is required. Optional
Google guest sign-in may be enabled but must still validate the
invitation token. CAPTCHA/rate limiting protect public endpoints.
Super-admin uses a separate guard and strong auth. Payment success is
verified server-side.

## 7. Entitlement service

Plan entitlements live in versioned plan configuration. Central service
answers active/read-only/expired state, feature access, and configured
limits. Guest count is unlimited for every plan. Never scatter
Basic/Pro/Prime conditionals through UI components.

## 8. Lifecycle

``` mermaid
stateDiagram-v2
 [*] --> AwaitingPayment
 AwaitingPayment --> Active: Verified payment
 Active --> Active: Upgrade difference paid
 Active --> ReadOnly: 00:00 day after wedding
 ReadOnly --> DeletionScheduled: retention window
 DeletionScheduled --> Deleted: scheduled timestamp
```

Example wedding 10 Dec Asia/Kolkata: expires 11 Dec 00:00; deletion 18
Dec 00:00. At expiry host can view/export, cannot edit; public
invitation/RSVP disabled.

## 9. RSVP and attendance

Shared and unique invitation tokens are separate records. Store token
hashes where practical. Unique links bind to an invitation group. Phone
OTP is verified before phone-based RSVP. RSVP captures name, email,
party size, diet, overall status, event selections, and configured
answers. Updates are transactional and idempotent. Deadline checks use
server time. QR is one per group and marks group arrival, not individual
family-member arrival.

## 10. Payments and notifications

Payment interface: create order, verify payment, handle webhook, get
status. Use idempotency and validate amount/currency/wedding. Failed
upgrade preserves current plan. Email and official WhatsApp are
adapters; queue/retry delivery after data commit. Messaging must not
block RSVP.

## 11. Deletion

Persist wedding date, timezone, subscription expiry, and scheduled
deletion. A trusted worker sends 7-day/3-day reminders and processes due
jobs idempotently. Remove dependent DB records and assets; separately
enforce backup expiry. Keep minimal non-personal deletion audit result.

## 12. Proposed repository tree

``` text
wedding-guest-manager/
├── apps/web/{app,components,features}
├── apps/mobile/{app,components,features,services}
├── packages/{domain,validation,api-client,design-tokens,config}
├── supabase/{migrations,functions,seed.sql}
├── services/{worker,notification-adapters}
├── tests/
├── docs/
├── .env.example
├── AGENTS.md
└── README.md
```

This is a target, not proof of existing files. Inspect any existing
repository before changing its structure.

## 13. State, errors, performance

Use typed server/API boundaries; keep transient UI state local. Validate
all external input. Use stable error codes, correlation IDs, safe logs,
and retries only for idempotent operations. Index wedding-scoped
queries; paginate guests; queue large exports and notifications; cache
only public-safe invitation content and invalidate on
edit/unpublish/expiry. Start modular; split services only when measured
load requires it.

## 14. Environment categories

Supabase URL/public key, server-only service role, payment credentials,
OTP, CAPTCHA, email, WhatsApp, monitoring, and worker auth. Exact names
are in `INTEGRATIONS.md`. No secrets in client bundles.
