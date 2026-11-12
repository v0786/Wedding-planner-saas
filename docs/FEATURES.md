# Feature Implementation Guide --- Wedding Guest Manager

Build one feature at a time. After acceptance, update `PLAN.md` and wait
for owner confirmation before starting the next feature.

## 1. Account authentication

**Story:** Host needs a secure account. Screens:
signup/login/Google/password reset. Data: Supabase Auth, `accounts`,
`account_profiles`. Build auth, idempotent account provisioning,
session/logout, reset, admin guard. Edge cases: duplicate signup,
callback mismatch, expired session, provisioning race. **Accept:**
email/password and Google work; account provisioned once;
unauthenticated host routes denied.

## 2. Multi-wedding guided setup

**Story:** Owner manages multiple independent weddings. Screens: wedding
list, wizard, overview. Data: `weddings`, `wedding_settings`,
`accounts`. Wizard collects
couple/title/date/timezone/location/events/invitation/guest
settings/RSVP deadline/privacy. Ask host during onboarding how guest
mobile/email visibility should work. **Accept:** multiple weddings;
save/resume; timezone persisted; contact visibility chosen before
publish.

## 3. Plans, payment, upgrades

**Story:** Owner purchases a plan for each wedding. Data: `plans`,
`wedding_subscriptions`, `subscription_events`, `payments`. Implement
entitlement resolver, Razorpay/Cashfree adapters, idempotent order,
server verification, upgrade difference. **Accept:** Basic ₹499/Pro
₹999/Prime ₹1,999; unlimited guests; one plan per wedding; upgrade
before wedding date charges difference; failure preserves current plan;
no invoice/coupon feature.

## 4. Events

Fields: name/date/time/venue/description/dress code/map/cover. Host can
create/edit/delete/reorder and choose public fields. Basic has limited
advanced fields; Pro/Prime unlock more. **Accept:** same-wedding
validation, server-side entitlement, no silent data loss on plan change.

## 5. Guest/group management

Data: `guest_groups`, `guests`, `guest_import_jobs`. Implement person
records, families/groups, bride/groom side,
VIP/relative/friend/colleague categories,
dietary/accommodation/transport/private notes, search/filter/sort,
CSV/XLSX preview, duplicate detection, export. **Accept:** no guest cap;
distinct group/person/party counts; private notes never public; import
conflicts reviewable.

## 6. Invitations

Data: `invitation_links`, weddings/events/settings. Implement shared
wedding link, unique group link, revoke, one design per wedding,
plan-aware themes/customization, PDF/image download. **Accept:** token
binds correctly; public allowlist only; one design across wedding;
locked features explained.

## 7. OTP and abuse protection

Data: `guest_verification_challenges`. Implement CAPTCHA adapter, OTP
adapter, expiry, resend/attempt limits, short-lived one-use proof.
**Accept:** OTP never stored/logged plaintext; replay blocked; phone
enumeration reduced; rate limits tested; optional Google path still
validates invitation.

## 8. RSVP

Data: `rsvp_submissions`, `rsvp_event_selections`, `rsvp_questions`,
`rsvp_answers`. Form: name, email, party size, diet,
Accept/Decline/Maybe, event selection, custom questions. Implement
review, submit, private edit capability, deadlines, idempotent updates.
**Accept:** event IDs same wedding; party size validated; Maybe distinct
from Pending; resubmission updates current record; deadlines
server-enforced.

## 9. Dashboard and reports

Data: guest/group/events/RSVP/report jobs. Simple dashboard; overall,
event, family, dietary, custom columns/filters; PDF and spreadsheet
export. **Accept:** totals reconcile; contact fields respect host
visibility; no finance module.

## 10. QR group check-in

Data: `check_in_records`, groups, links. One QR per invitation/group;
any authorized check-in dashboard user can scan; manual fallback.
**Accept:** group marked arrived; duplicate scan idempotent; group scan
not described as individual attendance.

## 11. Expiry and deletion

Data: weddings, subscriptions, deletion jobs, audit. Expiry 00:00 day
after wedding; read/export only; public invitation/RSVP disabled;
deletion 7 days after wedding at 00:00; reminders 7 and 3 days before;
early delete requires confirmation. **Accept:** correct timezone;
idempotent worker; backup policy tested.

## 12. Notifications

Email and official WhatsApp adapters; manual sharing first. Queue after
core data commit; retry idempotently; show delivery status. **Accept:**
provider failure never blocks RSVP; sensitive details excluded.

## 13. Super-admin

Separate dashboard for customers, weddings, plans, subscriptions,
payments, deletion queue, settings, audit. **Accept:** normal owners
denied; admin actions audited; destructive/payment actions require
confirmation.

## 14. Native apps and localization

Expo Android/iOS host workflows, QR scanner, locale/currency/timezone
support. **Accept:** core approved flows work on both platforms; camera
fallback; INR/Asia-Kolkata defaults; additional locales/currencies
supported by architecture.

## Private invitation and RSVP links

- The host can publish a shared invitation for all guests, or create a private link for a guest or group. A guest explicitly opens a private invitation to bind it to the current browser. Opening a bound private link in another browser gives a 404. The host can issue a fresh link when needed.
- A guest verifies the mobile number before submitting an RSVP. The private edit link works in the browser that saved the response. Another submission with the same phone number cannot overwrite a bound response. Existing RSVPs from before device binding can be claimed once after verifying the associated phone.
- To switch browsers, select **Create device transfer link**, open it on the new browser within 15 minutes, and confirm. This keeps the saved RSVP and invalidates the old edit link. The transfer cannot be reused.
- Browser data is the access credential. Switching networks does not affect access. A different browser app, private browsing session, or cleared site data is treated as a different browser.

In **Group Invitations & Check-in**, hosts can create, reissue, or revoke
private guest or group links. The QR on an opened invitation encodes an
opaque group code. Authorized wedding staff can scan it with a compatible
browser, enter the code, or find the group by name. Repeated check-ins keep
the first arrival time.
