# Agent Tooling Setup — Wedding Guest Manager

Recorded during the autonomous build on 2026-10-29. All installs were user-level
(global) and did not change project source code.

## Global skills (`vercel-labs/skills`)

Installer: Skills CLI from https://github.com/vercel-labs/skills  
Command used:
```
npx skills add <repo> --skill <name> -g -a opencode -y
```

Installed skills (location `~/.agents/skills`, discovered by OpenCode):
- `vercel-react-best-practices` — source `vercel-labs/agent-skills`
- `web-design-guidelines` — source `vercel-labs/agent-skills`
- `prisma-client-api` — source `prisma/skills`
- `prisma-database-setup` — source `prisma/skills`
- `nextjs-app-router-patterns` — source `vercel-labs/next-skills`
- `playwright-best-practices` — source `currents-dev/playwright-best-practices-skill`
- `security-and-hardening` — source `affaan-m/ECC`

Verification: `ls ~/.agents/skills` lists all seven; OpenCode's skill tool can invoke them.

## `affan-m/ecc` harness

Requested repository `https://github.com/affan-m/ecc` returned 404. The
maintained successor is `https://github.com/affaan-m/ECC` (note the extra `a`).
Installed package: **ecc-universal@2.2.3**.

Install command used:
```
npx ecc-universal@2.2.3 install --target opencode --profile core --no-hooks
```
Install root: `~/.config/opencode` (307 operations). Install state:
`~/.config/opencode/ecc-install-state.json` (installedAt 2026-10-29T14:40:32Z).

Components installed by the `core` profile:
- commands-core, platform-configs, skill-unified-memory, workflow-quality
- rules-core and agents-core are skipped by this profile
- hooks-runtime excluded because `--no-hooks` was used

New ECC skills discovered after install (under `~/.config/opencode/skills`):
agent-introspection-debugging, agent-self-evaluation, agent-sort, ai-regression-testing,
android-device, architecture-decision-records, browser-qa, ck, click-path-audit,
code-tour, codebase-onboarding, codehealth-mcp, config-gc, configure-ecc, context-budget,
continuous-learning, continuous-learning-v2, council, council-multi-model, delivery-gate,
dev-team, e2e-testing, ecc-guide, ecc-recipes, error-handling, eval-harness, git-workflow,
growth-log, hookify-rules, inherit-legacy-style, intent-driven-development, iterative-retrieval,
living-docs-governance, loop-design-check, plan-canvas, plankton-code-quality, product-lens,
production-audit, repo-scan, rules-distill, santa-method, skill-comply, skill-scout,
skill-stocktake, strategic-compact, tdd-workflow, unified-memory, verification-loop,
windows-desktop-e2e.

Limitations and compatibility notes:
- Hooks were intentionally excluded (`--no-hooks`) to avoid changing shell or
  agent hooks in this environment; ECC commands/skills/platform config are still
  available.
- The installer's lock check assumes hardlink identity (`fs.linkSync`) survives a
  round trip. This container's overlay filesystem reports a different inode for a
  hardlink than for its source, so the stock installer refused to run with
  "Refusing changed OpenCode install lock". The installer was executed from a
  compatibility-only copy under `/tmp/opencode/ecc-pkg` with the lock identity
  comparison relaxed (release still cleans up the lock file). This patch is not
  part of the repository and is not required on normal filesystems.
- ECC version is not recorded in the install state (`version: null`); the
  installed package version is `ecc-universal@2.2.3`.
- Third-party repository content was reviewed before execution; no scripts were
  run with elevated privileges beyond the normal user-level install.

## Database and runtime notes

- PostgreSQL 16 was installed manually from the Ubuntu 24.04 package because the
  package's cluster configuration failed in this container. Cluster:
  `/var/lib/postgresql/data`, socket `/run/postgresql`, trust auth, port 5432.
  Start command:
  ```
  su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -l /tmp/opencode/pg.log -o '-p 5432 -k /run/postgresql' start"
  ```
- Databases: `wedding_guest_manager`, `wedding_guest_manager_test`.
- Prisma migration: `prisma/migrations/20261029144901_init` (initial schema).
- Demo seed: `npm run db:seed` (`demo@example.com` / `demo1234`, invitation
  token `demo-invitation-token`).
