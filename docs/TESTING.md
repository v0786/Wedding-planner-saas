# Testing Strategy --- Wedding Guest Manager

**Status:** Plan only; no tests have been implemented or run in this
documentation task.

## 1. Tools

Vitest for domain/unit; React Testing Library for web; React Native
Testing Library for mobile; Playwright for web E2E; dedicated Supabase
test project/local environment for DB/RLS integration; axe plus manual
accessibility checks; dependency/static security scans. Pin versions
after scaffold.

## 2. Priorities

Critical: tenant isolation, payment activation, OTP, RSVP idempotency,
deadline, plan entitlements, expiry/deletion, exports, QR check-in. Then
UI states, responsive behavior, localization, and notifications.

## 3. Test matrix

  -----------------------------------------------------------------------
  Feature                 Scenario/input          Expected
  ----------------------- ----------------------- -----------------------
  Auth                    valid signup            one account provisioned

  Tenant                  Account A requests B    denied/not found
                          wedding                 

  Multi-wedding           one account creates two independent
                                                  subscriptions/data

  Plans                   very large guest list   no guest cap blocks it

  Payment                 valid signed webhook    plan activates once

  Payment                 redirect success, no    remains pending
                          verified webhook        

  Upgrade                 Basic ₹499 → Pro ₹999   ₹500 difference

  Upgrade                 payment fails           old plan remains

  Events                  select event from other rejected
                          wedding                 

  OTP                     valid challenge/code    one-use proof issued

  OTP                     wrong                   rejected and
                          code/replay/expired     rate-limited

  CAPTCHA                 invalid proof           request rejected

  RSVP                    accepted, party size 4  current response saved

  RSVP                    same invitation submits update; no double count
                          again                   

  RSVP                    Maybe                   remains distinct from
                                                  Pending

  RSVP                    Declined                zero expected attendees

  Event                   select two events       two valid selections
                                                  saved

  Deadline                before/at/after         follows server boundary
                                                  policy

  Expiry                  wedding 10 Dec          expires 11 Dec 00:00
                          Asia/Kolkata            

  Read-only               host mutates after      rejected; view/export
                          expiry                  allowed

  Public                  invitation after expiry disabled

  Deletion                wedding 10 Dec          delete scheduled 18 Dec
                                                  00:00

  Deletion                worker retries          idempotent, no partial
                                                  corruption

  Report                  phone hidden in host    phone omitted
                          settings                

  QR                      valid group QR          group marked arrived

  QR                      scan twice              already checked in, no
                                                  duplicate

  Export                  owner requests another  denied
                          wedding                 

  Admin                   normal owner opens      denied and audited
                          admin                   
  -----------------------------------------------------------------------

## 4. Domain/unit tests

Test plan prices/difference; entitlement rules; local-time
expiry/deletion; status normalization; party-size validation;
same-wedding event selection; deadline comparisons; currency/timezone
formatting; idempotency.

## 5. Integration tests

RLS; payment adapters/webhooks; OTP challenge lifecycle; RSVP
transactions; report aggregation; QR resolution/check-in; deletion
worker and storage cleanup; notification retry.

## 6. E2E flows

Signup/login; create multiple weddings; purchase/upgrade; import guests;
publish shared/unique invitation; OTP; submit RSVP; update before
deadline; dashboard/export; QR check-in; expiry/read-only; deletion
reminders and scheduled deletion in test environment.

## 7. Attendance semantics

Test accepted party size and multiple events; Maybe vs Pending; Declined
contributes zero expected attendance; party-size update replaces old
count; removing event selection removes contribution; group QR does not
claim individual family attendance; dashboard and exports share
aggregation logic.

## 8. Payment tests

Valid/invalid signature; wrong amount/currency/wedding;
duplicate/out-of-order webhook; pending→success; failure/retry; provider
timeout; reconciliation; failed upgrade preserves old plan.

## 9. Security tests

Cross-tenant read/insert/update/delete/export/storage denied; public
invitation allowlist; invalid token rejected; edit token cannot access
another response; OTP replay blocked; rate limit enforced; secrets
absent from client bundle/logs.

## 10. Deletion tests

Timezone conversion; reminders at configured 7-day and 3-day offsets;
early deletion confirmation; due-job selection; retry; dependent
DB/storage removal; backup expiry separately verified; safe audit record
retained.

## 11. Coverage goals

Domain logic 90% line coverage target. Critical
auth/payment/RSVP/lifecycle/RLS branch scenarios fully covered. E2E
covers all critical host and guest paths. Coverage is not a substitute
for risk-based review.

## 12. Manual release checklist

-   [ ] Android and iOS devices/simulators.
-   [ ] Mobile and desktop invitation.
-   [ ] OTP/resend/limits.
-   [ ] Name/email/party size/diet/event form.
-   [ ] RSVP update/deadline.
-   [ ] Reports and privacy columns.
-   [ ] QR camera permission/manual fallback.
-   [ ] Payment and upgrade sandbox.
-   [ ] Read-only and public disable after expiry.
-   [ ] Deletion reminders and job in test.
-   [ ] Logs contain no secrets/PII.
-   [ ] Backup restore drill complete.

Add exact test commands only after package scripts exist; do not invent
scripts or claim tests passed without execution.
