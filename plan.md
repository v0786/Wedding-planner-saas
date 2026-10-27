# Implementation Plan --- Wedding Planner SaaS

**Status:** Planning; implementation waits for explicit approval\
**Version:** 1.1

## Phase 0 --- Product definition and validation

### Tasks

-   Confirm product name and initial customer segment.
-   Finalize guest journey, host journey, custom question behavior, and
    RSVP deadline rules.
-   Resolve household/person model and attendee-count rules.
-   Draft privacy, retention, and deletion policy.
-   Interview 5--10 potential hosts/planners and recruit 1--3 pilot
    weddings.
-   Review and approve PRD, architecture, design, security rules, and
    tracker. \### Exit criteria
-   No critical contradictions in product requirements.
-   Attendance semantics and edit/deadline rules documented.
-   Pilot feedback informs the MVP scope.
-   User explicitly authorizes coding.

## Phase 1 --- Foundation and workspace security

### Tasks

-   Inspect repository and existing code before changes.
-   Configure approved app stack, environment variables, lint/type
    checks/tests.
-   Set up database migrations and host authentication.
-   Implement workspace membership and server-side tenant isolation.
    \### Exit criteria
-   Repeatable development setup.
-   Workspace authorization and isolation tests pass.
-   No secrets committed.

## Phase 2 --- Weddings, events, and guests

### Tasks

-   Create/edit/archive weddings and events.
-   Implement guest/person/household model.
-   Guest list search/filter/sort.
-   CSV import preview, validation, duplicate warnings, and export. \###
    Exit criteria
-   Household and person counts are unambiguous.
-   CSV edge cases and permissions are tested.

## Phase 3 --- Invitation and unified RSVP

### Tasks

-   Publish one mobile-friendly invitation link per wedding.
-   Build customizable question editor and guest preview.
-   Implement one unified form; no guest-category-specific form/link.
-   Support name/mobile with no OTP; optionally enable Google sign-in.
-   Add individual family members and event selections.
-   Add secure private edit link and thank-you page. \### Exit criteria
-   Guest can complete the full flow on a mobile browser.
-   Public pages do not expose private responses.
-   Re-submissions update existing responses without duplicates.

## Phase 4 --- Deadlines and attendance integrity

### Tasks

-   Host can disable editing or choose a wedding-wide deadline.
-   Add advanced event-specific deadlines.
-   Enforce deadlines server-side, including boundary conditions.
-   Preserve closed event answers if only some events remain editable.
-   Calculate current counts correctly after response updates. \### Exit
    criteria
-   Tests cover before/at/after deadline.
-   Tests cover multiple events, Yes/No/Maybe/Pending, family counts,
    and updates.

## Phase 5 --- Host dashboard, reports, and FAQ

### Tasks

-   Wedding summary and response metrics.
-   Event-specific attendance and meal totals.
-   Searchable FAQ/help with short guides.
-   Authorized CSV reports. \### Exit criteria
-   Dashboard totals match tested source records.
-   FAQ answers match current product behavior.
-   Exports are authorized and do not expose unnecessary data.

## Phase 6 --- Pilot and hardening

### Tasks

-   Test on common mobile browsers and slow networks.
-   Conduct authorization, privacy, abuse, and tenant-isolation checks.
-   Configure backups, restore procedure, logging, and monitoring.
-   Pilot with real weddings; collect feedback and fix high-priority
    issues. \### Exit criteria
-   MVP acceptance criteria pass.
-   Known limitations and support process documented.
-   Pilot evidence supports next steps.

## Phase 7 --- WhatsApp notifications

**After core MVP; not a blocker for launch validation.** - Select
official WhatsApp Business integration/provider. - Review account setup,
templates, consent, pricing, delivery status, and retries. - Notify
hosts of new or updated RSVPs. - Link only to secure host pages; avoid
putting sensitive guest details into notifications by default. \### Exit
criteria - Provider configuration and costs approved. - Delivery
failures, duplicate events, and opt-out behavior handled.

## Phase 8 --- Chatbot

**After FAQ content and common questions have been validated.** - Start
with FAQ-backed answers. - Later allow host-authorized questions about
their own weddings and RSVP data. - Enforce tenant isolation and
permissions in every query. - Require explicit confirmation before any
future write action. \### Exit criteria - Answers are grounded in FAQs
or authorized live data. - Privacy, access-control, and failure cases
are tested.

## Later, validation-dependent

Payments/subscriptions, staff roles, seating plans, vendor
collaboration, advanced white-labeling, native apps, and AI features
should only be prioritized when customer evidence supports them.
