# AGENTS.md --- Coding Assistant Rules

## Project summary

Wedding Guest Manager is a multi-tenant wedding guest-management SaaS.
One account can manage multiple weddings; each wedding has its own paid
plan. Guests use shared or unique invitation links, verify by OTP, and
submit RSVPs. The product includes web, Android, iOS, QR group check-in,
reports, and a super-admin area.

## Source of truth (priority)

1.  `PRD.md` 2. `DESIGN.md` 3. `ARCHITECTURE.md` 4. `DATABASE.md` 5.
    `API.md` 6. `AUTH_SECURITY.md` 7. `INTEGRATIONS.md` 8.
    `FEATURES.md` 9. `PLAN.md` 10. `TESTING.md` 11. `SETUP.md` 12.
    `README.md` and this file.

If documents conflict, stop, explain the conflict, and ask the owner. Do
not silently choose.

## DO

-   Inspect repository, Git status, existing code, package scripts, and
    tests before changes.
-   Plan first; implement one small vertical slice at a time.
-   Reuse established patterns and components.
-   Use TypeScript and validate all external input.
-   Keep domain logic independent of UI and provider SDKs.
-   Enforce ownership server-side and with Supabase RLS.
-   Test tenant isolation, payment activation, RSVP idempotency,
    deadlines, expiry, and deletion.
-   Handle loading, empty, success, and error states.
-   Comment complex business logic.
-   Keep secrets and personal data out of logs and source control.
-   Update docs and migrations together when behavior/schema changes.
-   Report exact verification commands and results.

## DO NOT

-   Change the approved stack or add libraries without asking.
-   Expose Supabase service-role keys in clients.
-   Trust client redirects for payment success.
-   Add guest-count limits to any plan.
-   Bypass OTP, CAPTCHA, RLS, tenant checks, or deadline checks.
-   Expose guest contact details publicly.
-   Create duplicate RSVP records on resubmission.
-   Permit edits after expiry or after an applicable guest deadline.
-   Run destructive deletion without explicit confirmation or verified
    scheduled job.
-   Invent commands, test results, deployments, or completed features.
-   Rewrite working code or perform unrelated refactors without
    approval.

## Workflow

1.  Read relevant source-of-truth docs.
2.  Inspect repository and current state.
3.  State task, dependencies, and acceptance criteria.
4.  Make the smallest safe change.
5.  Run relevant tests, lint, type checks, and build where available.
6.  Review diff and update docs.
7.  Summarize files changed, behavior, verification, and gaps.

## Approval gates

Ask before schema changes affecting data, new providers/paid services,
production deployment, real payment actions, customer-data exports,
permission changes, or deletion. If unsure, ask rather than guess.
