# Architecture --- Wedding Planner SaaS

**Status:** Proposed, pre-coding\
**Version:** 1.1

## 1. Architecture goals

Mobile-first experience, simple deployment, safe multi-tenancy, accurate
RSVP calculations, and an MVP that can be tested with real weddings
before adding integrations.

## 2. Proposed stack

-   Web app: Next.js + TypeScript
-   UI: Tailwind CSS + shadcn/ui (or equivalent accessible component
    system)
-   Database: PostgreSQL
-   Authentication: Supabase Auth (Google OAuth optional for guests;
    guest RSVP itself does not require an account)
-   Hosting: Vercel or compatible
-   Storage: object storage only if invitation images are supported
-   Reports: CSV for MVP
-   Messaging: official WhatsApp Business Platform/provider in a later
    phase, not direct unofficial automation

Final choices require approval before implementation.

## 3. High-level modules

1.  **Web UI:** host dashboard, wedding setup, guest management, form
    builder, public invitation, RSVP form, FAQ.
2.  **Application/API layer:** validates requests, enforces permissions,
    manages business rules, computes metrics.
3.  **Authentication/workspace layer:** host sessions, workspace
    membership, roles.
4.  **Data layer:** PostgreSQL tables with foreign keys, constraints,
    indexes, and tenant isolation.
5.  **Public RSVP service:** validates invitation token, serves approved
    public data, accepts submissions, handles secure edits and deadline
    enforcement.
6.  **Reporting service:** calculates event attendance and creates
    authorized CSV exports.
7.  **Future notification adapter:** WhatsApp notification delivery with
    provider abstraction, consent/template tracking, retries, and
    delivery status.
8.  **Future FAQ/chatbot layer:** FAQ search first; chatbot only later,
    scoped to the authenticated host and their authorized wedding data.

## 4. Domain model

Suggested entities: - `users` - `workspaces` - `workspace_members` -
`weddings` - `events` - `guests` (individual people) - `households` or
`guest_parties` - `party_members` (if using explicit household
grouping) - `rsvp_submissions` (one current response per
respondent/party as defined by the final domain rules) -
`rsvp_attendees` - `rsvp_event_responses` - `rsvp_questions` -
`rsvp_question_options` - `rsvp_answers` - `invitation_links` -
`rsvp_edit_tokens` - `faq_articles` - `audit_logs` - future:
`notification_preferences`, `notification_deliveries`, `subscriptions`,
`payments`

Exact table design and whether an RSVP is person-based or
household-based must be finalized before migrations. Regardless of
representation, a resubmission must update the correct existing RSVP and
must not inflate attendance.

## 5. Key relationships and invariants

-   Workspace owns weddings.
-   Wedding owns events, invitation configuration, RSVP questions, and
    guest data.
-   Each RSVP event response references an event belonging to the same
    wedding.
-   All host operations verify workspace membership on the server.
-   Public pages expose only approved invitation fields.
-   The public invitation token is not an edit credential.
-   Private edit token is high entropy, revocable/expiring as designed,
    and never reveals other responses.
-   Attendance counts derive from current valid RSVP state, not raw
    submission history.
-   Keep an audit/history trail for updates if required, but count only
    the current response.

## 6. RSVP request flow

1.  Guest opens the single wedding invitation link.
2.  Server validates the public token and returns approved invitation
    details.
3.  Guest fills the same wedding-wide form; no category-based routing.
4.  Server validates fields, attendee limits, question IDs, and event
    ownership.
5.  Submission is stored transactionally and an edit capability is
    issued.
6.  Thank-you page confirms receipt and explains the host-configured
    deadline.
7.  Before the deadline, the private edit capability loads existing
    answers; a resubmission updates the existing record.
8.  Server rejects guest edits after the applicable deadline. Host
    corrections remain available through authenticated, authorized
    dashboard actions.

## 7. Deadline logic

-   Host selects whether guest edits are enabled.
-   Default mode: one wedding-wide deadline.
-   Advanced mode: separate deadline per event.
-   Use a consistent timezone (store timestamps in UTC; display in the
    wedding's configured timezone, defaulting appropriately for the
    host).
-   Define behavior for a form opened before but submitted after
    deadline: server-side submission-time check is authoritative.
-   If a guest edits several event responses, only events whose
    deadlines remain open may be changed; preserve closed event answers
    unless the host explicitly corrects them.

## 8. Security

-   Enforce authorization on every protected server operation.
-   If Supabase is selected, enable and test RLS for every tenant-owned
    table.
-   Never trust a client-supplied workspace ID without membership
    verification.
-   Use unguessable tokens; store only token hashes where practical.
-   Rate-limit public RSVP endpoints and validate/sanitize inputs.
-   Restrict CSV exports and avoid exposing phone numbers in public
    pages.
-   Store secrets in environment variables; use separate
    development/test/production configuration.
-   Add backup, restore, monitoring, and error-handling procedures
    before public launch.

## 9. Integration sequencing

-   **MVP:** no WhatsApp API dependency; host manually shares the link.
-   **Next:** WhatsApp notifications via an official provider, only
    after credentials, templates, consent behavior, and pricing are
    understood.
-   **Later:** FAQ content/search, then chatbot. Chatbot must use
    authenticated context, enforce tenant boundaries, and require
    confirmation for any future write action.

## 10. Operational expectations

Use a modular monolith. Add database migrations, structured
non-sensitive logs, error monitoring, health checks, backup/restore
documentation, and CI checks. No production-ready claim without test
evidence.
