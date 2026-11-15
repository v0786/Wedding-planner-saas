# Authentication and Security --- Wedding Guest Manager

**Status:** Design only; production launch requires implementation
review and security testing.

## 1. Identity types

-   **Host:** Supabase Auth email/password and Google OAuth; one owner
    role for customer account in initial release.
-   **Guest:** no mandatory full account; phone OTP before phone-based
    RSVP; optional Google guest path if enabled, always scoped to
    invitation.
-   **Super-admin:** separate protected area, strong auth/MFA, manually
    provisioned; no public admin signup.

## 2. Flows

**Signup:** Supabase Auth validates credentials/OAuth; server provisions
account/profile idempotently.\
**Login/logout:** provider session lifecycle; secure HTTP-only cookies
on web where supported; platform-secure storage on mobile.\
**Password reset:** provider flow, allowlisted redirect, generic
responses to reduce enumeration.\
**Guest OTP:** invitation → CAPTCHA/risk check → phone entry →
per-IP/phone/wedding/device limits → provider sends OTP → bounded
verification attempts → one-use, short-lived proof scoped to invitation
→ proof consumed by RSVP. Never store/log OTP plaintext.\
**Google guest option:** if enabled, validate OAuth server-side and
still require valid invitation token; do not bypass wedding scoping.

## 3. Tokens

Supabase owns host access/refresh lifecycle. Public invitation token and
private edit token are separate. Use high-entropy values; store hashes
where practical. Edit token is response-scoped, revocable, and
deadline-checked. OTP proof is short-lived and single-use. Avoid
long-lived tokens in query strings; apply strict referrer policy and
token exchange where link-based edit is used.

## 4. Permissions

  -------------------------------------------------------------------------------
  Action            Guest             Account owner     Super-admin
  ----------------- ----------------- ----------------- -------------------------
  View approved     Yes               Yes               Support need only,
  invitation                                            audited

  Submit own RSVP   Verified          May               No routine action
                                      record/correct    
                                      while active      

  Edit own RSVP     Yes               Yes               No routine action
  before deadline                                       

  View guest        No                Yes               Restricted/audited
  list/private                                          
  notes                                                 

  Create/edit       No                Active            Restricted support
  wedding                             subscription only 

  Export wedding    No                Active or         Restricted/audited
  data                                read-only window  

  Mark check-in     No                Authorized        No routine action
                                      check-in          
                                      dashboard         

  Manage platform   No                No                Yes
  plans                                                 

  Run deletion      No                Request early     System/admin-controlled
                                      deletion          
  -------------------------------------------------------------------------------

## 5. Tenant isolation

Derive account ownership from auth identity; RLS on every tenant table;
validate wedding ownership on every API; use same-wedding foreign-key
constraints; public endpoints return allowlisted projections; test
cross-tenant reads/writes/updates/deletes/exports/storage. Never rely on
hidden UI controls.

## 6. Web/API protections

HTTPS; secure cookies; CORS allowlist; CSRF protection for
cookie-authenticated writes; CSP; XSS-safe output; schema validation;
parameterized SQL; request/body limits; CAPTCHA and rate limits; safe
errors and correlation IDs; idempotency for payments, RSVP, imports,
check-in. Never log secrets or unnecessary PII.

## 7. Data protection

Collect minimum necessary guest data. Host selects contact visibility
during onboarding. Private notes never public. Restrict exports and use
short-lived signed URLs. Document retention and backup purge. Deletion
of live records is not complete erasure while backup copies remain.

## 8. Payment security

Create orders server-side; verify signatures, order, amount, currency,
account, wedding, and provider. Browser redirect is not proof. Webhooks
are idempotent. Never store card details. Do not let client control
upgrade amount. Store provider references and sanitized metadata only.

## 9. Super-admin

No public admin registration; MFA; separate session/guard; least
privilege; audit sensitive reads and all destructive operations; require
reason/confirmation for overrides and deletion.

## 10. Launch checklist

-   [ ] RLS and cross-tenant tests pass on every tenant resource.
-   [ ] Public invitation allowlist reviewed.
-   [ ] OTP expiry, replay, resend, attempt limits tested.
-   [ ] CAPTCHA/rate limits tested.
-   [ ] Edit tokens scoped and protected.
-   [ ] Payment signature and webhook idempotency verified.
-   [ ] CORS/CSRF/CSP/cookie flags reviewed.
-   [ ] Input/output validation reviewed.
-   [ ] Exports and contact visibility tested.
-   [ ] Super-admin MFA/audit enabled.
-   [ ] Logs checked for PII/secrets.
-   [ ] Backup/restore/deletion policies tested.
-   [ ] Dependency scan and independent security review completed.

## Implemented administrator step-up — 15 November 2026

The current application retains Auth.js and Prisma under the approved migration
plan. Platform administration now requires both a manually provisioned admin
identity and a separate, recent authenticator verification. The shared
`requireAdmin` guard protects all administrative services and API routes; the
admin page layout and page guards redirect to `/dashboard/admin-access`.

Enrollment requires the existing account password and a six-digit RFC 6238
SHA-1 authenticator code. A Google-only administrator can use the existing
account password-recovery flow before enrollment. Setup expires after ten
minutes. The authenticator secret is encrypted with AES-256-GCM using a
purpose-separated key derived from the server's `AUTH_SECRET` (at least 32
characters); neither the secret nor recovery codes enter logs or audit records.
Eight high-entropy recovery codes are displayed once and stored only as SHA-256
hashes. Store these outside the application in a password manager.

A successful second factor creates a Secure-in-production, HttpOnly,
SameSite=Strict cookie valid for 15 minutes. Its encrypted payload is bound to
the current Auth.js session cookie, account session version, user ID and
credential ID. Sign-in/session changes and credential removal invalidate that
access. TOTP time steps and recovery codes are consumed through conditional
PostgreSQL writes so replay and concurrent duplicate verification cannot
succeed. All verification attempts use the shared database limiter and fail
closed if that limiter is unavailable.

To replace a lost authenticator, verify with an unused recovery code, reopen
Administrator verification, then choose replacement and confirm the account
password. Removing the old credential closes administrator access until a new
authenticator is enrolled. Enrollment, successful verification, recovery use
and credential replacement are durably audited. An operator-assisted reset
must independently verify the administrator identity; there is no public reset
or bypass endpoint. Retain the encryption key with encrypted backups: rotating
`AUTH_SECRET` requires a controlled MFA credential migration or re-enrollment.

Local tests cover RFC vectors, encryption/tamper resistance, clock/replay
bounds, session binding, guard enforcement, real-database enrollment,
concurrent recovery consumption and credential replacement. Live device
acceptance and independent security review remain release checks.
