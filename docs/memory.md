# Project Memory --- Wedding Guest Manager

**Last updated:** 2026-10-31  
**Stage:** Documentation synchronized; pre-implementation per source-of-truth docs

## Current snapshot
- Product: Wedding Guest Manager SaaS
- Documentation synchronized to source-of-truth pack (PRD, DESIGN, ARCHITECTURE, DATABASE, API, AGENTS, AUTH_SECURITY, INTEGRATIONS, FEATURES, PLAN, TESTING, SETUP, TESTING, MCP, DEBUGGING)
- Stack per source-of-truth: Next.js + TypeScript web; React Native + Expo mobile; Supabase PostgreSQL/Auth/Storage; Razorpay + Cashfree adapters; hybrid managed hosting
- Plans: Basic ₹499 / Pro ₹999 / Prime ₹1,999 one-time per wedding; unlimited guests
- Authentication: Host via Supabase Auth (email/password, Google OAuth); Guest via phone OTP or enabled Google path
- Expiry: wedding-local midnight day after wedding; deletion 7 days after wedding date
- No implementation committed by this documentation task; source code untouched
