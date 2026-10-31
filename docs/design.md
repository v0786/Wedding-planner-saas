# Design System --- Wedding Guest Manager

**Version:** 2.0 \| **Theme:** Light only; no dark mode in initial
product.

## 1. Brand direction

Elegant, warm, trustworthy, calm, and practical. The product should feel
celebratory without sacrificing usability.

Principles: (1) clarity before decoration; (2) warm restrained elegance;
(3) mobile-first usability.

## 2. Light palette

  Token           HEX         Purpose
  --------------- ----------- -----------------
  Primary         `#7A3E52`   Main actions
  Primary hover   `#653244`   Hover/pressed
  Secondary       `#C49A6C`   Accent
  Background      `#FAF8F6`   Canvas
  Surface         `#FFFFFF`   Cards/forms
  Muted surface   `#F2ECE8`   Subtle panels
  Text            `#292326`   Main text
  Muted text      `#6F666A`   Secondary text
  Border          `#E7DEE1`   Dividers
  Success         `#287A54`   Confirmed
  Warning         `#9A6500`   Pending/warning
  Error           `#B42318`   Error
  Info            `#245B83`   Information

Validate all contrast against WCAG 2.2 AA. Never rely on color alone for
status.

## 3. Typography

Inter or equivalent sans-serif for UI; DM Serif Display or similar
readable serif for invitation headings. Body 16px/1.5 line-height; small
labels 13--14px; page title 28--32px desktop and 24--28px mobile;
section title 20--24px. Use tabular numerals for metrics and system
fallbacks.

## 4. Layout tokens

Spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Radius: 8px controls,
12px cards, 16px invitation panels, pill radius for chips. Use subtle
borders and restrained shadows.

Breakpoints: mobile \<640px; tablet 640--1023px; desktop ≥1024px; wide
≥1280px. Touch targets minimum 44×44px.

## 5. Navigation

**Web host:** Overview, Weddings, Guests, Events, Invitations, RSVP
Form, Check-in, Reports, Help/FAQ, Settings. Keep selected wedding
context visible.\
**Mobile:** Home, Weddings, Guests, Check-in, More.\
**Super-admin:** separate area for platform overview, customers,
weddings, plans, subscriptions, payments, deletion queue, audit log,
settings.

## 6. Screen specifications

-   **Auth:** signup, login, Google, password reset; persistent labels,
    safe errors.
-   **Wedding wizard:** couple details, date/time/timezone, location,
    events, invitation, guest settings, RSVP deadline, privacy;
    save/resume.
-   **Overview:** simple metric cards for invited, accepted, declined,
    maybe, pending; event summary, recent RSVP activity, deadline
    notice. No budget/expense cards.
-   **Guest manager:** search/filter, side/category chips,
    import/export, person/group counts clearly distinguished, private
    details.
-   **Event manager:** event cards, CRUD/reorder, host-selected public
    fields; explain Basic locks and upgrades.
-   **Invitation editor:** one design per wedding, mobile/desktop
    preview, theme/customization per plan, public-field preview,
    PDF/image download.
-   **RSVP builder:** standard questions, custom question types,
    required/optional, conditional logic, preview, warning before
    altering answered questions.
-   **Guest flow:** invitation → phone OTP or enabled Google path → form
    (name/email/party size/diet/status/events/custom questions) → review
    → confirmation. Show own response only.
-   **Check-in:** camera permission explanation, scan result, group
    size, mark arrived, duplicate-scan state, manual lookup fallback.
-   **Reports:** overall/event/family/diet/custom columns and filters;
    PDF/spreadsheet export; report timestamp/timezone.
-   **Expiry:** show plan, expiry, deletion date; expired view is
    read-only with export; public page disabled.

## 7. Components and states

Buttons: primary, secondary, outline, text, destructive; default, hover,
focus, pressed, disabled, loading. Inputs: text, email, phone, number,
date/time, select, multi-select, textarea; persistent label and inline
errors. Cards: consistent 16--24px padding. Tables: paginated desktop;
responsive cards or intentional horizontal scroll on mobile. Dialogs:
focus trap and return focus. Toasts: success/info/warning/error;
critical payment/deletion outcomes also need persistent state. Status
labels pair text and icon.

## 8. Plan-aware invitation UX

Basic: limited themes, no custom design. Pro: expanded themes and basic
design. Prime: all themes, advanced design, full branding. Plan limits
must be shown before users select locked options. One design applies to
all wedding events. Shared and unique links use the same design.

## 9. Accessibility and content

Target WCAG 2.2 AA. Keyboard navigation, visible focus, semantic
headings, labels, error summaries, screen-reader announcements,
reduced-motion support, and non-color status cues. Guest copy should be
warm and concise; explain OTP and contact use plainly. A QR scanner
always has a manual alternative.
