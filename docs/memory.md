# Project memory

Updated 12 November 2026. The current verification record and full requirement map are in `implementation-tracker.md`.

- Repository `v0786/Wedding-planner-saas`, branch `main`. Deployment and provider acceptance are separate release gates.
- Current web stack remains Next.js 15, React 19, TypeScript, Prisma 6, Auth.js v5 and PostgreSQL. Supabase Auth remains a separately planned migration.
- Approved launch prices are Basic ₹499, Pro ₹999 and Prime ₹1,999, one-time per wedding with unlimited guests. Explicit migrated legacy grants cover only already-covered weddings until their original expiry.
- Private invitations and RSVP edit links use browser cookies. Switching networks works. Another browser receives 404. A confirmed one-time transfer changes browser ownership, rotates credentials and preserves the saved RSVP.
- Guest verification uses Twilio Verify and Turnstile adapters. Optional verified Google sign-in, secure password reset, account policy acceptance and session invalidation are implemented.
- Reports use party sizes, separate Maybe/Pending and zero declined expected attendees. Privacy settings apply to public fields and report contact columns.
- Guest import records make retries idempotent. New and legacy phone formats share the guest creation lock and identity lookup.
- GST and advertisements default disabled. The configured tax amounts are snapshotted on payment orders.
- Retention uses durable jobs, exact owner confirmation for early deletion and safe completion metadata. Scheduled deletions and email reminder delivery remain opt-in. Payment history survives wedding removal.
- ECC v2.2.3 cache and local enabled configuration were verified. This chat's native teams execute reviewed ECC workflows, with no claim of automatic plugin hooks in the current runtime.
- Latest local evidence is 107 unit tests, 50 integration tests, 96 HTTP checks and 6 browser journeys passed, plus build/types/lint. Provider staging acceptance, normal migration-engine execution, RLS/storage, MFA, native XLSX/native apps and operational release checks remain explicit gaps.
