
# 💍 Wedding Guest Manager

A mobile-first wedding guest management platform that helps Indian families and wedding planners organize guest lists, digital invitations, RSVPs, event attendance, and guest reports from one dashboard.

## 🎯 Project Overview

Wedding Guest Manager aims to replace scattered WhatsApp conversations, phone calls, spreadsheets, and paper guest lists with one simple platform.

Hosts can create weddings, manage multiple events, organize guests, share digital invitations, collect RSVPs, and track expected attendance without manually maintaining multiple records.

**Project Status:** Planning and requirements defined; implementation and customer validation are not yet confirmed.

**Working Name:** Wedding Guest Manager  
**Target Market:** India  
**Product Type:** Multi-tenant SaaS web application  
**Primary Platform:** Responsive web application  
**Design Priority:** Mobile-first

## ✨ Core Features

### 1. Account and Workspace Management
- User registration and authentication.
- Create and manage wedding workspaces.
- Support multiple weddings where appropriate.
- Securely isolate each workspace's data.

### 2. Wedding and Event Management
- Create and edit wedding details.
- Store couple names, wedding dates, venues, and locations.
- Manage multiple events, such as:
  - Mehendi
  - Haldi
  - Wedding ceremony
  - Reception
- Track event-specific guest invitations and attendance.

### 3. Guest Management
- Add, edit, archive, search, and filter guests.
- Organize guests by family, side, or custom groups.
- Support household and party-based guest records.
- Import and export guest lists using CSV files.
- Track invitation and RSVP status.

### 4. Digital Invitations
- Generate shareable wedding invitation pages.
- Display wedding details, dates, venues, and messages.
- Support optional cover images and basic themes.
- Share invitation links through WhatsApp or other apps manually.
- Allow guests to view invitations without installing an application.

### 5. RSVP Management
- Allow guests to respond without creating accounts.
- Support Yes, No, and Maybe responses.
- Collect attendee counts and event-specific responses.
- Optionally collect meal preferences and special requests.
- Allow guests to update responses through a supported flow.
- Prevent duplicate or abusive submissions.

### 6. Dashboard and Reports
- Total guest records and invited attendee estimates.
- Confirmed, declined, pending, and maybe responses.
- Expected attendance for each event.
- Event-specific guest and catering summaries.
- CSV exports for authorized users.

## 🛠️ Recommended Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| Language | TypeScript |
| UI | Tailwind CSS |
| Component Library | shadcn/ui |
| Backend | Next.js Route Handlers / Server Actions |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Database Security | PostgreSQL permissions and Supabase Row Level Security |
| Hosting | Vercel or compatible platform |
| File Storage | Supabase Storage, if required |
| Reports | CSV export |
| Version Control | Git and GitHub |

Technology choices are recommendations and should be confirmed during implementation.

## 🏗️ High-Level Architecture

```text
User / Guest
     |
     v
Responsive Web Application
     |
     v
Next.js Application Layer
     |
     +---- Authentication
     |
     +---- Authorization
     |
     +---- Wedding and Event Services
     |
     +---- Guest and RSVP Services
     |
     +---- Reporting Services
     |
     v
PostgreSQL Database
     |
     +---- Workspaces
     +---- Weddings
     +---- Events
     +---- Guests
     +---- Invitations
     +---- RSVPs
```

The application should use a modular monolith for the MVP rather than introducing unnecessary microservices.

## 🔐 Security and Privacy

- Enforce authorization on the server.
- Isolate data between workspaces.
- Use Row Level Security where applicable.
- Validate all user-submitted data.
- Protect public RSVP endpoints against abuse.
- Never expose private guest contact details on public invitation pages.
- Keep API keys, credentials, and secrets out of source control.
- Use environment variables for configuration.
- Protect CSV exports with authorization checks.
- Collect only the personal information needed by the application.
- Prefer archiving over destructive deletion where appropriate.

## 📁 Project Documentation

Keep these documents in the repository root:

```text
README.md
prd.md
architecture.md
design.md
memory.md
Rules.md
tracker.md
plan.md
```

| Document | Purpose |
|---|---|
| `README.md` | Project overview and getting started |
| `prd.md` | Product requirements and acceptance criteria |
| `architecture.md` | Application architecture and technical decisions |
| `design.md` | UI/UX guidelines, screens, and responsive behavior |
| `memory.md` | Project context and decision history |
| `Rules.md` | Coding, security, and development rules |
| `tracker.md` | Tasks, progress, blockers, and risks |
| `plan.md` | Implementation phases and milestones |

## 🚀 Development Roadmap

### Phase 0 — Product Definition
- Finalize product name and MVP scope.
- Review product and technical documentation.
- Interview potential customers.
- Validate the primary customer segment and pricing.

### Phase 1 — Foundation
- Set up the repository and development environment.
- Configure Next.js and TypeScript.
- Set up the database and authentication.
- Implement workspaces and tenant authorization.

### Phase 2 — Weddings and Guests
- Implement wedding and event management.
- Build guest management and grouping.
- Add search, filtering, and CSV import/export.

### Phase 3 — Invitations and RSVPs
- Build public invitation pages.
- Implement RSVP submission and updates.
- Support event-specific responses.
- Verify attendee-count calculations.

### Phase 4 — Dashboard and Reports
- Build dashboard metrics.
- Add event-specific attendance summaries.
- Implement authorized CSV exports.
- Test all calculations against known test data.

### Phase 5 — Pilot and Monetization
- Test the application with real families and wedding planners.
- Fix usability and reliability issues.
- Validate willingness to pay.
- Introduce paid plans only after validating the core product.

### Phase 6 — Automation and Expansion
- Consider official WhatsApp Business integration.
- Add automated reminders if customers need them.
- Consider additional planner roles and permissions.
- Evaluate native mobile applications based on demand.

## 💰 Initial Pricing Hypotheses

These prices are starting points for customer validation, not finalized plans.

| Plan | Proposed Price |
|---|---:|
| Basic | ₹499 per wedding |
| Premium | ₹999 per wedding |
| Planner | ₹2,999 per month |

Validate these prices with potential customers before implementing billing.

## ✅ MVP Completion Criteria

The MVP is ready for a small pilot when:

- [ ] Users can register and create a wedding workspace.
- [ ] Users can create weddings and multiple events.
- [ ] Users can manage guests and import CSV files.
- [ ] Users can publish and share digital invitations.
- [ ] Guests can submit and update RSVPs without signing in.
- [ ] Dashboard metrics reflect correct response and attendee counts.
- [ ] Users can review event-specific attendance.
- [ ] Authorized users can export CSV reports.
- [ ] Cross-workspace access is prevented and tested.
- [ ] Core workflows work on common mobile screen sizes.
- [ ] Relevant automated tests pass.
- [ ] Secrets and private guest information are protected.

## 🧪 Development Principles

1. Read the project documentation before making changes.
2. Inspect the existing repository before modifying code.
3. Implement features in small, testable phases.
4. Keep the PRD, architecture, design, and implementation aligned.
5. Do not add features outside the agreed MVP without documenting the change.
6. Write tests for business logic, RSVP calculations, and authorization.
7. Never claim a feature is complete without verification.
8. Preserve existing working functionality.
9. Record progress and blockers in `tracker.md`.
10. Update `memory.md` and other documentation when important decisions change.

## 🔮 Future Possibilities

Potential future features, subject to customer validation:

- QR-code check-in at wedding venues.
- Automated RSVP reminders.
- Advanced planner dashboards.
- Seating arrangements and table assignments.
- Custom branding for wedding planners.
- Additional staff permissions.
- Payment processing and subscription management.
- Native Android and iOS applications.

These features are not required for the initial MVP.

## 📄 License

License not yet selected. Add a license before distributing the project publicly.

---

**Wedding Guest Manager — One place for every guest, every invitation, and every RSVP.**

