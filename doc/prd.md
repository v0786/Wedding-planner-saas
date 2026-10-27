# Product Requirements Document --- Wedding Planner SaaS

**Status:** Planning / pre-coding\
**Version:** 1.1\
**Market:** India\
**Working name:** Wedding Guest Manager (temporary)

## 1. Product summary

A mobile-first SaaS web app for families and wedding planners to publish
a wedding invitation, collect guest RSVPs, manage multiple wedding
events, and view accurate attendance reports. Guests use a browser; no
app installation is required.

## 2. Confirmed product decisions

-   One wedding has **one shared public invitation/RSVP link** for all
    guests.
-   No guest-category-specific forms or separate invitation links.
-   Guest journey: **open link → fill in the form → submit**.
-   Guests can respond without creating an account. The form asks for
    full name and mobile number; Google sign-in may also be offered.
    **No OTP verification is required.**
-   The host can customize RSVP questions. Standard questions are
    available by default.
-   Questions can be optional/required and can use supported answer
    types. Conditional questions may appear based on earlier answers.
-   Guests may respond for themselves and add family members
    individually.
-   Guests choose which events they will attend (e.g. Haldi, Mehendi,
    Wedding, Reception).
-   The thank-you page explains how to change a response.
-   The host controls the RSVP editing deadline. Default: one deadline
    for the whole wedding; advanced option: separate deadline per event.
-   Before the applicable deadline, a guest can submit an update. It
    updates the existing response and must not create duplicate
    attendance counts.
-   After the deadline, guest self-editing closes. The host can still
    correct responses from the host dashboard.
-   Host experience: dashboard and help/FAQ first; WhatsApp
    notifications are a later planned phase; chatbot comes after FAQ and
    notifications have been validated.

## 3. Problem and goals

Guest details are scattered across WhatsApp chats, calls, spreadsheets,
and paper lists. Hosts need one place to manage invitations, responses,
event attendance, meal preferences, and reports.

MVP goals: 1. Create a host account/workspace and manage weddings. 2.
Create a wedding with multiple events and dates/venues. 3. Add guests
manually and by CSV import/export. 4. Publish one public invitation/RSVP
link per wedding. 5. Collect and update guest responses safely. 6.
Customize questions without creating separate forms for guest
categories. 7. Display correct totals by RSVP status and event. 8.
Provide a useful host dashboard and searchable FAQ/help section. 9.
Validate the product with real hosts before expanding scope.

## 4. Users

-   Family host organizing a wedding.
-   Independent wedding planner managing client weddings.
-   Authorized event assistant (future role; MVP may start with
    owner-only access).
-   Guest responding to an invitation without an account.

## 5. MVP scope

### Accounts and workspace

-   Sign up, sign in, sign out.
-   Create a workspace; all workspace data is isolated.
-   Start with owner permissions while allowing the model to support
    roles later.

### Wedding and events

-   Create, edit, view, and archive weddings.
-   Store wedding title, couple names, date/time, venue, address/map
    link, and invitation message.
-   Add multiple events with their own date, time, venue, and
    description.
-   Configure RSVP editing deadline: wedding-wide default, with
    event-specific deadlines as an advanced option.

### Guest management

-   Add/edit/archive guests; search, filter, and sort.
-   Support a household/party and individual attendee records without
    confusing party counts with people counts.
-   CSV import with preview, validation, and duplicate warnings; CSV
    export.
-   Host-side organization may use internal labels/groups, but this does
    **not** create different guest-facing forms or invitation links.

### Invitation and RSVP

-   Public, mobile-friendly invitation page with approved wedding/event
    details only.
-   One shared link per wedding; no guest-specific category link.
-   Form includes standard RSVP questions and host-created custom
    questions.
-   Supported question types may include short/long text, yes/no, single
    choice, multiple choice, number, and date where useful.
-   Required/optional setting, question ordering, and conditional
    visibility.
-   Guests enter full name and mobile number or use Google sign-in if
    enabled; no OTP.
-   Yes/No/Maybe status; event-specific attendance; family member entry;
    optional food preference and special requests.
-   Confirmation page with a private, secure way to edit the response
    before the host's deadline.
-   Re-submission updates the existing response; no double counting.
-   Do not expose another guest's response to public visitors.

### Host dashboard and reports

-   Summary of weddings and response metrics.
-   Wedding dashboard with confirmed, declined, maybe, and pending
    responses.
-   Event-level attendance estimates and meal preference totals when
    enabled.
-   Search/filter guest records; authorized CSV reports.
-   FAQ/help area with searchable answers and simple guides.

## 6. Roadmap (not all MVP)

1.  **MVP:** wedding/events, guest records, invitation, customizable
    RSVP, response editing deadlines, dashboard, CSV, FAQ.
2.  **Next:** official WhatsApp Business notifications for new/updated
    RSVPs, subject to provider setup, consent, templates, and cost.
3.  **Later:** chatbot after FAQs have been curated; initially answer
    product FAQs, then authorized wedding-specific queries.
4.  **Later/validation-dependent:** payments/subscriptions, staff roles,
    seating charts, automated reminders, white-labeling, native apps,
    vendor tools, AI.

## 7. Security and privacy

-   Use unguessable public invitation tokens and separate private edit
    tokens.
-   A public invitation link must not grant access to guest contact data
    or other guests' responses.
-   Enforce server-side authorization and tenant isolation; test
    database policies/RLS if Supabase is selected.
-   Validate inputs, rate-limit public submission endpoints, and handle
    repeated submissions idempotently.
-   Minimize personal data, restrict exports, and define
    retention/deletion and backup/recovery policies.
-   Keep secrets out of source control.

## 8. Phase 1 discovery plan (proposal, not validated)

### Recruitment sample

Recruit five interviews:

- 3 family wedding hosts who are organizing or recently organized an Indian wedding.
- 2 independent wedding planners who manage client weddings.

This is a discovery sample only. It does not confirm the final target market or exclude other customer segments.

### Short interview questionnaire

1. Tell me about the last wedding you organized or managed.
2. How did you collect guest names, attendance, event-wise attendance, and meal needs?
3. What was difficult, slow, or error-prone?
4. Which tools did you use (WhatsApp, calls, spreadsheets, paper, forms, or another product)?
5. What did you do when a guest changed their response or did not reply?
6. What information did you need for each event, and who needed the final counts?
7. What would make you trust a new tool with guest names and phone numbers?
8. What would be the most valuable improvement to your current process?
9. Have you paid for a wedding-planning or RSVP tool? If yes, how much and for what?
10. What would make you try a tool for one wedding, and what would stop you?

Ask for permission before recording. Do not lead with the proposed solution. Record facts, quotes, and observed workflows separately from interpretation.

### Interview tracker template

| ID | Segment | Recruitment source | Status | Interview date | Current tools | Main pain | Evidence quote | Willingness-to-pay signal | Follow-up |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Family host | — | Not recruited | — | — | — | — | — | — |
| F2 | Family host | — | Not recruited | — | — | — | — | — | — |
| F3 | Family host | — | Not recruited | — | — | — | — | — | — |
| P1 | Independent planner | — | Not recruited | — | — | — | — | — | — |
| P2 | Independent planner | — | Not recruited | — | — | — | — | — | — |

### Recruitment message

Hello [Name], I am researching how families and independent wedding planners manage guest lists, RSVPs, and event attendance. I am not selling anything. Would you be open to a short 15–20 minute phone or video conversation about your recent experience? I will not publish your name or personal details. Please reply with a convenient time if interested.

### Competitor scan: verified public information

Checked 2026-10-28 against publicly available official product/pricing pages or official product pages. Pricing and features can change; these are comparison inputs, not validated customer preferences.

- **Joy (withjoy.com):** free wedding website, online RSVP, and connected guest-list management; optional paid upgrades such as custom domains and premium stationery. Public pricing is primarily free plus optional upgrades.
- **Weddingkart (weddingkart.in):** one-time per-wedding pricing. Publicly listed Basic at ₹5,999 before GST (₹7,079 including GST) and Standard at ₹14,999 before GST (₹17,699 including GST). Features publicly described include WhatsApp RSVPs, message credits, team collaboration, and higher-tier guest/travel/photo collection; AI voice features are also described.
- **Sehnai (sehnai.com):** free plan for one wedding up to 50 guests; Pro publicly listed at ₹4,999 before GST (₹5,899 including GST) per wedding. Publicly described features include WhatsApp guest messaging, WhatsApp RSVP invites, guest concierge, and a paid own-number add-on; planner pricing is custom.
- **Wedence (wedence.com):** public product information describes an invitation homepage, online guest registration, and digital RSVP. Pricing was not reliably visible in the reviewed public results, so it is not used for price comparison.
- **WedPlan:** public results describe planning services/packages, but a reliable current public SaaS price and feature list was not available in the reviewed source material. Treat as a research lead, not a verified direct competitor benchmark.

### Discovery assumptions to test

- Families need a simpler shared RSVP link and accurate event-level counts than their current WhatsApp/spreadsheet process.
- Independent planners may value repeatable workflows, exports, and managing multiple weddings more than a one-off family host.
- A one-time per-wedding price may be easier to understand than a subscription during discovery.
- Privacy, edit recovery, and duplicate-free attendance counts may be trust blockers.

These are hypotheses until supported by interviews or pilot evidence.

## 8. Success measures

Pilot measures: RSVP completion rate, time to set up a wedding/import
guests, response completeness by deadline, duplicate/correction rate,
time saved preparing event reports, host satisfaction, and willingness
to pay. Set numeric targets after collecting baseline data.

## 9. Acceptance criteria for pilot

-   Host can create a wedding with multiple events.
-   Host can customize and preview one unified RSVP form.
-   Guest can submit from a mobile browser without app installation or
    OTP.
-   Guest can add individual family members and choose events.
-   Guest can update the existing RSVP before the configured deadline.
-   Editing closes after the deadline, while host correction remains
    available.
-   Dashboard counts correctly distinguish households/records from
    attendees.
-   Event reports and CSV export work with authorization checks.
-   One workspace cannot access another workspace's data.
-   FAQ is available; chatbot is not required for MVP.
