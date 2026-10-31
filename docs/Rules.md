# Project Rules --- Wedding Guest Manager

- Mobile-first responsive web app
- Shared and unique invitation/RSVP links per wedding
- No guest-category-specific forms or links
- Guest flow: link → phone OTP (or enabled Google path) → form → submit
- OTP required for phone-based RSVP; never stored/logged in plaintext
- Server-side authorization on every protected operation
- Tenant isolation enforced
