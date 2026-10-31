# MASTER PROJECT EXECUTION PROMPT
# WEDDING GUEST PLANNER SaaS

You are an autonomous software development team responsible for transforming the existing Wedding SaaS project into a beautiful, secure, production-ready commercial product.

Your mission is to inspect, architect, develop, test, and complete the application.

Do not just provide suggestions or a development plan. Implement the actual working product.

---

## 1. TEAM STRUCTURE

Use the available team, subagent, or parallel-agent capabilities in OpenCode/ECC.

Assign these responsibilities:

### TEAM LEAD — PROJECT ARCHITECT
- Inspect the entire repository.
- Understand the existing architecture.
- Coordinate implementation.
- Maintain implementation consistency.
- Review changes from other agents.

### TEAM 1 — UI/UX DESIGNER
- Design the complete wedding application experience.
- Create a beautiful, elegant, premium visual identity.
- Improve responsive layouts.
- Ensure mobile-first usability.

### TEAM 2 — FRONTEND ENGINEER
- Implement onboarding.
- Implement dashboards.
- Implement pricing and checkout interfaces.
- Implement wedding and guest management interfaces.

### TEAM 3 — BACKEND ENGINEER
- Implement APIs.
- Implement wedding-level plan entitlements.
- Implement feature restrictions.
- Implement onboarding and user workflows.

### TEAM 4 — PAYMENT ENGINEER
- Review existing Razorpay integration.
- Implement per-wedding purchases.
- Implement payment verification and webhooks.
- Implement GST calculations and payment records.

### TEAM 5 — DATABASE ENGINEER
- Review Prisma schema.
- Design necessary database changes.
- Implement migrations.
- Maintain workspace and wedding isolation.

### TEAM 6 — SECURITY AND QA ENGINEER
- Review authorization.
- Test payment security.
- Test data isolation.
- Test all plan restrictions.
- Run automated tests and production build.

If parallel team execution is unavailable, perform the same responsibilities sequentially as specialized engineering roles. Do not pretend that agents were launched if they were not.

### TEAM COORDINATION RULES
- Assign clear file ownership to avoid conflicting modifications.
- Do not allow multiple agents to modify the same files simultaneously without coordination.
- Team Lead reviews all changes.
- Run integration tests after combining work.
- Maintain one shared implementation tracker.
- Resolve conflicting architectural decisions before implementation.

---

## 2. PRODUCT IDENTITY

**Product name:** Wedding Guest Planner

**Product purpose:** A complete digital wedding guest and event management application.

**Target customers:**
- Couples planning weddings.
- Families organizing wedding celebrations.
- Wedding organizers.

**Product experience:**
- Beautiful.
- Elegant.
- Modern.
- Simple.
- Mobile-first.
- Fast.
- Trustworthy.

### Design direction
Use a sophisticated wedding-inspired visual language:
- Warm ivory backgrounds.
- Champagne and muted gold accents.
- Elegant typography.
- Refined cards.
- Beautiful wedding imagery.
- Subtle animations.
- Clean spacing.
- Professional dashboards.
- Responsive mobile navigation.

Avoid excessive gradients, unnecessary animations, overcrowded dashboards, generic admin-panel appearance, and inconsistent design components.

Build a cohesive design system with reusable components.

---

## 3. EXISTING PROJECT ANALYSIS

The existing application uses:
- Next.js 15 App Router.
- TypeScript.
- Prisma ORM.
- PostgreSQL.
- Auth.js v5.
- Workspace-based tenancy.
- Wedding management.
- Guest management.
- Event management.
- Custom questions.
- Public RSVP.
- Reports.
- CSV import/export.
- Audit logging.
- Razorpay payment integration.
- Subscription and entitlement infrastructure.

Inspect the complete repository before implementation.

The existing payment implementation uses workspace-level subscriptions. The new business model requires independent purchases for individual weddings.

Architect and implement this change carefully.

Reuse existing functionality wherever possible. Do not rebuild working modules unnecessarily.

---

## 4. BUSINESS MODEL AND PRICING

This is a **ONE-TIME PURCHASE PER WEDDING** model.

There are three plans.

### BASIC — ₹299 PER WEDDING
Includes:
- Wedding workspace.
- Guest management.
- Event management.
- RSVP management.
- Basic reports.
- Limited CSV functionality.
- Basic customization.
- Application services included in Basic.
- Advertisements displayed.
- No WhatsApp integration.

### PRO — ₹399 PER WEDDING
Includes:
- All Basic features.
- Advanced reports.
- Full CSV import/export.
- Advanced customization.
- WhatsApp integration.
- All available application services.
- Advertisements displayed.

### PRIME — ₹499 PER WEDDING
Includes:
- All Pro features.
- Premium customization.
- All available application services.
- WhatsApp integration.
- Completely advertisement-free experience.

### IMPORTANT PRICING RULES
- Prices are in INR.
- Prices are for one wedding only.
- No monthly subscription.
- No recurring payment.
- Each wedding has an independent purchase.
- Different weddings can have different plans.
- Display exact prices consistently.
- Centralize pricing and feature configuration.
- Allow authorized administrators to change prices.
- Do not alter historical payment records when prices change.

Do not invent additional plan prices.

---

## 5. GST AND TAX CONFIGURATION

Implement configurable GST support.

Requirements:
- GST enabled/disabled.
- Configurable GST percentage.
- Configurable tax-inclusive or tax-exclusive pricing.
- Server-side tax calculation.
- Correct currency rounding.
- Store tax details with every payment.

Initial configuration:
- GST collection disabled.
- Default configurable rate: 18%.
- Currency: INR.

Since the business is initially operating as an individual without GST registration, do not collect or represent any amount as GST until registration and applicable legal requirements are satisfied.

When GST is disabled, display only the base price.

When legally enabled, display:
- Basic: ₹299 + applicable GST.
- Pro: ₹399 + applicable GST.
- Prime: ₹499 + applicable GST.

The checkout must clearly show base price, applicable tax, and final payable amount.

Never trust frontend-supplied prices or tax amounts.

---

## 6. WEDDING-LEVEL PURCHASE AND EXPIRY

Each purchase belongs to exactly one wedding.

Example:

Workspace A:
- Wedding 1 → PRIME.
- Wedding 2 → BASIC.
- Wedding 3 → PRO.

Each wedding has its own:
- Purchased plan.
- Payment history.
- Entitlements.
- Usage limits.
- Expiry date.
- Purchase status.

Do not share paid access automatically across weddings.

### EXPIRY RULE

The purchased plan expires at 00:00 IST on the calendar day immediately following the wedding date.

Example:
- Wedding date: 15 December 2026.
- Last active date: 15 December 2026.
- Expiry: 16 December 2026 at 00:00 Asia/Kolkata.

After expiry:
- Mark purchase EXPIRED.
- Lock wedding editing.
- Lock premium features.
- Disable WhatsApp integration.
- Stop paid-plan entitlements.
- Prevent new paid-plan usage.

Preserve historical wedding records, guest lists, RSVPs, payment history and invoices according to the data-retention policy.

Provide read-only access to historical wedding information after expiry.

No automatic renewal. No recurring charges.

If the wedding date changes:
- Recalculate expiry.
- Record the change in the audit log.
- Enforce authorization.
- Prevent unauthorized date manipulation.

Implement timezone-safe expiry calculations.

---

## 7. CUSTOMER ONBOARDING EXPERIENCE

Create a beautiful multi-step onboarding process.

### STEP 1 — WELCOME

**Heading:** Welcome to Wedding Guest Planner ❤️

**Description:** Plan your wedding, organize your guests, manage invitations, and make every celebration memorable.

**Button:** Get Started.

### STEP 2 — AUTHENTICATION
- Register.
- Login.
- Reuse existing Auth.js authentication.
- Validate user information.

### STEP 3 — CREATE YOUR WEDDING

Collect:
- Wedding name.
- Couple names.
- Wedding date.
- Wedding location.
- Optional wedding cover photo.
- Other essential existing wedding information.

### STEP 4 — CHOOSE YOUR PLAN

Display three elegant pricing cards:
- Basic — ₹299.
- Pro — ₹399.
- Prime — ₹499.

Clearly show features, limitations, WhatsApp availability, and advertisement status.

Highlight Prime as the recommended premium experience without misleading users.

### STEP 5 — ORDER SUMMARY

Show:
- Wedding name.
- Selected plan.
- Base price.
- GST if legally applicable.
- Total payable.
- Wedding date.
- Expiry date.

### STEP 6 — PAYMENT

Use existing Razorpay integration. Support available payment methods configured in Razorpay. Verify payments securely on the backend.

### STEP 7 — SUCCESS

Display:

**Your Wedding Workspace Is Ready! 🎉**

Provide:
- Go to Dashboard.
- Manage Guests.
- Manage Events.
- View Wedding Details.

Allow users to save onboarding progress and resume later.

---

## 8. APPLICATION FEATURES

Inspect existing modules and improve them consistently.

### A. DASHBOARD
- Wedding overview.
- Selected plan.
- Payment status.
- Expiry countdown.
- Guest statistics.
- RSVP statistics.
- Upcoming events.
- Quick actions.
- Usage information.

### B. GUEST MANAGEMENT
- Add guests.
- Edit guests.
- Delete guests.
- Guest categories.
- Contact information.
- Invitation status.
- RSVP status.
- CSV import/export according to plan.

### C. EVENT MANAGEMENT
- Multiple wedding events.
- Event dates.
- Event locations.
- Guest assignments.
- Event details.

### D. RSVP MANAGEMENT
- Public RSVP pages.
- Guest response tracking.
- RSVP editing.
- Attendance statistics.

### E. REPORTS
- Guest reports.
- RSVP reports.
- Event reports.
- Attendance statistics.
- CSV exports according to plan.

### F. CUSTOMIZATION
- Wedding cover.
- Couple photographs.
- Theme colors.
- Invitation customization.
- WhatsApp sharing according to plan.

Preserve existing working functionality.

---

## 9. ADVERTISEMENT SYSTEM

Implement a plan-aware advertisement system.

- BASIC: Advertisements enabled.
- PRO: Advertisements enabled.
- PRIME: Advertisements disabled.

Requirements:
- Centralized ad eligibility.
- Reusable advertisement components.
- Advertisement placement configuration.
- No advertisements on public RSVP pages unless explicitly configured.
- No interference with payment, authentication, or important user actions.
- PRIME users must never see application-controlled advertisements.

Do not integrate random advertising networks without authorization. Prepare an integration-ready advertisement architecture.

---

## 10. WHATSAPP INTEGRATION

- BASIC: WhatsApp integration unavailable.
- PRO: WhatsApp integration available.
- PRIME: WhatsApp integration available.

Inspect existing WhatsApp functionality.

Implement plan-based authorization on both frontend and backend.

Do not claim automated WhatsApp messaging works unless an actual supported provider integration exists.

Preserve existing manual sharing capabilities where appropriate, subject to plan rules.

---

## 11. PAYMENT ARCHITECTURE

Use the existing Razorpay integration.

Implement:
- Order creation.
- Server-side amount calculation.
- Payment verification.
- HMAC signature verification.
- Webhook signature verification.
- Idempotency.
- Duplicate payment prevention.
- Payment history.
- Failed payment handling.
- Payment receipts.
- Wedding-level purchase activation.

The final payment amount must match the verified Razorpay order.

Never unlock a paid plan based only on frontend success.

Preserve historical plan and tax information.

Do not introduce recurring subscriptions.

---

## 12. TERMS AND CONDITIONS

Create a polished public page:

`/terms`

Include:
- Service description.
- Eligibility.
- Account responsibilities.
- Per-wedding purchase model.
- Plan features.
- Payment terms.
- Wedding-date-based expiry.
- Feature restrictions.
- Advertisements.
- WhatsApp availability.
- Cancellation and refunds.
- User responsibilities.
- Intellectual property.
- Account suspension.
- Liability limitations.
- Applicable Indian laws.
- Contact and grievance information.

Make the content readable, structured and mobile responsive.

Do not invent legal identity, address or registration details. Use configurable placeholders for missing business information.

Mark the policy for legal review before commercial launch.

---

## 13. PRIVACY POLICY

Create a polished public page:

`/privacy`

The application collects and processes user and guest information.

Cover:
- Account information.
- Names.
- Phone numbers.
- Email addresses.
- Wedding information.
- Guest lists.
- RSVP information.
- Event details.
- Uploaded photographs.
- Uploaded documents.
- Payment references.
- Cookies.
- Analytics.
- Advertisements.
- Third-party services.
- Razorpay processing.
- WhatsApp data sharing.
- Data security.
- Data retention.
- Data deletion.
- User rights.
- Consent.
- Consent withdrawal.
- Data access and correction.
- Grievance handling.

Implement privacy-conscious data handling.

Do not expose guest information publicly without proper authorization.

Provide appropriate consent and privacy notices.

Use configurable business contact details and legal placeholders.

Ensure the policies are reviewed against applicable Indian privacy and consumer protection requirements before launch.

---

## 14. CONSENT AND POLICY ACCEPTANCE

Integrate policy acceptance into registration and onboarding.

Requirements:
- Terms acceptance.
- Privacy notice acknowledgement.
- Policy version.
- Acceptance timestamp.
- Associated user ID.
- Audit trail.

Use clear language and accessible links.

Do not use preselected consent checkboxes.

Support future policy updates without overwriting historical acceptance records.

---

## 15. ADMIN DASHBOARD

Create or improve the admin management interface.

### PRICING
- Configure Basic price.
- Configure Pro price.
- Configure Prime price.
- Activate/deactivate plans.

### FEATURE MANAGEMENT
- Configure feature availability.
- Configure usage limits.
- Configure WhatsApp access.
- Configure advertisement eligibility.

### TAX
- Configure GST status.
- Configure GST rate.
- Configure GSTIN.
- Configure tax display mode.

### BUSINESS
- Business display name.
- Contact email.
- Support information.
- Legal policy details.

### PAYMENTS
- View transactions.
- View failed payments.
- View wedding purchases.
- View payment history.

### WEDDINGS
- View wedding purchases.
- View active and expired plans.
- Inspect wedding expiry.
- Review audit logs.

Only authorized administrators can access these features.

---

## 16. SECURITY AND MULTI-TENANCY

Preserve and strengthen existing workspace isolation.

Requirements:
- Verify user authentication.
- Verify workspace membership.
- Verify wedding ownership/access.
- Enforce plan entitlements server-side.
- Validate all API inputs.
- Protect payment APIs.
- Protect admin APIs.
- Prevent cross-workspace access.
- Prevent cross-wedding data access.
- Protect personal and guest information.
- Prevent unauthorized plan upgrades.
- Protect webhook endpoints.
- Use secure audit logging.

Frontend restrictions are not sufficient.

Every protected operation must have appropriate backend authorization.

---

## 17. DATABASE AND MIGRATIONS

Inspect the existing Prisma schema before changing it.

Adapt existing subscription tables and services where appropriate.

Implement the correct wedding-level purchase architecture.

Ensure support for:
- Multiple weddings per workspace.
- Different plans per wedding.
- Independent payments.
- Purchase history.
- Tax snapshots.
- Wedding-based expiry.
- Usage tracking.
- Policy acceptance.
- Audit logging.

Use safe Prisma migrations.

Never destroy existing customer data.

---

## 18. TESTING AND QUALITY ASSURANCE

Test all major workflows.

### AUTHENTICATION
- Registration.
- Login.
- Logout.
- Workspace isolation.

### ONBOARDING
- Complete onboarding.
- Resume onboarding.
- Wedding creation.

### PRICING
- Basic.
- Pro.
- Prime.
- Admin price updates.
- GST disabled/enabled.

### PAYMENTS
- Successful payment.
- Failed payment.
- Invalid signature.
- Duplicate webhook.
- Incorrect amount.
- Repeated verification.

### ENTITLEMENTS
- Basic restrictions.
- Pro features.
- Prime features.
- Advertisement visibility.
- WhatsApp access.

### EXPIRY
- Expiry at midnight IST.
- Correct wedding date.
- Wedding-date changes.
- Expired feature restrictions.
- Historical read-only access.

### PRIVACY
- Policy acceptance.
- Policy version changes.
- Guest data authorization.
- Data isolation.

### QUALITY
- Unit tests.
- Integration tests.
- TypeScript.
- ESLint.
- Production build.

Fix issues introduced by implementation. Do not fabricate test results.

---

## 19. EXECUTION WORKFLOW

Follow these phases.

1. **Complete project audit:** Inspect the complete repository, identify existing working functionality and architectural conflicts, and create an implementation tracker.
2. **Architecture and database:** Design wedding-level purchasing, implement safe schema changes, and review migration safety.
3. **Design system:** Create cohesive visual identity, improve layouts, and build responsive reusable components.
4. **Customer onboarding:** Implement the complete onboarding journey.
5. **Pricing and entitlements:** Implement Basic, Pro and Prime.
6. **Payments and GST:** Implement one-time wedding purchases using Razorpay.
7. **Expiry engine:** Implement automatic wedding-date-based expiry.
8. **Legal pages and privacy:** Implement Terms and Privacy pages and policy acceptance.
9. **Admin management:** Implement pricing, features, advertisements, tax and payment management.
10. **Security and QA:** Run complete tests and fix issues.
11. **Production readiness:** Review configuration, migrations, environment variables, error handling and deployment requirements.

---

## 20. STRICT DEVELOPMENT RULES

1. Inspect before modifying.
2. Never assume existing functionality is broken without verification.
3. Reuse existing architecture.
4. Never create duplicate services unnecessarily.
5. Never delete working features.
6. Never invent payment credentials.
7. Never invent business details.
8. Never collect GST without appropriate legal authorization.
9. Never trust frontend payment verification.
10. Never bypass workspace or wedding authorization.
11. Never report tests as passed without executing them.
12. Keep documentation synchronized.
13. Update implementation trackers continuously.
14. Use small, testable changes.
15. Fix errors introduced by your own changes.
16. Do not stop after writing a plan.
17. Continue implementation autonomously.
18. Ask me only when a genuine business decision, missing credential, destructive operation, or external authorization requires my input.

If credentials are unavailable, implement the integration and clearly report what configuration remains.

Do not expose secrets in logs or documentation.

---

## 21. FINAL PROJECT REPORT

When implementation is complete, provide:

1. Complete project analysis.
2. Team responsibilities and actual execution.
3. Architecture changes.
4. Database changes.
5. Onboarding implementation.
6. Pricing implementation.
7. Payment implementation.
8. GST implementation.
9. Wedding expiry implementation.
10. Terms and Privacy implementation.
11. Admin dashboard implementation.
12. Security improvements.
13. Files created.
14. Files modified.
15. Database migration status.
16. Tests executed and actual results.
17. Production build status.
18. Remaining blockers.
19. Environment variables required.
20. Exact actions required from me.

---

## FINAL OBJECTIVE

Deliver a beautiful, reliable, production-ready Wedding Guest Planner SaaS where a customer can:

**Register → Create Wedding → Choose Plan → Pay Once → Manage Guests → Manage Events → Collect RSVPs → View Reports.**

The system must correctly enforce Basic, Pro and Prime features for each individual wedding and automatically expire the purchased plan after the wedding date.

Start with the complete repository audit, coordinate the development team, and execute the project through completion.

**Do not stop at planning. Build the product.**
