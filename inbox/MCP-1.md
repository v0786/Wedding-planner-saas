# MCP Tooling Policy --- Wedding Guest Manager

**Status:** Optional developer tooling only. MCP is not a runtime
dependency of the SaaS; no AI feature is required for wedding
operations.

## 1. Useful server categories

  -----------------------------------------------------------------------
  MCP category            Development use         Default permission
  ----------------------- ----------------------- -----------------------
  Filesystem              Read project            Read-only; writes only
                          docs/source             in approved workspace

  GitHub                  Issues, branches, PR    Read-only by default
                          review                  

  Supabase/PostgreSQL     Inspect development     Read-only; never
                          schema/data             production by default

  Browser                 Test invitation/host    Test environment only
                          flows                   

  Documentation           Framework/provider docs Read-only

  Test runner             Approved local tests    Project workspace only
  -----------------------------------------------------------------------

Use maintained, provenance-checked servers. Verify package, version, and
permissions before enabling.

## 2. Illustrative configuration

Adapt to the selected coding agent's documented schema; this is not a
verified executable config:

``` json
{
  "mcpServers": {
    "project-files": {
      "command": "<approved-filesystem-mcp-command>",
      "args": ["<project-root>"]
    },
    "github": {
      "command": "<approved-github-mcp-command>",
      "env": { "GITHUB_TOKEN": "${GITHUB_READONLY_TOKEN}" }
    }
  }
}
```

Never commit real credentials or machine-specific config.

## 3. Allowed tools

Read project docs/source; search files; inspect Git status/diffs; read
issues/PRs; inspect development schema; run non-destructive tests; open
test app; prepare proposed patches.

## 4. Confirmation-required / blocked

Require explicit confirmation before writing/deleting outside workspace,
destructive DB commands, production guest-data access/export, RLS/auth
changes, real payments/refunds, real OTP/email/WhatsApp messages,
deployments, permission changes, or wedding deletion. Do not give
assistants unrestricted production service-role keys.

## 5. Least privilege

Use separate dev/prod credentials; read-only GitHub token; dedicated dev
Supabase project; filesystem root restricted to repo; no secrets or
guest PII in prompts/config; rotate exposed credentials.

## 6. Test a connection

Verify package provenance; start with test credential; list tools;
perform harmless read; verify scope boundaries; verify destructive
actions are unavailable or approval-gated; record server version/config.

## 7. Troubleshooting

Server fails: command/runtime/package. Auth fails: token
scope/expiry/env injection. No tools: agent config schema/capabilities.
Files denied: root/OS permissions. DB denied: dev project/read-only
role. Browser fails: local server/URL. Timeout: network/request size.
Unexpected write access: disable server and review grants.
