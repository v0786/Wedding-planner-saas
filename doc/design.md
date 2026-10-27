# Design and UX Specification --- Wedding Planner SaaS

**Status:** Planning\
**Version:** 1.1\
**Design principle:** Mobile first, simple, welcoming, accessible.

## 1. Product navigation

Host area: - Overview - Weddings - Guests - Events - RSVP Form -
Reports - Help / FAQ - Settings

Keep the first version focused. A chatbot is not part of MVP navigation;
it can be added after FAQ usage is understood.

## 2. Host experience

### Overview

-   Show upcoming weddings and quick response metrics.
-   When a host has one wedding, offer a direct shortcut to its
    dashboard.
-   When a host has multiple weddings, show a wedding list and allow
    selecting one.
-   Clearly label guest records/households separately from people
    expected to attend.

### Wedding setup

-   Wedding title and couple names.
-   Main date/time, venue/address/map URL, and invitation message.
-   Add multiple events with individual dates, times, and venue details.
-   Set RSVP editing policy: edits allowed yes/no; wedding-wide deadline
    by default; optional event-specific deadlines.

### Guest management

-   List, search, sort, filter, add/edit/archive guests.
-   Support family/household members without treating one household as
    one attendee.
-   CSV import includes preview, row validation, and duplicate warnings.
-   Host-side labels/groups may help organization, but guest-facing form
    and share link remain unified.

### RSVP form builder

-   Start with sensible standard wedding questions.
-   Add, edit, remove, and reorder custom questions.
-   Configure question type, required/optional status, answer options,
    and conditional visibility.
-   Preview the form as a guest before publishing.
-   Clearly warn when editing/removing a question may affect
    already-submitted answers.
-   Do not create different forms or links for guest categories.

### Reports

-   RSVP totals: Yes, No, Maybe, Pending.
-   Expected attendees by event.
-   Meal preferences and special requests only when enabled.
-   Export CSV only to authorized hosts.
-   Show the event and generation time for each report.

### FAQ

-   Searchable questions grouped by practical topics: getting started,
    wedding/events, guests, RSVP form, deadlines, reports,
    privacy/security.
-   Each answer should be short and actionable, with links to the
    relevant screen where possible.
-   Keep FAQs maintained as features change.
-   Chatbot is explicitly deferred until FAQs are useful and common
    questions are known.

## 3. Guest experience: one-link flow

1.  **Open invitation:** show couple names, wedding details, event
    schedule, venue/map link, and clear RSVP button.
2.  **Fill form:** full name and mobile number, or Google sign-in if
    enabled; no OTP. Show the host-configured questions in a card/page
    sequence that works on small screens.
3.  **Family details:** allow adding each attending family member
    individually.
4.  **Event attendance:** allow selection of each event and Yes/No/Maybe
    behavior as configured.
5.  **Custom questions:** show only relevant conditional questions;
    clearly mark required fields.
6.  **Review:** summarize answers before submission if the host enables
    review.
7.  **Submit:** validate, save, and show a confirmation page.
8.  **Change response:** offer a secure private edit action when enabled
    and before the deadline.

## 4. Thank-you page

Include: - Confirmation that the response was received. - Brief summary
of the submitted response, without exposing other guests' data. -
"Changed your plans?" message. - Private "Review or change my RSVP"
action if edits are enabled. - Clear deadline in the wedding's
timezone. - After deadline: explain that guest editing is closed and
tell the guest to contact the host.

## 5. Visual and accessibility requirements

-   Responsive design for common Android phones and desktop.
-   Large tap targets, readable type, strong contrast, visible focus,
    labels and text (not color alone).
-   Inline validation with answers preserved after errors.
-   Loading, empty, success, and failure states.
-   Use familiar date/time formats and show the relevant timezone when
    deadlines matter.
-   Keep public invitation pages fast and avoid unnecessary sign-up
    prompts.

## 6. Content tone

Warm, clear, and respectful. Avoid technical wording in guest-facing
messages. Do not promise that a mobile number is verified: OTP is not
used. Explain that guests can edit only until the host's configured
deadline.

## 7. Future messaging UX

WhatsApp notifications should be concise, opt-in/configurable where
applicable, and link to a secure host dashboard. The future chatbot must
not expose another wedding's data or perform write actions without
authorization and confirmation.
