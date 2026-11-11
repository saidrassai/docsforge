# Commands

DocsForge installs six slash commands in OpenCode and Oh My Pi.

| Command | Purpose |
| --- | --- |
| `/docs-init` | Initialize docs infrastructure for the current Git repository |
| `/docs-sync` | Update only docs affected by current implementation changes |
| `/docs-audit` | Full, engineering, customer, or screenshot audit |
| `/docs-code` | Work only on the OpenWiki engineering knowledge base |
| `/docs-user` | Work only on customer-facing Help Center guides |
| `/docs-screenshots` | Capture or regenerate real application screenshots |

## `/docs-init`

```text
/docs-init
/docs-init --dry-run
```

Operations:

1. Confirm the Git root.
2. Detect the stack, product type, UI, docs framework, E2E tooling, and CI host.
3. Preserve existing docs and instructions.
4. Create `.documentation/config.yml`.
5. Create the OpenWiki brief and ignore file.
6. Select a user-docs adapter.
7. Configure the docs-only Playwright harness when a browser UI exists.
8. Merge the documentation policy into `AGENTS.md`.
9. Add CI only for the existing CI host.
10. Run an initial audit.

It does not generate content.

## `/docs-sync`

```text
/docs-sync
/docs-sync origin/main
```

Operations:

1. Resolve the comparison base.
2. Run the impact helper.
3. Classify changes.
4. Update impacted OpenWiki pages and Claims.
5. Update impacted customer guides.
6. Regenerate affected screenshots.
7. Validate links, config, Claims, and images.
8. Produce an impact report.

Internal refactors with no behavior or contract change produce no public docs
changes.

## `/docs-audit`

```text
/docs-audit
/docs-audit engineering
/docs-audit customer
/docs-audit screenshots
```

The auditor reports findings first:

| Severity | Meaning |
| --- | --- |
| CRITICAL | Security exposure, data leak, or a primary path that cannot succeed |
| HIGH | Materially wrong or missing for a primary journey |
| MEDIUM | Important gap or drift with a workaround |
| LOW | Polish |

It does not rewrite documentation unless remediation is requested.

## `/docs-code`

```text
/docs-code
/docs-code billing permissions
```

Uses OpenWiki to:

- initialize or update the engineering wiki;
- preserve source references;
- reconcile stale Claims;
- document architecture, data, APIs, security, jobs, caching, storage, AI
  systems, errors, testing, deployment, configuration, operations, and ADRs;
- keep customer content out.

## `/docs-user`

```text
/docs-user "invite a member"
/docs-user "onboarding journey"
```

Produces task-based guides with:

1. what the feature does;
2. who can use it;
3. required permissions;
4. prerequisites;
5. where to find it;
6. what to click;
7. what to enter;
8. how to complete the operation;
9. expected result;
10. common problems;
11. related guides.

## `/docs-screenshots`

```text
/docs-screenshots "invite member"
/docs-screenshots /settings/members
```

Uses Playwright to:

- capture real screenshots;
- use synthetic demo data;
- authenticate with a dedicated test user;
- assert the UI state before capture;
- update the inventory;
- regenerate only affected images.

## Host behavior

OpenCode and OMP both support file-based markdown commands. The same command
body is installed in both hosts with host-specific frontmatter.

If a host cannot expose a particular command, the underlying skill remains
available for direct invocation.
