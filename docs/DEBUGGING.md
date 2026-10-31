# Debugging Playbook --- Wedding Guest Manager

Use this process for defects, failed builds, incorrect counts,
payment/OTP issues, security concerns, and integration failures.

## 1. Capture evidence

Record error/logs, action performed, expected/actual behavior,
environment, app version/commit, request ID, reproduction steps, scope,
and recent changes. Remove secrets, OTPs, tokens, payment credentials,
and unnecessary guest PII.

## 2. Required process

1.  Read error and relevant files.
2.  Explain failure plainly.
3.  List three likely root causes ranked by evidence.
4.  Identify a safe log/test/check to confirm the leading cause.
5.  Confirm before changing code.
6.  Propose smallest fix and show only affected lines.
7.  Add regression test.
8.  Run focused then broader checks.
9.  Explain why it broke and prevention. Never rewrite broad code for a
    narrow defect.

## 3. Area-specific checks

**Auth:** wrong Supabase environment, OAuth callback, expired session,
account provisioning race, cookie/mobile storage. Never log tokens.\
**Tenant isolation:** missing ownership check, RLS error, unsafe
service-role path, cross-wedding FK, broad storage policy. Treat
exposure as critical; stop rollout and follow incident response.\
**Payments:** provider environment, signature, amount/currency mismatch,
duplicate/out-of-order webhook, redirect trusted as success, wrong
internal order mapping. Verify safe IDs and idempotency; do not casually
replay live payment.\
**OTP/CAPTCHA:** provider credentials/sender, phone normalization,
expiry, non-atomic attempt count, reused CAPTCHA, over-aggressive rate
limit. Never print OTP.\
**RSVP/counts:** duplicate handling, invitation/group mapping,
party-size validation, foreign event, Maybe/Pending conflation, counting
submissions instead of current RSVP, timezone. Reproduce with synthetic
records.\
**Lifecycle:** wrong timezone, fixed 24-hour math instead of local
calendar boundary, incorrect upgrade amount, failed upgrade overwrites
old plan, read-only not enforced, stale public cache.\
**Deletion:** worker selects not-due wedding, non-idempotent retry, FK
order, storage not purged, backups remain, reminder offset wrong.
Disable production worker if unexpected deletion suspected.\
**QR:** revoked token, wrong group mapping, scanner permission,
duplicate scan race, camera denied; use manual fallback.\
**Exports:** filter mismatch, unauthorized columns, timezone, large
timeout, expired signed URL; compare against authorized source query.

## 4. Safe diagnostics

Inspect Git status, branch, environment, package scripts, and logs
first. Prefer read-only diagnostics. Use synthetic data and
development/staging. Commands must come from actual manifests; do not
invent them.

## 5. Change safety

Do not reset/overwrite user work, disable RLS/rate limits, weaken tests,
deploy speculative fixes, or change schema without docs+migration.
Require explicit approval for production data changes, payment actions,
or deletion.

## 6. Severity

-   **Critical:** cross-tenant exposure, unauthorized payment, data
    loss, accidental deletion, auth bypass. Stop rollout and incident
    response.
-   **High:** widespread payment/OTP/RSVP outage or incorrect attendance
    totals.
-   **Medium:** one feature degraded with safe workaround.
-   **Low:** cosmetic/usability defect.

## 7. Bug template

``` text
Title:
Environment:
App version / commit:
What I was doing:
Expected:
Actual:
Exact error:
Request ID:
Reproduction steps:
Scope / affected weddings:
Recent changes:
Checks already performed:
Sensitive data removed: yes/no
```

## 8. Definition of fixed

Root cause confirmed; minimal change reviewed; regression test passes;
tenant/security boundaries remain intact; relevant tests pass; docs
updated if needed; deployment verified in intended environment.
