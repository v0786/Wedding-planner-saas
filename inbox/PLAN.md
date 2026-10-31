# Implementation Plan --- Wedding Guest Manager

**Status:** Planning; coding requires explicit authorization. Tasks are
intended to take 1--2 hours; split further when needed. Every phase
should leave a runnable vertical slice.

## Phase 0 --- Repository audit and foundation

-   [ ] Inspect repo, branch, Git status, existing code, protected
    files. Files: repo-wide. Verify baseline recorded.
-   [ ] Confirm runtime, package manager, manifests, lockfile. Verify
    versions pinned.
-   [ ] Scaffold/align Next.js web app. Verify dev app starts.
-   [ ] Scaffold/align Expo mobile app. Verify Android/iOS development
    builds launch.
-   [ ] Configure lint, format, type checks, CI. Verify baseline passes.
-   [ ] Add shared design tokens and validation package. Verify both
    clients consume them.
-   [ ] Separate dev/test/preview/prod environment config. Verify no
    production secrets in templates. **DoD:** web/mobile shells and
    quality checks run with documented environments.

## Phase 1 --- Supabase and identity (depends on Phase 0)

-   [ ] Create dev Supabase project/config. Verify connection.
-   [ ] Add account/profile migrations. Verify apply/rollback in test.
-   [ ] Configure email/password and Google OAuth. Verify
    signup/login/callback.
-   [ ] Provision account idempotently. Verify one account per owner.
-   [ ] Add super-admin provisioning guard. Verify normal users denied.
-   [ ] Add RLS and cross-account tests. Verify foreign reads/writes
    fail. **DoD:** secure identity, ownership, and admin boundary.

## Phase 2 --- Wedding, events, plan entitlements (depends on Phase 1)

-   [ ] Seed Basic/Pro/Prime prices. Verify no guest cap.
-   [ ] Implement wedding draft and guided setup. Verify save/resume.
-   [ ] Add timezone/locale/location. Verify local display.
-   [ ] Implement event CRUD/reorder. Verify ownership and ordering.
-   [ ] Add invitation preview/public-field allowlist. Verify private
    fields excluded.
-   [ ] Add centralized plan entitlement resolver. Verify
    Basic/Pro/Prime checks. **DoD:** account creates multiple isolated
    weddings and events.

## Phase 3 --- Payments and lifecycle (depends on Phase 2)

-   [ ] Add provider-neutral payment interface. Verify adapter contract
    tests.
-   [ ] Integrate Razorpay sandbox. Verify signed test payment.
-   [ ] Integrate Cashfree sandbox. Verify signed test payment.
-   [ ] Add idempotent checkout and verified activation. Verify redirect
    alone cannot activate.
-   [ ] Add upgrade difference calculation. Verify Basic→Pro charges
    ₹500.
-   [ ] Preserve old plan on failed upgrade. Verify with provider
    failure test.
-   [ ] Implement expiry/read-only state. Verify exact local midnight
    boundary.
-   [ ] Implement reminders/deletion worker. Verify dry-run, retries,
    audit, backup policy. **DoD:** purchase, upgrade, expiry, read-only,
    reminder, deletion lifecycle verified.

## Phase 4 --- Guests and imports (depends on stable wedding schema)

-   [ ] Implement groups, side, categories. Verify bride/groom/custom
    categories.
-   [ ] Implement guest CRUD and private fields. Verify authorization.
-   [ ] Add search/filter/sort/pagination. Verify large synthetic
    dataset.
-   [ ] Add CSV/XLSX preview, validation, duplicate detection, commit.
    Verify conflicts.
-   [ ] Add exports. Verify field visibility and permissions. **DoD:**
    unlimited guest records managed/imported/exported safely.

## Phase 5 --- Invitations and RSVP (depends on Phases 2 and 4)

-   [ ] Shared and unique links, revoke. Verify group binding.
-   [ ] One wedding-wide invitation design and plan-aware editor. Verify
    preview.
-   [ ] PDF/image rendering. Verify output on mobile/desktop.
-   [ ] CAPTCHA adapter and public rate limits. Verify invalid proof
    rejected.
-   [ ] OTP provider adapter. Verify expiry, attempts, resend, one-time
    proof.
-   [ ] RSVP form: name/email/party size/diet/status/events/questions.
    Verify validation.
-   [ ] Private edit token and deadline enforcement. Verify
    before/at/after boundary.
-   [ ] Idempotent updates. Verify no duplicate attendance counts.
    **DoD:** mobile guest flow completes and updates securely.

## Phase 6 --- Dashboard, reports, check-in (depends on Phase 5)

-   [ ] Simple dashboard metrics. Verify totals against source rows.
-   [ ] Event/family/diet reports. Verify aggregation.
-   [ ] Custom columns/filters. Verify field-level authorization.
-   [ ] PDF and spreadsheet exports. Verify files open and match data.
-   [ ] QR per group and authorized scanner. Verify token resolution.
-   [ ] Group arrival and manual fallback. Verify duplicate scan
    idempotency. **DoD:** reports reconcile and group check-in works.

## Phase 7 --- Notifications and help

-   [ ] Add templates/preferences. Verify safe rendering.
-   [ ] Add email adapter. Verify sandbox delivery.
-   [ ] Add official WhatsApp Business adapter. Verify approved
    template.
-   [ ] Add retry/idempotency/delivery status. Verify duplicate events
    do not duplicate sends.
-   [ ] Add searchable FAQ. Verify answers match product behavior.
    **DoD:** notifications do not block RSVP; manual sharing remains
    available.

## Phase 8 --- Native apps and internationalization

-   [ ] Mobile auth and wedding/guest overview. Verify iOS/Android.
-   [ ] Mobile QR scanner and manual fallback. Verify camera permission.
-   [ ] Add locale infrastructure. Verify language switch.
-   [ ] Add currency/timezone formatting. Verify INR and non-INR test
    cases.
-   [ ] Prepare app-store privacy and release assets. Verify policy
    review. **DoD:** approved host workflows work on mobile and
    locale-aware formatting.

## Phase 9 --- Security, performance, pilot

-   [ ] Tenant isolation tests across reads/writes/exports/storage.
-   [ ] OWASP security review and dependency scan.
-   [ ] OTP/CAPTCHA/rate-limit tests.
-   [ ] Payment webhook replay/idempotency tests.
-   [ ] Expiry/deletion/backup tests.
-   [ ] Accessibility and responsive review.
-   [ ] Monitoring, backup, restore drill.
-   [ ] Pilot with consented real users; record feedback and release
    decision. **DoD:** no critical data-loss/security issues; pilot
    acceptance criteria pass.

## Dependency rule

Build vertical slices. Do not mark tasks complete without evidence.
Update this plan after each accepted feature; do not begin the next
feature until the owner confirms.
