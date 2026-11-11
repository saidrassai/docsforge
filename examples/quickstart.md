# Worked example: initialize a Next.js SaaS

This example shows the expected workflow. It uses a fictional repository.

```sh
cd ~/projects/acme-saas
git rev-parse --show-toplevel        # /home/you/projects/acme-saas
```

## 1. Inspect

```sh
node ~/.documentation-toolkit/scripts/detect-stack.mjs --root . --json
```

Expected signals:

- `next`, `react`, `@prisma/client`, `next-auth`
- `hasUi: true`, routes include `/settings/members`
- `e2e: ["@playwright/test"]`
- `docsFrameworks: []`
- `recommendations.userDocs.framework: "fumadocs"`

## 2. Preview and initialize

```sh
node ~/.documentation-toolkit/scripts/init-project.mjs --root . --dry-run
node ~/.documentation-toolkit/scripts/init-project.mjs --root .
```

Result:

```text
.documentation/config.yml
.documentation/state.json
.documentation/user-docs.md
.documentation/templates/user-guide.md
.documentation/screenshots/{inventory.yml,README.md,specs/}
.documentation/toolkit/{validate-config,audit-project,docs-impact}.mjs
openwiki/INSTRUCTIONS.md
.openwikiignore
docs/user/.gitkeep
docs/assets/screenshots/.gitkeep
playwright.docs.config.ts
AGENTS.md                       # managed block appended, existing text preserved
.github/workflows/docs-check.yml
.github/workflows/docs-sync.yml  # when daily sync is enabled
```

The initializer does **not** generate architecture pages, guides, or fake
screenshots.

## 3. Engineering wiki

In OpenCode or OMP:

```text
/docs-code
```

OpenWiki will use the host's authenticated session and its MCP lifecycle.
It reads `openwiki/INSTRUCTIONS.md`, plans pages, and writes grounded pages
with Claims.

For unattended runs:

```sh
OPENWIKI_PROVIDER=openrouter \
OPENROUTER_API_KEY=... \
openwiki --init --print
```

## 4. Customer guides

```text
/docs-user "invite a teammate"
```

The writer verifies:

- route `/settings/members`
- navigation: Settings → Members
- button: Add member (current UI)
- permission: `members:invite`
- result: invitation appears with status Invited

## 5. Screenshots

```text
/docs-screenshots "invite member"
```

The specialist:

- uses `.documentation/screenshots/.auth/owner.json`
- seeds `demo.member@example.com`
- captures starting, dialog, and success states
- writes to `docs/assets/screenshots/members/`
- updates the inventory
- references the images from the guide

## 6. Sync after a change

A developer renames the button to "Invite teammate".

```text
/docs-sync
```

The impact helper reports:

```text
Categories: {"ui":1}
Impacted routes: /settings/members
Customer: yes
Screenshots: yes
User guides: docs/user/guides/invite-member.md
Screenshots: members-invite-01
```

Only that guide and its screenshots are updated.

## 7. Audit

```text
/docs-audit full
```

The auditor runs deterministic checks, then verifies HIGH findings against the
running UI. It reports findings first. Remediation requires a separate request.

## 8. Scheduled automation

The GitHub workflow runs daily:

- updates `openwiki/`
- opens a docs-only PR
- never auto-merges
- uses `OPENROUTER_API_KEY` (or the configured provider secret)
- fails visibly if OpenWiki fails

Required secrets/variables:

- `OPENROUTER_API_KEY` (secret)
- `OPENWIKI_PROVIDER` (variable, optional)
- `OPENWIKI_MODEL_ID` (variable, optional)
- `DOCS_USER_EMAIL` / `DOCS_USER_PASSWORD` for screenshot CI, if enabled
