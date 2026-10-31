# Product Requirements Document --- Wedding Guest Manager

**Version:** 2.0 \| **Status:** Approved product definition,
pre-implementation \| **Market:** India-first, international-ready \|
**Coding:** Not authorized by this documentation request.

## 1. Product summary

Wedding Guest Manager is a multi-tenant SaaS for families, independent
wedding planners, and event-management companies. It manages multiple
weddings per account, guest/family records, invitations, verified RSVPs,
event attendance, reports, and QR group check-in. It provides web,
Android, iOS, and a separate platform-owner super-admin area.

## 2. Problem

Wedding coordination is fragmented across WhatsApp, calls, spreadsheets,
and paper. Hosts lack a reliable view of invitees, household groups,
responses, event attendance, dietary requirements, and arrivals. The
product centralizes this work while keeping guest participation simple
and mobile-friendly.

## 3. Personas

-   **Family host:** Organizes one wedding and needs a simple guest,
    invitation, RSVP, and catering view.
-   **Independent planner:** Manages multiple client weddings from one
    account; each wedding has its own subscription and data.
-   **Event-management company:** Coordinates multiple weddings and
    requires repeatable workflows, reports, and exports.
-   **Guest:** Opens a link, verifies a phone number or uses an enabled
    Google path, and submits a response without installing an app.

## 4. Goals

-   One account can manage multiple weddings; every wedding requires its
    own plan.
-   Unlimited guests on every plan.
-   Manage individuals, families/groups, bride/groom sides, and
    categories.
-   Shared and unique invitation links; one design per wedding.
-   OTP-verified RSVP with name, email, party size, dietary preference,
    overall status, and event selection.
-   Correct attendance totals, reports, and QR group check-in.
-   Strict tenant isolation, clear expiry, and scheduled deletion.

## 5. Non-goals

No AI dependency, wedding budgeting/accounting, vendor marketplace,
seating charts, customer-side staff roles, invoice generation, discount
coupons, unofficial WhatsApp automation, or mandatory guest app
installation.

## 6. Account and wedding model

Account → Wedding A → Subscription A + events + guests + links + RSVPs +
reports. Account → Wedding B → independent Subscription B and data.
Plans cannot be shared across weddings. Customer-side role is Owner
only. Platform owner uses a separate super-admin dashboard.

## 7. Plans and pricing

One-time per wedding:

  Plan       Price Guest limit
  ------- -------- -------------
  Basic       ₹499 Unlimited
  Pro         ₹999 Unlimited
  Prime     ₹1,999 Unlimited

  Capability                     Basic      Pro        Prime
  ------------------------------ ---------- ---------- ----------
  Guest management/events/RSVP   Yes        Yes        Yes
  Shared + unique links          Yes        Yes        Yes
  Basic spreadsheet export       Yes        Yes        Yes
  PDF reports                    Basic      Advanced   Advanced
  Invitation themes              Limited    Expanded   All
  Custom invitation design       No         Basic      Advanced
  Dashboard                      Standard   Advanced   Advanced
  Custom RSVP questions          Limited    Yes        Yes
  Branding                       No         Limited    Full
  Priority support               No         No         Yes

Basic may limit advanced event details, customization, question options,
and report capabilities; exact numeric caps are a launch configuration
decision. Guest count is never limited.

### Purchase and upgrade rules

-   Successful **server-verified** one-time payment activates the plan
    immediately.
-   Razorpay and Cashfree are both supported behind a provider
    abstraction.
-   Upgrade any time before wedding date; charge only price difference.
    Example: Basic ₹499 → Pro ₹999 = ₹500.
-   Failed upgrade keeps the current plan.
-   No coupons, recurring billing, or application-generated invoices.
-   Cancellation does not terminate access early or create an automatic
    refund; access follows the paid lifecycle. There is no recurring
    renewal.

## 8. Expiry and deletion

Expiry is wedding-local midnight on the calendar day after the wedding
date. Example: wedding 10 Dec → subscription expires **11 Dec 00:00
IST**. After expiry, host can view/export but cannot edit; public
invitation and RSVP pages are disabled. Wedding data is scheduled for
permanent deletion **18 Dec 00:00 IST**, seven complete days after the
wedding date. Send reminders 7 days and 3 days before deletion. Host may
request early deletion. Backup retention/purge must be separately
documented and enforced.

## 9. Wedding and event setup

Guided setup collects couple names, title, wedding date, timezone,
location, venue, events, invitation design, guest settings, RSVP
deadline, and privacy settings. Host can create/edit/delete/reorder
events. Event fields: name, date/time, venue/address, map, description,
dress code, cover photo. Host chooses which details appear in
invitation. Plan entitlements govern advanced fields. One invitation
design is shared across the wedding. Download as PDF and image.

## 10. Guest management

Individual guest records; family/household groups; bride/groom side;
categories (VIP, relatives, friends, colleagues); bulk Excel/CSV import
with preview, validation, duplicate detection; search/filter/sort; meal
preference; accommodation and transport requirements; private notes; PDF
and spreadsheet exports. Distinguish host-maintained person records,
invitation/group count, and RSVP party size. Public RSVP asks for number
of people attending; it does not require every accompanying family
member to be individually named.

## 11. Invitation and RSVP

Both shared wedding links and unique invitation/group links are
supported. Public pages expose only host-approved wedding/event fields.
Guest flow: open link → phone OTP or enabled Google path → form → review
→ submit. Phone path verifies the number before showing/accepting the
form. Form fields: name, email, party size, dietary preference
(e.g. vegetarian/non-vegetarian), overall Accept/Decline/Maybe, event
selections, and host-configured questions. Guests need no app install.
Host configures a wedding-wide edit deadline; advanced mode may use
event-specific deadlines. Before deadline, resubmission updates the
existing response. After deadline, guest edits close; host may correct
while subscription is active.

## 12. QR check-in

One QR per invitation/group. Any user with authorized check-in dashboard
access can scan. Initial action marks the group arrived. Because public
RSVP records party size rather than named family members, this is
group-level check-in, not proof each person arrived. Duplicate scans are
idempotent; manual lookup fallback is required.

## 13. Dashboard, reports, notifications

Simple overview, no wedding finance module. Metrics: invited, accepted,
declined, maybe, pending, event-wise attendance, family-wise attendance,
guest statistics, RSVP deadline. Reports: overall, event-wise,
family-wise, dietary totals, and custom selected columns/filters. Export
PDF and Excel/CSV, subject to plan. Contact fields obey host visibility
preference chosen during onboarding. Email and WhatsApp notifications
are planned in phases; manual link sharing first; WhatsApp must use
official Business API/provider.

## 14. Authentication and admin

Host: email/password and Google login. Guest: phone OTP; optional Google
sign-in path when enabled. Separate super-admin panel manages customers,
weddings, plans, subscriptions, payments, platform settings, and
deletion jobs. Admin access is strongly authenticated and audited.

## 15. International readiness

Support multiple languages, currencies, and IANA timezones in data model
and UI formatting. Initial defaults: INR and Asia/Kolkata.
International-ready architecture does not mean every translation or
payment provider is available at launch.

## 16. MVP / V2 / Later

**MVP:** auth, account/multi-wedding model, plan purchase/upgrade,
wedding/events, guests/groups/import, shared+unique links, plan-aware
invitation, OTP/CAPTCHA, RSVP, deadlines, dashboard/reports/exports, QR
group check-in, super-admin, tenant isolation, expiry/deletion.\
**V2:** automated email, official WhatsApp notifications/reminders,
expanded localization/currency providers, advanced report templates.\
**Later:** seating, vendors, chatbot/AI, marketplace, other validated
extensions.

## 17. Success metrics

Wedding setup completion/time; guest import time; invitation
open-to-RSVP rate; OTP delivery/verification; RSVP completion/update
rate; duplicate/abuse rate; event/family count accuracy; check-in
success; export success; payment success/upgrade conversion; host
satisfaction and support volume.

## 18. Risks and open decisions

Risks: OTP cost/delivery; forwarded unique links; party-size
inaccuracies; payment spoofing; deletion mistakes; privacy exposure;
WhatsApp policy/cost; international complexity. Mitigate with adapters,
server verification, token revocation, RLS, idempotency, dry-run
deletion, and pilot testing. Before implementation finalize exact Basic
caps, OTP/CAPTCHA/email/WhatsApp providers, guest Google flow, deadline
boundary semantics, legal/tax terms, backup retention, mobile release
sequence, and international payment coverage.
