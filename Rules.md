# Project Rules --- Wedding Planner SaaS

These rules apply to contributors and coding agents once implementation
is authorized.

## 1. Before work

-   Read all seven project documents before making changes.
-   Inspect the repository, existing files, branches, package scripts,
    tests, and deployment setup.
-   Do not assume code exists or replace project structure without
    evidence.
-   State intended change and acceptance criteria before substantial
    implementation.
-   Do not begin coding until the user explicitly authorizes it.

## 2. Product rules

-   Mobile-first responsive web app.
-   One shared invitation/RSVP link per wedding.
-   No guest-category-specific forms or links.
-   Guest flow: link → fill form → submit.
-   No OTP requirement.
-   Guests may enter full name/mobile or use Google sign-in if enabled.
-   Host customizes questions; standard questions are provided by
    default.
-   Guests may add family members individually and select events.
-   Host configures response-editing deadlines: wedding-wide default,
    event-specific option.
-   Guest updates before deadline modify the existing response and never
    double-count.
-   Guest edits close after the deadline; authorized host correction
    remains possible.
-   FAQ/help precedes chatbot; WhatsApp notifications and chatbot are
    phased additions, not MVP blockers.

## 3. Security and privacy

-   Enforce authorization server-side for every protected operation.
-   Never trust client-provided workspace IDs without membership checks.
-   Test tenant isolation for reads, writes, updates, deletes, and
    exports.
-   If Supabase is used, enable and test RLS on tenant-owned tables.
-   Keep secrets in environment variables and commit only safe examples.
-   Validate/sanitize all external input; rate-limit public RSVP
    endpoints.
-   Public invitation token and private edit token must be separate.
-   Never expose guest contact details or private RSVP records publicly.
-   Minimize personal data; document retention, deletion, backups, and
    recovery.
-   Do not log secrets or unnecessary personal data.

## 4. Data integrity

-   Use foreign keys, constraints, indexes, and versioned migrations.
-   Define household/person counting rules before attendance
    calculations.
-   Keep Yes, No, Maybe, and Pending distinct.
-   Calculate metrics from the current valid RSVP, not the number of
    submissions.
-   Reject invalid attendee counts and responses for events outside the
    wedding.
-   Prefer archive over destructive deletion for normal workflows.
-   Record important changes where audit history is needed.

## 5. UI/UX

-   Test mobile-first layouts.
-   Provide loading, empty, success, and error states.
-   Preserve entered answers when validation fails.
-   Use accessible contrast, labels, focus states, and sufficiently
    large tap targets.
-   Clearly display the RSVP editing deadline and timezone.
-   Keep the guest journey short; do not force account creation.
-   Public pages contain approved invitation details only.

## 6. Testing

-   Run relevant unit/integration tests, lint, type checks, and
    production build when available.
-   Test deadline boundaries, repeated submissions, household counts,
    event counts, authorization, and tenant isolation.
-   Test both open and closed event-specific deadlines.
-   Do not weaken tests merely to make them pass.
-   Report exact commands/results; distinguish tests not run from tests
    passed.
-   Never claim completion without evidence.

## 7. Git and documentation

-   Inspect `git status` and diffs before changes.
-   Do not reset, overwrite, delete, commit, or push user work unless
    explicitly requested.
-   Keep changes focused and use clear commit messages.
-   Update PRD, architecture, design, memory, tracker, Rules, and plan
    when decisions change.
-   Never commit real guest lists, secrets, or private customer data.
