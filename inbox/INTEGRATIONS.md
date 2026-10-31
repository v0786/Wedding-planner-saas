# Third-Party Integrations --- Wedding Guest Manager

**Status:** Provider-neutral plan. Provider accounts and credentials are
not configured.

## 1. Rules

All external calls run server-side behind adapters. Never put secrets in
web/mobile clients. Verify webhooks; use idempotency; keep provider
payloads sanitized; RSVP persistence must not depend on notification
delivery. Test in sandbox before production.

## 2. Supabase

Purpose: PostgreSQL, Auth, Storage, selected Edge Functions. Planned
variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (server-only). Create separate environments;
configure email/password and Google OAuth; apply migrations/RLS;
configure private storage; test cross-account isolation. Do not bypass
RLS on failure.

## 3. Razorpay

Purpose: one-time plan purchase and upgrade. Variables:
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
Adapter operations: create order, verify signature, process webhook,
fetch status for reconciliation. Validate
order/amount/currency/account/wedding; idempotency; activate only after
server-verified success. Upgrade amount is difference. No app-generated
invoice. Test success/failure/pending/duplicate/out-of-order callbacks
in test mode.

## 4. Cashfree

Purpose: alternate payment provider using same internal interface.
Variables: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`,
`CASHFREE_WEBHOOK_SECRET`, `CASHFREE_ENVIRONMENT`. Verify signature and
amount/currency; duplicate callbacks cannot activate twice. Use sandbox.

## 5. OTP provider (not selected)

Variables: `OTP_PROVIDER`, `OTP_API_KEY`, `OTP_API_SECRET`,
`OTP_SENDER_ID` if required. Must support short-lived OTP, bounded
attempts/resends, one-time verification, generic anti-enumeration
responses, no plaintext OTP storage/logging, and target-region coverage.
On outage, never create false verified state. Select after comparing
coverage, sender rules, cost, rate limits, and data handling.

## 6. CAPTCHA provider (not selected)

Variables: `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY`. Apply
to OTP requests and public abuse-prone flows. CAPTCHA supplements server
rate limiting; it does not replace it.

## 7. Email provider (not selected)

Variables: `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS`,
`EMAIL_FROM_NAME`, optional `EMAIL_WEBHOOK_SECRET`. Use transactional
email for account notices, deletion reminders, and approved wedding
messages. Localize templates; minimize PII.

## 8. WhatsApp Business

Use official WhatsApp Business Platform or approved provider only; no
unofficial browser automation or personal sessions. Variables:
`WHATSAPP_PROVIDER`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`. Requires
approved templates where applicable, consent/opt-out handling, delivery
callbacks, idempotent retries, and safe message content. Manual sharing
remains fallback. Phased after core RSVP.

## 9. Storage and exports

Supabase Storage for invitation assets and private report files. Use
private buckets, short-lived signed URLs, MIME/size validation,
non-predictable object paths, and delete assets with wedding. Public
assets must be explicitly approved for public access.

## 10. Monitoring

Choose managed monitoring before launch. Do not send OTPs, tokens, guest
phone/email, payment secrets, or private notes to error tools. Use
request IDs and sanitized metadata.

## 11. Webhook checklist

Verify signature; validate event; persist provider event/idempotency
key; ignore duplicate; validate internal order/wedding/amount; update
transactionally; queue notification after commit; return safe response.

## 12. Cost and fallback

OTP, WhatsApp, email, and storage may be usage-priced. Track cost per
wedding and alert thresholds. Keep manual link sharing and host exports
available during provider outage. Provider abstraction prevents domain
redesign. Do not promise international delivery until tested.

## 13. Decisions before implementation

-   [ ] OTP provider selected and tested in target regions.
-   [ ] CAPTCHA provider selected.
-   [ ] Email provider selected.
-   [ ] Official WhatsApp provider selected.
-   [ ] Razorpay and Cashfree sandbox configured.
-   [ ] Storage retention/signed URLs verified.
-   [ ] Webhook signature/replay tests pass.
-   [ ] Data processing terms reviewed.
