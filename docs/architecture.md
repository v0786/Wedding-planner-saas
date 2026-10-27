# Architecture - Wedding Guest Manager

## Overview
Mobile-first SaaS built as a modular monolith using Next.js 15 App Router.

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes/Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Validation**: Zod

## Architecture Pattern
Modular monolith with clear separation of concerns:
- `app/` - Next.js App Router (pages, layouts, API routes)
- `components/` - Reusable UI components
- `lib/` - Utilities, auth, database client
- `prisma/` - Database schema and migrations

## Multi-Tenancy
- Workspaces are the tenant boundary
- All data scoped by workspaceId through relationships
- Server-side authorization on every request
- Users can only access data in workspaces they belong to

## Security
- NextAuth.js for authentication
- Server-side session validation
- Workspace membership checks on all protected operations
- Unpredictable tokens for public invitations (cuid)
- Password hashing with bcryptjs
- Input validation with Zod
- No service role keys exposed to client

## Data Flow
1. Host authenticates → creates/selects workspace → manages wedding
2. Host creates events and guests → publishes invitation
3. Guest opens public link → fills RSVP form (no auth) → submits
4. Data saved with proper tenant scoping
