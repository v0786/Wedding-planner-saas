# Database Design --- Wedding Guest Manager

**Database:** Supabase PostgreSQL \| **Status:** Proposed schema; no
migrations applied. **Conventions:** UUID PKs, snake_case, `timestamptz`
UTC, IANA wedding timezone, created/updated timestamps, RLS on
tenant-owned tables.

## 1. Conventions

Use integer minor units plus ISO currency code for money (INR values in
paise). Store wedding date as `date`, event local times as `time`,
timezone as IANA name. Use foreign keys, constraints, indexes, soft
archive for normal guest operations, and permanent deletion only through
lifecycle workflow. Service-role keys stay server-side.

## 2. Tables

### `accounts`

`id uuid PK`; `owner_user_id uuid FK auth.users UNIQUE`;
`display_name text`; `default_locale text DEFAULT 'en'`;
`default_currency char(3) DEFAULT 'INR'`;
`default_timezone text DEFAULT 'Asia/Kolkata'`; `created_at`,
`updated_at timestamptz`.

### `account_profiles`

`id uuid PK`; `account_id uuid FK accounts UNIQUE`; `full_name text`;
`email citext`; `phone_e164 text`; timestamps.

### `plans`

`id uuid PK`; `code text UNIQUE` (`basic`,`pro`,`prime`); `name text`;
`price_minor bigint` (49900, 99900, 199900); `currency char(3)`;
`entitlements jsonb`; `version int`; `is_active bool`; timestamps. Never
add a guest-count limit.

### `weddings`

`id uuid PK`; `account_id uuid FK accounts`; `title text`;
`couple_name_1 text`; `couple_name_2 text`; `wedding_date date`;
`wedding_timezone text`; `locale text`; `currency char(3)`;
`venue_name/address text`; `map_url text`; `invitation_message text`;
`cover_image_path text`; `lifecycle_status text`
(`draft`,`active`,`read_only`,`deletion_scheduled`,`deleted`);
`subscription_expires_at timestamptz`;
`scheduled_deletion_at timestamptz`; `deleted_at timestamptz`;
timestamps.

### `events`

`id uuid PK`; `wedding_id uuid FK weddings`; `name text`;
`description text`; `event_date date`; `start_time/end_time time`;
`venue_name/address text`; `map_url text`; `dress_code text`;
`cover_image_path text`; `display_order int DEFAULT 0`;
`is_published bool`; timestamps. Add composite uniqueness
`(id,wedding_id)` for same-wedding references.

### `wedding_subscriptions`

`id uuid PK`; `wedding_id uuid FK weddings`;
`account_id uuid FK accounts`; `plan_id uuid FK plans`;
`plan_version int`; `amount_paid_minor bigint`; `currency char(3)`;
`status text`
(`pending`,`active`,`read_only`,`deletion_scheduled`,`deleted`);
`activated_at/expires_at/scheduled_deletion_at timestamptz`;
`upgraded_from_subscription_id uuid`; timestamps. Enforce one current
subscription per wedding; retain history.

### `subscription_events`

`id uuid PK`; `subscription_id uuid FK`; `event_type text`;
`from_plan_id/to_plan_id uuid FK plans`; `amount_minor bigint`;
`currency char(3)`; `metadata jsonb`; `created_at`.

### `payments`

`id uuid PK`; `account_id/wedding_id/subscription_id uuid FK`;
`provider text` (`razorpay`,`cashfree`);
`provider_order_id/payment_id text`; `internal_order_id text UNIQUE`;
`idempotency_key text UNIQUE`; `purpose text`
(`initial_purchase`,`upgrade`); `amount_minor bigint`;
`currency char(3)`; `status text`; `verified_at timestamptz`;
`provider_payload_safe jsonb`; timestamps. No invoice table required.

### `guest_groups`

`id uuid PK`; `wedding_id uuid FK`; `group_name text`; `side text`
(`bride`,`groom`,`both`,`other`); `category text`;
`invited_party_size int CHECK >=1`; `notes_private text`;
`archived_at timestamptz`; timestamps.

### `guests`

`id uuid PK`; `wedding_id uuid FK`; `guest_group_id uuid FK nullable`;
`full_name text`; `email citext`; `phone_e164 text`;
`relationship_label/side/category text`; `dietary_preference text`;
`accommodation_required bool`; `transport_required bool`;
`notes_private text`; `archived_at timestamptz`; timestamps.

### `guest_import_jobs`

`id uuid PK`; `wedding_id/account_id uuid FK`; `file_name text`;
`status text`; `total_rows/accepted_rows/rejected_rows int`;
`result_summary jsonb`; timestamps. Raw import files should be
short-lived.

### `invitation_links`

`id uuid PK`; `wedding_id uuid FK`; `guest_group_id uuid FK nullable`;
`link_type text` (`shared`,`unique_group`); `token_hash text UNIQUE`;
`status text`; `expires_at timestamptz`; timestamps. Raw token shown
only at creation; hash stored for validation.

### `guest_verification_challenges`

`id uuid PK`; `wedding_id uuid FK`; `phone_e164 text`;
`challenge_hash text`; `expires_at timestamptz`;
`verified_at/consumed_at timestamptz`; `attempts int`; timestamps. Never
store OTP plaintext.

### `rsvp_submissions`

`id uuid PK`; `wedding_id uuid FK`; `guest_group_id uuid FK nullable`;
`invitation_link_id uuid FK`; `respondent_name text`;
`respondent_email citext`; `verified_phone_e164 text`;
`overall_status text` (`accepted`,`declined`,`maybe`);
`party_size int CHECK >=0`; `dietary_preference text`;
`edit_token_hash text UNIQUE`;
`submitted_at/last_updated_at timestamptz`; timestamps. Enforce one
current response per invitation/group as product semantics require.

### `rsvp_event_selections`

`id uuid PK`; `wedding_id uuid FK`; `rsvp_submission_id uuid FK`;
`event_id uuid FK`; `selected bool`; timestamps. Enforce same wedding
for RSVP and event.

### `rsvp_questions`

`id uuid PK`; `wedding_id uuid FK`; `label text`; `question_type text`;
`options jsonb`; `is_required bool`; `display_order int`;
`conditional_rule jsonb`; `is_active bool`; timestamps.

### `rsvp_answers`

`id uuid PK`; `wedding_id uuid FK`; `rsvp_submission_id uuid FK`;
`question_id uuid FK`; `answer_json jsonb`; timestamps.

### `wedding_settings`

`id uuid PK`; `wedding_id uuid FK UNIQUE`;
`default_rsvp_deadline timestamptz`; `allow_guest_edits bool`;
`event_specific_deadlines_enabled bool`; `contact_visibility_mode text`
(`show`,`ask_host`,`hide`); `public_fields jsonb`;
`invitation_theme text`; `invitation_customization jsonb`; timestamps.
Host must resolve `ask_host` during onboarding before publish.

### `event_rsvp_deadlines`

`id uuid PK`; `wedding_id uuid FK`; `event_id uuid FK UNIQUE`;
`edit_deadline timestamptz`; timestamps.

### `check_in_records`

`id uuid PK`; `wedding_id uuid FK`; `guest_group_id uuid FK`;
`invitation_link_id uuid FK`; `checked_in_at timestamptz`;
`checked_in_by_user_id uuid FK auth.users`; `method text`
(`qr`,`manual`); timestamps. Initial uniqueness
`(wedding_id,guest_group_id)` means one group arrival; per-event
check-in needs a deliberate schema extension.

### `notification_deliveries`

`id uuid PK`; `wedding_id uuid FK`; `channel text` (`email`,`whatsapp`);
`recipient_ref text`; `template_key/provider text`;
`provider_message_id text`; `status text`; `attempts int`;
`last_error_code text`; timestamps.

### `deletion_jobs`

`id uuid PK`; `wedding_id uuid FK`; `scheduled_for timestamptz`;
`status text`; `attempts int`; `started_at/completed_at timestamptz`;
`safe_result jsonb`; timestamps.

### `audit_logs`

`id uuid PK`; `account_id/wedding_id/actor_user_id uuid nullable FK`;
`actor_type text`; `action/entity_type text`; `entity_id uuid`;
`request_id text`; `metadata_safe jsonb`; `created_at`. No secrets or
unnecessary PII.

### `super_admin_profiles`

`id uuid PK`; `user_id uuid FK auth.users UNIQUE`; `is_active bool`;
timestamps. Provision securely; no public admin signup.

## 3. Relationships

Account 1---many weddings; wedding 1---many events, groups, guests,
links, questions, notifications, audit entries; wedding 1---current
subscription plus history; group 1---many guests; invitation link
1---current RSVP; RSVP 1---many event selections and answers; group
1---0/1 initial check-in record.

## 4. ER diagram

``` mermaid
erDiagram
 ACCOUNTS ||--o{ WEDDINGS : owns
 WEDDINGS ||--o{ EVENTS : contains
 WEDDINGS ||--o{ GUEST_GROUPS : organizes
 WEDDINGS ||--o{ GUESTS : tracks
 GUEST_GROUPS ||--o{ GUESTS : includes
 WEDDINGS ||--o{ INVITATION_LINKS : publishes
 INVITATION_LINKS ||--o| RSVP_SUBMISSIONS : identifies
 RSVP_SUBMISSIONS ||--o{ RSVP_EVENT_SELECTIONS : selects
 EVENTS ||--o{ RSVP_EVENT_SELECTIONS : selected_for
 WEDDINGS ||--o{ RSVP_QUESTIONS : configures
 RSVP_SUBMISSIONS ||--o{ RSVP_ANSWERS : provides
 RSVP_QUESTIONS ||--o{ RSVP_ANSWERS : answered_by
 GUEST_GROUPS ||--o| CHECK_IN_RECORDS : checked_in
 PLANS ||--o{ WEDDING_SUBSCRIPTIONS : defines
 WEDDINGS ||--o| WEDDING_SETTINGS : configures
 WEDDINGS ||--o{ DELETION_JOBS : schedules
```

## 5. Indexes and constraints

Indexes: `weddings(account_id,wedding_date)`;
`events(wedding_id,event_date,display_order)`;
`guests(wedding_id,full_name)` and phone;
`guest_groups(wedding_id,side,category)`; unique invitation token hash;
RSVP by wedding/status; event selection by event/selected; payments by
provider reference/internal order; deletion jobs by status/scheduled
time; notifications by status/created time. Validate party size, amount,
provider/status enums, same-wedding references, active token, and unique
current response. Use composite FKs where practical.

## 6. RLS/access

Enable RLS on all tenant tables. Owner can access only weddings in their
account. Expired wedding permits read/export but blocks mutation. Public
invitation endpoint uses a server-side allowlisted projection; no
anonymous table-wide reads. Guest writes require scoped verified
proof/edit token and deadline check. Super-admin uses separate server
guard and audit. Deletion worker uses restricted server-only
credentials.

## 7. Seed data and migration order

Seed Basic ₹499, Pro ₹999, Prime ₹1,999 and synthetic
wedding/events/groups only. Migration order: extensions/enums; accounts;
plans; weddings/settings; events; subscriptions/payments;
groups/guests/import; links; OTP; RSVP/questions/answers/selections;
check-in; notifications; deletion/audit; indexes/constraints/RLS/tests.

## 8. Deletion and review blockers

Deletion removes wedding-scoped guests, links, RSVP, check-in, exports,
and assets. Define any legally required payment retention separately; it
must not retain guest PII unnecessarily. Before migration, validate
party-size semantics, unique-link behavior, plan entitlement schema,
audit retention, payment history, RLS adversarial tests, and backup
purge policy.
