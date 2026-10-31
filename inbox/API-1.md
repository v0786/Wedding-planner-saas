# API Specification --- Wedding Guest Manager

**Status:** Proposed contract, not implemented. **Base:** `/api/v1`
**Transport:** HTTPS JSON.

## 1. Authentication

Host endpoints require Supabase Auth bearer token. Super-admin requires
a separate active admin authorization. Public invitation endpoints use
an invitation token and strict allowlist. Guest RSVP requires verified
OTP proof or an explicitly enabled Google guest identity. Webhooks
require provider signature verification.

Headers: `Authorization: Bearer <token>`,
`Content-Type: application/json`, `Idempotency-Key: <uuid>`,
`X-Request-ID: <id>`.

Success: `{"data":{},"meta":{"requestId":"req_123"}}`.

Error:
`{"error":{"code":"VALIDATION_ERROR","message":"Please correct the fields.","details":[{"field":"partySize","issue":"Must be zero or greater."}],"requestId":"req_123"}}`.

HTTP: 400 malformed; 401 unauthenticated; 403 forbidden/expired/plan
restriction; 404 not found or concealed; 409 conflict; 422 validation;
429 rate limit; 402 payment/upgrade required; 500 internal; 502/503
provider unavailable. Never return stack traces, secrets, OTPs, or
private guest records.

## 2. Lists

Use cursor pagination:
`?limit=25&cursor=<opaque>&sort=createdAt:desc&search=<term>`. Default
25, max 100. Filters/sorts are allowlisted; never interpolate
user-provided sort strings into SQL.

## 3. Account

-   `GET /account` --- current owner profile.
-   `PATCH /account` --- update display name, locale, currency,
    timezone. Auth required.

## 4. Weddings

-   `GET /weddings` --- list current account weddings.
-   `POST /weddings` --- create draft; body includes title, couple
    names, date, timezone, locale, currency.
-   `GET /weddings/{weddingId}` --- detail/lifecycle.
-   `PATCH /weddings/{weddingId}` --- update; mutation requires active
    lifecycle.
-   `DELETE /weddings/{weddingId}` --- request early deletion; explicit
    confirmation required; returns deletion job. All require owner auth
    and ownership check.

## 5. Events

-   `GET /weddings/{id}/events`
-   `POST /weddings/{id}/events` --- name, date/time, venue,
    description, dress code, map, cover.
-   `PATCH /weddings/{id}/events/{eventId}`
-   `DELETE /weddings/{id}/events/{eventId}` --- archive/delete with
    orphan checks.
-   `POST /weddings/{id}/events/reorder` ---
    `{ "eventIds": ["uuid-1","uuid-2"] }`. Host auth; all IDs must
    belong to same wedding; plan entitlements enforced.

## 6. Plans and payments

-   `GET /plans` --- public active plan catalog.
-   `POST /weddings/{id}/checkout` ---
    `{ "planCode":"basic", "provider":"razorpay" }`.
-   `POST /weddings/{id}/upgrade` ---
    `{ "targetPlanCode":"pro", "provider":"cashfree" }`; only before
    wedding date; charge difference.
-   `GET /weddings/{id}/subscription` --- plan/payment/expiry/deletion
    state.
-   `POST /payments/webhooks/{provider}` --- verify signature;
    idempotent; server-side activation only.

## 7. Guests and groups

-   `GET /weddings/{id}/guests` ---
    search/filter/side/category/diet/accommodation/transport.
-   `POST /weddings/{id}/guests` --- create individual guest.
-   `PATCH /weddings/{id}/guests/{guestId}` --- update.
-   `DELETE /weddings/{id}/guests/{guestId}` --- archive.
-   `POST /weddings/{id}/guest-groups` --- create family/group.
-   `PATCH /weddings/{id}/guest-groups/{groupId}` --- update
    side/category/size.
-   `POST /weddings/{id}/guests/import` --- create validated import
    job/preview.
-   `POST /weddings/{id}/guests/import/{jobId}/commit` --- idempotent
    commit. Owner auth; all records wedding-scoped.

## 8. Invitation links and public page

-   `POST /weddings/{id}/invitation-links` ---
    `{ "type":"unique_group", "guestGroupId":"uuid" }` or shared.
-   `POST /weddings/{id}/invitation-links/{linkId}/revoke`.
-   `GET /public/invitations/{token}` --- no host login; safe approved
    fields only; rate-limited/CAPTCHA-protected as risk requires.

## 9. OTP and RSVP

-   `POST /public/invitations/{token}/verification-challenges` ---
    `{ "phone":"+919876543210", "captchaToken":"proof" }`.
-   `POST /public/verification-challenges/{challengeId}/verify` ---
    `{ "otp":"123456" }`; returns short-lived scoped proof.
-   `POST /public/invitations/{token}/rsvps` ---
    `{ "verificationProof":"proof", "name":"Guest Name", "email":"guest@example.com", "partySize":3, "dietaryPreference":"vegetarian", "overallStatus":"accepted", "eventIds":["event-uuid"], "answers":[] }`.
-   `GET /public/rsvps/{editToken}` --- own response only, valid token.
-   `PATCH /public/rsvps/{editToken}` --- update existing response;
    server enforces deadlines.

## 10. Questions, dashboard and reports

-   `GET/POST /weddings/{id}/rsvp-questions`
-   `PATCH/DELETE /weddings/{id}/rsvp-questions/{questionId}`
    (deactivate rather than erase historical answers).
-   `GET /weddings/{id}/dashboard` ---
    invited/accepted/declined/maybe/pending, event/family summaries,
    deadline.
-   `POST /weddings/{id}/reports` --- selected columns, filters, format
    `pdf`/`xlsx`/`csv`; returns job/download reference.
-   `GET /weddings/{id}/reports/{reportId}` --- job status. Contact
    fields only included if host visibility preference permits.

## 11. Check-in

-   `POST /public/check-in/resolve` --- resolve QR to safe preview;
    authorized scanner session required.
-   `POST /weddings/{id}/check-ins` ---
    `{ "guestGroupId":"uuid", "method":"qr" }`; idempotent.
-   `GET /weddings/{id}/check-ins` --- authorized list.

## 12. Notifications

-   `POST /weddings/{id}/notifications/test` --- test destination
    controlled by owner.
-   `GET /weddings/{id}/notifications` --- delivery status. Provider
    callbacks are separately authenticated and idempotent.

## 13. Super-admin

Admin-only and audited: `GET /admin/customers`, `/admin/weddings`,
`/admin/subscriptions`, `/admin/payments`, `/admin/deletion-jobs`,
`/admin/audit-logs`; `POST /admin/plans/{planId}/versions`;
`POST /admin/weddings/{id}/lifecycle-actions`. Sensitive data access
must be justified and audited.

## 14. Rate limits

Apply per-IP, per-phone, per-wedding, per-token, and per-device risk
limits for OTP, CAPTCHA, invitation reads, RSVP submit/update,
login/reset, exports, and check-in. Return 429 with `Retry-After`.

## 15. Versioning

Breaking changes require a new API version or documented migration.
Mobile clients may lag web releases; preserve backward-compatible fields
and publish deprecation windows. Every endpoint maps to a PRD feature
and database entity.
