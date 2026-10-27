# Project Memory --- Wedding Planner SaaS

**Last updated:** 2026-10-28\
**Stage:** Product planning; coding has not been authorized/started in
this workflow.

## 1. Current snapshot

-   Product: Wedding Guest Manager SaaS (temporary name).
-   Market: India; families, wedding planners, event managers.
-   Platform: mobile-first responsive web app.
-   Core value: one invitation link, one configurable RSVP flow,
    accurate event attendance, and host reporting.
-   Proposed stack: Next.js + TypeScript, Tailwind/shadcn, PostgreSQL,
    Supabase Auth, Vercel-compatible hosting. These are proposed pending
    approval.

## 2. Confirmed decisions

1.  One wedding uses one shared invitation/RSVP link for everyone.
2.  No guest-category-specific links or separate forms.
3.  Guest journey is link → fill form → submit.
4.  Guests do not need to install an app or create an account.
5.  Guests provide full name and mobile number or may use Google sign-in
    if enabled. No OTP verification.
6.  Host can customize RSVP questions; use standard questions as a
    starting point.
7.  Conditional questions may appear based on previous answers.
8.  Guest can respond for themselves and add family members
    individually.
9.  Guest selects events they plan to attend.
10. After submission, show a thank-you page with an edit option when
    allowed.
11. Host configures whether editing is allowed and the deadline.
12. Default is one wedding-wide deadline; advanced mode supports
    event-specific deadlines.
13. Before the deadline, resubmission updates the existing response
    rather than creating a duplicate.
14. After the deadline, guest editing closes; host can still correct
    responses.
15. Host experience starts with dashboard and FAQ/help.
16. WhatsApp notifications are planned after core MVP/FAQ; chatbot is
    deferred until FAQ content and common support questions are
    established.
17. No coding until the user explicitly says to begin.

## 3. MVP priorities

-   Host account/workspace and wedding setup.
-   Multiple events.
-   Guest and household/person management.
-   One public invitation link.
-   Customizable RSVP form and secure response updates.
-   Host-configured editing deadlines.
-   Dashboard metrics and event reports.
-   CSV import/export.
-   FAQ/help.
-   Strong tenant isolation and privacy.

## 4. Deferred features

-   WhatsApp notifications: next phase, official business messaging
    integration.
-   Chatbot: later phase, initially FAQ-based and then authorized
    wedding-specific answers.
-   Native apps, seating plans, vendor marketplace, complex
    white-labeling, AI features, and paid subscriptions until
    validation.

## 5. Open decisions

-   Final product name and domain.
-   Exact guest identity and household/RSVP data model.
-   Exact supported custom question types.
-   Deadline timezone and behavior when a response contains both open
    and closed event deadlines.
-   Google sign-in availability for guests.
-   Host dashboard initial screen and final navigation.
-   Privacy/retention policy and edit-link recovery process.
-   Pricing and first customer segment.
-   Final stack/provider selection.

## 6. Current discovery plan

- Initial mixed sample: 3 family wedding hosts and 2 independent wedding planners.
- This sample is a discovery plan only; final target market is not validated.
- Discovery must cover problems, current alternatives, essential workflows, trust concerns, willingness to pay, and MVP opportunities.
- No interview participants or results have been recorded yet.
- Competitor scan is preliminary and based on public official information checked 2026-10-28; prices/features must be rechecked before commercial decisions.

## 7. Document set

-   `prd.md`: scope, requirements, acceptance criteria.
-   `architecture.md`: modules, data model, security, flows.
-   `design.md`: host/guest UX.
-   `memory.md`: durable decisions and open questions.
-   `Rules.md`: working, security, and quality rules.
-   `tracker.md`: status, risks, decisions, next actions.
-   `plan.md`: phases and gates.

## 7. Change log

### 1.1 --- 2026-10-28

-   Recorded one-link/unified-form decision.
-   Added host-configurable RSVP deadlines and response-editing rules.
-   Clarified no OTP and no guest-category-specific forms.
-   Set FAQ before chatbot; WhatsApp notifications planned after core
    MVP.
-   Recorded that coding must wait for explicit user approval.
