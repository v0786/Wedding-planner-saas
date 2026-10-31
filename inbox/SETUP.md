# Local Development Setup --- Wedding Guest Manager

**Status:** Scaffold-pending. The supplied project files do not include
a verified repository manifest, lockfile, Expo manifest, migration set,
or scripts. This document intentionally avoids invented copy-paste
commands.

## 1. Planned prerequisites

-   Node.js LTS version pinned by the repository.
-   Package manager declared in the root manifest (pnpm is a
    recommendation, not yet confirmed).
-   Git.
-   Expo-compatible Android environment.
-   Xcode on macOS for local iOS simulator/native builds.
-   Supabase development project or approved local Supabase setup.
-   Browser supported by the selected Next.js release.

## 2. Clone and install

After the repository URL and package manager are known: clone, enter
repository, install using the committed lockfile/frozen mode, and verify
scripts from actual manifests. Do not regenerate lockfiles casually. Add
exact commands only after testing them.

## 3. Environment

Create local env file from `.env.example`. See `INTEGRATIONS.md` for
variable inventory. Never commit real secrets, expose service-role keys
in client bundles, or reuse production credentials in development.

## 4. Supabase

1.  Create separate development/staging/production projects.
2.  Configure Auth providers and callback URLs.
3.  Apply reviewed migrations in `DATABASE.md` order.
4.  Apply RLS and policy tests.
5.  Seed synthetic plans/demo data only.
6.  Configure private storage buckets and access policies.
7.  Test that two accounts cannot access each other's weddings. Exact
    CLI commands require a pinned Supabase CLI and committed config.

## 5. Web

When `apps/web` exists, install from repository root, configure
environment, run the actual manifest's dev script, and open the URL
printed by the app. Test host auth, setup, public invitation, and RSVP
in separate sessions. Do not assume a port or script name.

## 6. Mobile

When `apps/mobile` exists, configure Expo, API URL, and Supabase public
client settings. Use the actual Expo script. Test Android on
emulator/device and iOS on macOS simulator/device. Test camera
permission and manual check-in fallback. No server secrets in mobile
bundle.

## 7. Tests

Add exact commands after scripts exist. Required layers: domain/unit,
API/database integration, RLS, web E2E, mobile component/device,
payment/OTP/notification sandbox tests. Record commands and results
accurately.

## 8. Common errors

  -------------------------------------------------------------------------
  Error                   Likely cause              Safe fix/check
  ----------------------- ------------------------- -----------------------
  Node mismatch           Runtime differs from      Read
                          project pin               `.nvmrc`/`engines`;
                                                    install pinned version

  Install fails           Wrong package             Use declared package
                          manager/lockfile          manager and frozen
                                                    lockfile

  Missing env             Incomplete local env      Compare names with
                                                    `.env.example`; do not
                                                    guess secrets

  Supabase connection     Wrong URL/key or          Verify project URL and
  fails                   unavailable project       public key

  OAuth redirect fails    Callback not allowlisted  Add exact local
                                                    callback URL in
                                                    Supabase settings

  RLS returns no rows     Policy/ownership issue    Inspect policy using
                                                    authenticated test
                                                    owner; do not disable
                                                    RLS

  Migration fails         Order/schema drift/SQL    Reproduce in disposable
                          incompatibility           dev database and
                                                    inspect history

  Expo device cannot      Network/firewall/dev      Verify device network
  connect                 server mode               and documented Expo
                                                    mode

  iOS build unavailable   Xcode missing/non-macOS   Use macOS for local iOS
                          host                      simulator/native build

  QR camera unavailable   Permission denied/browser Check permission; use
                          unsupported               manual lookup

  Payment webhook missing Local endpoint/signature  Use provider sandbox
                          config                    and inspect safe logs

  OTP not delivered       Credentials/sender/rate   Check provider sandbox
                          limit                     delivery ID; never log
                                                    OTP

  Invitation 404          Invalid/revoked token or  Check token and
                          expired wedding           lifecycle via
                                                    authorized host view
  -------------------------------------------------------------------------

## 9. OS differences

Windows: use PowerShell or WSL consistently. macOS: required for local
iOS simulator/signing. Linux: suitable for web/server; Android emulator
needs virtualization. Document actual platform-specific commands after
scaffold tests.

## 10. Finalize before implementation handoff

-   [ ] Repository URL/branch known.
-   [ ] Runtime/package manager pinned.
-   [ ] Actual scripts copied from manifests.
-   [ ] Env variables verified.
-   [ ] Supabase migration commands tested.
-   [ ] Web URL/port verified.
-   [ ] Android setup tested.
-   [ ] iOS setup tested on macOS.
-   [ ] Test commands executed.
-   [ ] At least eight troubleshooting cases validated.
